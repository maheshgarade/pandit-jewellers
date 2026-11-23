import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Shop lock: the app opens only inside the shop (shop Wi-Fi + GPS geofence), or for a while after the
 * owner gives a one-time code from their authenticator app (TOTP) or one of their single-use backup codes.
 * Everything is checked on the phone, so it works offline. Nothing that unlocks the app is reusable:
 * a TOTP code expires in 30 s and cannot be used twice, and a backup code is deleted once used.
 */

interface ShopLockPlugin {
  getWifi(): Promise<{ connected: boolean; bssid?: string; ssid?: string }>;
  getLocation(): Promise<{ lat: number; lng: number; accuracy: number; mock: boolean }>;
}
export const ShopLockNative = registerPlugin<ShopLockPlugin>("ShopLock");

export interface ShopWifi {
  bssid: string;
  ssid: string;
}
export interface Geofence {
  lat: number;
  lng: number;
  radius: number; // metres
}
export interface LockConfig {
  enabled: boolean;
  /** Base32 TOTP secret shared with the owner's authenticator app. */
  secret: string;
  /** SHA-256 of each unused backup code. */
  backup: string[];
  wifi: ShopWifi[];
  geo: Geofence | null;
  /** How long an owner code keeps the app open outside the shop. */
  grantHours: number;
  /** Last TOTP time step accepted, so a code cannot be reused. */
  lastStep: number;
}
interface LockState {
  grantUntil: number;
  grantFrom: number;
  lastSeen: number;
}

const CONFIG_KEY = "pj-lock";
const STATE_KEY = "pj-lock-state";

const read = <T,>(key: string): T | null => {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
};

export const loadConfig = () => read<LockConfig>(CONFIG_KEY);
export const saveConfig = (c: LockConfig | null) => write(CONFIG_KEY, c);
const loadState = (): LockState => read<LockState>(STATE_KEY) ?? { grantUntil: 0, grantFrom: 0, lastSeen: 0 };
const saveState = (s: LockState) => write(STATE_KEY, s);

/* ---------- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ---------- */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = "";
  bytes.forEach((b) => (bits += b.toString(2).padStart(8, "0")));
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(s: string): Uint8Array {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const v = B32.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

async function totpAt(secret: string, step: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(step / 2 ** 32));
  view.setUint32(4, step >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** The matching time step for `code` (±1 step for clock drift), or null. */
export async function matchTotp(secret: string, code: string, afterStep = -1): Promise<number | null> {
  const now = Math.floor(Date.now() / 30_000);
  for (const step of [now, now - 1, now + 1]) {
    if (step > afterStep && (await totpAt(secret, step)) === code) return step;
  }
  return null;
}

export const otpauthUrl = (secret: string, shop: string) => {
  const label = encodeURIComponent(`${shop || "Pandit Jewellers"}:Shop lock`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(shop || "Pandit Jewellers")}&digits=6&period=30`;
};

/* ---------- Backup codes ---------- */

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const normalize = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Ten new codes (shown once) and their hashes (stored). */
export async function newBackupCodes(): Promise<{ codes: string[]; hashes: string[] }> {
  const codes = Array.from({ length: 10 }, () => {
    const r = crypto.getRandomValues(new Uint8Array(8));
    const s = Array.from(r, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
  return { codes, hashes: await Promise.all(codes.map((c) => sha256(normalize(c)))) };
}

/**
 * Check an owner code: a 6-digit authenticator code or a backup code.
 * On success the config is saved with the code spent (TOTP step recorded / backup code removed).
 */
export async function spendOwnerCode(input: string): Promise<"totp" | "backup" | null> {
  const cfg = loadConfig();
  if (!cfg) return null;
  const digits = input.replace(/\s/g, "");
  if (/^\d{6}$/.test(digits)) {
    const step = await matchTotp(cfg.secret, digits, cfg.lastStep);
    if (step === null) return null;
    saveConfig({ ...cfg, lastStep: step });
    return "totp";
  }
  const h = await sha256(normalize(input));
  if (normalize(input).length === 8 && cfg.backup.includes(h)) {
    saveConfig({ ...cfg, backup: cfg.backup.filter((x) => x !== h) });
    return "backup";
  }
  return null;
}

/* ---------- Grants (owner unlocked the app outside the shop) ---------- */

export function grant(hours: number) {
  const now = Date.now();
  saveState({ ...loadState(), grantFrom: now, grantUntil: now + hours * 3_600_000, lastSeen: now });
}
export const endGrant = () => saveState({ ...loadState(), grantFrom: 0, grantUntil: 0 });

/** Time left on the owner's grant in ms (0 if none). A clock moved backwards ends it. */
export function grantLeft(): number {
  const s = loadState();
  const now = Date.now();
  if (s.lastSeen && now < s.lastSeen - 5 * 60_000) {
    // Phone clock was turned back: drop the grant.
    saveState({ grantFrom: 0, grantUntil: 0, lastSeen: now });
    return 0;
  }
  saveState({ ...s, lastSeen: Math.max(s.lastSeen, now) });
  if (now < s.grantFrom || now >= s.grantUntil) return 0;
  return s.grantUntil - now;
}

/* ---------- In-shop check ---------- */

export type Reason = "wifi-off" | "location-off" | "permission" | "not-shop-wifi" | "outside" | "mock" | "no-fix" | "not-setup" | "error";
export interface CheckResult {
  ok: boolean;
  reasons: Reason[];
}

export const isNative = () => Capacitor.isNativePlatform();

const errCode = (e: unknown): Reason => {
  const c = (e as { code?: string })?.code;
  return c === "wifi-off" || c === "location-off" || c === "permission" || c === "no-fix" ? c : "error";
};

/** Metres between two points. */
export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** In the shop = every configured check passes (shop Wi-Fi and, if set, inside the geofence). */
export async function checkInShop(cfg: LockConfig): Promise<CheckResult> {
  if (!cfg.wifi.length && !cfg.geo) return { ok: false, reasons: ["not-setup"] };
  const reasons: Reason[] = [];

  if (cfg.wifi.length) {
    try {
      const w = await ShopLockNative.getWifi();
      if (!w.connected || !cfg.wifi.some((x) => x.bssid === w.bssid)) reasons.push("not-shop-wifi");
    } catch (e) {
      reasons.push(errCode(e));
    }
  }
  if (cfg.geo) {
    try {
      const l = await ShopLockNative.getLocation();
      if (l.mock) reasons.push("mock");
      else if (distance(l, cfg.geo) > cfg.geo.radius + Math.min(l.accuracy, 50)) reasons.push("outside");
    } catch (e) {
      reasons.push(errCode(e));
    }
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}
