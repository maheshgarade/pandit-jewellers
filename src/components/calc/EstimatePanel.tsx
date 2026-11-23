import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EMPTY_ESTIMATE, EstimateState, MakingType, useStore } from "@/lib/store";
import { buildEstimate, drawEstimate, EstimateItem, money, rupees } from "@/lib/receipt";
import { recordEstimate } from "@/lib/customers";
import { computeItem, ItemInput } from "@/lib/items";
import { useLanguage } from "@/context/LanguageContext";
import { ResultActions } from "./ResultActions";
import { Field, inputCls, Modal, primaryBtnCls, resetBtnCls } from "./ui";

type ListKey = "items" | "old";
type Ref = { key: ListKey; index: number };

/**
 * The estimate being built: a compact card per item (edit / delete), the totals, and Print / Share / WhatsApp /
 * Download, each showing the print preview first. The print layout itself is only in that preview.
 */
export const EstimatePanel: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const [confirmNew, setConfirmNew] = useState(false);
  const [editing, setEditing] = useState<Ref | null>(null);
  const [deleting, setDeleting] = useState<Ref | null>(null);
  const e = state.estimate;
  if (!e.items.length && !e.old.length) return null;

  const est = buildEstimate(e, state.roundOff);
  const no = e.no ?? state.billSeq;
  const edit = (fn: (x: EstimateState) => EstimateState) => update((s) => ({ ...s, estimate: fn(s.estimate) }));
  const itemAt = (r: Ref) => e[r.key][r.index];
  const sellMode = e.items.length > 0;

  const card = (it: EstimateItem, key: ListKey, index: number) => {
    const old = key === "old";
    const deducted = old && sellMode;
    return (
      <li key={`${key}-${index}`} className="flex items-center gap-2 rounded-xl border border-purple-200 bg-white py-2 pl-3 pr-1 shadow-sm">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${old ? "bg-amber-100 text-amber-900" : "bg-purple-100 text-purple-800"}`}
          aria-hidden="true"
        >
          {old ? "↺" : index + 1}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold text-gray-900">{it.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
            {it.code ? <span className="shrink-0 rounded border border-gray-400 px-1 text-[11px] font-semibold text-gray-800">{it.code}</span> : null}
            <span className="truncate">
            {[`Net ${it.net.toFixed(3)} g`, it.fine !== undefined ? `Fine ${it.fine.toFixed(3)} g` : "", it.purity ?? "", deducted ? t("estimate.deducted") : ""].filter(Boolean).join(" · ")}
            </span>
          </span>
        </div>
        <span className={`whitespace-nowrap text-[15px] font-bold ${deducted ? "text-amber-800" : "text-purple-900"}`}>
          {deducted ? "− " : ""}₹{money(it.total)}
        </span>
        <span className="flex shrink-0">
          <button type="button" aria-label={`${t("estimate.editItem")} ${it.name}`} onClick={() => setEditing({ key, index })} className="flex h-11 w-10 items-center justify-center text-purple-700">
            <Pencil className="h-[18px] w-[18px]" />
          </button>
          <button type="button" aria-label={`${t("estimate.deleteItem")} ${it.name}`} onClick={() => setDeleting({ key, index })} className="flex h-11 w-10 items-center justify-center text-red-600">
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        </span>
      </li>
    );
  };

  return (
    <section aria-labelledby="estimate-title" className="mt-2 flex flex-col gap-3">
      <h2 id="estimate-title" className="text-base font-bold text-purple-900">
        {sellMode ? `${t("estimate.items")} (${e.items.length})` : `${t("estimate.oldMetal")} (${e.old.length})`}
      </h2>
      <ul className="flex flex-col gap-2">
        {e.items.map((it, i) => card(it, "items", i))}
        {e.old.map((it, i) => card(it, "old", i))}
      </ul>

      <div className="flex flex-col gap-1.5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">
            {t("estimate.itemsTotal")} ({est.items.length})
          </span>
          <span className="font-semibold text-gray-900">₹{money(est.itemsTotal)}</span>
        </div>
        {est.less.map((l) => (
          <div key={l.metal} className="flex justify-between">
            <span className="text-gray-700">{l.label}</span>
            <span className="font-semibold text-amber-800">− ₹{money(l.amount)}</span>
          </div>
        ))}
        {est.roundOff ? (
          <div className="flex justify-between">
            <span className="text-gray-700">{t("calc.roundOff")}</span>
            <span className="text-gray-900">
              {est.roundOff > 0 ? "+" : "−"} ₹{money(Math.abs(est.roundOff))}
            </span>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between rounded-md bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200 p-3 font-bold text-purple-900">
          <span>{est.payLabel === "NET PAYABLE" ? t("estimate.netPayable") : t("calc.amountToPay")}</span>
          <span>{rupees(est.grand)}</span>
        </div>
      </div>

      <ResultActions
        render={(n) => drawEstimate(est, state.shop, state.paper, n, state.layout, state.printShopDetails)}
        shareText={`${state.shop.name} - ${t("estimate.title")} ${no}: ${rupees(est.grand)}`}
        no={e.no}
        // The first print / share numbers the estimate, saves its customer and keeps it in their history.
        onNumbered={(n) => update((s) => recordEstimate({ ...s, estimate: { ...s.estimate, no: n } }))}
      />
      <button type="button" onClick={() => setConfirmNew(true)} className={resetBtnCls}>
        {t("estimate.new")}
      </button>

      {editing ? (
        <ItemEditor
          item={itemAt(editing)}
          onClose={() => setEditing(null)}
          onSave={(it) => {
            edit((x) => ({ ...x, [editing.key]: x[editing.key].map((o, k) => (k === editing.index ? it : o)) }));
            setEditing(null);
          }}
        />
      ) : null}

      {deleting ? (
        <Modal
          title={t("estimate.deleteItem")}
          onClose={() => setDeleting(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  edit((x) => ({ ...x, [deleting.key]: x[deleting.key].filter((_, k) => k !== deleting.index) }));
                  setDeleting(null);
                }}
                className="h-12 rounded-lg bg-rose-600 text-[15px] font-semibold text-white"
              >
                {t("estimate.delete")}
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {t("estimate.deleteConfirm")} <strong>{itemAt(deleting)?.name}</strong> (₹{money(itemAt(deleting)?.total ?? 0)})
          </p>
        </Modal>
      ) : null}

      {confirmNew ? (
        <Modal
          title={t("estimate.new")}
          onClose={() => setConfirmNew(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmNew(false)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // A numbered estimate is kept in the history as it ended, then cleared.
                  update((s) => ({ ...recordEstimate(s), estimate: EMPTY_ESTIMATE }));
                  setConfirmNew(false);
                }}
                className="h-12 rounded-lg bg-rose-600 text-[15px] font-semibold text-white"
              >
                {t("estimate.clear")}
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">{t("estimate.newConfirm")}</p>
        </Modal>
      ) : null}
    </section>
  );
};

const n = (v: string) => {
  const x = parseFloat(v);
  return isNaN(x) || x < 0 ? 0 : x;
};
const s3 = (x?: number) => (x === undefined ? "" : String(Math.round(x * 1000) / 1000));

/** Edit one item: its details filled in; Save works the prices out again. */
const ItemEditor: React.FC<{ item: EstimateItem; onClose: () => void; onSave: (it: EstimateItem) => void }> = ({ item, onClose, onSave }) => {
  const { t } = useLanguage();
  const { state } = useStore();
  const inp = item.input;
  const unit = state.rateUnit;
  const [f, setF] = useState({
    name: item.name,
    code: item.code ?? "",
    gross: s3(inp?.gross),
    less: s3(inp?.less),
    net: s3(item.net),
    rate: inp ? String(Math.round(inp.rate * unit * 100) / 100) : "",
    mkType: (inp?.mkType ?? "percentage") as MakingType,
    mkValue: s3(inp?.mkValue),
    other: s3(inp?.other),
    purity: s3(inp?.purity),
  });
  const set = (k: keyof typeof f, v: string) =>
    setF((o) => {
      const next = { ...o, [k]: v };
      // Net follows Gross − Less while those are edited; it can still be typed.
      if ((k === "gross" || k === "less") && next.gross !== "") next.net = Math.max(0, n(next.gross) - n(next.less)).toFixed(3);
      return next;
    });
  const hasGross = inp?.gross !== undefined;
  const sell = inp?.mode === "sell";
  const goldBuyPurity = inp && !sell && inp.metal === "gold" && inp.purity !== undefined;
  const rateLabel = t(`calc.${inp?.metal === "silver" ? "silverRate" : "goldRate"}${unit === 10 ? "10" : ""}`);

  const save = () => {
    if (!inp) {
      onSave({ ...item, name: f.name.trim() || item.name, code: f.code.trim() || undefined });
      return;
    }
    const next: ItemInput = {
      ...inp,
      name: f.name.trim() || inp.name,
      code: f.code.trim() || undefined,
      ...(hasGross ? { gross: n(f.gross), less: n(f.less) } : {}),
      net: n(f.net),
      rate: n(f.rate) / unit,
      ...(sell ? { mkType: f.mkType, mkValue: n(f.mkValue), other: inp.metal === "gold" ? n(f.other) : 0 } : {}),
      ...(goldBuyPurity ? { purity: n(f.purity), purityLabel: state.purities.find((p) => p.value === n(f.purity))?.label } : {}),
    };
    onSave(computeItem(next));
  };

  const num = (k: keyof typeof f, label: string, cls = "") => (
    <Field id={`ie-${k}`} label={label} className={cls}>
      <input id={`ie-${k}`} type="number" inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} />
    </Field>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-gray-900/45" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t("estimate.editItem")}
        className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-purple-900">{t("estimate.editItem")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field id="ie-name" label={t("calc.itemName")}>
            <input id="ie-name" value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field id="ie-code" label={t("calc.productCode")}>
            <input id="ie-code" value={f.code} autoCapitalize="characters" onChange={(e) => set("code", e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase())} className={inputCls} />
          </Field>
          {inp ? (
            <>
              {hasGross ? (
                <>
                  {num("gross", t("calc.grossWeight"))}
                  {num("less", inp.lessLabel === "Packet Wt" ? t("calc.packetWeight") : t("calc.lessWeight"))}
                </>
              ) : null}
              {num("rate", rateLabel)}
              {num("net", t("calc.netWeight"))}
              {sell ? (
                <>
                  <Field id="ie-mkValue" label={t("calc.making")}>
                    <div className="flex gap-1.5">
                      <select aria-label="Making charges type" value={f.mkType} onChange={(e) => set("mkType", e.target.value)} className="h-11 rounded-md border border-purple-200 bg-white px-0.5 text-sm">
                        <option value="percentage">%</option>
                        <option value="flat">₹</option>
                        <option value="pergram">₹/g</option>
                      </select>
                      <input id="ie-mkValue" type="number" inputMode="decimal" value={f.mkValue} onChange={(e) => set("mkValue", e.target.value)} className={`${inputCls} min-w-0`} />
                    </div>
                  </Field>
                  {inp.metal === "gold" ? num("other", t("calc.otherCharges")) : null}
                </>
              ) : goldBuyPurity ? (
                num("purity", `${t("calc.purity")} %`)
              ) : null}
            </>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            Cancel
          </button>
          <button type="button" onClick={save} className={primaryBtnCls}>
            {t("customers.save")}
          </button>
        </div>
      </section>
    </div>
  );
};
