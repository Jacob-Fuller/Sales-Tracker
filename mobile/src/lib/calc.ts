// Money maths, ported from the Sales Tracker web app. Sales are kept after
// discount and store fee; recurring costs turn into one expense per payment
// date up to today.
import { FREQS, keyOf, monthLabel, today, ymd, type Expense, type Recurring, type Sale, type Snapshot, type LinkKey } from "./model.ts";

/* ---------- periods ---------- */
export type Period = "month" | "fy" | "all";
export type Range = { from: string; to: string };
export function range(p: Period, fyStartMonth = 7, now = new Date()): Range {
  const y = now.getFullYear(), m = now.getMonth();
  if (p === "month") return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 1)) };
  if (p === "fy") {
    const sm = fyStartMonth - 1; // 0-based
    const fy = m >= sm ? y : y - 1;
    return { from: ymd(new Date(fy, sm, 1)), to: ymd(new Date(fy + 1, sm, 1)) };
  }
  return { from: "0000", to: "9999" };
}
export const inRange = (ds: string, rg: Range) => ds >= rg.from && ds < rg.to;
export const periodLabel = (p: Period, fyStartMonth: number) =>
  p === "month" ? "This month" : p === "all" ? "All time" : fyStartMonth === 1 ? "This year" : "This financial year";

/* ---------- recurring ---------- */
function occDate(start: string, f: { days?: number; months?: number }, i: number) {
  const [y, m, d] = start.split("-").map(Number);
  if (f.days) return ymd(new Date(y, m - 1, d + f.days * i));
  const mi = m - 1 + (f.months || 1) * i;
  const yy = y + Math.floor(mi / 12), mm = ((mi % 12) + 12) % 12;
  return ymd(new Date(yy, mm, Math.min(d, new Date(yy, mm + 1, 0).getDate())));
}
export function occurrences(r: Recurring, until: string): string[] {
  const f = FREQS[r.frequency] || FREQS.monthly, out: string[] = [];
  for (let i = 0; i < 3000; i++) {
    const ds = occDate(r.startDate, f, i);
    if (ds > until || (r.endDate && ds > r.endDate)) break;
    out.push(ds);
  }
  return out;
}
export function nextDue(r: Recurring, t = today()): string | null {
  const f = FREQS[r.frequency] || FREQS.monthly;
  for (let i = 0; i < 3000; i++) {
    const ds = occDate(r.startDate, f, i);
    if (r.endDate && ds > r.endDate) return null;
    if (ds > t) return ds;
  }
  return null;
}
export const isActive = (r: Recurring, t = today()) => !r.endDate || r.endDate > t;
export const perMonth = (r: Recurring) => r.amount * (FREQS[r.frequency] || FREQS.monthly).perMonth;

/* ---------- joined rows ---------- */
export type SaleRow = Sale & {
  productName: string; itemId: string | null; groupId: string | null;
  gross: number; feeAmount: number; net: number;
};
export type ExpenseRow = Expense & { recurringId?: string; frequency?: string };

export function salesJoined(d: Snapshot): SaleRow[] {
  const pMap: { [id: string]: Snapshot["products"][number] } = {};
  d.products.forEach((p) => { pMap[p.id] = p; });
  return d.sales.filter((s) => pMap[s.productId]).map((s) => {
    const p = pMap[s.productId];
    const gross = p.price * s.quantity * (1 - (s.discount || 0) / 100);
    const feeAmount = gross * (s.fee || 0) / 100;
    return { ...s, productName: p.name, itemId: p.itemId, groupId: p.groupId, gross, feeAmount, net: gross - feeAmount };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export function expensesAll(d: Snapshot, t = today()): ExpenseRow[] {
  const rows: ExpenseRow[] = d.expenses.map((e) => ({ ...e }));
  for (const r of d.recurring) for (const ds of occurrences(r, t)) {
    rows.push({
      id: `${r.id}@${ds}`, recurringId: r.id, frequency: r.frequency, createdAt: r.createdAt, updatedAt: r.updatedAt,
      description: r.description, vendor: r.vendor, category: r.category, amount: r.amount, date: ds,
      itemId: r.itemId, groupId: r.groupId,
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

/* ---------- totals ---------- */
export type Totals = { kept: number; spent: number; net: number; monthly: number; sales: SaleRow[]; exps: ExpenseRow[] };

// keys: undefined = everything, otherwise the links to include.
export function recurringMonthly(d: Snapshot, keys?: Set<LinkKey>, t = today()) {
  return d.recurring.filter((r) => isActive(r, t) && (!keys || keys.has(keyOf(r)))).reduce((s, r) => s + perMonth(r), 0);
}

// Joined sales and expenses for a snapshot, worked out once per snapshot per day.
const derived = new WeakMap<Snapshot, { t: string; sales: SaleRow[]; exps: ExpenseRow[] }>();
export function derive(d: Snapshot) {
  const t = today();
  let v = derived.get(d);
  if (!v || v.t !== t) { v = { t, sales: salesJoined(d), exps: expensesAll(d, t) }; derived.set(d, v); }
  return v;
}

export function totalsFor(d: Snapshot, keys: Set<LinkKey> | undefined, rg: Range): Totals {
  const { sales: allS, exps: allE } = derive(d);
  const sales = allS.filter((x) => (!keys || keys.has(keyOf(x))) && inRange(x.date, rg));
  const exps = allE.filter((x) => (!keys || keys.has(keyOf(x))) && inRange(x.date, rg));
  const kept = sales.reduce((t, x) => t + x.net, 0), spent = exps.reduce((t, x) => t + x.amount, 0);
  return { kept, spent, net: kept - spent, sales, exps, monthly: recurringMonthly(d, keys) };
}

export const itemsIn = (d: Snapshot, groupId: string | null) =>
  d.items.filter((p) => (p.groupId || null) === groupId).sort((a, b) => a.name.localeCompare(b.name));
export const groupKeys = (d: Snapshot, groupId: string) => new Set<LinkKey>(["g:" + groupId, ...itemsIn(d, groupId).map((i) => "p:" + i.id)]);

export function groupByMonth<T extends { date: string }>(rows: T[], amount: (r: T) => number) {
  const out: { label: string; rows: T[]; total: number }[] = [], idx: { [k: string]: number } = {};
  for (const r of rows) {
    const label = monthLabel(r.date);
    if (!(label in idx)) { idx[label] = out.length; out.push({ label, rows: [], total: 0 }); }
    const b = out[idx[label]]; b.rows.push(r); b.total += amount(r);
  }
  return out;
}

// Money in and out for the last n months (oldest first).
export function trend(sales: SaleRow[], exps: ExpenseRow[], n = 6, now = new Date()) {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(ymd(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  return keys.map((k) => ({
    k,
    rev: sales.filter((s) => s.date.startsWith(k)).reduce((a, s) => a + s.net, 0),
    exp: exps.filter((e) => e.date.startsWith(k)).reduce((a, e) => a + e.amount, 0),
  }));
}
