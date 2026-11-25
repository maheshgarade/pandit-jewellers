import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const SIZE = 32; // the round × button
const GAP = 6;
const TYPES = new Set(["text", "number", "tel", "search", "email", "url", "password", ""]);

const editable = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement => {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  return el instanceof HTMLInputElement && TYPES.has(el.type) && !el.readOnly && !el.disabled && !el.dataset.noClear;
};

/** Clear a React-controlled field: set it through the native setter, then fire "input" so React's onChange runs. */
const clearField = (el: HTMLInputElement | HTMLTextAreaElement) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, "");
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

/**
 * One × button for every text / number box in the app: shown inside the end of the focused box while it has a
 * value; one tap empties it and keeps the keyboard open. Mounted once (App). A box can opt out with data-no-clear.
 */
export const ClearButton: React.FC = () => {
  const { t } = useLanguage();
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const target = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const padded = useRef<{ el: HTMLElement; pr: string } | null>(null);

  useEffect(() => {
    const unpad = () => {
      if (padded.current) padded.current.el.style.paddingRight = padded.current.pr;
      padded.current = null;
    };
    const place = () => {
      const el = target.current;
      if (!el || document.activeElement !== el || !el.value) {
        unpad();
        setBox(null);
        return;
      }
      if (!padded.current || padded.current.el !== el) {
        unpad();
        padded.current = { el, pr: el.style.paddingRight };
      }
      // Sit just left of anything already inside the box's right end (e.g. the pencil button).
      el.style.paddingRight = padded.current.pr;
      const basePad = parseFloat(getComputedStyle(el).paddingRight) || 0;
      const inner = basePad >= 32 ? basePad : 0;
      el.style.paddingRight = `${inner + SIZE + GAP}px`;
      const r = el.getBoundingClientRect();
      const top = el instanceof HTMLTextAreaElement ? r.top + GAP : r.top + (r.height - SIZE) / 2;
      setBox({ top, left: r.right - inner - SIZE - GAP });
    };
    const onFocus = (e: FocusEvent) => {
      target.current = editable(e.target as Element) ? (e.target as HTMLInputElement) : null;
      place();
    };
    const onBlur = () => setTimeout(place, 0);
    const onMove = () => target.current && place();
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("input", onMove, true);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("input", onMove, true);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      unpad();
    };
  }, []);

  if (!box) return null;
  return (
    <button
      type="button"
      aria-label={t("common.clear")}
      // pointerdown + preventDefault: the box keeps focus, so the keyboard stays up.
      onPointerDown={(e) => {
        e.preventDefault();
        if (target.current) clearField(target.current);
      }}
      onClick={(e) => {
        e.preventDefault();
        if (target.current) clearField(target.current);
      }}
      style={{ top: box.top, left: box.left, width: SIZE, height: SIZE }}
      className="fixed z-[60] flex items-center justify-center rounded-full bg-gray-200 text-gray-600 active:bg-gray-300"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
};
