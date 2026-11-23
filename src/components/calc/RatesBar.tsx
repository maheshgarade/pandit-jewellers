import React, { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { RateKey, timeText, useStore } from "@/lib/store";
import { useLanguage } from "@/context/LanguageContext";
import { RateDialog } from "./MetalCalculator";

const KEYS: RateKey[] = ["gold-sell", "gold-buy", "silver-sell", "silver-buy"];

/**
 * Today's saved rates (Gold / Silver × Sell / Buy) on the Calculator and Estimate tabs. Tapping one updates it
 * for both tabs, the same as the pencil inside a rate field.
 */
export const RatesBar: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const [editing, setEditing] = useState<RateKey | null>(null);
  const name = (k: RateKey) => {
    const [metal, mode] = k.split("-");
    return `${metal === "gold" ? t("calculators.gold") : t("calculators.silver")} ${mode === "sell" ? t("calc.sell") : t("calc.buy")}`;
  };
  const latest = Math.max(0, ...KEYS.map((k) => state.rates[k].updatedAt ?? 0));

  return (
    <section aria-labelledby="rates-title" className="flex flex-col gap-2 rounded-xl border border-purple-200 bg-white p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="rates-title" className="text-sm font-bold text-purple-900">
          {t("calc.todaysRates")}
        </h2>
        {latest ? <span className="text-xs text-gray-600">{timeText(latest)}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {KEYS.map((k) => {
          const r = state.rates[k].rate;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setEditing(k)}
              aria-label={`${r !== null ? t("calc.update") : t("calc.set")} ${name(k)} rate`}
              className="flex min-h-12 items-center justify-between gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-left"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-gray-700">{name(k)}</span>
                <span className={`text-[15px] font-bold ${r !== null ? "text-purple-900" : "text-gray-500"}`}>
                  {r !== null ? `₹${r.toLocaleString("en-IN")}/g` : t("calc.notSet")}
                </span>
              </span>
              {r !== null ? <Pencil className="h-4 w-4 shrink-0 text-purple-700" /> : <Plus className="h-4 w-4 shrink-0 text-purple-700" />}
            </button>
          );
        })}
      </div>
      {editing ? (
        <RateDialog
          title={`${state.rates[editing].rate !== null ? t("calc.update") : t("calc.set")} ${name(editing)} rate`}
          label={editing.startsWith("gold") ? t("calc.goldRate") : t("calc.silverRate")}
          initial={state.rates[editing].rate}
          updatedAt={state.rates[editing].updatedAt}
          actionLabel={state.rates[editing].rate !== null ? t("calc.update") : t("calc.set")}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            update((s) => ({ ...s, rates: { ...s.rates, [editing]: { rate: v, updatedAt: Date.now() } } }));
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
};
