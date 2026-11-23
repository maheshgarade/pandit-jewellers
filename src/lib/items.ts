import type { MakingType, Metal } from "./store";
import type { EstimateItem } from "./receipt";

const GST_RATE = 3;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** What was entered for one item. Kept on the item so it can be edited and worked out again. */
export interface ItemInput {
  metal: Metal;
  mode: "sell" | "buy";
  name: string;
  code?: string;
  gross?: number; // with Gross / Less (Packet) weights
  less?: number;
  lessLabel?: string; // "Less Wt" or "Packet Wt"
  net: number;
  /** Per gram, whatever unit it was typed in. */
  rate: number;
  // Sell
  mkType?: MakingType;
  mkValue?: number;
  other?: number;
  // Gold Buy: purity %; undefined = 100 (purity field off)
  purity?: number;
  purityLabel?: string; // e.g. "22K"
}

/** The item's prices from what was entered: Sell = metal + making + other + 3% GST; Buy = fine metal × rate. */
export function computeItem(i: ItemInput): EstimateItem {
  const base: EstimateItem = {
    metal: i.metal,
    name: i.name,
    code: i.code || undefined,
    net: i.net,
    total: 0,
    input: i,
    ...(i.gross !== undefined ? { gross: i.gross, less: i.less ?? 0, lessLabel: i.lessLabel } : {}),
  };
  if (i.mode === "sell") {
    const price = r2(i.net * i.rate);
    const mv = i.mkValue ?? 0;
    const making = r2(i.mkType === "percentage" ? (price * mv) / 100 : i.mkType === "pergram" ? i.net * mv : mv);
    const oth = r2(i.other ?? 0);
    const gst = r2(((price + making + oth) * GST_RATE) / 100);
    return { ...base, price, making, ...(oth ? { other: oth } : {}), gst, total: r2(price + making + oth + gst) };
  }
  if (i.metal === "silver") return { ...base, rate: i.rate, total: r2(i.net * i.rate) }; // Silver Buy: Net × rate
  // Gold Buy: fine gold at the 24K rate.
  const pur = i.purity ?? 100;
  const fine = (i.net * pur) / 100;
  return {
    ...base,
    ...(i.purity !== undefined ? { purity: `${i.purityLabel ? i.purityLabel + "/" : ""}${pur}%` } : {}),
    fine,
    eq995: fine / 0.995,
    eq999: fine / 0.999,
    rate: i.rate,
    total: r2(fine * i.rate),
  };
}
