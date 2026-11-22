import React, { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { formatINR, MakingType, makingText, Metal, Mode, rateKey, timeText, useStore } from "@/lib/store";
import type { Bill } from "@/lib/receipt";
import { useLanguage } from "@/context/LanguageContext";
import { Field, inputCls, linkBtnCls, Modal, NumberInput, primaryBtnCls, readOnlyCls, resetBtnCls } from "./ui";
import { PurityCombo } from "./PurityCombo";
import { ResultActions } from "./ResultActions";

const GST_RATE = 3;
const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
};
const grams = (n: number) => `${n.toFixed(3)} g`;
const rupees = (n: number) => `₹ ${formatINR(n)}`;

/**
 * Sell / Buy calculator for one metal. Shared rows sit in the same place in every mode:
 * row 1 = Rate | Net Weight (Net on the right for quick entry), row 2 = mode-specific, then Reset | Calculate.
 */
export const MetalCalculator: React.FC<{ metal: Metal }> = ({ metal }) => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const [mode, setMode] = useState<Mode>("sell");

  // Inputs. `null` overrides mean "use the saved value".
  const [netIn, setNetIn] = useState("");
  const [gross, setGross] = useState("");
  const [less, setLess] = useState(""); // Less (gold) or Packet (silver) weight
  const [rateIn, setRateIn] = useState<string | null>(null);
  const [makingIn, setMakingIn] = useState<string | null>(null);
  const [mTypeIn, setMTypeIn] = useState<MakingType | null>(null);
  const [other, setOther] = useState("");
  const [purity, setPurity] = useState("91.6");
  const [itemName, setItemName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [bill, setBill] = useState<Bill | null>(null);
  const [dialog, setDialog] = useState<null | "rate" | "making">(null);

  const saved = state.rates[rateKey(metal, mode)];
  const savedMaking = state.making[metal];
  const metalName = metal === "gold" ? t("calculators.gold") : t("calculators.silver");
  const rateLabel = metal === "gold" ? t("calc.goldRate") : t("calc.silverRate");

  // Which optional fields are on (Settings, per metal and mode).
  const isSilver = metal === "silver";
  const goldCfg = mode === "sell" ? state.fields["gold-sell"] : state.fields["gold-buy"];
  const silverCfg = state.fields["silver-sell"];
  const grossOn = isSilver ? mode === "sell" && silverCfg.gross : goldCfg.grossLess;
  const leftOn = isSilver ? silverCfg.packet : goldCfg.grossLess;
  const purityOn = !isSilver && mode === "buy" && state.fields["gold-buy"].purity;

  const rateVal = rateIn ?? (saved.rate !== null ? String(saved.rate) : "");
  const mType = mTypeIn ?? savedMaking.type;
  const makingVal = makingIn ?? (savedMaking.value !== null ? String(savedMaking.value) : "");
  const net = grossOn ? Math.max(0, num(gross) - (leftOn ? num(less) : 0)) : num(netIn);
  const hasWeight = grossOn ? gross !== "" : netIn !== "";

  const rateOverridden = rateIn !== null && rateIn !== "" && num(rateIn) !== saved.rate;
  const makingOverridden =
    savedMaking.value !== null && ((makingIn !== null && num(makingIn) !== savedMaking.value) || (mTypeIn !== null && mTypeIn !== savedMaking.type));

  const saveRate = (value: number) => {
    update((s) => ({ ...s, rates: { ...s.rates, [rateKey(metal, mode)]: { rate: value, updatedAt: Date.now() } } }));
    setRateIn(null);
  };
  const saveMaking = (type: MakingType, value: number) => {
    update((s) => ({ ...s, making: { ...s.making, [metal]: { type, value } } }));
    setMakingIn(null);
    setMTypeIn(null);
  };

  const reset = () => {
    setNetIn("");
    setGross("");
    setLess("");
    setRateIn(null);
    setMakingIn(null);
    setMTypeIn(null);
    setOther("");
    setPurity("91.6");
    setItemName("");
    setProductCode("");
    setCustomerName("");
    setCustomerNumber("");
    setBill(null);
  };

  const det = state.details;
  const anyDetail = det.itemName || det.productCode || det.customerName || det.customerNumber;
  const detailRows = () =>
    [
      det.customerName && customerName.trim() ? { label: t("calc.customerName"), value: customerName.trim() } : null,
      det.customerNumber && customerNumber.trim() ? { label: t("calc.customerNumber"), value: customerNumber.trim() } : null,
      det.itemName && itemName.trim() ? { label: t("calc.itemName"), value: itemName.trim() } : null,
      det.productCode && productCode.trim() ? { label: t("calc.productCode"), value: productCode.trim() } : null,
    ].filter((r): r is { label: string; value: string } => r !== null);

  /** With Round off on: nearest ₹10, and the difference shown as its own row. */
  const finish = (amount: number) => {
    if (!state.roundOff) return { rows: [], total: formatINR(amount) };
    const rounded = Math.round(amount / 10) * 10;
    const diff = rounded - amount;
    return {
      rows: [{ label: t("calc.roundOff"), value: `${diff < 0 ? "−" : "+"} ₹ ${Math.abs(diff).toFixed(2)}` }],
      total: formatINR(rounded),
    };
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setRateIn(null); // each mode shows its own saved rate
    setBill(null);
  };

  const calculate = () => {
    if (!hasWeight || rateVal === "") return;
    const rate = num(rateVal);
    if (mode === "sell") {
      const price = net * rate;
      const mv = num(makingVal);
      const making = mType === "percentage" ? (price * mv) / 100 : mType === "pergram" ? net * mv : mv;
      const oth = isSilver ? 0 : num(other);
      const subtotal = price + making + oth;
      const gst = (subtotal * GST_RATE) / 100;
      const end = finish(subtotal + gst);
      setBill({
        title: isSilver ? t("calc.silverEstimate") : t("calc.goldEstimate"),
        details: detailRows(),
        rows: [
          { label: `${t("calc.netWeight")}`, value: grams(net) },
          { label: `${metalName} ${t("calc.price")}`, value: rupees(price) },
          { label: `${t("calc.making")} (${makingText(mType, mv)})`, value: rupees(making) },
          ...(isSilver ? [] : [{ label: t("calc.otherCharges"), value: rupees(oth) }]),
          { label: t("gold.receipt.subtotal"), value: rupees(subtotal) },
          { label: t("gold.receipt.gst"), value: rupees(gst) },
          ...end.rows,
        ],
        totalLabel: t("gold.receipt.total"),
        total: end.total,
      });
    } else {
      // Old gold bought from a customer. The rate is the 24K rate per gram.
      const pur = purityOn ? num(purity) : 100;
      const fine = (net * pur) / 100;
      const match = state.purities.find((p) => p.value === pur);
      const end = finish(fine * rate);
      setBill({
        title: t("calc.oldGoldTitle"),
        details: detailRows(),
        rows: [
          { label: t("calc.netWeight"), value: grams(net) },
          { label: t("calc.purity"), value: `${match?.label ? match.label + " - " : ""}${pur}%` },
          { label: t("calc.fineGold"), value: grams(fine) },
          { label: t("calc.eq995"), value: grams(fine / 0.995) },
          { label: t("calc.eq999"), value: grams(fine / 0.999) },
          { label: rateLabel, value: rupees(rate) },
          ...end.rows,
        ],
        totalLabel: t("calc.amountToPay"),
        total: end.total,
      });
    }
  };

  const showForm = !(isSilver && mode === "buy");
  const leftLabel = isSilver ? t("calc.packetWeight") : t("calc.lessWeight");
  const netHint = isSilver ? (leftOn ? t("calc.grossMinusPacket") : t("calc.sameAsGross")) : t("calc.grossMinusLess");

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Mode" className="grid grid-cols-2 overflow-hidden rounded-full border border-purple-300 bg-white">
        {(["sell", "buy"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => switchMode(m)}
            className={`h-11 text-[15px] font-semibold ${mode === m ? "bg-purple-800 text-white" : "text-purple-800"}`}
          >
            {m === "sell" ? t("calc.sell") : t("calc.buy")}
          </button>
        ))}
      </div>

      {!showForm ? (
        <section className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-6 text-center">
          <h2 className="text-lg font-bold text-purple-800">
            {metalName} · {t("calc.buy")}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{t("calc.comingSoon")}</p>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-xl border border-purple-200 bg-gradient-to-br from-white to-purple-50 p-4 shadow-lg">
          {grossOn ? (
            <div className="grid grid-cols-2 gap-4">
              {leftOn ? (
                <Field id={`${metal}-less`} label={leftLabel}>
                  <input id={`${metal}-less`} type="number" inputMode="decimal" placeholder="0" value={less} onChange={(e) => setLess(e.target.value)} className={inputCls} />
                </Field>
              ) : (
                <div />
              )}
              <Field id={`${metal}-gross`} label={t("calc.grossWeight")}>
                <input id={`${metal}-gross`} type="number" inputMode="decimal" placeholder={t("calc.enterWeight")} value={gross} onChange={(e) => setGross(e.target.value)} className={inputCls} />
              </Field>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Field id={`${metal}-rate`} label={rateLabel}>
              <NumberInput
                id={`${metal}-rate`}
                placeholder={t("calc.enterRate")}
                value={rateVal}
                onChange={(e) => setRateIn(e.target.value)}
                onIcon={() => setDialog("rate")}
                iconSet={saved.rate !== null}
                iconLabel={`${saved.rate !== null ? "Edit" : "Set"} ${metal} ${mode} rate`}
              />
              {rateOverridden ? (
                <button type="button" className={linkBtnCls} onClick={() => saveRate(num(rateIn!))}>
                  {t("calc.saveAsTodayRate")}
                </button>
              ) : null}
            </Field>
            <Field id={`${metal}-net`} label={t("calc.netWeight")}>
              {grossOn ? (
                <>
                  <input id={`${metal}-net`} readOnly value={gross === "" ? "" : net.toFixed(3)} className={readOnlyCls} />
                  <span className="text-xs text-gray-500">{netHint}</span>
                </>
              ) : (
                <input id={`${metal}-net`} type="number" inputMode="decimal" placeholder={t("calc.enterWeight")} value={netIn} onChange={(e) => setNetIn(e.target.value)} className={inputCls} />
              )}
            </Field>
          </div>

          {mode === "sell" ? (
            <div className="grid grid-cols-2 gap-4">
              <Field id={`${metal}-making`} label={t("calc.making")}>
                <div className="flex gap-1.5">
                  <select
                    aria-label="Making charges type"
                    value={mType}
                    onChange={(e) => setMTypeIn(e.target.value as MakingType)}
                    className="h-11 rounded-md border border-purple-200 bg-white px-0.5 text-sm"
                  >
                    <option value="percentage">%</option>
                    <option value="flat">₹</option>
                    <option value="pergram">₹/g</option>
                  </select>
                  <NumberInput
                    id={`${metal}-making`}
                    placeholder="0"
                    value={makingVal}
                    onChange={(e) => setMakingIn(e.target.value)}
                    onIcon={() => setDialog("making")}
                    iconSet={savedMaking.value !== null}
                    iconLabel={savedMaking.value !== null ? "Edit default making charges" : "Set default making charges"}
                  />
                </div>
                {makingOverridden ? (
                  <button
                    type="button"
                    className={linkBtnCls}
                    onClick={() => {
                      setMakingIn(null);
                      setMTypeIn(null);
                    }}
                  >
                    {t("calc.useDefault")} ({makingText(savedMaking.type, savedMaking.value!)})
                  </button>
                ) : null}
              </Field>
              {!isSilver ? (
                <Field id={`${metal}-other`} label={t("calc.otherCharges")}>
                  <input id={`${metal}-other`} type="number" inputMode="decimal" placeholder="0" value={other} onChange={(e) => setOther(e.target.value)} className={inputCls} />
                </Field>
              ) : null}
            </div>
          ) : purityOn ? (
            <div className="grid grid-cols-2 gap-4">
              <Field id={`${metal}-purity`} label={t("calc.purity")}>
                <PurityCombo id={`${metal}-purity`} value={purity} onChange={setPurity} />
              </Field>
            </div>
          ) : null}

          {anyDetail ? (
            <div className="grid grid-cols-2 gap-4 border-t border-purple-100 pt-4">
              {det.itemName ? (
                <Field id={`${metal}-item`} label={t("calc.itemName")}>
                  <input id={`${metal}-item`} value={itemName} onChange={(e) => setItemName(e.target.value)} className={inputCls} />
                </Field>
              ) : null}
              {det.productCode ? (
                <Field id={`${metal}-code`} label={t("calc.productCode")}>
                  <input
                    id={`${metal}-code`}
                    value={productCode}
                    autoCapitalize="characters"
                    onChange={(e) => setProductCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase())}
                    className={inputCls}
                  />
                </Field>
              ) : null}
              {det.customerName ? (
                <Field id={`${metal}-cname`} label={t("calc.customerName")}>
                  <input id={`${metal}-cname`} autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} />
                </Field>
              ) : null}
              {det.customerNumber ? (
                <Field id={`${metal}-cnum`} label={t("calc.customerNumber")}>
                  <input
                    id={`${metal}-cnum`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value.replace(/[^0-9+ ]/g, ""))}
                    className={inputCls}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={reset} className={resetBtnCls}>
              {t("gold.reset")}
            </button>
            <button type="button" onClick={calculate} className={`${primaryBtnCls} flex items-center justify-center gap-2`}>
              {t("gold.calculate")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {bill && showForm ? (
        <>
          <BillCard bill={bill} />
          <ResultActions bill={bill} />
        </>
      ) : null}

      {dialog === "rate" ? (
        <RateDialog
          title={`${saved.rate !== null ? t("calc.update") : t("calc.set")} ${metalName} ${mode === "sell" ? t("calc.sell") : t("calc.buy")} rate`}
          label={rateLabel}
          initial={saved.rate}
          updatedAt={saved.updatedAt}
          actionLabel={saved.rate !== null ? t("calc.update") : t("calc.set")}
          onClose={() => setDialog(null)}
          onSave={(v) => {
            saveRate(v);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "making" ? (
        <MakingDialog
          title={`${savedMaking.value !== null ? t("calc.update") : t("calc.set")} ${t("calc.defaultMaking")}`}
          initialType={savedMaking.type}
          initialValue={savedMaking.value}
          actionLabel={savedMaking.value !== null ? t("calc.update") : t("calc.set")}
          onClose={() => setDialog(null)}
          onSave={(ty, v) => {
            saveMaking(ty, v);
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
};

const BillCard: React.FC<{ bill: Bill }> = ({ bill }) => (
  <section className="flex flex-col gap-2.5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 px-5 pb-4 pt-3 text-sm shadow-lg">
    <h2 className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-center text-xl font-bold text-transparent">{bill.title}</h2>
    {bill.details?.length ? (
      <div className="flex flex-col gap-1 rounded-md bg-white/70 px-3 py-2">
        {bill.details.map((d) => (
          <div key={d.label} className="flex justify-between gap-3">
            <span className="text-gray-600">{d.label}</span>
            <span className="truncate font-medium text-gray-900">{d.value}</span>
          </div>
        ))}
      </div>
    ) : null}
    {bill.rows.map((r) => (
      <div key={r.label} className="flex justify-between gap-3 px-1">
        <span className="text-gray-600">{r.label}</span>
        <span className="whitespace-nowrap text-purple-700">{r.value}</span>
      </div>
    ))}
    <div className="h-0.5 rounded-full bg-gradient-to-r from-purple-200 to-pink-200" />
    <div className="flex justify-between rounded-md bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200 p-3 font-bold text-purple-900">
      <span>{bill.totalLabel}</span>
      <span>₹ {bill.total}</span>
    </div>
  </section>
);

const RateDialog: React.FC<{
  title: string;
  label: string;
  initial: number | null;
  updatedAt: number | null;
  actionLabel: string;
  onClose: () => void;
  onSave: (v: number) => void;
}> = ({ title, label, initial, updatedAt, actionLabel, onClose, onSave }) => {
  const [v, setV] = useState(initial !== null ? String(initial) : "");
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            Cancel
          </button>
          <button type="button" disabled={v === ""} onClick={() => onSave(num(v))} className={`${primaryBtnCls} disabled:opacity-50`}>
            {actionLabel}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dlg-rate" className="text-sm font-medium text-purple-800">
          {label}
        </label>
        <input id="dlg-rate" type="number" inputMode="decimal" autoFocus value={v} onChange={(e) => setV(e.target.value)} className={`${inputCls} h-12 text-lg font-semibold`} />
        {updatedAt ? <span className="text-xs text-gray-500">Last updated {timeText(updatedAt)}</span> : null}
      </div>
    </Modal>
  );
};

const MakingDialog: React.FC<{
  title: string;
  initialType: MakingType;
  initialValue: number | null;
  actionLabel: string;
  onClose: () => void;
  onSave: (t: MakingType, v: number) => void;
}> = ({ title, initialType, initialValue, actionLabel, onClose, onSave }) => {
  const [ty, setTy] = useState<MakingType>(initialType);
  const [v, setV] = useState(initialValue !== null ? String(initialValue) : "");
  const hint = useMemo(() => "Used for every Sell bill. You can still change it on a single bill.", []);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            Cancel
          </button>
          <button type="button" disabled={v === ""} onClick={() => onSave(ty, num(v))} className={`${primaryBtnCls} disabled:opacity-50`}>
            {actionLabel}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dlg-making" className="text-sm font-medium text-purple-800">
          Making Charges
        </label>
        <div className="flex gap-2">
          <select aria-label="Making charges type" value={ty} onChange={(e) => setTy(e.target.value as MakingType)} className="h-12 rounded-lg border border-purple-300 bg-white px-1.5 text-[15px]">
            <option value="percentage">%</option>
            <option value="flat">Flat ₹</option>
            <option value="pergram">₹ / g</option>
          </select>
          <input id="dlg-making" type="number" inputMode="decimal" autoFocus value={v} onChange={(e) => setV(e.target.value)} className={`${inputCls} h-12 text-lg font-semibold`} />
        </div>
        <span className="text-xs text-gray-500">{hint}</span>
      </div>
    </Modal>
  );
};
