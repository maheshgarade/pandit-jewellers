import { EMPTY_ESTIMATE, type AppState, type Customer, type EstimateState, type SavedCustomer } from "./store";
import { buildEstimate } from "./receipt";

const pick = (c: Customer): Customer => ({ name: c.name, number: c.number, address: c.address });
const clean = (c: Customer): Customer => ({ name: c.name.trim(), number: c.number.trim(), address: c.address.trim() });
const digits = (s: string) => s.replace(/\D/g, "");

/** A mobile number field's value: digits only, at most 10. A pasted +91 / 0 prefix is dropped. */
export function mobileDigits(s: string): string {
  let d = digits(s);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

/** The estimate with this saved customer on it. One already printed or shared is kept as it was: a new one starts. */
export const estimateFor = (est: EstimateState, c: SavedCustomer): EstimateState =>
  est.no !== null ? { ...EMPTY_ESTIMATE, customer: pick(c), customerId: c.id } : { ...est, customer: pick(c), customerId: c.id };

/** The saved customer this one is: same mobile number, or same name when either has no number. */
export function findCustomer(list: SavedCustomer[], c: Customer): SavedCustomer | undefined {
  const n = digits(c.number);
  if (n) return list.find((x) => digits(x.number) === n);
  const name = c.name.trim().toLowerCase();
  return name ? list.find((x) => !digits(x.number) && x.name.trim().toLowerCase() === name) : undefined;
}

/** Saved customers matching a name or number, most recent first. */
export function searchCustomers(list: SavedCustomer[], q: string): SavedCustomer[] {
  const t = q.trim().toLowerCase();
  const d = digits(q);
  if (!t) return list;
  return list.filter((c) => c.name.toLowerCase().includes(t) || (d && digits(c.number).includes(d)) || c.address.toLowerCase().includes(t));
}

/**
 * Adds the customer, or updates the matching one: by `id` when given (an edit), else by number / name (filled-in
 * fields win). Nothing to save without a name or number. The saved customer is first in the returned list.
 */
export function upsertCustomer(list: SavedCustomer[], c: Customer, id?: string): SavedCustomer[] {
  const v = clean(c);
  if (!v.name && !v.number) return list;
  const match = (id && list.find((x) => x.id === id)) || findCustomer(list, v);
  if (!match) return [{ ...v, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, updatedAt: Date.now() }, ...list];
  const merged = id ? v : { name: v.name || match.name, number: v.number || match.number, address: v.address || match.address };
  return [{ ...match, ...merged, updatedAt: Date.now() }, ...list.filter((x) => x.id !== match.id)];
}

/** Saves the estimate's customer (first time: adds them) and links the estimate to them. */
export function saveEstimateCustomer(s: AppState, c: Customer = s.estimate.customer): AppState {
  const customers = upsertCustomer(s.customers, c, s.estimate.customerId);
  const saved = customers !== s.customers ? customers[0] : undefined;
  return { ...s, customers, estimate: { ...s.estimate, customer: pick(clean(c)), customerId: saved?.id ?? s.estimate.customerId } };
}

/** Keeps a numbered estimate in the history (for the customer's card), replacing its earlier copy. */
export function recordEstimate(s: AppState): AppState {
  const e = s.estimate;
  if (e.no === null || (!e.items.length && !e.old.length)) return s;
  const withCustomer = e.customer.name.trim() || e.customer.number.trim() ? saveEstimateCustomer(s) : s;
  const est = withCustomer.estimate;
  const entry = { no: est.no!, at: Date.now(), customerId: est.customerId, estimate: est, grand: buildEstimate(est, s.roundOff).grand };
  return { ...withCustomer, history: [entry, ...withCustomer.history.filter((h) => h.no !== entry.no)].slice(0, 1000) };
}
