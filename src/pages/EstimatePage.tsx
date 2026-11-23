import React, { useEffect, useState } from "react";
import { Pencil, UserRound, X } from "lucide-react";
import Layout from "@/components/Layout";
import CalculatorsSection from "@/components/CalculatorsSection";
import { EstimatePanel } from "@/components/calc/EstimatePanel";
import { Field, inputCls } from "@/components/calc/ui";
import { Customer, EMPTY_ESTIMATE, SavedCustomer, useStore } from "@/lib/store";
import { estimateFor, mobileDigits, recordEstimate, saveEstimateCustomer, searchCustomers } from "@/lib/customers";
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

/**
 * The estimate's customer. Name and Mobile search the saved customers as you type: pick one to fill everything,
 * or just keep typing (a new customer, saved once the first item is added). Then it shows as a small card.
 */
const CustomerBox: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const c = state.estimate.customer;
  const hasCustomer = !!(c.name.trim() || c.number.trim());
  const hasItems = state.estimate.items.length + state.estimate.old.length > 0;
  const [editing, setEditing] = useState(!hasCustomer || !hasItems);
  const [focus, setFocus] = useState<"name" | "number" | null>(null);

  // The first item added: save the customer (first time: added to Customers) and fold the fields into the card.
  useEffect(() => {
    if (hasItems && hasCustomer && editing && focus === null) {
      update((s) => saveEstimateCustomer(s));
      setEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasItems]);

  // Editing keeps the link to a picked customer (their record is updated); clearing name and mobile drops it.
  const setField = (k: keyof Customer, v: string) =>
    update((s) => {
      const customer = { ...s.estimate.customer, [k]: v };
      const keep = customer.name.trim() || customer.number.trim();
      return { ...s, estimate: { ...s.estimate, customer, customerId: keep ? s.estimate.customerId : undefined } };
    });
  const pick = (m: SavedCustomer) => {
    update((s) => ({ ...recordEstimate(s), estimate: estimateFor(s.estimate, m) }));
    setFocus(null);
    setEditing(false);
  };

  if (hasCustomer && !editing) {
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
        <button type="button" aria-label={`${t("customers.edit")} ${c.name || c.number}`} onClick={() => setEditing(true)} className="flex h-11 w-11 shrink-0 items-center justify-center text-purple-700">
          <Pencil className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label={t("estimate.changeCustomer")}
          onClick={() => {
            update((s) =>
              // A printed / shared estimate stays with its customer (kept in their history); a new one starts.
              s.estimate.no !== null
                ? { ...recordEstimate(s), estimate: EMPTY_ESTIMATE }
                : { ...s, estimate: { ...s.estimate, customer: EMPTY_ESTIMATE.customer, customerId: undefined } }
            );
            setEditing(true);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-600"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </section>
    );
  }

  const query = focus === "name" ? c.name : focus === "number" ? c.number : "";
  const matches = query.trim() && !state.estimate.customerId ? searchCustomers(state.customers, query).slice(0, 5) : [];
  const suggestions = matches.length ? (
    <ul role="listbox" aria-label={t("estimate.savedCustomers")} className="col-span-2 -mt-2 overflow-hidden rounded-xl border border-purple-200 bg-white shadow-lg">
      {matches.map((m) => (
        <li key={m.id} role="option" aria-selected="false">
          {/* onMouseDown so the pick lands before the field loses focus. */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pick(m);
            }}
            onClick={() => pick(m)}
            className="flex min-h-12 w-full flex-col justify-center border-b border-purple-100 px-4 py-1.5 text-left last:border-b-0 active:bg-purple-50"
          >
            <span className="text-[15px] font-semibold text-gray-900">{m.name || m.number}</span>
            <span className="text-xs text-gray-600">{[m.name ? m.number : "", m.address].filter(Boolean).join(" · ")}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <section aria-label={t("estimate.customer")} className="grid grid-cols-2 gap-4 rounded-xl border border-purple-200 bg-white p-4 shadow-lg">
      <Field id="est-cname" label={t("calc.customerName")}>
        <input
          id="est-cname"
          role="combobox"
          aria-expanded={focus === "name" && matches.length > 0}
          autoComplete="off"
          placeholder={t("estimate.searchOrType")}
          value={c.name}
          onFocus={() => setFocus("name")}
          onBlur={() => setFocus(null)}
          onChange={(e) => setField("name", e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field id="est-cnum" label={t("calc.customerNumber")}>
        <input
          id="est-cnum"
          role="combobox"
          aria-expanded={focus === "number" && matches.length > 0}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          autoComplete="off"
          placeholder={t("estimate.searchOrType")}
          value={c.number}
          onFocus={() => setFocus("number")}
          onBlur={() => setFocus(null)}
          onChange={(e) => setField("number", mobileDigits(e.target.value))}
          className={inputCls}
        />
      </Field>
      {suggestions}
      <Field id="est-caddr" label={t("calc.customerAddress")} className="col-span-2">
        <input id="est-caddr" autoComplete="street-address" value={c.address} onChange={(e) => setField("address", e.target.value)} className={inputCls} />
      </Field>
      {hasCustomer && hasItems ? (
        <button
          type="button"
          onClick={() => {
            update((s) => saveEstimateCustomer(s));
            setEditing(false);
          }}
          className="col-span-2 h-11 rounded-lg bg-purple-800 text-[15px] font-semibold text-white"
        >
          {t("estimate.done")}
        </button>
      ) : null}
    </section>
  );
};
