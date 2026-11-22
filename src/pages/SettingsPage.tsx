import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Printer as PrinterIcon, X } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { inputCls, Switch } from "@/components/calc/ui";
import { DetailFields, EstimateState, FieldSettings, purityLabel, ShopDetails, useStore } from "@/lib/store";
import { buildEstimate, drawEstimate } from "@/lib/receipt";

const Card: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="overflow-hidden rounded-xl border border-purple-200 bg-white">
    <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-purple-800">{title}</h2>
    {hint ? <p className="px-4 pb-2 text-xs text-gray-500">{hint}</p> : null}
    {children}
  </section>
);

const SHOP_FIELDS: { key: keyof ShopDetails; label: string; placeholder: string }[] = [
  { key: "name", label: "Shop name", placeholder: "e.g. Pandit Jewellers" },
  { key: "address", label: "Address", placeholder: "Street, city, PIN" },
  { key: "phone", label: "Phone number", placeholder: "Mobile or landline" },
  { key: "gstin", label: "GSTIN", placeholder: "15-character GST number" },
  { key: "other", label: "Other details", placeholder: "e.g. BIS hallmark reg. no., email" },
  { key: "footer", label: "Footer message", placeholder: "e.g. Thank you! Visit again." },
];

const LAYOUTS = [
  { value: "compact", label: "Compact", hint: "Net Wt and Total" },
  { value: "detailed", label: "Detailed", hint: "Weights, metal, making, GST" },
] as const;

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
  const [newName, setNewName] = useState("");
  const [newVal, setNewVal] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const setField = <K extends keyof FieldSettings>(key: K, field: keyof FieldSettings[K]) =>
    update((s) => ({ ...s, fields: { ...s.fields, [key]: { ...s.fields[key], [field]: !s.fields[key][field] } } }));

  const setDetail = (k: keyof DetailFields) => update((s) => ({ ...s, details: { ...s.details, [k]: !s.details[k] } }));

  const setShop =(key: keyof ShopDetails, value: string) => update((s) => ({ ...s, shop: { ...s.shop, [key]: value } }));

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
    const est = buildEstimate(SAMPLE, { ...state.details, customerName: true, customerNumber: true }, state.roundOff);
    const c = await drawEstimate(est, state.shop, state.paper, state.billSeq, state.layout, state.printShopDetails);
    setPreview(c.toDataURL("image/png"));
  };

  const f = state.fields;

  return (
    <Layout>
      <div className="container mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
        <h1 className="text-xl font-bold text-purple-900">Settings</h1>

        <Card title="Calculator fields" hint="Turn on the extra fields you need. Each metal and mode has its own.">
          <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">Gold · Sell</h3>
          <Switch on={f["gold-sell"].grossLess} onToggle={() => setField("gold-sell", "grossLess")} label="Gross & Less Weight" hint="Net = Gross − Less" />
          <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">Gold · Buy</h3>
          <Switch on={f["gold-buy"].grossLess} onToggle={() => setField("gold-buy", "grossLess")} label="Gross & Less Weight" hint="Net = Gross − Less" />
          <Switch on={f["gold-buy"].purity} onToggle={() => setField("gold-buy", "purity")} label="Purity" hint="Fine gold = Net × Purity %" />
          <h3 className="border-t border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-900">Silver · Sell</h3>
          <Switch on={f["silver-sell"].gross} onToggle={() => setField("silver-sell", "gross")} label="Gross Weight" hint="Net = Gross − Packet" />
          <Switch on={f["silver-sell"].packet} onToggle={() => setField("silver-sell", "packet")} label="Packet Weight" hint="Used with Gross Weight" />
        </Card>

        <Card title="Estimate details" hint="Optional fields for every metal and mode. Filled-in values are printed on the estimate.">
          <Switch on={state.details.itemName} onToggle={() => setDetail("itemName")} label="Item name" />
          <Switch on={state.details.productCode} onToggle={() => setDetail("productCode")} label="Product code" hint="Letters and numbers" />
          <Switch on={state.details.customerName} onToggle={() => setDetail("customerName")} label="Customer name" />
          <Switch on={state.details.customerNumber} onToggle={() => setDetail("customerNumber")} label="Customer number" />
          <Switch on={state.details.customerAddress} onToggle={() => setDetail("customerAddress")} label="Customer address" />
          <Switch
            on={state.roundOff}
            onToggle={() => update((s) => ({ ...s, roundOff: !s.roundOff }))}
            label="Round off"
            hint="Round the final amount to the nearest ₹10"
          />
        </Card>

        <Card title="Estimate print" hint="How the printed and shared estimate looks.">
          <div role="radiogroup" aria-label="Item cards" className="grid grid-cols-2 gap-2 px-4 pb-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={state.layout === l.value}
                onClick={() => update((s) => ({ ...s, layout: l.value }))}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-2 text-center ${state.layout === l.value ? "border-purple-700 bg-purple-50" : "border-gray-200"}`}
              >
                <span className="text-[15px] font-semibold text-gray-900">{l.label}</span>
                <span className="text-xs text-gray-500">{l.hint}</span>
              </button>
            ))}
          </div>
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
        </Card>

        <Card title="Shop details" hint="The shop name prints at the top of every estimate. The rest prints when Shop details is on under Estimate print.">
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
        </Card>

        <Card title="Printer">
          <div role="radiogroup" aria-label="Paper size" className="grid grid-cols-2 gap-2 px-4 pb-2">
            {([58, 80] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={state.paper === p}
                onClick={() => update((s) => ({ ...s, paper: p }))}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 ${state.paper === p ? "border-purple-700 bg-purple-50" : "border-gray-200"}`}
              >
                <span className="text-[15px] font-semibold text-gray-900">{p === 58 ? "2 inch" : "3 inch"}</span>
                <span className="text-xs text-gray-500">{p} mm paper</span>
              </button>
            ))}
          </div>
          <Link to="/settings/printer" className="flex min-h-16 items-center gap-3 border-t border-purple-100 px-4 py-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
              <PrinterIcon className="h-5 w-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] text-gray-900">{state.printer?.name ?? "No printer connected"}</span>
              <span className="text-xs text-gray-500">{state.printer ? "Bluetooth · ready to print" : "Tap to find a Bluetooth printer"}</span>
            </span>
            <span className="text-sm font-semibold text-purple-700">{state.printer ? "Change" : "Connect"}</span>
            <ChevronRight className="h-4 w-4 text-purple-700" />
          </Link>
          <p className="px-4 pb-3 text-xs leading-relaxed text-gray-500">
            The printer is released about 20 seconds after each print, so other apps and phones can use the same printer.
          </p>
        </Card>

        <Card title="Purity list" hint="Shown in the Gold Buy purity list.">
          <div className="max-h-56 overflow-y-auto border-t border-purple-100">
            {state.purities.map((p, i) => (
              <div key={`${p.value}-${i}`} className="flex min-h-11 items-center justify-between border-b border-purple-100 pl-4 pr-2">
                <span className="text-[15px] text-gray-900">{purityLabel(p)}</span>
                {p.custom ? (
                  <button
                    type="button"
                    aria-label={`Remove ${purityLabel(p)}`}
                    onClick={() => update((s) => ({ ...s, purities: s.purities.filter((_, j) => j !== i) }))}
                    className="flex h-10 w-10 items-center justify-center text-red-600"
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
        </Card>
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
