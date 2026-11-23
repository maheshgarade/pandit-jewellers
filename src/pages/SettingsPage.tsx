import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, ChevronDown, ChevronRight, FileText, Gem, IndianRupee, Printer as PrinterIcon, Store, X } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { inputCls, Switch } from "@/components/calc/ui";
import { DetailFields, EstimateState, FieldSettings, purityLabel, ShopDetails, useStore } from "@/lib/store";
import { buildEstimate, drawEstimate } from "@/lib/receipt";

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

const SHOP_FIELDS: { key: keyof ShopDetails; label: string; placeholder: string }[] = [
  { key: "name", label: "Shop name", placeholder: "e.g. Pandit Jewellers" },
  { key: "address", label: "Address", placeholder: "Street, city, PIN" },
  { key: "phone", label: "Phone number", placeholder: "Mobile or landline" },
  { key: "gstin", label: "GSTIN", placeholder: "15-character GST number" },
  { key: "other", label: "Other details", placeholder: "e.g. BIS hallmark reg. no., email" },
  { key: "footer", label: "Footer message", placeholder: "e.g. Thank you! Visit again." },
];

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

const onOff = (b: boolean) => (b ? "on" : "off");

export default function SettingsPage() {
  const { state, update } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
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
      toast.error("Enter a purity between 0 and 100.");
      return;
    }
    if (state.purities.some((p) => p.value === v)) {
      toast.error(`${v}% is already in the list.`);
      return;
    }
    update((s) => ({ ...s, purities: [...s.purities, { value: v, label: newName.trim(), custom: true }] }));
    setNewName("");
    setNewVal("");
    toast.success(`Added ${v}% to the Purity list`);
  };

  const showPreview = async () => {
    const est = buildEstimate(SAMPLE, state.roundOff);
    const c = await drawEstimate(est, state.shop, state.paper, state.billSeq, state.layout, state.printShopDetails);
    setPreview(c.toDataURL("image/png"));
  };

  const f = state.fields;
  const paper = state.paper === 58 ? "2 inch" : "3 inch";
  const fieldsOn = [
    f["gold-sell"].grossLess && "Gold Sell gross/less",
    f["gold-buy"].grossLess && "Gold Buy gross/less",
    f["gold-buy"].purity && "Purity",
    f["silver-sell"].gross && "Silver gross",
    state.details.itemName && "Item name",
    state.details.productCode && "Product code",
  ].filter(Boolean);

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
        <h1 className="text-xl font-bold text-purple-900">Settings</h1>

        <Section id="printer" icon={PrinterIcon} title="Printer" summary={`${state.printer?.name ?? "No printer"} · ${paper} paper`} open={open === "printer"} onToggle={() => toggle("printer")}>
          <Link to="/settings/printer" className="flex min-h-16 items-center gap-3 px-4 py-2">
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] text-gray-900">{state.printer?.name ?? "No printer connected"}</span>
              <span className="text-xs text-gray-600">{state.printer ? "Bluetooth · ready to print" : "Tap to find a Bluetooth printer"}</span>
            </span>
            <span className="text-sm font-semibold text-purple-700">{state.printer ? "Change" : "Connect"}</span>
            <ChevronRight className="h-4 w-4 text-purple-700" aria-hidden="true" />
          </Link>
          <Sub>Paper size</Sub>
          <Choice
            label="Paper size"
            value={state.paper}
            onPick={(p) => update((s) => ({ ...s, paper: p }))}
            options={[
              { value: 58, title: "2 inch", hint: "58 mm paper" },
              { value: 80, title: "3 inch", hint: "80 mm paper" },
            ]}
          />
          <Hint>The printer is released about 20 seconds after each print, so other apps and phones can use it.</Hint>
        </Section>

        <Section
          id="print"
          icon={FileText}
          title="Estimate print"
          summary={`${state.layout === "compact" ? "Compact" : "Detailed"} cards · shop details ${onOff(state.printShopDetails)}`}
          open={open === "print"}
          onToggle={() => toggle("print")}
        >
          <Sub>Item cards</Sub>
          <Choice
            label="Item cards"
            value={state.layout}
            onPick={(l) => update((s) => ({ ...s, layout: l }))}
            options={[
              { value: "compact", title: "Compact", hint: "Net Wt and Total" },
              { value: "detailed", title: "Detailed", hint: "Weights, metal, making, GST" },
            ]}
          />
          <Switch
            on={state.printShopDetails}
            onToggle={() => update((s) => ({ ...s, printShopDetails: !s.printShopDetails }))}
            label="Shop details"
            hint="Logo, address, phone, GSTIN, other details and footer. Off prints only the shop name, to save paper."
          />
          <div className="px-4 pb-4 pt-2">
            <button type="button" onClick={showPreview} className="h-11 w-full rounded-lg border border-purple-300 bg-purple-50 text-sm font-semibold text-purple-800">
              Preview estimate
            </button>
          </div>
        </Section>

        <Section id="shop" icon={Store} title="Shop details" summary={state.shop.name || "Not set"} open={open === "shop"} onToggle={() => toggle("shop")}>
          <Hint>The shop name prints on every estimate. The rest prints when Shop details is on under Estimate print.</Hint>
          <div className="flex flex-col gap-3 px-4 pb-4">
            {SHOP_FIELDS.map((sf) => (
              <div key={sf.key} className="flex flex-col gap-1">
                <label htmlFor={`shop-${sf.key}`} className="text-[13px] font-medium text-purple-800">
                  {sf.label}
                </label>
                <input id={`shop-${sf.key}`} value={state.shop[sf.key]} placeholder={sf.placeholder} onChange={(e) => setShop(sf.key, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="rates"
          icon={IndianRupee}
          title="Rates & totals"
          summary={`Rate ${state.rateUnit === 1 ? "per gram" : "per 10 gram"} · round off ${onOff(state.roundOff)}`}
          open={open === "rates"}
          onToggle={() => toggle("rates")}
        >
          <Sub>Rate unit</Sub>
          <Choice
            label="Rate unit"
            value={state.rateUnit}
            onPick={setRateUnit}
            options={[
              { value: 1, title: "Per gram", hint: "e.g. ₹6,850 / g" },
              { value: 10, title: "Per 10 gram", hint: "e.g. ₹68,500 / 10 g" },
            ]}
          />
          <Switch on={state.roundOff} onToggle={() => update((s) => ({ ...s, roundOff: !s.roundOff }))} label="Round off" hint="Round the final amount to the nearest ₹10" />
        </Section>

        <Section
          id="fields"
          icon={Calculator}
          title="Calculator fields"
          summary={fieldsOn.length ? fieldsOn.join(", ") : "Only the basic fields"}
          open={open === "fields"}
          onToggle={() => toggle("fields")}
        >
          <Hint>Extra fields for each metal and mode. The Estimate tab always has item name, product code and customer details.</Hint>
          <Sub>Gold · Sell</Sub>
          <Switch on={f["gold-sell"].grossLess} onToggle={() => setField("gold-sell", "grossLess")} label="Gross & Less Weight" hint="Net = Gross − Less" />
          <Sub>Gold · Buy</Sub>
          <Switch on={f["gold-buy"].grossLess} onToggle={() => setField("gold-buy", "grossLess")} label="Gross & Less Weight" hint="Net = Gross − Less" />
          <Switch on={f["gold-buy"].purity} onToggle={() => setField("gold-buy", "purity")} label="Purity" hint="Fine gold = Net × Purity %" />
          <Sub>Silver · Sell</Sub>
          <Switch on={f["silver-sell"].gross} onToggle={() => setField("silver-sell", "gross")} label="Gross Weight" hint="Net = Gross − Packet" />
          <Switch on={f["silver-sell"].packet} onToggle={() => setField("silver-sell", "packet")} label="Packet Weight" hint="Used with Gross Weight" />
          <Sub>Calculator tab</Sub>
          <Switch on={state.details.itemName} onToggle={() => setDetail("itemName")} label="Item name" />
          <Switch on={state.details.productCode} onToggle={() => setDetail("productCode")} label="Product code" hint="Letters and numbers" />
        </Section>

        <Section id="purity" icon={Gem} title="Purity list" summary={`${state.purities.length} purities for Gold Buy`} open={open === "purity"} onToggle={() => toggle("purity")}>
          <div className="max-h-56 overflow-y-auto">
            {state.purities.map((p, i) => (
              <div key={`${p.value}-${i}`} className="flex min-h-11 items-center justify-between border-b border-purple-100 pl-4 pr-2">
                <span className="text-[15px] text-gray-900">{purityLabel(p)}</span>
                {p.custom ? (
                  <button
                    type="button"
                    aria-label={`Remove ${purityLabel(p)}`}
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
            <input aria-label="Name (optional)" placeholder="Name e.g. Hallmark" value={newName} onChange={(e) => setNewName(e.target.value)} className={`${inputCls} min-w-0 flex-1`} />
            <input aria-label="Purity %" type="number" inputMode="decimal" placeholder="%" value={newVal} onChange={(e) => setNewVal(e.target.value)} className={`${inputCls} w-20`} />
            <button type="button" onClick={addPurity} className="h-11 rounded-md bg-purple-800 px-4 text-sm font-semibold text-white">
              Add
            </button>
          </div>
        </Section>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/70" onClick={() => setPreview(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <h2 className="text-[17px] font-bold">Estimate preview</h2>
            <button type="button" aria-label="Close" className="flex h-11 w-11 items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 justify-center overflow-y-auto px-4 pb-6">
            <img src={preview} alt="Estimate preview" className="h-fit w-full max-w-[300px] rounded-sm shadow-2xl" />
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
