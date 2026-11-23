import React, { useState } from "react";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Quick product pick on the Estimate tab: category cards in one swipeable row; tap one to show its products as
 * chips; one tap on a product fills Item Name. A category with one product fills it straight away.
 */
export const ProductQuickPick: React.FC<{ value: string; onPick: (name: string) => void }> = ({ value, onPick }) => {
  const { t } = useLanguage();
  const { state } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.products.find((c) => c.id === openId);
  if (!state.products.length) return null;

  return (
    <div className="col-span-2 flex flex-col gap-2">
      <span className="text-sm font-medium text-purple-800" id="pq-label">
        {t("products.categories")}
      </span>
      <ul aria-labelledby="pq-label" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {state.products.map((c) => {
          const on = c.id === openId;
          const chosen = c.products.length === 1 && c.products[0].name === value;
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={on || chosen}
                onClick={() => {
                  if (c.products.length === 1) {
                    onPick(c.products[0].name);
                    setOpenId(null);
                  } else setOpenId(on ? null : c.id);
                }}
                className={`flex h-14 w-32 flex-col justify-center rounded-xl border px-2.5 text-left ${
                  on || chosen ? "border-purple-700 bg-purple-700 text-white" : "border-purple-200 bg-white text-purple-900"
                }`}
              >
                <span className="line-clamp-2 text-xs font-bold leading-tight">{c.name}</span>
                {c.products.length > 1 ? <span className={`text-[11px] ${on ? "text-purple-100" : "text-gray-600"}`}>{c.products.length}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <ul aria-label={open.name} className="flex flex-wrap gap-2 rounded-xl border border-purple-200 bg-purple-50 p-2">
          {open.products.map((p) => {
            const on = p.name === value;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onPick(p.name);
                    setOpenId(null);
                  }}
                  className={`flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm font-semibold ${
                    on ? "border-purple-700 bg-purple-700 text-white" : "border-purple-300 bg-white text-purple-900"
                  }`}
                >
                  {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {p.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
