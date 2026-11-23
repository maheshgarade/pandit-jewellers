import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Field, inputCls, Modal, primaryBtnCls } from "@/components/calc/ui";
import { Customer, SavedCustomer, useStore } from "@/lib/store";
import { estimateFor, upsertCustomer } from "@/lib/customers";
import { useLanguage } from "@/context/LanguageContext";

/** Customers tab: saved customers (also saved when their estimate is printed or shared), search, and Estimate. */
const CustomersPage: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<SavedCustomer | "new" | null>(null);
  const [deleting, setDeleting] = useState<SavedCustomer | null>(null);

  const query = q.trim().toLowerCase();
  const list = state.customers.filter((c) => !query || c.name.toLowerCase().includes(query) || c.number.includes(query) || c.address.toLowerCase().includes(query));

  const startEstimate = (c: SavedCustomer) => {
    update((s) => ({ ...s, estimate: estimateFor(s.estimate, c) }));
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
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-1 rounded-xl border border-purple-200 bg-white py-2 pl-4 pr-1 shadow-sm">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold text-gray-900">{c.name || c.number}</span>
                {c.name && c.number ? (
                  <span className="flex items-center gap-1 text-sm text-gray-700">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {c.number}
                  </span>
                ) : null}
                {c.address ? <span className="truncate text-xs text-gray-600">{c.address}</span> : null}
              </div>
              <button
                type="button"
                onClick={() => startEstimate(c)}
                className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-purple-100 px-3 text-sm font-semibold text-purple-800"
              >
                <FileText className="h-4 w-4" aria-hidden="true" /> {t("menu.estimate")}
              </button>
              <button type="button" aria-label={`${t("customers.edit")} ${c.name || c.number}`} onClick={() => setEditing(c)} className="flex h-11 w-11 shrink-0 items-center justify-center text-purple-700">
                <Pencil className="h-[18px] w-[18px]" />
              </button>
              <button type="button" aria-label={`${t("customers.delete")} ${c.name || c.number}`} onClick={() => setDeleting(c)} className="flex h-11 w-11 shrink-0 items-center justify-center text-red-600">
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </li>
          ))}
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

      {deleting ? (
        <Modal
          title={t("customers.delete")}
          onClose={() => setDeleting(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                Cancel
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
            Cancel
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
            inputMode="tel"
            autoComplete="tel"
            value={c.number}
            onChange={(e) => setC({ ...c, number: e.target.value.replace(/[^0-9+ ]/g, "") })}
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
