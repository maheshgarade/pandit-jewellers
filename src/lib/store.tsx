import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import type { EstimateItem, PrintLayout } from "./receipt";
import { DEFAULT_PRODUCTS, type ProductCategory } from "./products";

export type Metal = "gold" | "silver";
export type Mode = "sell" | "buy";
export type MakingType = "percentage" | "flat" | "pergram";
export type PaperWidth = 58 | 80;
export type RateKey = `${Metal}-${Mode}`;
export const rateKey = (metal: Metal, mode: Mode): RateKey => `${metal}-${mode}`;

export interface SavedRate {
  rate: number | null;
  updatedAt: number | null;
}
export interface SavedMaking {
  type: MakingType;
  value: number | null;
}
export interface Purity {
  value: number;
  label: string; // e.g. "22K"; empty for an unnamed custom purity
  custom?: boolean;
}
export interface ShopDetails {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  other: string;
  footer: string;
}
export interface FieldSettings {
  "gold-sell": { grossLess: boolean };
  "gold-buy": { grossLess: boolean; purity: boolean };
  "silver-sell": { gross: boolean; packet: boolean };
}
/** Optional item fields on the Calculator, switched on in Settings. The Estimate tab always has them. */
export interface DetailFields {
  itemName: boolean;
  productCode: boolean;
}
export interface Customer {
  name: string;
  number: string;
  address: string;
}
/** A customer in the Customers tab. */
export interface SavedCustomer extends Customer {
  id: string;
  updatedAt: number;
}
/** The estimate being built. Shared by the Gold and Silver tabs and kept until "New estimate". */
export interface EstimateState {
  /** Items sold (Sell mode). */
  items: EstimateItem[];
  /** Old gold / silver bought from the customer (Buy mode): deducted from the items, or a purchase estimate on its own. */
  old: EstimateItem[];
  customer: Customer;
  /** Given on the first print, share or save, so reprints keep the same number. */
  no: number | null;
  /** The saved customer this estimate is for (picked or added on the Estimate tab). */
  customerId?: string;
  /** Who made it: the Profile name when it was first printed / shared (then kept with it). */
  salesman?: string;
}
/** An estimate kept after it was numbered (printed, shared or saved), for the customer's history. */
export interface SavedEstimate {
  no: number;
  at: number;
  customerId?: string;
  estimate: EstimateState;
  grand: number;
}
export interface SavedPrinter {
  address: string;
  name: string;
}

export interface AppState {
  /** Saved rate per metal and mode ("gold-sell", "gold-buy", …): each is set and updated on its own. */
  rates: Record<RateKey, SavedRate>;
  making: Record<Metal, SavedMaking>;
  fields: FieldSettings;
  details: DetailFields;
  /** Round the final amount to the nearest ₹10 and show the difference as "Round off". */
  roundOff: boolean;
  purities: Purity[];
  shop: ShopDetails;
  /** Print the logo, address, phone, GSTIN, other details and footer. Off prints only the shop name, to save paper. */
  printShopDetails: boolean;
  /** Item cards on the estimate: Net Wt and Total only, or the full breakdown. */
  layout: PrintLayout;
  /** Rates are entered and saved per 1 g (default) or per 10 g. Calculations divide by this. */
  rateUnit: 1 | 10;
  printer: SavedPrinter | null;
  paper: PaperWidth;
  billSeq: number;
  estimate: EstimateState;
  customers: SavedCustomer[];
  history: SavedEstimate[];
  /** Product master (Settings): parent categories and their products, picked as item names. */
  products: ProductCategory[];
  /** Profile: the user's name, printed at the bottom of estimates as "Salesman: <name>". */
  salesman: string;
}

export const EMPTY_ESTIMATE: EstimateState = { items: [], old: [], customer: { name: "", number: "", address: "" }, no: null };

export const DEFAULT_PURITIES: Purity[] = [
  { value: 99.9, label: "24K" },
  { value: 95.8, label: "23K" },
  { value: 91.6, label: "22K" },
  { value: 87.5, label: "21K" },
  { value: 83.3, label: "20K" },
  { value: 75, label: "18K" },
  { value: 66.6, label: "16K" },
  { value: 58.5, label: "14K" },
  { value: 50, label: "12K" },
  { value: 41.7, label: "10K" },
  { value: 37.5, label: "9K" },
];

const DEFAULT_STATE: AppState = {
  rates: {
    "gold-sell": { rate: null, updatedAt: null },
    "gold-buy": { rate: null, updatedAt: null },
    "silver-sell": { rate: null, updatedAt: null },
    "silver-buy": { rate: null, updatedAt: null },
  },
  making: { gold: { type: "percentage", value: null }, silver: { type: "percentage", value: null } },
  fields: {
    "gold-sell": { grossLess: false },
    "gold-buy": { grossLess: false, purity: true },
    "silver-sell": { gross: false, packet: false },
  },
  details: { itemName: false, productCode: false },
  roundOff: false,
  purities: DEFAULT_PURITIES,
  shop: { name: "Pandit Jewellers", address: "", phone: "", gstin: "", other: "", footer: "Thank you! Visit again." },
  printShopDetails: false,
  layout: "compact",
  rateUnit: 1,
  printer: null,
  paper: 58,
  billSeq: 1,
  estimate: EMPTY_ESTIMATE,
  customers: [],
  history: [],
  products: DEFAULT_PRODUCTS,
  salesman: "",
};

const STORAGE_KEY = "pj-store-v1";

/** Saved values merged over the defaults, so a value added in a later version still gets its default. */
function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw) as Partial<AppState>;
    // The first test build kept one rate per metal ({ gold, silver }); carry it into both Sell and Buy.
    const old = (saved.rates ?? {}) as Partial<Record<string, SavedRate>>;
    const rates = { ...DEFAULT_STATE.rates };
    for (const k of Object.keys(rates) as RateKey[]) {
      rates[k] = old[k] ?? old[k.split("-")[0]] ?? rates[k];
    }
    return {
      ...DEFAULT_STATE,
      ...saved,
      rates,
      making: { ...DEFAULT_STATE.making, ...saved.making },
      fields: {
        "gold-sell": { ...DEFAULT_STATE.fields["gold-sell"], ...saved.fields?.["gold-sell"] },
        "gold-buy": { ...DEFAULT_STATE.fields["gold-buy"], ...saved.fields?.["gold-buy"] },
        "silver-sell": { ...DEFAULT_STATE.fields["silver-sell"], ...saved.fields?.["silver-sell"] },
      },
      details: { ...DEFAULT_STATE.details, ...saved.details },
      shop: { ...DEFAULT_STATE.shop, ...saved.shop },
      estimate: { ...EMPTY_ESTIMATE, ...saved.estimate, customer: { ...EMPTY_ESTIMATE.customer, ...saved.estimate?.customer } },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

interface StoreValue {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  return <StoreContext.Provider value={{ state, update }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

export const purityLabel = (p: Purity) => (p.label ? `${p.label} - ${p.value}%` : `${p.value}%`);

export const makingText = (type: MakingType, value: number) =>
  type === "percentage" ? `${value}%` : type === "flat" ? `₹ ${value} flat` : `₹ ${value} / g`;

export const formatINR = (n: number) => Math.round(n).toLocaleString("en-IN");

export const timeText = (ts: number | null) =>
  ts ? new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "";
