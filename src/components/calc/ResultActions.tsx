import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Printer as PrinterIcon, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { bytesToBase64, canvasToBase64Png, canvasToEscPos } from "@/lib/receipt";
import { isNative, Printer, printerError } from "@/lib/printer";
import { WhatsAppIcon } from "./ui";

type Action = "print" | "share" | "whatsapp" | "download";

const ACTION_TEXT: Record<Action, { title: string; go: string }> = {
  print: { title: "Print estimate", go: "Print" },
  share: { title: "Share estimate", go: "Share" },
  whatsapp: { title: "Send estimate on WhatsApp", go: "Send on WhatsApp" },
  download: { title: "Download estimate", go: "Save image" },
};

/** Print / Share / WhatsApp / Download for an estimate. Icon-only buttons with accessible names. */
export const ResultActions: React.FC<{
  /** Draws the image with the given estimate number. */
  render: (no: number) => Promise<HTMLCanvasElement>;
  shareText: string;
  /** The number the estimate already has. Without one it takes the next number, used up by the first print, share or save. */
  no?: number | null;
  onNumbered?: (no: number) => void;
}> = ({ render, shareText, no: given, onNumbered }) => {
  const { state, update } = useStore();
  const [noPrinter, setNoPrinter] = useState(false);
  const [preview, setPreview] = useState<{ action: Action; url: string; canvas: HTMLCanvasElement } | null>(null);
  const [busy, setBusy] = useState(false);
  const paperName = state.paper === 58 ? "2 inch" : "3 inch";
  const no = given ?? state.billSeq;
  const fileName = `estimate-${String(no).padStart(4, "0")}.png`;

  /** After a print, share or save: a new estimate keeps the number it was given. */
  const numbered = () => {
    if (given != null) return;
    update((s) => ({ ...s, billSeq: s.billSeq + 1 }));
    onNumbered?.(no);
  };

  /** Print from the preview: the image shown is the one printed. */
  const print = async (canvas: HTMLCanvasElement) => {
    if (!state.printer) {
      setNoPrinter(true);
      return;
    }
    if (!isNative()) {
      toast.error("Printing works in the Android app.");
      return;
    }
    setBusy(true);
    try {
      await Printer.ensureReady();
      await Printer.write({ address: state.printer.address, data: bytesToBase64(canvasToEscPos(canvas)) });
      toast.success(`Printed on ${state.printer.name}`);
      numbered();
      setPreview(null);
    } catch (e) {
      toast.error(printerError(e));
    } finally {
      setBusy(false);
    }
  };

  const open = async (action: Action) => {
    const canvas = await render(no);
    setPreview({ action, url: canvas.toDataURL("image/png"), canvas });
  };

  const go = async () => {
    if (!preview) return;
    if (preview.action === "print") return print(preview.canvas);
    const data = canvasToBase64Png(preview.canvas);
    const text = shareText;
    try {
      if (isNative()) {
        if (preview.action === "download") {
          await Printer.saveImage({ data, fileName });
          toast.success("Estimate saved to Pictures / Pandit Jewellers");
        } else {
          await Printer.shareImage({ data, fileName, text, target: preview.action === "whatsapp" ? "whatsapp" : "" });
        }
      } else {
        const blob = await (await fetch(preview.url)).blob();
        const file = new File([blob], fileName, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        if (preview.action !== "download" && nav.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text });
        } else {
          const a = document.createElement("a");
          a.href = preview.url;
          a.download = fileName;
          a.click();
        }
      }
      numbered();
      setPreview(null);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(printerError(e));
    }
  };

  const iconBtn = "flex h-14 items-center justify-center rounded-xl disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        <button type="button" aria-label="Print" title="Print" disabled={busy} onClick={() => open("print")} className={`${iconBtn} bg-purple-800 text-white`}>
          <PrinterIcon className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Share" title="Share" onClick={() => open("share")} className={`${iconBtn} border border-purple-300 bg-white text-purple-800`}>
          <Share2 className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Send on WhatsApp" title="WhatsApp" onClick={() => open("whatsapp")} className={`${iconBtn} bg-[#0f7a5c] text-white`}>
          <WhatsAppIcon className="h-7 w-7" />
        </button>
        <button type="button" aria-label="Download" title="Download" onClick={() => open("download")} className={`${iconBtn} border border-purple-300 bg-white text-purple-800`}>
          <Download className="h-6 w-6" />
        </button>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-[13px] text-gray-600">
        <span>{state.printer ? `Printer: ${state.printer.name} · ${paperName}` : "No printer connected"}</span>
        <Link to="/settings/printer" className="min-h-8 px-1 font-semibold text-purple-700 underline">
          {state.printer ? "Change" : "Connect"}
        </Link>
      </p>

      {noPrinter ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-gray-900/45" onClick={() => setNoPrinter(false)}>
          <section role="dialog" aria-modal="true" aria-label="No printer connected" className="flex flex-col gap-3 rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-purple-900">No printer connected</h2>
            <p className="text-sm leading-relaxed text-gray-600">Connect a 2 inch or 3 inch Bluetooth thermal printer once. After that, Print sends the estimate straight to it.</p>
            <Link to="/settings/printer" className="flex h-12 items-center justify-center rounded-lg bg-purple-800 text-[15px] font-semibold text-white">
              Connect printer
            </Link>
            <button type="button" onClick={() => setNoPrinter(false)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
              Cancel
            </button>
          </section>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/70">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <h2 className="text-[17px] font-bold">{ACTION_TEXT[preview.action].title}</h2>
            <button type="button" aria-label="Close" onClick={() => setPreview(null)} className="flex h-11 w-11 items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 justify-center overflow-y-auto px-4 pb-4">
            <img src={preview.url} alt="Estimate preview" className="h-fit w-full max-w-[300px] rounded-sm shadow-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-2 bg-white px-4 pb-5 pt-3">
            <button type="button" onClick={() => setPreview(null)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
              Close
            </button>
            <button
              type="button"
              onClick={go}
              disabled={busy}
              className={`h-12 rounded-lg disabled:opacity-60 text-[15px] font-semibold text-white ${preview.action === "whatsapp" ? "bg-[#0f7a5c]" : "bg-purple-800"}`}
            >
              {ACTION_TEXT[preview.action].go}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
