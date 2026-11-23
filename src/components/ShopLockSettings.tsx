import React, { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { inputCls, Switch } from "@/components/calc/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useStore } from "@/lib/store";
import {
  endGrant,
  isNative,
  loadConfig,
  matchTotp,
  newBackupCodes,
  newSecret,
  otpauthUrl,
  saveConfig,
  ShopLockNative,
  spendOwnerCode,
  type LockConfig,
} from "@/lib/shopLock";

const btn = "h-11 rounded-lg border border-purple-300 bg-purple-50 px-3 text-sm font-semibold text-purple-800 disabled:opacity-50";
const primary = "h-11 rounded-md bg-purple-800 px-4 text-sm font-semibold text-white disabled:opacity-50";

const nativeError = (e: unknown, t: (k: string) => string) => {
  const c = (e as { code?: string })?.code;
  return t(`lock.reason.${c === "wifi-off" || c === "location-off" || c === "permission" || c === "no-fix" ? c : "error"}`);
};

/** Backup codes, shown once. */
const BackupList: React.FC<{ codes: string[]; onDone: () => void }> = ({ codes, onDone }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <p className="text-sm font-semibold text-red-700">{t("lock.backupSave")}</p>
      <ol className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 font-mono text-[15px]">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <button type="button" className={primary} onClick={onDone}>
        {t("lock.backupDone")}
      </button>
    </div>
  );
};

/** First-time setup: pair the owner's authenticator app, then show backup codes. */
const Setup: React.FC<{ onSaved: (cfg: LockConfig, codes: string[]) => void }> = ({ onSaved }) => {
  const { t } = useLanguage();
  const { state } = useStore();
  const secret = useMemo(newSecret, []);
  const qr = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(otpauthUrl(secret, state.shop.name));
    q.make();
    return q.createDataURL(5, 8);
  }, [secret, state.shop.name]);
  const [code, setCode] = useState("");

  const confirm = async () => {
    const step = await matchTotp(secret, code.trim());
    if (step === null) return toast.error(t("lock.badCode"));
    const { codes, hashes } = await newBackupCodes();
    onSaved({ enabled: false, secret, backup: hashes, wifi: [], geo: null, grantHours: 2, lastStep: step }, codes);
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
      <p className="text-sm text-gray-700">{t("lock.setupStep1")}</p>
      <img src={qr} alt={t("lock.qrAlt")} className="mx-auto h-52 w-52" />
      <p className="text-center text-xs text-gray-600">
        {t("lock.manualKey")} <span className="break-all font-mono text-gray-900">{secret.match(/.{1,4}/g)?.join(" ")}</span>
      </p>
      <p className="text-sm text-gray-700">{t("lock.setupStep2")}</p>
      <div className="flex gap-2">
        <input aria-label={t("lock.ownerCode")} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className={`${inputCls} min-w-0 flex-1`} />
        <button type="button" className={primary} disabled={code.length !== 6} onClick={confirm}>
          {t("lock.confirm")}
        </button>
      </div>
    </div>
  );
};

/** Settings → Shop lock. Opening it after setup needs an owner code, so salesmen cannot change it. */
export const ShopLockSettings: React.FC = () => {
  const { t } = useLanguage();
  const [cfg, setCfg] = useState<LockConfig | null>(loadConfig);
  const [owner, setOwner] = useState(false);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const save = (c: LockConfig | null) => {
    saveConfig(c);
    setCfg(c);
  };
  const patch = (p: Partial<LockConfig>) => cfg && save({ ...cfg, ...p, lastStep: loadConfig()?.lastStep ?? cfg.lastStep, backup: p.backup ?? loadConfig()?.backup ?? cfg.backup });

  if (!isNative()) return <p className="px-4 py-3 text-sm text-gray-600">{t("lock.appOnly")}</p>;

  if (codes) return <BackupList codes={codes} onDone={() => setCodes(null)} />;

  if (!cfg)
    return (
      <Setup
        onSaved={(c, cs) => {
          save(c);
          setOwner(true);
          setCodes(cs);
        }}
      />
    );

  if (!owner)
    return (
      <form
        className="flex flex-col gap-2 px-4 pb-4 pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await spendOwnerCode(code)) {
            setCfg(loadConfig());
            setOwner(true);
            setCode("");
          } else toast.error(t("lock.badCode"));
        }}
      >
        <label htmlFor="lock-admin" className="text-[13px] font-medium text-purple-800">
          {t("lock.ownerCode")}
        </label>
        <input id="lock-admin" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("lock.ownerCodePh")} className={inputCls} />
        <button type="submit" className={primary} disabled={!code.trim()}>
          {t("lock.manage")}
        </button>
      </form>
    );

  const addWifi = async () => {
    setBusy(true);
    try {
      const w = await ShopLockNative.getWifi();
      if (!w.connected || !w.bssid) toast.error(t("lock.reason.not-shop-wifi"));
      else if (cfg.wifi.some((x) => x.bssid === w.bssid)) toast(t("lock.wifiExists"));
      else {
        patch({ wifi: [...cfg.wifi, { bssid: w.bssid, ssid: w.ssid ?? "" }] });
        toast.success(t("lock.wifiAdded", { n: w.ssid || w.bssid }));
      }
    } catch (e) {
      toast.error(nativeError(e, t));
    }
    setBusy(false);
  };

  const setHere = async () => {
    setBusy(true);
    try {
      const l = await ShopLockNative.getLocation();
      if (l.mock) toast.error(t("lock.reason.mock"));
      else {
        patch({ geo: { lat: l.lat, lng: l.lng, radius: cfg.geo?.radius ?? 100 } });
        toast.success(t("lock.geoSet", { a: Math.round(l.accuracy) }));
      }
    } catch (e) {
      toast.error(nativeError(e, t));
    }
    setBusy(false);
  };

  const canEnable = cfg.wifi.length > 0 || !!cfg.geo;
  const pills = (vals: number[], cur: number, pick: (v: number) => void, fmt: (v: number) => string) => (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {vals.map((v) => (
        <button key={v} type="button" aria-pressed={cur === v} onClick={() => pick(v)} className={`h-10 rounded-full border-2 px-4 text-sm ${cur === v ? "border-purple-700 bg-purple-50 font-semibold" : "border-gray-200"}`}>
          {fmt(v)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="pb-2">
      <Switch
        on={cfg.enabled}
        onToggle={() => (canEnable || cfg.enabled ? patch({ enabled: !cfg.enabled }) : toast.error(t("lock.needCheck")))}
        label={t("lock.enable")}
        hint={t("lock.enableHint")}
      />

      <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">{t("lock.wifi")}</h3>
      {cfg.wifi.map((w) => (
        <div key={w.bssid} className="flex min-h-11 items-center justify-between border-b border-purple-100 pl-4 pr-2">
          <span className="flex flex-col">
            <span className="text-[15px] text-gray-900">{w.ssid || t("lock.wifiNoName")}</span>
            <span className="font-mono text-xs text-gray-500">{w.bssid}</span>
          </span>
          <button type="button" aria-label={t("settings.remove")} onClick={() => patch({ wifi: cfg.wifi.filter((x) => x.bssid !== w.bssid) })} className="flex h-11 w-11 items-center justify-center text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="px-4 py-3">
        <button type="button" className={`${btn} w-full`} disabled={busy} onClick={addWifi}>
          {t("lock.addWifi")}
        </button>
      </div>

      <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">{t("lock.geo")}</h3>
      <p className="px-4 pt-2 text-xs text-gray-600">{cfg.geo ? t("lock.geoOn", { lat: cfg.geo.lat.toFixed(5), lng: cfg.geo.lng.toFixed(5) }) : t("lock.geoOff")}</p>
      <div className="flex gap-2 px-4 py-3">
        <button type="button" className={`${btn} flex-1`} disabled={busy} onClick={setHere}>
          {t("lock.setHere")}
        </button>
        {cfg.geo ? (
          <button type="button" className={btn} onClick={() => patch({ geo: null })}>
            {t("settings.remove")}
          </button>
        ) : null}
      </div>
      {cfg.geo ? pills([50, 100, 200, 500], cfg.geo.radius, (r) => patch({ geo: { ...cfg.geo!, radius: r } }), (v) => `${v} m`) : null}

      <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">{t("lock.grant")}</h3>
      <p className="px-4 pt-2 text-xs text-gray-600">{t("lock.grantHint")}</p>
      <div className="pt-2">{pills([1, 2, 4, 8, 12], cfg.grantHours, (h) => patch({ grantHours: h }), (v) => t("lock.hours", { h: v }))}</div>

      <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">{t("lock.backup")}</h3>
      <p className="px-4 pt-2 text-xs text-gray-600">{t("lock.backupLeft", { n: cfg.backup.length })}</p>
      <div className="flex flex-col gap-2 px-4 py-3">
        <button
          type="button"
          className={btn}
          onClick={async () => {
            const { codes: cs, hashes } = await newBackupCodes();
            patch({ backup: hashes });
            setCodes(cs);
          }}
        >
          {t("lock.newBackup")}
        </button>
        <button type="button" className={btn} onClick={() => (endGrant(), toast.success(t("lock.lockedNow")))}>
          {t("lock.lockNow")}
        </button>
        <button
          type="button"
          className="h-11 rounded-lg border border-red-300 text-sm font-semibold text-red-700"
          onClick={() => {
            if (window.confirm(t("lock.removeConfirm"))) {
              save(null);
              endGrant();
              setOwner(false);
            }
          }}
        >
          {t("lock.remove")}
        </button>
      </div>
    </div>
  );
};
