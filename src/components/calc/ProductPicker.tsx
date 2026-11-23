import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { ProductCategory, searchProducts } from "@/lib/products";
import { useLanguage } from "@/context/LanguageContext";
import { inputCls } from "./ui";

/** Choose an item from the Product master: category cards, then its products; or search them all. */
export const ProductPicker: React.FC<{ onPick: (name: string) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const { t } = useLanguage();
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ProductCategory | null>(null);
  const results = searchProducts(state.products, q);
  const row = "flex min-h-12 w-full items-center gap-2 border-b border-purple-100 px-4 py-1.5 text-left active:bg-purple-50";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-gray-900/45" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={t("products.choose")} className="flex h-[85vh] flex-col rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 px-2 pt-2">
          {cat && !q ? (
            <button type="button" aria-label={t("products.back")} onClick={() => setCat(null)} className="flex h-11 w-11 items-center justify-center text-purple-800">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h2 className="flex-1 truncate px-2 text-lg font-bold text-purple-900">{cat && !q ? cat.name : t("products.choose")}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative px-4 pb-3 pt-1">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <input aria-label={t("products.search")} placeholder={t("products.search")} value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} pl-9`} />
        </div>
        <div className="flex-1 overflow-y-auto border-t border-purple-100 pb-6">
          {q.trim() ? (
            <ul>
              {results.map(({ cat: c, p }) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onPick(p.name)} className={row}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold text-gray-900">{p.name}</span>
                      <span className="truncate text-xs text-gray-600">{c.name}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => onPick(q.trim())} className={`${row} font-semibold text-purple-800`}>
                  {t("products.useText")} “{q.trim()}”
                </button>
              </li>
            </ul>
          ) : cat ? (
            <ul>
              {cat.products.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onPick(p.name)} className={row}>
                    <span className="flex-1 text-[15px] font-semibold text-gray-900">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-2 gap-2 p-4">
              {state.products.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => (c.products.length === 1 ? onPick(c.products[0].name) : setCat(c))}
                    className="flex min-h-20 w-full flex-col justify-between rounded-xl border border-purple-200 bg-gradient-to-br from-white to-purple-50 p-3 text-left shadow-sm active:bg-purple-100"
                  >
                    <span className="text-sm font-bold leading-tight text-purple-900">{c.name}</span>
                    <span className="flex items-center justify-between text-xs text-gray-600">
                      {c.products.length} {c.products.length === 1 ? t("products.product") : t("products.products")}
                      {c.products.length > 1 ? <ChevronRight className="h-4 w-4 text-purple-700" aria-hidden="true" /> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};
