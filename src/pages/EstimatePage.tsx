import React, { useState } from "react";
import { Check, Pencil, Search, UserPlus, UserRound, X } from "lucide-react";
import Layout from "@/components/Layout";
import CalculatorsSection from "@/components/CalculatorsSection";
import { EstimatePanel } from "@/components/calc/EstimatePanel";
import { Field, inputCls } from "@/components/calc/ui";
import { Customer, EMPTY_ESTIMATE, useStore } from "@/lib/store";
import { estimateFor, recordEstimate, saveEstimateCustomer, searchCustomers } from "@/lib/customers";
import { useLanguage } from "@/context/LanguageContext";

/** Estimate tab: the customer, items added one by one, and the estimate as it prints. */
export default function EstimatePage() {
  const { t } = useLanguage();
  const { state } = useStore();
  const empty = !state.estimate.items.length && !state.estimate.old.length;

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
        <h1 className="text-xl font-bold text-purple-900">
          {t("estimate.title")}
          {state.estimate.no !== null ? ` No: ${state.estimate.no}` : ""}
        </h1>

        <CustomerBox />

        <section aria-labelledby="est-add" className="flex flex-col gap-3">
          <h2 id="est-add" className="text-base font-bold text-purple-900">
            {t("estimate.addItems")}
          </h2>
          <CalculatorsSection target="estimate" />
        </section>

        {empty ? <p className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-4 text-center text-sm text-gray-700">{t("estimate.emptyHint")}</p> : null}
        <EstimatePanel />
      </div>
    </Layout>
  );
}

const digitsOnly = (s: string) => /^[\d+ ]+$/.test(s.trim());

/**
 * The estimate's customer: search saved customers (dropdown); none found → add them, saved straight away. Once
 * chosen it shows as a small card with Edit and Change.
 */
const CustomerBox: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const c = state.estimate.customer;
  const hasCustomer = !!(c.name.trim() || c.number.trim());
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Customer | null>(null); // adding or editing

  if (form) {
    const ok = !!(form.name.trim() || form.number.trim());
    const set = (k: keyof Customer, v: string) => setForm({ ...form, [k]: v });
    return (
      <section aria-label={t("estimate.customer")} className="flex flex-col gap-4 rounded-xl border border-purple-200 bg-white p-4 shadow-lg">
        <div className="grid grid-cols-2 gap-4">
          <Field id="est-cname" label={t("calc.customerName")}>
            <input id="est-cname" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field id="est-cnum" label={t("calc.customerNumber")}>
            <input id="est-cnum" type="tel" inputMode="tel" autoComplete="tel" value={form.number} onChange={(e) => set("number", e.target.value.replace(/[^0-9+ ]/g, ""))} className={inputCls} />
          </Field>
          <Field id="est-caddr" label={t("calc.customerAddress")} className="col-span-2">
            <input id="est-caddr" autoComplete="street-address" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setForm(null)} className="h-11 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => {
              update((s) => saveEstimateCustomer(s, form));
              setForm(null);
              setQ("");
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-purple-800 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> {t("customers.save")}
          </button>
        </div>
      </section>
    );
  }

  if (hasCustomer) {
    return (
      <section aria-label={t("estimate.customer")} className="flex items-center gap-2 rounded-xl border border-purple-200 bg-white py-2 pl-4 pr-1 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-800">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold text-gray-900">{c.name || c.number}</span>
          {c.name && c.number ? <span className="text-sm text-gray-700">{c.number}</span> : null}
          {c.address ? <span className="truncate text-xs text-gray-600">{c.address}</span> : null}
        </div>
        <button type="button" aria-label={`${t("customers.edit")} ${c.name || c.number}`} onClick={() => setForm({ ...c })} className="flex h-11 w-11 shrink-0 items-center justify-center text-purple-700">
          <Pencil className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label={t("estimate.changeCustomer")}
          onClick={() =>
            update((s) =>
              // A printed / shared estimate stays with its customer (kept in their history); a new one starts.
              s.estimate.no !== null
                ? { ...recordEstimate(s), estimate: EMPTY_ESTIMATE }
                : { ...s, estimate: { ...s.estimate, customer: EMPTY_ESTIMATE.customer, customerId: undefined } }
            )
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-600"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </section>
    );
  }

  const matches = q.trim() ? searchCustomers(state.customers, q).slice(0, 6) : [];
  const startAdd = () => setForm({ name: digitsOnly(q) ? "" : q.trim(), number: digitsOnly(q) ? q.trim() : "", address: "" });
  return (
    <section aria-label={t("estimate.customer")} className="relative flex flex-col gap-1">
      <label htmlFor="est-csearch" className="sr-only">
        {t("estimate.findCustomer")}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <input
          id="est-csearch"
          role="combobox"
          aria-expanded={!!q.trim()}
          aria-controls="est-clist"
          autoComplete="off"
          placeholder={t("estimate.findCustomer")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${inputCls} h-12 pl-9`}
        />
      </div>
      {q.trim() ? (
        <ul id="est-clist" role="listbox" className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-lg">
          {matches.map((m) => (
            <li key={m.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => {
                  update((s) => ({ ...recordEstimate(s), estimate: estimateFor(s.estimate, m) }));
                  setQ("");
                }}
                className="flex min-h-12 w-full flex-col justify-center border-b border-purple-100 px-4 py-1.5 text-left active:bg-purple-50"
              >
                <span className="text-[15px] font-semibold text-gray-900">{m.name || m.number}</span>
                <span className="text-xs text-gray-600">{[m.name ? m.number : "", m.address].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
          {matches.length === 0 ? <li className="px-4 pt-3 text-sm text-gray-600">{t("customers.none")}</li> : null}
          <li>
            <button type="button" onClick={startAdd} className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-[15px] font-semibold text-purple-800">
              <UserPlus className="h-4 w-4" aria-hidden="true" /> {t("estimate.addNewCustomer")} “{q.trim()}”
            </button>
          </li>
        </ul>
      ) : (
        <button type="button" onClick={startAdd} className="flex min-h-11 items-center gap-1.5 self-start px-1 text-sm font-semibold text-purple-700 underline">
          <UserPlus className="h-4 w-4" aria-hidden="true" /> {t("estimate.addNewCustomer")}
        </button>
      )}
    </section>
  );
};
