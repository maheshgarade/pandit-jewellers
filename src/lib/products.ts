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
