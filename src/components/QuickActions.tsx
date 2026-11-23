import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, FileText, Plus, UserPlus } from "lucide-react";
import { EMPTY_ESTIMATE, useStore } from "@/lib/store";
import { recordEstimate } from "@/lib/customers";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Floating + (bottom right, above the tabs): Create estimate, Create customer, Calculate, to jump between
 * screens. "Create estimate" starts a new one only when the current one was already printed / shared.
 */
export const QuickActions: React.FC = () => {
  const { t } = useLanguage();
  const { update } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const actions = [
    {
      label: t("fab.estimate"),
      icon: FileText,
      run: () => {
        update((s) => (s.estimate.no !== null ? { ...recordEstimate(s), estimate: EMPTY_ESTIMATE } : s));
        navigate("/estimate");
      },
    },
    { label: t("fab.customer"), icon: UserPlus, run: () => navigate("/customers?add=1") },
    { label: t("fab.calculate"), icon: Calculator, run: () => navigate("/") },
  ];

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-gray-900/30" aria-hidden="true" onClick={() => setOpen(false)} /> : null}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col-reverse items-end gap-2">
        <button
          type="button"
          aria-label={t("fab.open")}
          aria-expanded={open}
          aria-controls="quick-actions"
          onClick={() => setOpen((o) => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl active:scale-95"
        >
          <Plus className={`h-7 w-7 transition-transform ${open ? "rotate-45" : ""}`} aria-hidden="true" />
        </button>
        {open ? (
          <ul id="quick-actions" className="flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.label}>
                <button
                  type="button"
                  onClick={() => go(a.run)}
                  className="flex h-12 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-[15px] font-semibold text-purple-900 shadow-lg active:bg-purple-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-800">
                    <a.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};
