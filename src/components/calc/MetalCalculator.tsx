import React, { useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EMPTY_ESTIMATE, EstimateState, formatINR, MakingType, makingText, Metal, Mode, rateKey, timeText, useStore } from "@/lib/store";
import { money, wt, type EstimateItem } from "@/lib/receipt";
import { recordEstimate } from "@/lib/customers";
import { computeItem } from "@/lib/items";
import { ProductPicker } from "./ProductPicker";
import { useLanguage } from "@/context/LanguageContext";
import { Field, inputCls, linkBtnCls, Modal, NumberInput, primaryBtnCls, resetBtnCls } from "./ui";
import { PurityCombo } from "./PurityCombo";

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
};
type ListKey = "items" | "old";
/** The Calculator tab's single result. */
type CalcResult = { it: EstimateItem; key: ListKey; name: string; making: string; rateText: string };
type Row = { label: string; value: string };
const grams = (n: number) => `${wt(n)} g`;
const rupees = (n: number) => `₹ ${formatINR(n)}`;

/**
 * Sell / Buy calculator for one metal. Shared rows sit in the same place in every mode:
 * row 1 = Rate | Net Weight (Net on the right for quick entry), row 2 = mode-specific, then Reset | Calculate.
 * On the Calculator tab, Calculate shows the item with "Add to estimate". On the Estimate tab ("estimate"), the
 * button is "Add item" and adds it straight away. Sell items are the estimate's cards; Buy (old gold / silver) is
 * deducted from them, or printed on its own as a purchase estimate.
 */
export const MetalCalculator: React.FC<{ metal: Metal; target?: "calculator" | "estimate" }> = ({ metal, target = "calculator" }) => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const navigate = useNavigate();
  const onEstimate = target === "estimate";
  const [mode, setMode] = useState<Mode>("sell");
  /** Calculator tab: the calculated item, waiting for "Add to estimate". */
  const [result, setResult] = useState<CalcResult | null>(null);

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
  /** An item waiting for "add it to the estimate already printed, or start a new one?" */
  const [pending, setPending] = useState<{ it: EstimateItem; key: ListKey } | null>(null);
  const [dialog, setDialog] = useState<null | "rate" | "making">(null);
  const [pickingProduct, setPickingProduct] = useState(false);

  const saved = state.rates[rateKey(metal, mode)];
  const savedMaking = state.making[metal];
  const metalName = metal === "gold" ? t("calculators.gold") : t("calculators.silver");
  const per10 = state.rateUnit === 10;
  const rateLabel = t(`calc.${metal === "gold" ? "goldRate" : "silverRate"}${per10 ? "10" : ""}`);

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
  // Net is always its own field: filled in as Gross − Less while those are typed, and can still be edited.
  const net = num(netIn);
  const hasWeight = netIn !== "";
  const fillNet = (g: string, l: string) => setNetIn(g === "" ? "" : wt(Math.max(0, num(g) - (leftOn ? num(l) : 0))));
  const typeGross = (v: string) => {
    setGross(v);
    fillNet(v, less);
  };
  const typeLess = (v: string) => {
    setLess(v);
    fillNet(gross, v);
  };

  const makingOverridden =
    savedMaking.value !== null && ((makingIn !== null && num(makingIn) !== savedMaking.value) || (mTypeIn !== null && mTypeIn !== savedMaking.type));

  const saveRate = (value: number) => {
    update((s) => ({ ...s, rates: { ...s.rates, [rateKey(metal, mode)]: { rate: value, updatedAt: Date.now() } } }));
    setRateIn(null);
  };
  /**
   * The rate field is the saved rate for this metal and mode, shared by the Calculator and Estimate tabs: typing
   * here updates it for both. `rateIn` only keeps the text being typed (e.g. "6850.").
   */
  const typeRate = (v: string) => {
    setRateIn(v);
    const n = parseFloat(v);
    if (v === "" || (!isNaN(n) && n >= 0)) {
      update((s) => ({ ...s, rates: { ...s.rates, [rateKey(metal, mode)]: { rate: v === "" ? null : n, updatedAt: Date.now() } } }));
    }
  };
  const saveMaking = (type: MakingType, value: number) => {
    update((s) => ({ ...s, making: { ...s.making, [metal]: { type, value } } }));
    setMakingIn(null);
    setMTypeIn(null);
  };

  /** Clears the item fields for the next item; rate, making and purity stay. */
  const clearItemFields = () => {
    setNetIn("");
    setGross("");
    setLess("");
    setOther("");
    setItemName("");
    setProductCode("");
  };

  const reset = () => {
    clearItemFields();
    setRateIn(null);
    setMakingIn(null);
    setMTypeIn(null);
    setPurity("91.6");
    setResult(null);
  };

  // Item name and product code: always on the Estimate tab, switched on in Settings for the Calculator.
  const showName = onEstimate || state.details.itemName;
  const showCode = onEstimate || state.details.productCode;

  /** The item in the form, or null when weight or rate is missing. */
  const currentItem = (): EstimateItem | null => {
    if (!hasWeight || rateVal === "") return null;
    const pur = num(purity);
    return computeItem({
      metal,
      mode,
      name: (showName && itemName.trim()) || (mode === "sell" ? `${metalName} ${t("calc.defaultItem")}` : `${t("calc.oldItem")} ${metalName}`),
      code: (showCode && productCode.trim()) || undefined,
      ...(grossOn ? { gross: num(gross), less: leftOn ? num(less) : 0, lessLabel: isSilver ? "Packet Wt" : "Less Wt" } : {}),
      net,
      rate: num(rateVal) / state.rateUnit, // per gram, whatever unit the rate is entered in
      ...(mode === "sell" ? { mkType: mType, mkValue: num(makingVal), other: isSilver ? 0 : num(other) } : {}),
      ...(purityOn ? { purity: pur, purityLabel: state.purities.find((p) => p.value === pur)?.label } : {}),
    });
  };

  const addToEstimate = (it: EstimateItem, key: ListKey, fresh: boolean) => {
    update((s0) => {
      // Starting a new one: the printed estimate goes into the history first. The customer stays.
      const s = fresh ? recordEstimate(s0) : s0;
      const base: EstimateState = fresh ? { ...EMPTY_ESTIMATE, customer: s.estimate.customer, customerId: s.estimate.customerId } : s.estimate;
      return { ...s, estimate: { ...base, [key]: [...base[key], it] } };
    });
    clearItemFields();
    setResult(null);
    const msg = `${it.name}: ₹${money(it.total)} · ${t("calc.itemAdded")}`;
    if (onEstimate) toast.success(msg);
    else toast.success(msg, { action: { label: t("menu.estimate"), onClick: () => navigate("/estimate") } });
  };

  /** Adds to the estimate, first asking when it has already been printed or shared. */
  const add = (it: EstimateItem, key: ListKey) => {
    if (state.estimate.no !== null) setPending({ it, key });
    else addToEstimate(it, key, false);
  };

  const calculate = () => {
    const it = currentItem();
    if (!it) {
      toast.error(t("calc.enterWeightAndRate"));
      return;
    }
    const key: ListKey = mode === "sell" ? "items" : "old";
    if (onEstimate) add(it, key);
    else setResult({ it, key, name: showName ? itemName.trim() : "", making: makingText(mType, num(makingVal)), rateText: `₹ ${rateVal} ${per10 ? "/ 10 g" : "/ g"}` });
  };

  /** The Calculator's result card, as before the Estimate tab: breakdown, then the total (Round off: nearest ₹10). */
  const billRows = (r: CalcResult, metalLabel: string) => {
    const it = r.it;
    const details: Row[] = [
      r.name ? { label: t("calc.itemName"), value: r.name } : null,
      it.code ? { label: t("calc.productCode"), value: it.code } : null,
    ].filter((x): x is Row => x !== null);
    const weights: Row[] = [
      ...(it.gross !== undefined ? [{ label: t("calc.grossWeight"), value: grams(it.gross) }, { label: it.lessLabel === "Packet Wt" ? t("calc.packetWeight") : t("calc.lessWeight"), value: grams(it.less ?? 0) }] : []),
      { label: t("calc.netWeight"), value: grams(it.net) },
    ];
    let rows: Row[];
    if (r.key === "items") {
      const sub = (it.price ?? 0) + (it.making ?? 0) + (it.other ?? 0);
      rows = [
        ...weights,
        { label: `${metalLabel} ${t("calc.price")}`, value: rupees(it.price ?? 0) },
        { label: `${t("calc.making")} (${r.making})`, value: rupees(it.making ?? 0) },
        ...(isSilver ? [] : [{ label: t("calc.otherCharges"), value: rupees(it.other ?? 0) }]),
        { label: t("gold.receipt.subtotal"), value: rupees(sub) },
        { label: t("gold.receipt.gst"), value: rupees(it.gst ?? 0) },
      ];
    } else {
      rows = [
        ...weights,
        ...(it.fine !== undefined
          ? [
              ...(it.purity ? [{ label: t("calc.purity"), value: it.purity }] : []),
              { label: t("calc.fineGold"), value: grams(it.fine) },
              { label: t("calc.eq995"), value: grams(it.eq995 ?? it.fine / 0.995) },
              { label: t("calc.eq999"), value: grams(it.eq999 ?? it.fine / 0.999) },
            ]
          : []),
        { label: rateLabel, value: r.rateText },
      ];
    }
    let total = it.total;
    if (state.roundOff) {
      total = Math.round(it.total / 10) * 10;
      const diff = total - it.total;
      rows.push({ label: t("calc.roundOff"), value: `${diff < 0 ? "−" : "+"} ₹ ${Math.abs(diff).toFixed(2)}` });
    }
    const title = r.key === "items" ? (isSilver ? t("calc.silverEstimate") : t("calc.goldEstimate")) : isSilver ? t("calc.oldSilverTitle") : t("calc.oldGoldTitle");
    return { title, details, rows, totalLabel: r.key === "items" ? t("gold.receipt.total") : t("calc.amountToPay"), total: formatINR(total) };
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setRateIn(null); // each mode shows its own saved rate
    setResult(null);
  };

  const showForm = true;
  const leftLabel = isSilver ? t("calc.packetWeight") : t("calc.lessWeight");
  const netHint = isSilver ? (leftOn ? t("calc.grossMinusPacket") : t("calc.sameAsGross")) : t("calc.grossMinusLess");

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t("calc.mode")} className="grid grid-cols-2 overflow-hidden rounded-full border border-purple-300 bg-white">
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
          {/* Weights in order: Gross, Less, then Net (= Gross − Less, still editable). */}
          {grossOn ? (
            <div className="grid grid-cols-2 gap-4">
              <Field id={`${metal}-gross`} label={t("calc.grossWeight")}>
                <input id={`${metal}-gross`} type="number" inputMode="decimal" placeholder={t("calc.enterWeight")} value={gross} onChange={(e) => typeGross(e.target.value)} className={inputCls} />
              </Field>
              {leftOn ? (
                <Field id={`${metal}-less`} label={leftLabel}>
                  <input id={`${metal}-less`} type="number" inputMode="decimal" placeholder="0" value={less} onChange={(e) => typeLess(e.target.value)} className={inputCls} />
                </Field>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Field id={`${metal}-rate`} label={rateLabel}>
              <NumberInput
                id={`${metal}-rate`}
                placeholder={t("calc.enterRate")}
                value={rateVal}
                onChange={(e) => typeRate(e.target.value)}
                onIcon={() => setDialog("rate")}
                iconSet={saved.rate !== null}
                iconLabel={`${saved.rate !== null ? t("calc.update") : t("calc.set")}: ${rateLabel}`}
              />
            </Field>
            {/* Net on the right, under Less when Gross & Less are on. */}
            <Field id={`${metal}-net`} label={t("calc.netWeight")}>
              <input id={`${metal}-net`} type="number" inputMode="decimal" placeholder={t("calc.enterWeight")} value={netIn} onChange={(e) => setNetIn(e.target.value)} className={inputCls} />
              {grossOn ? <span className="text-xs text-gray-600">{netHint}</span> : null}
            </Field>
          </div>

          {mode === "sell" ? (
            <div className="grid grid-cols-2 gap-4">
              <Field id={`${metal}-making`} label={t("calc.making")}>
                <div className="flex gap-1.5">
                  <select
                    aria-label={t("calc.makingType")}
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
                    iconLabel={`${savedMaking.value !== null ? t("calc.update") : t("calc.set")} ${t("calc.defaultMaking")}`}
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

          {showName || showCode ? (
            <div className="grid grid-cols-2 gap-4 border-t border-purple-100 pt-4">
              {showName ? (
                <Field id={`${metal}-item`} label={t("calc.itemName")}>
                  {/* Type a name, or tap search to pick from the Product master. */}
                  <div className="relative">
                    <input id={`${metal}-item`} value={itemName} onChange={(e) => setItemName(e.target.value)} className={`${inputCls} pr-11`} />
                    <button
                      type="button"
                      aria-label={t("products.choose")}
                      onClick={() => setPickingProduct(true)}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-purple-700"
                    >
                      <Search className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </Field>
              ) : null}
              {showCode ? (
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
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={reset} className={resetBtnCls}>
              {t("gold.reset")}
            </button>
            <button type="button" onClick={calculate} className={`${primaryBtnCls} flex items-center justify-center gap-2`}>
              {onEstimate ? (
                <>
                  <Plus className="h-4 w-4" /> {t("calc.addItem")}
                </>
              ) : (
                <>
                  {t("gold.calculate")} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {result ? <BillCard {...billRows(result, metalName)} /> : null}

      {pending ? (
        <Modal
          title={`${t("estimate.title")} No: ${state.estimate.no}`}
          onClose={() => setPending(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  addToEstimate(pending.it, pending.key, true);
                  setPending(null);
                }}
                className="h-12 rounded-lg border border-purple-300 text-[15px] font-semibold text-purple-800"
              >
                {t("estimate.new")}
              </button>
              <button
                type="button"
                onClick={() => {
                  addToEstimate(pending.it, pending.key, false);
                  setPending(null);
                }}
                className={primaryBtnCls}
              >
                {t("calc.addToIt")}
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">{t("calc.alreadyPrinted")}</p>
        </Modal>
      ) : null}

      {pickingProduct ? (
        <ProductPicker
          onClose={() => setPickingProduct(false)}
          onPick={(name) => {
            setItemName(name);
            setPickingProduct(false);
          }}
        />
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

/** The Calculator's result card (restored from before the Estimate tab). */
const BillCard: React.FC<{ title: string; details: Row[]; rows: Row[]; totalLabel: string; total: string }> = ({ title, details, rows, totalLabel, total }) => (
  <section className="flex flex-col gap-2.5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 px-5 pb-4 pt-3 text-sm shadow-lg">
    <h2 className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-center text-xl font-bold text-transparent">{title}</h2>
    {details.length ? (
      <div className="flex flex-col gap-1 rounded-md bg-white/70 px-3 py-2">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between gap-3">
            <span className="text-gray-600">{d.label}</span>
            <span className="truncate font-medium text-gray-900">{d.value}</span>
          </div>
        ))}
      </div>
    ) : null}
    {rows.map((r) => (
      <div key={r.label} className="flex justify-between gap-3 px-1">
        <span className="text-gray-600">{r.label}</span>
        <span className="whitespace-nowrap text-purple-700">{r.value}</span>
      </div>
    ))}
    <div className="h-0.5 rounded-full bg-gradient-to-r from-purple-200 to-pink-200" />
    <div className="flex justify-between rounded-md bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200 p-3 font-bold text-purple-900">
      <span>{totalLabel}</span>
      <span>₹ {total}</span>
    </div>
  </section>
);

/** Set / update one saved rate. */
export const RateDialog: React.FC<{
  title: string;
  label: string;
  initial: number | null;
  updatedAt: number | null;
  actionLabel: string;
  onClose: () => void;
  onSave: (v: number) => void;
}> = ({ title, label, initial, updatedAt, actionLabel, onClose, onSave }) => {
  const { t } = useLanguage();
  const [v, setV] = useState(initial !== null ? String(initial) : "");
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            {t("common.cancel")}
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
        {updatedAt ? <span className="text-xs text-gray-600">{t("calc.lastUpdated", { time: timeText(updatedAt) })}</span> : null}
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
  const { t } = useLanguage();
  const [ty, setTy] = useState<MakingType>(initialType);
  const [v, setV] = useState(initialValue !== null ? String(initialValue) : "");
  const hint = t("calc.makingHint");
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            {t("common.cancel")}
          </button>
          <button type="button" disabled={v === ""} onClick={() => onSave(ty, num(v))} className={`${primaryBtnCls} disabled:opacity-50`}>
            {actionLabel}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dlg-making" className="text-sm font-medium text-purple-800">
          {t("calc.making")}
        </label>
        <div className="flex gap-2">
          <select aria-label={t("calc.makingType")} value={ty} onChange={(e) => setTy(e.target.value as MakingType)} className="h-12 rounded-lg border border-purple-300 bg-white px-1.5 text-[15px]">
            <option value="percentage">%</option>
            <option value="flat">{t("calc.flat")} ₹</option>
            <option value="pergram">₹ / g</option>
          </select>
          <input id="dlg-making" type="number" inputMode="decimal" autoFocus value={v} onChange={(e) => setV(e.target.value)} className={`${inputCls} h-12 text-lg font-semibold`} />
        </div>
        <span className="text-xs text-gray-500">{hint}</span>
      </div>
    </Modal>
  );
};
