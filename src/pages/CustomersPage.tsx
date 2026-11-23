import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, FileText, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Field, inputCls, Modal, primaryBtnCls } from "@/components/calc/ui";
import { ResultActions } from "@/components/calc/ResultActions";
import { EstimateView } from "@/components/calc/EstimateView";
import { Customer, SavedCustomer, SavedEstimate, useStore } from "@/lib/store";
import { estimateFor, mobileDigits, recordEstimate, searchCustomers, upsertCustomer } from "@/lib/customers";
import { buildEstimate, drawEstimate, rupees } from "@/lib/receipt";
import { useLanguage } from "@/context/LanguageContext";

/** Customers tab: saved customers (also saved when their estimate is printed or shared), search, and Estimate. */
const CustomersPage: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  // "Create customer" from the + button opens the form straight away.
  const [editing, setEditing] = useState<SavedCustomer | "new" | null>(null);
  useEffect(() => {
    if (!params.get("add")) return;
    setEditing("new");
    setParams({}, { replace: true });
  }, [params, setParams]);
  const [deleting, setDeleting] = useState<SavedCustomer | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SavedEstimate | null>(null);

  const list = searchCustomers(state.customers, q);

  const startEstimate = (c: SavedCustomer) => {
    update((s) => ({ ...recordEstimate(s), estimate: estimateFor(s.estimate, c) }));
    navigate("/estimate");
  };

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-purple-900">{t("menu.customers")}</h1>
          <button type="button" onClick={() => setEditing("new")} className="flex h-11 items-center gap-1.5 rounded-lg bg-purple-800 px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" /> {t("customers.add")}
          </button>
        </div>

        {state.customers.length ? (
          <input type="search" aria-label={t("customers.search")} placeholder={t("customers.search")} value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} />
        ) : null}

        <ul className="flex flex-col gap-2">
          {list.map((c) => {
            const history = state.history.filter((h) => h.customerId === c.id);
            const isOpen = open === c.id;
            const who = c.name || c.number;
            return (
              <li key={c.id} className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-sm">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-base font-bold text-purple-800" aria-hidden="true">
                    {(who[0] || "?").toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-gray-900">{who}</span>
                    {c.name && c.number ? (
                      <span className="flex items-center gap-1 text-sm text-gray-700">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {c.number}
                      </span>
                    ) : null}
                    {c.address ? <span className="truncate text-xs text-gray-600">{c.address}</span> : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800">
                    {history.length} {t("customers.est")}
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-purple-700 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {isOpen ? (
                  <div className="border-t border-purple-100">
                    <div className="flex items-center gap-1 px-3 py-2">
                      <button type="button" onClick={() => startEstimate(c)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-800 text-sm font-semibold text-white">
                        <Plus className="h-4 w-4" aria-hidden="true" /> {t("customers.newEstimate")}
                      </button>
                      <button type="button" aria-label={`${t("customers.edit")} ${who}`} onClick={() => setEditing(c)} className="flex h-11 w-11 shrink-0 items-center justify-center text-purple-700">
                        <Pencil className="h-[18px] w-[18px]" />
                      </button>
                      <button type="button" aria-label={`${t("customers.delete")} ${who}`} onClick={() => setDeleting(c)} className="flex h-11 w-11 shrink-0 items-center justify-center text-red-600">
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                    <h3 className="bg-purple-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-purple-900">{t("estimate.estimates")}</h3>
                    {history.length ? (
                      <ul>
                        {history.map((h) => {
                          const count = h.estimate.items.length || h.estimate.old.length;
                          return (
                            <li key={h.no}>
                              <button type="button" onClick={() => setViewing(h)} className="flex min-h-12 w-full items-center gap-3 border-t border-purple-100 px-4 py-1.5 text-left first:border-t-0">
                                <FileText className="h-4 w-4 shrink-0 text-purple-700" aria-hidden="true" />
                                <span className="flex min-w-0 flex-1 flex-col">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {t("estimate.title")} No: {h.no}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {new Date(h.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {count} {h.estimate.items.length ? (count === 1 ? t("customers.item") : t("customers.items")) : t("customers.oldItems")}
                                  </span>
                                </span>
                                <span className="whitespace-nowrap text-sm font-bold text-purple-900">{rupees(h.grand)}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-600">{t("estimate.noEstimates")}</p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {state.customers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-5 text-center text-sm leading-relaxed text-gray-700">{t("customers.emptyHint")}</p>
        ) : list.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-600">{t("customers.none")}</p>
        ) : null}
      </div>

      {editing ? (
        <CustomerForm
          initial={editing === "new" ? { name: "", number: "", address: "" } : editing}
          title={editing === "new" ? t("customers.add") : t("customers.edit")}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            update((s) => ({ ...s, customers: upsertCustomer(s.customers, c, editing === "new" ? undefined : editing.id) }));
            setEditing(null);
            toast.success(t("customers.saved"));
          }}
        />
      ) : null}

      {viewing ? (
        <div role="dialog" aria-modal="true" aria-label={`${t("estimate.title")} No: ${viewing.no}`} className="fixed inset-0 z-50 flex flex-col bg-gray-900/70">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <h2 className="text-[17px] font-bold">
              {t("estimate.title")} No: {viewing.no}
            </h2>
            <button type="button" aria-label={t("common.close")} onClick={() => setViewing(null)} className="flex h-11 w-11 items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <EstimateView est={buildEstimate(viewing.estimate, state.roundOff)} shop={state.shop} no={viewing.no} layout={state.layout} shopDetails={state.printShopDetails} />
          </div>
          <div className="bg-white px-4 pb-5 pt-3">
            <ResultActions
              render={(n) => drawEstimate(buildEstimate(viewing.estimate, state.roundOff), state.shop, state.paper, n, state.layout, state.printShopDetails)}
              shareText={`${state.shop.name} - ${t("estimate.title")} ${viewing.no}: ${rupees(viewing.grand)}`}
              no={viewing.no}
            />
          </div>
        </div>
      ) : null}

      {deleting ? (
        <Modal
          title={t("customers.delete")}
          onClose={() => setDeleting(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  update((s) => ({ ...s, customers: s.customers.filter((x) => x.id !== deleting.id) }));
                  setDeleting(null);
                }}
                className="h-12 rounded-lg bg-rose-600 text-[15px] font-semibold text-white"
              >
                {t("customers.delete")}
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {t("customers.deleteConfirm")} <strong>{deleting.name || deleting.number}</strong>
          </p>
        </Modal>
      ) : null}
    </Layout>
  );
};

const CustomerForm: React.FC<{ initial: Customer; title: string; onClose: () => void; onSave: (c: Customer) => void }> = ({ initial, title, onClose, onSave }) => {
  const { t } = useLanguage();
  const [c, setC] = useState<Customer>({ name: initial.name, number: initial.number, address: initial.address });
  const ok = !!(c.name.trim() || c.number.trim());
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            {t("common.cancel")}
          </button>
          <button type="button" disabled={!ok} onClick={() => onSave(c)} className={`${primaryBtnCls} disabled:opacity-50`}>
            {t("customers.save")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Field id="cf-name" label={t("calc.customerName")}>
          <input id="cf-name" autoFocus autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} className={inputCls} />
        </Field>
        <Field id="cf-num" label={t("calc.customerNumber")}>
          <input
            id="cf-num"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            autoComplete="tel"
            value={c.number}
            onChange={(e) => setC({ ...c, number: mobileDigits(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field id="cf-addr" label={t("calc.customerAddress")}>
          <input id="cf-addr" autoComplete="street-address" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} className={inputCls} />
        </Field>
      </div>
    </Modal>
  );
};

export default CustomersPage;
