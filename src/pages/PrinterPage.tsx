import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Printer as PrinterIcon, X } from "lucide-react";
import { toast } from "sonner";
import type { PluginListenerHandle } from "@capacitor/core";
import Layout from "@/components/Layout";
import { useStore } from "@/lib/store";
import { bytesToBase64, canvasToEscPos, drawTestPrint } from "@/lib/receipt";
import { FoundDevice, isNative, Printer, printerError } from "@/lib/printer";
import { tr, useLanguage } from "@/context/LanguageContext";

const SCAN_MS = 15_000;

const Row: React.FC<{ name: string; sub?: string; subCls?: string; children: React.ReactNode }> = ({ name, sub, subCls, children }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-700">
      <PrinterIcon className="h-5 w-5" />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[15px] text-gray-900">{name}</span>
      {sub ? <span className={`text-xs ${subCls ?? "text-gray-500"}`}>{sub}</span> : null}
    </span>
    {children}
  </div>
);

const actionCls = "h-10 min-w-[84px] rounded-lg bg-purple-100 px-3 text-sm font-semibold text-purple-800 disabled:opacity-50";

/** Connect Printer (Bluetooth), modelled on RestoBill: scans on open, Paired / Found lists, pair + test print. */
export default function PrinterPage() {
  const { state, update } = useStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [bonded, setBonded] = useState<FoundDevice[]>([]);
  const [found, setFound] = useState<FoundDevice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const listeners = useRef<PluginListenerHandle[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    listeners.current.forEach((l) => void l.remove());
    listeners.current = [];
    if (timer.current) clearTimeout(timer.current);
    if (isNative()) void Printer.stopDiscovery().catch(() => {});
    setScanning(false);
  }, []);

  const scan = useCallback(async () => {
    if (!isNative()) {
      toast.info(tr("printer.androidOnly"));
      return;
    }
    stop();
    try {
      await Printer.ensureReady();
      setBonded((await Printer.getBondedDevices()).devices);
      setFound([]);
      setScanning(true);
      listeners.current.push(
        await Printer.addListener("deviceFound", (d) => setFound((list) => (list.some((x) => x.id === d.id) ? list : [...list, d]))),
        await Printer.addListener("discoveryFinished", () => setScanning(false))
      );
      await Printer.startDiscovery();
      timer.current = setTimeout(stop, SCAN_MS);
    } catch (e) {
      stop();
      toast.error(printerError(e));
    }
  }, [stop]);

  useEffect(() => {
    void scan();
    return stop;
  }, [scan, stop]);

  const testPrint = async (address: string, name: string) => {
    const canvas = drawTestPrint(state.shop.name, state.paper, [
      [t("printer.testPrint"), "OK"],
      [t("settings.printer"), name],
      [t("printer.paper"), state.paper === 58 ? t("settings.inch2") : t("settings.inch3")],
    ]);
    await Printer.write({ address, data: bytesToBase64(canvasToEscPos(canvas)) });
  };

  const connect = async (d: FoundDevice, needsPair: boolean) => {
    stop();
    setBusy(d.id);
    try {
      if (needsPair) {
        setPairing(d.name);
        const { value } = await Printer.pair({ address: d.id });
        setPairing(null);
        if (!value) {
          toast.error(t("printer.pairFailed"));
          return;
        }
      }
      update((s) => ({ ...s, printer: { address: d.id, name: d.name } }));
      toast.success(t("printer.connectedTo", { name: d.name }));
      await testPrint(d.id, d.name);
      navigate("/settings");
    } catch (e) {
      setPairing(null);
      toast.error(printerError(e));
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    if (!state.printer) return;
    setBusy(state.printer.address);
    try {
      await Printer.ensureReady();
      await testPrint(state.printer.address, state.printer.name);
      toast.success(t("printer.testSent"));
    } catch (e) {
      toast.error(printerError(e));
    } finally {
      setBusy(null);
    }
  };

  const savedId = state.printer?.address;
  const newBonded = bonded.filter((d) => d.id !== savedId);
  const newFound = found.filter((d) => d.id !== savedId && !bonded.some((b) => b.id === d.id) && !d.bonded);

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-2 px-4 py-4">
        <h1 className="text-xl font-bold text-purple-900">{t("print.connectPrinter")}</h1>

        {scanning ? (
          <div className="flex items-center gap-3 py-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Loader2 className="h-5 w-5 animate-spin text-purple-700" />
            </span>
            <span className="text-[15px] text-purple-700">{t("printer.searching")}</span>
          </div>
        ) : null}

        {pairing ? (
          <div className="rounded-xl border border-purple-400 bg-purple-50 p-4 text-sm">
            <p className="font-bold text-gray-900">{t("printer.pairingWith", { name: pairing })}</p>
            <p className="mt-1 text-gray-700">{t("printer.pinHint")}</p>
          </div>
        ) : null}

        <h2 className="mt-2 text-base font-bold text-gray-900">{t("printer.paired")}</h2>
        {!state.printer && newBonded.length === 0 ? <p className="py-1 text-sm text-gray-600">{t("printer.noPaired")}</p> : null}
        {state.printer ? (
          <Row name={state.printer.name} sub={t("printer.connected")} subCls="text-green-700">
            <button type="button" className={actionCls} disabled={!!busy} onClick={runTest}>
              {busy === state.printer.address ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("printer.testPrint")}
            </button>
            <button
              type="button"
              aria-label={t("printer.remove")}
              onClick={() => update((s) => ({ ...s, printer: null }))}
              className="flex h-10 w-10 items-center justify-center text-red-600"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </Row>
        ) : null}
        {newBonded.map((d) => (
          <Row key={d.id} name={d.name}>
            <button type="button" className={actionCls} disabled={!!busy} onClick={() => connect(d, false)}>
              {busy === d.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("print.connect")}
            </button>
          </Row>
        ))}

        <h2 className="mt-4 text-base font-bold text-gray-900">{t("printer.found")}</h2>
        {newFound.length === 0 && !scanning ? <p className="py-1 text-sm text-gray-600">{t("printer.turnOn")}</p> : null}
        {newFound.map((d) => (
          <Row key={d.id} name={d.name} sub={t("printer.notPaired")}>
            <button type="button" className={actionCls} disabled={!!busy} onClick={() => connect(d, true)}>
              {busy === d.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("printer.pair")}
            </button>
          </Row>
        ))}

        <button type="button" onClick={() => isNative() && Printer.openBluetoothSettings()} className="mt-2 self-start text-sm font-semibold text-purple-700 underline">
          {t("printer.pairInSettings")}
        </button>
      </div>

      <div className="sticky bottom-0 border-t border-purple-200 bg-white px-4 pb-5 pt-3">
        <button type="button" disabled={scanning || !!busy} onClick={scan} className="h-12 w-full rounded-lg bg-purple-100 text-[15px] font-semibold text-purple-800 disabled:opacity-50">
          {t("printer.scan")}
        </button>
      </div>
    </Layout>
  );
}
