import { EMPTY_ESTIMATE, type Customer, type EstimateState, type SavedCustomer } from "./store";

/** The estimate with this customer on it. One already printed or shared is kept as it was: a new one starts. */
export const estimateFor = (est: EstimateState, c: Customer): EstimateState =>
  est.no !== null ? { ...EMPTY_ESTIMATE, customer: { name: c.name, number: c.number, address: c.address } } : { ...est, customer: { name: c.name, number: c.number, address: c.address } };

const clean = (c: Customer): Customer => ({ name: c.name.trim(), number: c.number.trim(), address: c.address.trim() });
const digits = (s: string) => s.replace(/\D/g, "");

/** The saved customer this one is: same mobile number, or same name when either has no number. */
export function findCustomer(list: SavedCustomer[], c: Customer): SavedCustomer | undefined {
  const n = digits(c.number);
  if (n) return list.find((x) => digits(x.number) === n);
  const name = c.name.trim().toLowerCase();
  return name ? list.find((x) => !digits(x.number) && x.name.trim().toLowerCase() === name) : undefined;
}

/** Adds the customer, or updates the matching one (filled-in fields win). Nothing to save without a name or number. */
export function upsertCustomer(list: SavedCustomer[], c: Customer, id?: string): SavedCustomer[] {
  const v = clean(c);
  if (!v.name && !v.number) return list;
  const match = id ? list.find((x) => x.id === id) : findCustomer(list, v);
  if (!match) return [{ ...v, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, updatedAt: Date.now() }, ...list];
  const merged = id ? v : { name: v.name || match.name, number: v.number || match.number, address: v.address || match.address };
  return [{ ...match, ...merged, updatedAt: Date.now() }, ...list.filter((x) => x.id !== match.id)];
}
