/** Product master: parent categories, each with its products (child categories). Names only, no prices. */
export interface Product {
  id: string;
  name: string;
}
export interface ProductCategory {
  id: string;
  name: string;
  products: Product[];
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** The starting list, from the shop's stock reports. Spellings kept exactly. */
const SEED: [string, string[]][] = [
  ["FANCY FASA", ["FANCY FASA"]],
  [
    "LOOSE SILVER",
    ["BICHWI", "CHHUMCHHUM (0)", "FANCY JODWEE", "FANCY PAYAL (F)", "FANCY PAYAL (M)", "FASE", "GAJSHRI AARJU LOOSE", "KAMARCHAIN DOUBLE", "MASOLI", "VIRODI JODAVI", "ZALAR PAYAL (F)"],
  ],
  ["CHALLA", ["CHALLA"]],
  ["COIN", ["COIN"]],
  ["FANCY JEWELLRY", ["BALI SILVER", "BRACELET", "CHAIN", "FANCY GANTHAN", "PENDAL", "RINGA SILVER", "RUDRAKSHA BALI", "S BUGADI", "S FANCY TOPS", "S NOSE PIN"]],
  ["FANCY PAYAL", ["FANCY PAYAL"]],
  ["GAY VASRU", ["GAI VASRU"]],
  ["GENTS CHAIN", ["G CHAIN"]],
  ["GENTS RING", ["FANCY RING", "MOTI RING", "OTIV RING"]],
  ["HOLLOW MURTI", ["H ANNAPURNA", "H BALKRUSHNA", "H GANPATI", "H LAXMI"]],
  ["JODWEE", ["NAKSHI JODWEE", "NAKSHI VEDHA", "PEDHGHAT JODWEE", "SHIREGHAT JODWEE", "VEDHANI PLAIN"]],
  ["KADALI", ["KADLI"]],
  ["PETI", ["PETI"]],
  ["POOJA ITEM", ["BELPATRA", "GHODA", "JOINT KARANDA", "KARANDA", "KATRI", "KOYARI", "MASA", "MUKHAWATA", "NANDADIP", "NIRANJAN", "PALNA", "PAUL", "SWASTIK"]],
  ["SIL BRACELATE", ["G BRACELATE", "PLAIN KADA"]],
  ["SILVER BHANDI", ["CHAMACHA", "GLASS", "LOTI FULPATRA", "WATI"]],
  ["SOLID MURTI", ["S ANNAPURNA", "S BALKRUSHNA", "S GANPATI", "S KUBER", "S LAXMI"]],
  [
    "TAAK",
    [
      "ANNAPURNA",
      "BHAIROBA",
      "JANAI",
      "JYOTIBA",
      "KHANDOBA",
      "KOLHAPUR DEVI",
      "KSHETRAPAL KHANDOBA",
      "LAXMI",
      "MHASOBA",
      "MOHATA DEVI",
      "PALANG DEVI",
      "PALICHA KHANDOBA",
      "PURUSH",
      "RENUKAMATA",
      "SAPTSHRUNGI DEVI",
      "SATIASHRA",
      "SHRI",
      "TULJAPUR",
      "VEER",
      "WAGAVARCHI DEVI",
    ],
  ],
  ["WALE", ["CHATAI WALE", "HOLI LOW WALE"]],
  [
    "UNCATEGORIZED JEWELLERY",
    [
      "AKKASAHEB DORALE", "BAL ANGATHI", "BANGALI RING", "BHARIV BADAM", "BORMAAL", "BUTTON TOPS", "CASTING PLAIN", "CASTING STONE",
      "CHAIN KUDKE", "CHAPIL RING", "CHOKAR SET", "EMB ZUBE", "FANCY BALI", "FANCY CHAIN", "FANCY DUL", "FANCY EARRING",
      "FANCY PENDANT", "FANCY PENDANT L", "FANCY TOPS", "FANCY WATTI", "FASA EARRING", "GADA DUL", "GHUNGARU TOPS", "GUNE SHIMPLA",
      "JONDHALI TOPS", "K TOPS", "KAN CHAIN", "KOIMTUR TOPS", "KOIMTUR ZUBE", "L CASTING RING", "LATKAN CHAIN", "LATKAN TOPS",
      "LONG GANTHAN", "NATH", "NECKLACE", "NOSE PIN", "OM BADAM", "PLAIN BALI", "PLAIN BUGADI", "SATWAI",
      "SHIMPALA", "SHORT GANTHAN", "STONE BALI", "THUSHI", "TIN PAKLI TOPS", "ZUMKA TOPS",
    ],
  ],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Stable ids from the names, so the seed is the same on every phone. */
export const DEFAULT_PRODUCTS: ProductCategory[] = SEED.map(([cat, items]) => ({
  id: `c-${slug(cat)}`,
  name: cat,
  products: items.map((p) => ({ id: `p-${slug(cat)}-${slug(p)}`, name: p })),
}));

/** Products whose name (or category name) contains the search, with their category. */
export function searchProducts(cats: ProductCategory[], q: string): { cat: ProductCategory; p: Product }[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const out: { cat: ProductCategory; p: Product }[] = [];
  for (const cat of cats) for (const p of cat.products) if (p.name.toLowerCase().includes(t) || cat.name.toLowerCase().includes(t)) out.push({ cat, p });
  return out;
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/** Edit distance, stopping early once it passes `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well `q` matches a product name (0 = not at all). Forgiving: word starts, letters in order, small typos. */
function score(name: string, q: string): number {
  const n = norm(name);
  const words = n.split(" ");
  const qn = norm(q);
  if (!qn) return 0;
  if (n === qn) return 120;
  if (n.startsWith(qn)) return 100;
  if (words.some((w) => w.startsWith(qn))) return 85;
  if (n.includes(qn)) return 70;
  const compact = n.replace(/ /g, "");
  const qc = qn.replace(/ /g, "");
  // Letters in order (e.g. "kmrchn" → KAMARCHAIN): fewer gaps score higher.
  let pos = -1;
  let gaps = 0;
  let inOrder = qc.length >= 3;
  for (const ch of qc) {
    const at = compact.indexOf(ch, pos + 1);
    if (at < 0) {
      inOrder = false;
      break;
    }
    gaps += at - pos - 1;
    pos = at;
  }
  if (inOrder) return Math.max(30, 60 - gaps * 2);
  // Small typos against a word, or the whole name: 1 letter off for short text, 2 for longer.
  if (qc.length >= 3) {
    const max = qc.length <= 5 ? 1 : 2;
    const close = [...words, compact].some((w) => distance(qc, w.slice(0, Math.max(qc.length, Math.min(w.length, qc.length + 1))), max) <= max);
    if (close) return 40;
  }
  return 0;
}

/** Products similar to what was typed, best first (ties: most used, then shorter names). */
export function suggestProducts(cats: ProductCategory[], q: string, use: Record<string, number> = {}, limit = 6): { cat: ProductCategory; p: Product }[] {
  if (norm(q).length < 2) return [];
  const seen = new Set<string>();
  return cats
    .flatMap((cat) => {
      // A category that matches well (e.g. "taak" → TAAK) brings its products, just below direct name matches.
      const catHit = score(cat.name, q) >= 85 ? 65 : 0;
      return cat.products.map((p) => ({ cat, p, s: Math.max(score(p.name, q), catHit) }));
    })
    .filter((x) => x.s > 0 && !seen.has(x.p.name) && (seen.add(x.p.name), true))
    .sort((a, b) => b.s - a.s || (use[b.p.name] ?? 0) - (use[a.p.name] ?? 0) || a.p.name.length - b.p.name.length)
    .slice(0, limit)
    .map(({ cat, p }) => ({ cat, p }));
}
