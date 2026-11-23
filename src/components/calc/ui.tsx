import React, { ReactNode } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export const labelCls = "text-sm font-medium text-purple-800";
export const inputCls =
  "h-11 w-full rounded-md border border-purple-200 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100";
export const readOnlyCls = "h-11 w-full rounded-md border border-gray-200 bg-gray-100 px-3 text-base text-gray-700";
export const linkBtnCls = "self-start min-h-8 text-xs font-semibold text-purple-700 underline";
export const primaryBtnCls =
  "h-12 rounded-md bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 text-[15px] font-semibold text-white shadow-md active:opacity-90";
export const resetBtnCls = "h-12 rounded-md border border-rose-500 bg-transparent text-[15px] font-medium text-rose-600";

export const Field: React.FC<{ id: string; label: ReactNode; children: ReactNode; className?: string }> = ({ id, label, children, className }) => (
  <div className={`flex min-w-0 flex-col gap-2 ${className ?? ""}`}>
    <label htmlFor={id} className={labelCls}>
      {label}
    </label>
    {children}
  </div>
);

/** A number box with an optional icon button inside its right end (set / edit a saved value). */
export const NumberInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { onIcon?: () => void; iconSet?: boolean; iconLabel?: string }
> = ({ onIcon, iconSet, iconLabel, className, ...props }) => (
  <div className="relative min-w-0 flex-1">
    <input type="number" inputMode="decimal" className={`${inputCls} ${onIcon ? "pr-11" : ""} ${className ?? ""}`} {...props} />
    {onIcon ? (
      <button type="button" onClick={onIcon} aria-label={iconLabel} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-purple-700">
        {iconSet ? <Pencil className="h-[18px] w-[18px]" /> : <Plus className="h-[18px] w-[18px]" />}
      </button>
    ) : null}
  </div>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }> = ({ title, onClose, children, footer }) => {
  const closeLabel = useLanguage().t("common.close");
  return (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/45 px-6 pt-40" onClick={onClose}>
    <section
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-purple-900">{title}</h2>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2 flex h-10 w-10 items-center justify-center text-gray-500">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
      {footer}
    </section>
  </div>
  );
};

export const Switch: React.FC<{ on: boolean; onToggle: () => void; label: string; hint?: string }> = ({ on, onToggle, label, hint }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onToggle}
    className="flex min-h-14 w-full items-center justify-between gap-3 border-t border-purple-100 px-4 py-2 text-left"
  >
    <span className="flex flex-col gap-0.5">
      <span className="text-[15px] text-gray-900">{label}</span>
      {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </span>
    <span className={`relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-purple-600" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </span>
  </button>
);

/** WhatsApp-style glyph: a chat bubble with a phone handset. */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    <path d="M16.6 14.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3Z" />
  </svg>
);
