import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type Metal = "gold" | "silver";
export type Mode = "sell" | "buy";
export type MakingType = "percentage" | "flat" | "pergram";
export type PaperWidth = 58 | 80;

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
export interface SavedPrinter {
  address: string;
  name: string;
}

export interface AppState {
  rates: Record<Metal, SavedRate>;
  making: Record<Metal, SavedMaking>;
  fields: FieldSettings;
  purities: Purity[];
  shop: ShopDetails;
  printer: SavedPrinter | null;
  paper: PaperWidth;
  billSeq: number;
}

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
  rates: { gold: { rate: null, updatedAt: null }, silver: { rate: null, updatedAt: null } },
  making: { gold: { type: "percentage", value: null }, silver: { type: "percentage", value: null } },
  fields: {
    "gold-sell": { grossLess: false },
    "gold-buy": { grossLess: false, purity: true },
    "silver-sell": { gross: false, packet: false },
  },
  purities: DEFAULT_PURITIES,
  shop: { name: "Pandit Jewellers", address: "", phone: "", gstin: "", other: "", footer: "Thank you! Visit again." },
  printer: null,
  paper: 58,
  billSeq: 1,
};

const STORAGE_KEY = "pj-store-v1";

/** Saved values merged over the defaults, so a value added in a later version still gets its default. */
function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw) as Partial<AppState>;
    return {
      ...DEFAULT_STATE,
      ...saved,
      rates: { ...DEFAULT_STATE.rates, ...saved.rates },
      making: { ...DEFAULT_STATE.making, ...saved.making },
      fields: {
        "gold-sell": { ...DEFAULT_STATE.fields["gold-sell"], ...saved.fields?.["gold-sell"] },
        "gold-buy": { ...DEFAULT_STATE.fields["gold-buy"], ...saved.fields?.["gold-buy"] },
        "silver-sell": { ...DEFAULT_STATE.fields["silver-sell"], ...saved.fields?.["silver-sell"] },
      },
      shop: { ...DEFAULT_STATE.shop, ...saved.shop },
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
