import type { PaperWidth, ShopDetails } from "./store";

export interface BillRow {
  label: string;
  value: string;
}
export interface Bill {
  title: string;
  /** Item / customer details printed above the amounts (only the filled-in ones). */
  details?: BillRow[];
  rows: BillRow[];
  totalLabel: string;
  total: string; // already formatted, without ₹
}

/** Printable width in dots: 2 inch = 384, 3 inch = 576 (203 dpi heads). Also the image width. */
export const paperDots = (paper: PaperWidth) => (paper === 58 ? 384 : 576);

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

const FONT = "'Noto Sans', 'Noto Sans Devanagari', Roboto, Arial, sans-serif";

/**
 * Draws the bill as a thermal-receipt style image (black on white). The same canvas is shared/downloaded
 * as a PNG and sent to the printer as a raster image, so Hindi and Marathi print correctly on any printer.
 */
export async function drawReceipt(bill: Bill, shop: ShopDetails, paper: PaperWidth, billNo: number): Promise<HTMLCanvasElement> {
  const W = paperDots(paper);
  const pad = Math.round(W * 0.04);
  const base = paper === 58 ? 20 : 24; // body font px
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 4000;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  let y = pad;

  const font = (size: number, bold = false) => (ctx.font = `${bold ? "700" : "400"} ${size}px ${FONT}`);
  const wrap = (text: string, maxW: number): string[] => {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  };
  const center = (text: string, size: number, bold = false) => {
    font(size, bold);
    for (const l of wrap(text, W - pad * 2)) {
      ctx.fillText(l, (W - ctx.measureText(l).width) / 2, y);
      y += Math.round(size * 1.3);
    }
  };
  const dashed = () => {
    y += 6;
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    ctx.restore();
    y += 12;
  };
  const row = (left: string, right: string, size: number, bold = false) => {
    font(size, bold);
    const rw = ctx.measureText(right).width;
    const lines = wrap(left, W - pad * 2 - rw - 12);
    lines.forEach((l, i) => {
      ctx.fillText(l, pad, y);
      if (i === 0) ctx.fillText(right, W - pad - rw, y);
      y += Math.round(size * 1.45);
    });
  };

  const logo = await loadLogo();
  if (logo) {
    const size = Math.round(W * 0.22);
    // Grayscale so the printed logo dithers cleanly.
    ctx.save();
    ctx.filter = "grayscale(1) contrast(1.3)";
    ctx.drawImage(logo, (W - size) / 2, y, size, size);
    ctx.restore();
    y += size + 8;
  }
  center((shop.name || "").toUpperCase(), Math.round(base * 1.3), true);
  if (shop.address) center(shop.address, base - 2);
  if (shop.phone) center(`Ph: ${shop.phone}`, base - 2);
  if (shop.gstin) center(`GSTIN: ${shop.gstin}`, base - 2);
  if (shop.other) center(shop.other, base - 2);
  dashed();
  const date = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  center("ESTIMATE", Math.round(base * 1.1), true);
  y += 2;
  row(`Est. #${String(billNo).padStart(4, "0")}`, date, base - 2);
  y += 4;
  center(bill.title.toUpperCase(), base, true);
  dashed();
  if (bill.details?.length) {
    for (const d of bill.details) row(d.label, d.value, base - 2);
    dashed();
  }
  for (const r of bill.rows) row(r.label, r.value, base);
  dashed();
  row(bill.totalLabel, `₹ ${bill.total}`, Math.round(base * 1.2), true);
  dashed();
  center("This is an estimate, not a tax invoice.", base - 4);
  if (shop.footer) {
    y += 4;
    center(shop.footer, base - 2);
  }
  y += pad;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = y;
  out.getContext("2d")!.drawImage(canvas, 0, 0);
  return out;
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
