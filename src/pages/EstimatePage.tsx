import React, { useState } from "react";
import { Check, Pencil, UserRound, Users } from "lucide-react";
import Layout from "@/components/Layout";
import CalculatorsSection from "@/components/CalculatorsSection";
import { EstimatePanel } from "@/components/calc/EstimatePanel";
import { Field, inputCls, Modal } from "@/components/calc/ui";
import { Customer, SavedCustomer, useStore } from "@/lib/store";
import { estimateFor } from "@/lib/customers";
import { useLanguage } from "@/context/LanguageContext";

const cardCls = "flex flex-col gap-4 rounded-xl border border-purple-200 bg-white p-4 shadow-lg";

/** Estimate tab: the customer's details, items added one by one, and the estimate as it prints. */
export default function EstimatePage() {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const [picking, setPicking] = useState(false);
  const c = state.estimate.customer;
  const hasCustomer = !!(c.name.trim() || c.number.trim());
  // Customer details already there (e.g. coming back to the tab): show the small card.
  const [editing, setEditing] = useState(!hasCustomer);
  const empty = !state.estimate.items.length && !state.estimate.old.length;
  const setCustomer = (k: keyof Customer, v: string) =>
    update((s) => ({ ...s, estimate: { ...s.estimate, customer: { ...s.estimate.customer, [k]: v } } }));

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
        <h1 className="text-xl font-bold text-purple-900">
          {t("estimate.title")}
          {state.estimate.no !== null ? ` No: ${state.estimate.no}` : ""}
        </h1>

        {hasCustomer && !editing ? (
          // Filled in: a small card, ✎ to edit.
          <section aria-label={t("estimate.customer")} className="flex items-center gap-3 rounded-xl border border-purple-200 bg-white py-2 pl-4 pr-1 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-800">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold text-gray-900">{c.name || c.number}</span>
              {c.name && c.number ? <span className="text-sm text-gray-700">{c.number}</span> : null}
              {c.address ? <span className="truncate text-xs text-gray-600">{c.address}</span> : null}
            </div>
            <button type="button" aria-label={`${t("customers.edit")} ${c.name || c.number}`} onClick={() => setEditing(true)} className="flex h-11 w-11 shrink-0 items-center justify-center text-purple-700">
              <Pencil className="h-[18px] w-[18px]" />
            </button>
          </section>
        ) : (
        <section aria-label={t("estimate.customer")} className={cardCls}>
          {state.customers.length ? (
            <button type="button" onClick={() => setPicking(true)} className="-mb-2 flex min-h-11 items-center gap-1.5 self-end px-1 text-sm font-semibold text-purple-700 underline">
              <Users className="h-4 w-4" aria-hidden="true" /> {t("estimate.chooseCustomer")}
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field id="est-cname" label={t("calc.customerName")}>
              <input id="est-cname" autoComplete="name" value={c.name} onChange={(e) => setCustomer("name", e.target.value)} className={inputCls} />
            </Field>
            <Field id="est-cnum" label={t("calc.customerNumber")}>
              <input
                id="est-cnum"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={c.number}
                onChange={(e) => setCustomer("number", e.target.value.replace(/[^0-9+ ]/g, ""))}
                className={inputCls}
              />
            </Field>
            <Field id="est-caddr" label={t("calc.customerAddress")} className="col-span-2">
              <input id="est-caddr" autoComplete="street-address" value={c.address} onChange={(e) => setCustomer("address", e.target.value)} className={inputCls} />
            </Field>
          </div>
          {hasCustomer ? (
            <button type="button" onClick={() => setEditing(false)} className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-purple-800 text-[15px] font-semibold text-white">
              <Check className="h-4 w-4" aria-hidden="true" /> {t("estimate.done")}
            </button>
          ) : null}
        </section>
        )}

        <section aria-labelledby="est-add" className="flex flex-col gap-3">
          <h2 id="est-add" className="text-base font-bold text-purple-900">
            {t("estimate.addItems")}
          </h2>
          <CalculatorsSection target="estimate" />
        </section>

        {empty ? <p className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-4 text-center text-sm text-gray-700">{t("estimate.emptyHint")}</p> : null}
        <EstimatePanel />
      </div>

      {picking ? (
        <CustomerPicker
          customers={state.customers}
          onClose={() => setPicking(false)}
          onPick={(p) => {
            update((s) => ({ ...s, estimate: estimateFor(s.estimate, p) }));
            setPicking(false);
            setEditing(false);
          }}
        />
      ) : null}
    </Layout>
  );
}

const CustomerPicker: React.FC<{ customers: SavedCustomer[]; onClose: () => void; onPick: (c: SavedCustomer) => void }> = ({ customers, onClose, onPick }) => {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = customers.filter((c) => !query || c.name.toLowerCase().includes(query) || c.number.includes(query));
  return (
    <Modal title={t("estimate.chooseCustomer")} onClose={onClose}>
      <input aria-label={t("customers.search")} placeholder={t("customers.search")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus className={inputCls} />
      <ul className="-mx-2 max-h-72 overflow-y-auto">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)} className="flex min-h-12 w-full flex-col justify-center rounded-lg px-2 py-1.5 text-left active:bg-purple-50">
              <span className="text-[15px] font-semibold text-gray-900">{c.name || c.number}</span>
              <span className="text-xs text-gray-600">{[c.name ? c.number : "", c.address].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        ))}
        {list.length === 0 ? <li className="px-2 py-3 text-sm text-gray-600">{t("customers.none")}</li> : null}
      </ul>
    </Modal>
  );
};
