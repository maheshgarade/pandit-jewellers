import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, ChevronDown, Lock, ChevronRight, FileText, Gem, IndianRupee, Package, Printer as PrinterIcon, Store, UserRound, X } from "lucide-react";
import { ProductMaster } from "@/components/ProductMaster";
import { ShopLockSettings } from "@/components/ShopLockSettings";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { inputCls, Switch } from "@/components/calc/ui";
import { DetailFields, EstimateState, FieldSettings, purityLabel, ShopDetails, useStore } from "@/lib/store";
import { buildEstimate, drawEstimate } from "@/lib/receipt";
import { useLanguage } from "@/context/LanguageContext";

/** One expandable group of settings. Collapsed, it shows a one-line summary of what is set. */
const Section: React.FC<{
  id: string;
  title: string;
  summary: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ id, title, summary, icon: Icon, open, onToggle, children }) => (
  <section className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-sm">
    <h2>
      <button type="button" aria-expanded={open} aria-controls={`set-${id}`} onClick={onToggle} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold text-gray-900">{title}</span>
          <span className="truncate text-xs text-gray-600">{summary}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-purple-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    </h2>
    {open ? (
      <div id={`set-${id}`} className="border-t border-purple-100">
        {children}
      </div>
    ) : null}
  </section>
);

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900 first:border-t-0">{children}</h3>
);
const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="px-4 pb-2 pt-3 text-xs leading-relaxed text-gray-600">{children}</p>;

/** Two big choices side by side (paper size, layout, rate unit). */
function Choice<T extends string | number>({ label, value, options, onPick }: { label: string; value: T; options: { value: T; title: string; hint: string }[]; onPick: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 px-4 py-3">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onPick(o.value)}
          className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-2 text-center ${value === o.value ? "border-purple-700 bg-purple-50" : "border-gray-200"}`}
        >
          <span className="text-[15px] font-semibold text-gray-900">{o.title}</span>
          <span className="text-xs text-gray-600">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** Shop fields; their label and placeholder texts are settings.shop.<key> and settings.shop.<key>Ph. */
const SHOP_FIELDS: (keyof ShopDetails)[] = ["name", "address", "phone", "gstin", "other", "footer"];

/** A made-up estimate for the Settings preview. */
const SAMPLE: EstimateState = {
  items: [
    { metal: "gold", name: "Gold Ring", code: "PJ-0142", gross: 8.45, less: 0.33, lessLabel: "Less Wt", net: 8.12, price: 55622, making: 3654, gst: 1778.28, total: 61054.28 },
    { metal: "silver", name: "Silver Anklet", net: 42.3, price: 3891.6, making: 634.5, gst: 135.78, total: 4661.88 },
  ],
  old: [{ metal: "gold", name: "Old Gold", net: 6, fine: 5.496, total: 41110.08 }],
  customer: { name: "Customer name", number: "98XXXXXX21", address: "" },
  no: null,
};


export default function SettingsPage() {
  const { state, update } = useStore();
  const { t } = useLanguage();
  const onOff = (b: boolean) => (b ? t("settings.on") : t("settings.off"));
  const [open, setOpen] = useState<string | null>(null);
  const [newVal, setNewVal] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  const setField = <K extends keyof FieldSettings>(key: K, field: keyof FieldSettings[K]) =>
    update((s) => ({ ...s, fields: { ...s.fields, [key]: { ...s.fields[key], [field]: !s.fields[key][field] } } }));
  const setDetail = (k: keyof DetailFields) => update((s) => ({ ...s, details: { ...s.details, [k]: !s.details[k] } }));
  const setShop = (key: keyof ShopDetails, value: string) => update((s) => ({ ...s, shop: { ...s.shop, [key]: value } }));

  const setRateUnit = (u: 1 | 10) =>
    update((s) => {
      if (s.rateUnit === u) return s;
      const k = u / s.rateUnit; // 10 or 0.1: saved rates keep the same price
      const rates = Object.fromEntries(
        Object.entries(s.rates).map(([key, r]) => [key, { ...r, rate: r.rate === null ? null : Math.round(r.rate * k * 100) / 100 }])
      ) as typeof s.rates;
      return { ...s, rateUnit: u, rates };
    });

  const addPurity = () => {
    const v = parseFloat(newVal);
    if (isNaN(v) || v <= 0 || v > 100) {
      toast.error(t("settings.purityRange"));
      return;
    }
    if (state.purities.some((p) => p.value === v)) {
      toast.error(t("settings.purityExists", { v }));
      return;
    }
    // Custom purities have no karat: they show as the percentage only (e.g. 98.5%).
    update((s) => ({ ...s, purities: [...s.purities, { value: v, label: "", custom: true }] }));
    setNewVal("");
    toast.success(t("settings.purityAdded", { v }));
  };

  const showPreview = async () => {
    const est = buildEstimate({ ...SAMPLE, salesman: state.salesman }, state.roundOff);
    const c = await drawEstimate(est, state.shop, state.paper, state.billSeq, state.layout, state.printShopDetails);
    setPreview(c.toDataURL("image/png"));
  };

  const f = state.fields;
  const paper = state.paper === 58 ? t("settings.inch2") : t("settings.inch3");
  const fieldsOn = [
    f["gold-sell"].grossLess && t("settings.sumGoldSellGross"),
    f["gold-buy"].grossLess && t("settings.sumGoldBuyGross"),
    f["gold-buy"].purity && t("calc.purity"),
    f["gold-buy"].equivalent && t("settings.equivalent"),
    f["silver-sell"].gross && t("settings.sumSilverGross"),
    state.details.itemName && t("calc.itemName"),
    state.details.productCode && t("calc.productCode"),
  ].filter(Boolean);

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
        <h1 className="text-xl font-bold text-purple-900">{t("settings.title")}</h1>

        <Section id="lock" icon={Lock} title={t("lock.section")} summary={t("lock.sectionSum")} open={open === "lock"} onToggle={() => toggle("lock")}>
          <ShopLockSettings />
        </Section>

        <Section id="profile" icon={UserRound} title={t("settings.profile")} summary={state.salesman ? `${t("print.salesman")}: ${state.salesman}` : t("settings.addName")} open={open === "profile"} onToggle={() => toggle("profile")}>
          <Hint>{t("settings.profileHint")}</Hint>
          <div className="flex flex-col gap-1 px-4 pb-4">
            <label htmlFor="profile-name" className="text-[13px] font-medium text-purple-800">
              {t("settings.yourName")}
            </label>
            <input id="profile-name" autoComplete="name" value={state.salesman} placeholder={t("settings.yourNamePh")} onChange={(e) => update((s) => ({ ...s, salesman: e.target.value }))} className={inputCls} />
          </div>
          <Switch on={state.quickActions} onToggle={() => update((s) => ({ ...s, quickActions: !s.quickActions }))} label={t("fab.setting")} hint={t("fab.settingHint")} />
        </Section>

        <Section id="printer" icon={PrinterIcon} title={t("settings.printer")} summary={`${state.printer?.name ?? t("settings.noPrinter")} · ${paper}`} open={open === "printer"} onToggle={() => toggle("printer")}>
          <Link to="/settings/printer" className="flex min-h-16 items-center gap-3 px-4 py-2">
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] text-gray-900">{state.printer?.name ?? t("print.noPrinter")}</span>
              <span className="text-xs text-gray-600">{state.printer ? t("settings.printerReady") : t("settings.printerFind")}</span>
            </span>
            <span className="text-sm font-semibold text-purple-700">{state.printer ? t("print.change") : t("print.connect")}</span>
            <ChevronRight className="h-4 w-4 text-purple-700" aria-hidden="true" />
          </Link>
          <Sub>{t("settings.paperSize")}</Sub>
          <Choice
            label={t("settings.paperSize")}
            value={state.paper}
            onPick={(p) => update((s) => ({ ...s, paper: p }))}
            options={[
              { value: 58, title: t("settings.inch2"), hint: t("settings.mm58") },
              { value: 80, title: t("settings.inch3"), hint: t("settings.mm80") },
            ]}
          />
          <Hint>{t("settings.printerRelease")}</Hint>
        </Section>

        <Section
          id="print"
          icon={FileText}
          title={t("settings.estimatePrint")}
          summary={`${state.layout === "compact" ? t("settings.compact") : t("settings.detailed")} · ${t("settings.shopDetails")} ${onOff(state.printShopDetails)}`}
          open={open === "print"}
          onToggle={() => toggle("print")}
        >
          <Sub>{t("settings.itemCards")}</Sub>
          <Choice
            label={t("settings.itemCards")}
            value={state.layout}
            onPick={(l) => update((s) => ({ ...s, layout: l }))}
            options={[
              { value: "compact", title: t("settings.compact"), hint: t("settings.compactHint") },
              { value: "detailed", title: t("settings.detailed"), hint: t("settings.detailedHint") },
            ]}
          />
          <Switch
            on={state.printShopDetails}
            onToggle={() => update((s) => ({ ...s, printShopDetails: !s.printShopDetails }))}
            label={t("settings.shopDetails")}
            hint={t("settings.shopDetailsHint")}
          />
          <div className="px-4 pb-4 pt-2">
            <button type="button" onClick={showPreview} className="h-11 w-full rounded-lg border border-purple-300 bg-purple-50 text-sm font-semibold text-purple-800">
              {t("settings.preview")}
            </button>
          </div>
        </Section>

        <Section id="shop" icon={Store} title={t("settings.shopDetails")} summary={state.shop.name || t("settings.notSet")} open={open === "shop"} onToggle={() => toggle("shop")}>
          <Hint>{t("settings.shopHint")}</Hint>
          <div className="flex flex-col gap-3 px-4 pb-4">
            {SHOP_FIELDS.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={`shop-${key}`} className="text-[13px] font-medium text-purple-800">
                  {t(`settings.shop.${key}`)}
                </label>
                <input id={`shop-${key}`} value={state.shop[key]} placeholder={t(`settings.shop.${key}Ph`)} onChange={(e) => setShop(key, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="rates"
          icon={IndianRupee}
          title={t("settings.rates")}
          summary={`${state.rateUnit === 1 ? t("settings.perGram") : t("settings.per10")} · ${t("calc.roundOff")} ${onOff(state.roundOff)}`}
          open={open === "rates"}
          onToggle={() => toggle("rates")}
        >
          <Sub>{t("settings.rateUnit")}</Sub>
          <Choice
            label={t("settings.rateUnit")}
            value={state.rateUnit}
            onPick={setRateUnit}
            options={[
              { value: 1, title: t("settings.perGram"), hint: t("settings.perGramHint") },
              { value: 10, title: t("settings.per10"), hint: t("settings.per10Hint") },
            ]}
          />
          <Switch on={state.roundOff} onToggle={() => update((s) => ({ ...s, roundOff: !s.roundOff }))} label={t("calc.roundOff")} hint={t("settings.roundOffHint")} />
        </Section>

        <Section
          id="fields"
          icon={Calculator}
          title={t("settings.fields")}
          summary={fieldsOn.length ? fieldsOn.join(", ") : t("settings.basicFields")}
          open={open === "fields"}
          onToggle={() => toggle("fields")}
        >
          <Hint>{t("settings.fieldsHint")}</Hint>
          <Sub>{`${t("calculators.gold")} · ${t("calc.sell")}`}</Sub>
          <Switch on={f["gold-sell"].grossLess} onToggle={() => setField("gold-sell", "grossLess")} label={t("settings.grossLess")} hint={t("settings.grossLessHint")} />
          <Sub>{`${t("calculators.gold")} · ${t("calc.buy")}`}</Sub>
          <Switch on={f["gold-buy"].grossLess} onToggle={() => setField("gold-buy", "grossLess")} label={t("settings.grossLess")} hint={t("settings.grossLessHint")} />
          <Switch on={f["gold-buy"].purity} onToggle={() => setField("gold-buy", "purity")} label={t("calc.purity")} hint={t("settings.purityHint")} />
          <Switch on={f["gold-buy"].equivalent} onToggle={() => setField("gold-buy", "equivalent")} label={t("settings.equivalent")} hint={t("settings.equivalentHint")} />
          <Sub>{`${t("calculators.silver")} · ${t("calc.sell")}`}</Sub>
          <Switch on={f["silver-sell"].gross} onToggle={() => setField("silver-sell", "gross")} label={t("calc.grossWeight")} hint={t("settings.grossPacketHint")} />
          <Switch on={f["silver-sell"].packet} onToggle={() => setField("silver-sell", "packet")} label={t("calc.packetWeight")} hint={t("settings.packetHint")} />
          <Sub>{t("settings.calcTab")}</Sub>
          <Switch on={state.details.itemName} onToggle={() => setDetail("itemName")} label={t("calc.itemName")} />
          <Switch on={state.details.productCode} onToggle={() => setDetail("productCode")} label={t("calc.productCode")} hint={t("settings.codeHint")} />
        </Section>

        <Section
          id="products"
          icon={Package}
          title={t("settings.products")}
          summary={t("settings.productsSum", { c: state.products.length, p: state.products.reduce((a, c) => a + c.products.length, 0) })}
          open={open === "products"}
          onToggle={() => toggle("products")}
        >
          <Hint>{t("settings.productsHint")}</Hint>
          <ProductMaster />
        </Section>

        <Section id="purity" icon={Gem} title={t("settings.purityList")} summary={t("settings.puritySum", { n: state.purities.length })} open={open === "purity"} onToggle={() => toggle("purity")}>
          <div className="max-h-56 overflow-y-auto">
            {state.purities.map((p, i) => (
              <div key={`${p.value}-${i}`} className="flex min-h-11 items-center justify-between border-b border-purple-100 pl-4 pr-2">
                <span className="text-[15px] text-gray-900">{purityLabel(p)}</span>
                {p.custom ? (
                  <button
                    type="button"
                    aria-label={`${t("settings.remove")} ${purityLabel(p)}`}
                    onClick={() => update((s) => ({ ...s, purities: s.purities.filter((_, j) => j !== i) }))}
                    className="flex h-11 w-11 items-center justify-center text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex gap-2 p-4">
            <input aria-label={`${t("calc.purity")} %`} type="number" inputMode="decimal" placeholder={t("calc.enterPercent")} value={newVal} onChange={(e) => setNewVal(e.target.value)} className={`${inputCls} min-w-0 flex-1`} />
            <button type="button" onClick={addPurity} className="h-11 rounded-md bg-purple-800 px-4 text-sm font-semibold text-white">
              {t("settings.add")}
            </button>
          </div>
        </Section>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/70" onClick={() => setPreview(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <h2 className="text-[17px] font-bold">{t("settings.previewTitle")}</h2>
            <button type="button" aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 justify-center overflow-y-auto px-4 pb-6">
            <img src={preview} alt={t("settings.previewTitle")} className="h-fit w-full max-w-[300px] rounded-sm shadow-2xl" />
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
