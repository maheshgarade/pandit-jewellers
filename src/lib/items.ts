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
  /** Added to the making (₹, can be negative) when the final amount is adjusted by hand. */
  mkAdjust?: number;
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
    const making = r2((i.mkType === "percentage" ? (price * mv) / 100 : i.mkType === "pergram" ? i.net * mv : mv) + (i.mkAdjust ?? 0));
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

/** True when an item's making was adjusted to reach a typed final amount. */
export const isAdjusted = (items: EstimateItem[]) => items.some((it) => (it.input?.mkAdjust ?? 0) !== 0);

/** The sold items with their making adjustments removed. */
export const clearAdjust = (items: EstimateItem[]): EstimateItem[] =>
  items.map((it) => (it.input && it.input.mkAdjust ? computeItem({ ...it.input, mkAdjust: 0 }) : it));

/**
 * Makes the estimate come to `target` (before old metal is deducted, the same "net" the Net payable is rounded
 * from) by changing the sold items' making charges. The difference is shared in proportion to each item's making
 * (or price when none has making). Making carries 3% GST, so making moves by difference / 1.03.
 * `net` is the current exact amount the target replaces.
 */
export function adjustToTotal(items: EstimateItem[], net: number, target: number): EstimateItem[] {
  const idx = items.map((it, i) => (it.input?.mode === "sell" ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return items;
  const out = [...items];
  const sum = (list: EstimateItem[]) => list.reduce((a, it) => a + it.total, 0);
  const startTotal = sum(out);
  const weights = idx.map((i) => out[i].making ?? 0);
  const useMaking = weights.some((w) => w > 0);
  const w = useMaking ? weights : idx.map((i) => out[i].price ?? 1);
  const W = w.reduce((a, b) => a + b, 0) || 1;
  const want = (target - net) / (1 + GST_RATE / 100);
  idx.forEach((i, k) => {
    const inp = out[i].input!;
    out[i] = computeItem({ ...inp, mkAdjust: r2((inp.mkAdjust ?? 0) + (want * w[k]) / W) });
  });
  // Paise left over from rounding: put them on the item with the most making.
  const goal = startTotal + (target - net);
  const big = idx.reduce((b, i) => ((out[i].making ?? 0) > (out[b].making ?? 0) ? i : b), idx[0]);
  for (let pass = 0; pass < 2; pass++) {
    const left = r2(goal - sum(out));
    if (!left) break;
    const inp = out[big].input!;
    out[big] = computeItem({ ...inp, mkAdjust: r2((inp.mkAdjust ?? 0) + left / (1 + GST_RATE / 100)) });
  }
  return out;
}
