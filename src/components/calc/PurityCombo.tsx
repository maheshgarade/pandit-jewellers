import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { purityLabel, useStore } from "@/lib/store";
import { inputCls } from "./ui";
import { useLanguage } from "@/context/LanguageContext";

/**
 * One box for purity: type any % (custom), or pick from the list with the arrow. "Custom" clears the box
 * and puts the cursor in it. The karat shows as a small tag when the value matches a listed purity.
 */
export const PurityCombo: React.FC<{ id: string; value: string; onChange: (v: string) => void }> = ({ id, value, onChange }) => {
  const { state } = useStore();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const match = state.purities.find((p) => String(p.value) === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (v: string | null) => {
    setOpen(false);
    if (v === null) {
      onChange("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } else onChange(v);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="number"
        inputMode="decimal"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        placeholder={t("calc.enterPercent")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} pr-20`}
      />
      {match?.label ? (
        <span aria-hidden="true" className="absolute right-11 top-3 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">
          {match.label}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={t("calc.choosePurity")}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-gray-500"
      >
        <ChevronDown className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label={t("calc.purity")}
          className="absolute left-0 right-0 top-12 z-30 flex max-h-72 flex-col overflow-y-auto rounded-lg border border-purple-200 bg-white p-1 shadow-xl"
        >
          <button type="button" role="option" aria-selected={!match} onClick={() => pick(null)} className="min-h-11 rounded-md border-b border-purple-100 px-3 text-left text-[15px]">
            Custom
          </button>
          {state.purities.map((p) => {
            const sel = match === p;
            return (
              <button
                key={`${p.value}-${p.label}`}
                type="button"
                role="option"
                aria-selected={sel}
                onClick={() => pick(String(p.value))}
                className={`min-h-11 rounded-md px-3 text-left text-[15px] ${sel ? "bg-purple-100 font-semibold text-purple-900" : ""}`}
              >
                {purityLabel(p)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
