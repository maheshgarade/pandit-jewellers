import type { EstimateState, Metal, PaperWidth, ShopDetails } from "./store";
import type { ItemInput } from "./items";

/** One item card on the estimate. Sold items carry the price breakdown; old gold / silver the fine-metal value. */
export interface EstimateItem {
  metal: Metal;
  name: string;
  code?: string;
  purity?: string; // e.g. "22K/91.6%" (old gold)
  gross?: number; // only when Gross / Less (or Packet) weights were used
  less?: number;
  lessLabel?: string; // "Less Wt" or "Packet Wt"
  net: number;
  // Sold items
  price?: number; // net × rate
  making?: number;
  other?: number;
  gst?: number;
  // Old gold / silver
  fine?: number;
  eq995?: number;
  eq999?: number;
  rate?: number;
  /** Sold: price + making + other + GST. Old metal: the amount paid for it. */
  total: number;
  /** What was entered, so the item can be edited (see computeItem). */
  input?: ItemInput;
}

/** The estimate as printed, from buildEstimate(). */
export interface Estimate {
  /** "sell" when items were sold (old metal is deducted below them); "buy" when only old metal was bought. */
  mode: "sell" | "buy";
  customer: { name?: string; number?: string; address?: string };
  /** The cards: the sold items, or the old metal on a purchase estimate. */
  items: EstimateItem[];
  itemsTotal: number;
  less: { metal: Metal; label: string; amount: number }[];
  roundOff: number;
  /** The final amount in whole rupees, always positive: payLabel says which way it goes. */
  grand: number;
  payLabel: string;
  /** Printed at the bottom as "Salesman: <name>" when set. */
  salesman?: string;
}

export type PrintLayout = "detailed" | "compact";
type Align = "left" | "center" | "right";
export interface Cell {
  label: string;
  value: string;
  align: Align;
  bold?: boolean;
}

/** Printable width in dots: 2 inch = 384, 3 inch = 576 (203 dpi heads). Also the image width. */
export const paperDots = (paper: PaperWidth) => (paper === 58 ? 384 : 576);

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (list: EstimateItem[]) => r2(list.reduce((a, it) => a + it.total, 0));

export const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const wt = (n: number) => n.toFixed(3);
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
/** e.g. "22/11/2026 11:42 AM" */
export const estimateDate = () =>
  new Date()
    .toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(",", "")
    .replace(/am|pm/i, (m) => m.toUpperCase());

/** "ITEMS", or what the cards are on a purchase estimate. */
export const itemsHeading = (est: Estimate) => {
  if (est.mode === "sell") return "ITEMS";
  if (est.items.every((it) => it.metal === "gold")) return "OLD GOLD";
  if (est.items.every((it) => it.metal === "silver")) return "OLD SILVER";
  return "OLD GOLD & SILVER";
};

/**
 * The estimate as printed. Sold items are the cards and old gold / silver is deducted below them; with nothing
 * sold it is a purchase estimate of the old metal. The final amount is in whole rupees (nearest ₹10 with Round off
 * on) and the difference is shown as Round Off.
 */
export function buildEstimate(e: EstimateState, roundTo10: boolean): Estimate {
  const sell = e.items.length > 0;
  const items = sell ? e.items : e.old;
  const itemsTotal = sum(items);
  const less = sell
    ? (["gold", "silver"] as const)
        .map((metal) => ({ metal, label: metal === "gold" ? "Less: Old Gold" : "Less: Old Silver", amount: sum(e.old.filter((o) => o.metal === metal)) }))
        .filter((l) => l.amount > 0)
    : [];
  const net = r2(itemsTotal - less.reduce((a, l) => a + l.amount, 0));
  const amount = Math.abs(net);
  const grand = roundTo10 ? Math.round(amount / 10) * 10 : Math.round(amount);
  const c = e.customer;
  return {
    mode: sell ? "sell" : "buy",
    customer: { name: c.name.trim() || undefined, number: c.number.trim() || undefined, address: c.address.trim() || undefined },
    items,
    itemsTotal,
    less,
    roundOff: r2(grand - amount),
    grand,
    payLabel: sell && net >= 0 ? "NET PAYABLE" : "AMOUNT TO PAY",
    salesman: e.salesman?.trim() || undefined,
  };
}

/** In a row the last cell is right-aligned; summary rows centre the middle cells, detail rows keep them left. */
const align = (cells: Omit<Cell, "align">[], summary: boolean): Cell[] =>
  cells.map((c, i) => ({ ...c, align: cells.length > 1 && i === cells.length - 1 ? "right" : summary && i > 0 ? "center" : "left" }));

/**
 * One card's label / value cells: detail rows (above the dotted line, Detailed layout only) and the summary row.
 * Shared by the print and the on-screen estimate so both always show the same thing.
 */
export function cardCells(it: EstimateItem, mode: Estimate["mode"], layout: PrintLayout): { details: Cell[][]; summary: Cell[] } {
  const c = (label: string, value: string, bold = false) => ({ label, value, bold });
  const summary =
    mode === "sell"
      ? [c("Net Wt (g)", wt(it.net), true), ...(layout === "detailed" ? [c("GST 3% ₹", money(it.gst ?? 0))] : []), c("Total ₹", money(it.total), true)]
      : [c("Net Wt (g)", wt(it.net), true), ...(it.fine !== undefined ? [c("Fine (g)", wt(it.fine), true)] : []), c("Amount ₹", money(it.total), true)];
  if (layout === "compact") return { details: [], summary: align(summary, true) };
  const weights = it.gross !== undefined ? [c("Gross Wt", wt(it.gross)), c(it.lessLabel ?? "Less Wt", wt(it.less ?? 0))] : [];
  const rest =
    mode === "sell"
      ? [c("Metal ₹", money(it.price ?? 0)), c("Making ₹", money(it.making ?? 0)), ...(it.other ? [c("Other ₹", money(it.other))] : [])]
      : it.fine !== undefined
        ? [c("99.50 (g)", wt(it.eq995 ?? it.fine / 0.995)), c("99.9 (g)", wt(it.eq999 ?? it.fine / 0.999))]
        : [];
  // Up to 4 cells fit one row; more go on two rows (weights, then amounts).
  const rows = weights.length + rest.length <= 4 ? [[...weights, ...rest]] : [weights, rest];
  return { details: rows.filter((r) => r.length).map((r) => align(r, false)), summary: align(summary, true) };
}

let logoPromise: Promise<HTMLImageElement | null> | null = null;
function loadLogo(): Promise<HTMLImageElement | null> {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/logo/logo.png";
    });
  }
  return logoPromise;
}

const MONO = "'Roboto Mono', 'Noto Sans Mono', 'Droid Sans Mono', monospace";

/**
 * Draws the estimate as the "3-inch Estimate Print" design (black on white, monospace, one bordered card per item).
 * The design is 288 units wide; everything is scaled to the paper's dot width. The same image is printed as a
 * raster (so Hindi / Marathi print on any printer), shared, and saved. To save paper only the shop name is printed
 * at the top unless `shopDetails` is on.
 */
export async function drawEstimate(
  est: Estimate,
  shop: ShopDetails,
  paper: PaperWidth,
  no: number,
  layout: PrintLayout,
  shopDetails = false
): Promise<HTMLCanvasElement> {
  const W = paperDots(paper);
  const s = W / 288; // design unit → dots
  const P = 12 * s; // side padding
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.ceil((600 + est.items.length * 140) * s);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, canvas.height);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.textBaseline = "top";
  let y = 14 * s;

  const font = (size: number, weight = 400) => (ctx.font = `${weight} ${Math.round(size * s)}px ${MONO}`);
  const tw = (t: string) => ctx.measureText(t).width;
  const text = (t: string, x: number, yy: number, a: Align = "left") => ctx.fillText(t, a === "left" ? x : a === "center" ? x - tw(t) / 2 : x - tw(t), yy);
  const wrap = (t: string, maxW: number) => {
    const out: string[] = [];
    let line = "";
    for (const word of t.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (tw(test) > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
    return out;
  };
  const gap = (u: number) => (y += u * s);
  const hline = (x1: number, x2: number, width: number, dash: number[] = []) => {
    ctx.save();
    ctx.lineWidth = width * s;
    ctx.setLineDash(dash.map((d) => d * s));
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  };
  const rule = (solid = false) => hline(P, W - P, solid ? 2 : 1, solid ? [] : [4, 3]);
  const centerLines = (t: string, size: number, weight = 400) => {
    font(size, weight);
    for (const l of wrap(t, W - 2 * P)) {
      text(l, W / 2, y, "center");
      y += size * 1.4 * s;
    }
  };
  const lr = (l: string, r: string, size: number, weight = 400) => {
    font(size, weight);
    text(l, P, y);
    text(r, W - P, y, "right");
    y += size * 1.4 * s;
  };

  // Header: the shop name; logo and the other shop details only when switched on in Settings.
  if (shopDetails) {
    const logo = await loadLogo();
    if (logo) {
      const sz = 44 * s;
      ctx.save();
      ctx.filter = "grayscale(1) contrast(1.3)"; // dithers cleanly
      ctx.drawImage(logo, (W - sz) / 2, y, sz, sz);
      ctx.restore();
      y += sz + 6 * s;
    }
  }
  centerLines((shop.name || "").toUpperCase(), 16, 700);
  if (shopDetails) {
    for (const line of [shop.address, shop.phone && `Ph: ${shop.phone}`, shop.gstin && `GSTIN: ${shop.gstin}`, shop.other]) {
      if (line) centerLines(line, 10);
    }
  }
  gap(4);
  rule();
  gap(8);
  lr(`Estimate No: ${no}`, estimateDate(), 11);
  gap(4);
  rule();
  gap(8);

  // Customer: only the filled-in details, no heading.
  const customer = (
    [
      ["Name", est.customer.name],
      ["Mobile", est.customer.number],
      ["Address", est.customer.address],
    ] as const
  ).filter(([, v]) => v);
  if (customer.length) {
    font(11);
    const vx = P + 58 * s;
    for (const [k, v] of customer) {
      text(k, P, y);
      for (const l of wrap(`: ${v}`, W - P - vx)) {
        text(l, vx, y);
        y += 11 * 1.4 * s;
      }
      gap(2);
    }
    gap(2);
    rule();
    gap(8);
  }

  lr(`${itemsHeading(est)} (${est.items.length})`, est.mode === "sell" ? "Totals incl. GST" : "", 11, 700);
  gap(6);

  // Item cards
  const cardW = W - 2 * P;
  const inX = P + 7 * s;
  const inW = cardW - 14 * s;
  const row = (cells: Cell[], size: number) => {
    const colW = inW / cells.length;
    cells.forEach((c, k) => {
      const x = c.align === "left" ? inX + colW * k : c.align === "right" ? inX + colW * (k + 1) : inX + colW * (k + 0.5);
      font(9);
      text(c.label, x, y, c.align);
      // Shrink a value that would run into the next column.
      let sz = size;
      font(sz, c.bold ? 700 : 400);
      while (tw(c.value) > colW - 2 * s && sz > size * 0.7) font((sz -= 0.5), c.bold ? 700 : 400);
      text(c.value, x, y + 10.8 * s, c.align);
    });
    y += (10.8 + size * 1.4) * s;
  };
  est.items.forEach((it, i) => {
    const top = y;
    gap(5);
    // Title: "1. Gold Ring 22K/91.6%", with the product code boxed on the right.
    font(10, 700);
    const badge = it.code ? tw(it.code) + 6 * s : 0;
    const titleW = inW - (badge ? badge + 6 * s : 0);
    font(11, 700);
    const lines = wrap(`${i + 1}. ${it.name}`, titleW);
    lines.forEach((l, k) => text(l, inX, y + k * 15.4 * s));
    let rows = lines.length;
    if (it.purity) {
      const after = tw(lines[rows - 1]) + 5 * s;
      font(10);
      if (after + tw(it.purity) <= titleW) text(it.purity, inX + after, y + ((rows - 1) * 15.4 + 1) * s);
      else text(it.purity, inX, y + (rows++ * 15.4 + 1) * s);
    }
    if (it.code) {
      font(10, 700);
      ctx.lineWidth = 1 * s;
      ctx.strokeRect(inX + inW - badge, y, badge, 15 * s);
      text(it.code, inX + inW - 3 * s, y + 1.5 * s, "right");
    }
    y += (16 + (rows - 1) * 15.4) * s;

    const { details, summary } = cardCells(it, est.mode, layout);
    for (const r of details) {
      gap(3);
      row(r, 10);
    }
    gap(3);
    hline(inX, inX + inW, 1, [1.5, 2]);
    gap(4);
    row(summary, 11);
    gap(5);
    ctx.lineWidth = 1 * s;
    roundRect(ctx, P, top, cardW, y - top, 4 * s);
    gap(6);
  });

  // Totals
  gap(2);
  rule();
  gap(8);
  lr(`Items Total (${est.items.length})`, money(est.itemsTotal), 11, 600);
  for (const l of est.less) {
    gap(3);
    lr(l.label, `-${money(l.amount)}`, 11);
  }
  if (est.roundOff) {
    gap(3);
    lr("Round Off", `${est.roundOff > 0 ? "+" : "-"}${money(Math.abs(est.roundOff))}`, 11);
  }
  gap(8);
  rule(true);
  gap(7);
  font(15, 700);
  text(est.payLabel, P, y);
  text(rupees(est.grand), W - P, y, "right");
  gap(26);
  rule(true);
  if (est.salesman) {
    gap(8);
    font(10);
    text(`Salesman: ${est.salesman}`, P, y);
    y += 10 * 1.4 * s;
  }
  if (shopDetails && shop.footer) {
    gap(10);
    centerLines(shop.footer, 10);
  }
  gap(8);

  const out = document.createElement("canvas");
  out.width = W;
  out.height = Math.ceil(y);
  out.getContext("2d")!.drawImage(canvas, 0, 0);
  return out;
}

/** A short slip to check the printer: the shop name and a few label / value lines. */
export function drawTestPrint(shopName: string, paper: PaperWidth, lines: [string, string][]): HTMLCanvasElement {
  const W = paperDots(paper);
  const s = W / 288;
  const P = 12 * s;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.ceil((56 + lines.length * 16) * s);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  let y = 14 * s;
  ctx.font = `700 ${Math.round(16 * s)}px ${MONO}`;
  const name = (shopName || "").toUpperCase();
  ctx.fillText(name, (W - ctx.measureText(name).width) / 2, y);
  y += 30 * s;
  ctx.font = `400 ${Math.round(11 * s)}px ${MONO}`;
  for (const [l, r] of lines) {
    ctx.fillText(l, P, y);
    ctx.fillText(r, W - P - ctx.measureText(r).width, y);
    y += 16 * s;
  }
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
}

export const canvasToBase64Png = (c: HTMLCanvasElement) => c.toDataURL("image/png").split(",")[1];

/** ESC/POS raster (GS v 0) of the receipt image, in bands so small printer buffers keep up. */
export function canvasToEscPos(c: HTMLCanvasElement): Uint8Array {
  const W = c.width;
  const H = c.height;
  const bytesPerRow = Math.ceil(W / 8);
  const px = c.getContext("2d")!.getImageData(0, 0, W, H).data;
  const chunks: number[] = [0x1b, 0x40]; // ESC @ reset
  const BAND = 128;
  for (let top = 0; top < H; top += BAND) {
    const h = Math.min(BAND, H - top);
    chunks.push(0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff);
    for (let yy = top; yy < top + h; yy++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let b = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          if (x >= W) continue;
          const i = (yy * W + x) * 4;
          const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (lum < 150) b |= 0x80 >> bit;
        }
        chunks.push(b);
      }
    }
  }
  chunks.push(0x1b, 0x64, 0x04); // feed 4 lines
  chunks.push(0x1d, 0x56, 0x42, 0x00); // partial cut (ignored by printers without a cutter)
  return Uint8Array.from(chunks);
}

export const bytesToBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
