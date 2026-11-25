import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const SIZE = 28; // the round × button
const GAP = 6;
const TYPES = new Set(["text", "number", "tel", "search", "email", "url", "password", ""]);

type Box = HTMLInputElement | HTMLTextAreaElement;

const editable = (el: Element): el is Box => {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled && !el.dataset.noClear;
  return el instanceof HTMLInputElement && TYPES.has(el.type) && !el.readOnly && !el.disabled && !el.dataset.noClear;
};

/** Clear a React-controlled field: set it through the native setter, then fire "input" so React's onChange runs. */
const clearField = (el: Box) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, "");
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

/** Original inline padding-right of each box we widened, to put back when it empties. */
const origPad = new WeakMap<Box, string>();

/**
 * One × for every text / number box in the app that has a value, whether or not it is focused: tap × to empty
 * the box, tap anywhere else in the box to edit as usual. Mounted once (App). A box opts out with data-no-clear.
 * A × is hidden when something covers its box (a dialog, the sticky header, the quick-actions backdrop).
 */
export const ClearButton: React.FC = () => {
  const { t } = useLanguage();
  const [spots, setSpots] = useState<{ el: Box; top: number; left: number }[]>([]);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tracked = new Set<Box>();

    const unpad = (el: Box) => {
      if (origPad.has(el)) {
        el.style.paddingRight = origPad.get(el)!;
        origPad.delete(el);
      }
      tracked.delete(el);
    };

    const measure = () => {
      frame = 0;
      // While measuring, our own buttons must not count as "covering" a box.
      layer.current?.classList.add("pointer-events-none", "[&_*]:pointer-events-none");
      const next: { el: Box; top: number; left: number }[] = [];
      const seen = new Set<Box>();
      const vh = window.innerHeight;
      document.querySelectorAll<Box>("input, textarea").forEach((el) => {
        if (!editable(el) || !el.value) return;
        const r0 = el.getBoundingClientRect();
        if (r0.width < 60 || r0.bottom < 0 || r0.top > vh) return;
        seen.add(el);
        if (!origPad.has(el)) origPad.set(el, el.style.paddingRight);
        tracked.add(el);
        // Sit just left of anything already in the box's right end (e.g. the pencil button).
        el.style.paddingRight = origPad.get(el)!;
        const basePad = parseFloat(getComputedStyle(el).paddingRight) || 0;
        const inner = basePad >= 32 ? basePad : 0;
        el.style.paddingRight = `${inner + SIZE + GAP}px`;
        const r = el.getBoundingClientRect();
        const top = el instanceof HTMLTextAreaElement ? r.top + GAP : r.top + (r.height - SIZE) / 2;
        const left = r.right - inner - SIZE - GAP;
        const hit = document.elementFromPoint(left + SIZE / 2, top + SIZE / 2);
        if (hit && (hit === el || el.contains(hit))) next.push({ el, top, left });
      });
      tracked.forEach((el) => !seen.has(el) && unpad(el));
      layer.current?.classList.remove("pointer-events-none", "[&_*]:pointer-events-none");
      setSpots((prev) =>
        prev.length === next.length && prev.every((p, i) => p.el === next[i].el && p.top === next[i].top && p.left === next[i].left) ? prev : next
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const events: [EventTarget, string][] = [
      [document, "input"],
      [document, "focusin"],
      [document, "focusout"],
      [document, "click"],
      [window, "scroll"],
      [window, "resize"],
    ];
    events.forEach(([tg, ev]) => tg.addEventListener(ev, schedule, true));
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "value", "hidden", "open"] });
    // Values set by code (Reset, Calculate, a saved rate) fire no event: re-check now and then.
    const poll = window.setInterval(schedule, 400);
    schedule();
    return () => {
      events.forEach(([tg, ev]) => tg.removeEventListener(ev, schedule, true));
      mo.disconnect();
      clearInterval(poll);
      if (frame) cancelAnimationFrame(frame);
      tracked.forEach(unpad);
    };
  }, []);

  return (
    <div ref={layer}>
      {spots.map(({ el, top, left }, i) => (
        <button
          key={el.id || i}
          type="button"
          aria-label={`${t("common.clear")}${el.labels?.[0]?.textContent ? `: ${el.labels[0].textContent}` : ""}`}
          // pointerdown + preventDefault: a focused box keeps focus (keyboard stays up); an unfocused one stays closed.
          onPointerDown={(e) => {
            e.preventDefault();
            clearField(el);
          }}
          onClick={(e) => {
            e.preventDefault();
            if (e.detail === 0) clearField(el); // keyboard Enter / Space
          }}
          style={{ top, left, width: SIZE, height: SIZE }}
          className="fixed z-[60] flex items-center justify-center rounded-full bg-gray-200 text-gray-600 active:bg-gray-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};
