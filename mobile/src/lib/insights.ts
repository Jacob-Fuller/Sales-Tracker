// Figures for the Insights tab, the Home "coming up" list and the CSV export.
// Pure functions of a snapshot, so they're checked by logic.test.ts.
import { derive, inRange, nextDue, isActive, type ExpenseRow, type Range, type SaleRow } from "./calc.ts";
import { FREQS, MONTHS, keyOf, today, ymd, type Recurring, type Snapshot } from "./model.ts";

export type Slice = { key: string; name: string; v: number };

// Adds up rows by a key, biggest first.
export function sumBy<T>(rows: T[], key: (r: T) => string, name: (r: T) => string, amount: (r: T) => number): Slice[] {
  const map = new Map<string, Slice>();
  for (const r of rows) {
    const k = key(r);
    const cur = map.get(k) || { key: k, name: name(r), v: 0 };
    cur.v += amount(r);
    map.set(k, cur);
  }
  return [...map.values()].filter((x) => Math.abs(x.v) > 0.004).sort((a, b) => b.v - a.v);
}

// The first n slices, and everything after them folded into one "rest" slice.
export function topWithRest(slices: Slice[], n: number, restName = "Everything else"): Slice[] {
  if (slices.length <= n + 1) return slices;
  const rest = slices.slice(n).reduce((t, x) => t + x.v, 0);
  return [...slices.slice(0, n), { key: "__rest", name: restName, v: rest }];
}

// Money in, money out and profit for each of the last n months, oldest first.
export type MonthFig = { key: string; label: string; kept: number; spent: number; net: number };
export function monthly(d: Snapshot, n = 12, now = new Date()): MonthFig[] {
  const { sales, exps } = derive(d);
  const out: MonthFig[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = ymd(first).slice(0, 7);
    const kept = sales.filter((s) => s.date.startsWith(k)).reduce((a, s) => a + s.net, 0);
    const spent = exps.filter((e) => e.date.startsWith(k)).reduce((a, e) => a + e.amount, 0);
    out.push({ key: k, label: MONTHS[first.getMonth()].slice(0, 3), kept, spent, net: kept - spent });
  }
  return out;
}

export type Figures = {
  count: number; units: number; average: number; margin: number | null;
  fees: number; discounts: number; best: { label: string; net: number } | null;
};
// Headline numbers for a set of sales and expenses.
export function figures(sales: SaleRow[], exps: ExpenseRow[]): Figures {
  const kept = sales.reduce((a, s) => a + s.net, 0);
  const spent = exps.reduce((a, e) => a + e.amount, 0);
  const units = sales.reduce((a, s) => a + s.quantity, 0);
  const fees = sales.reduce((a, s) => a + s.feeAmount, 0);
  const discounts = sales.reduce((a, s) => {
    const full = s.discount >= 100 ? 0 : s.gross / (1 - (s.discount || 0) / 100);
    return a + (full - s.gross);
  }, 0);
  const byMonth = sumBy([...sales.map((s) => ({ k: s.date.slice(0, 7), v: s.net })), ...exps.map((e) => ({ k: e.date.slice(0, 7), v: -e.amount }))],
    (r) => r.k, (r) => r.k, (r) => r.v);
  const top = byMonth.length ? byMonth[0] : null;
  return {
    count: sales.length,
    units,
    average: sales.length ? kept / sales.length : 0,
    margin: kept > 0 ? (kept - spent) / kept : null,
    fees,
    discounts,
    best: top && top.v > 0 ? { label: monthName(top.key), net: top.v } : null,
  };
}
const monthName = (k: string) => { const [y, m] = k.split("-"); return `${MONTHS[+m - 1]} ${y}`; };

// Repeating costs due in the next `days` days (each cost once, at its next date).
export type Due = { r: Recurring; date: string; inDays: number };
export function comingUp(d: Snapshot, days = 30, t = today()): Due[] {
  const [y, m, dd] = t.split("-").map(Number);
  const limit = ymd(new Date(y, m - 1, dd + days));
  const base = new Date(y, m - 1, dd).getTime();
  const out: Due[] = [];
  for (const r of d.recurring) {
    if (!isActive(r, t)) continue;
    const nd = nextDue(r, t);
    if (!nd || nd > limit) continue;
    const [a, b, c] = nd.split("-").map(Number);
    out.push({ r, date: nd, inDays: Math.round((new Date(a, b - 1, c).getTime() - base) / 86400000) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.r.amount - a.r.amount);
}

// Tax to put aside on a profit (nothing on a loss).
export const taxAside = (profit: number, rate: number) => (profit > 0 && rate > 0 ? (profit * rate) / 100 : 0);

/* ---------- CSV ---------- */
const cell = (v: string | number) => {
  const s = typeof v === "number" ? v.toFixed(2) : String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (vals: (string | number)[]) => vals.map(cell).join(",");

// Sales then expenses in the range, one row each, for a spreadsheet or an accountant.
export function toCsv(d: Snapshot, rg: Range, projectOf: (r: { itemId: string | null; groupId: string | null }) => string): string {
  const { sales, exps } = derive(d);
  const rows: string[] = [line(["Type", "Date", "Description", "Project", "Channel / Category", "Quantity", "Discount %", "Fee %", "Gross", "Fees", "Amount"])];
  sales.filter((s) => inRange(s.date, rg)).slice().reverse().forEach((s) => rows.push(line([
    "Sale", s.date, s.productName, projectOf(s), s.channel, String(s.quantity), s.discount, s.fee, s.gross, s.feeAmount, s.net,
  ])));
  exps.filter((e) => inRange(e.date, rg)).slice().reverse().forEach((e) => rows.push(line([
    "Expense", e.date, e.description + (e.frequency ? ` (${(FREQS as any)[e.frequency]?.label || ""})` : ""), projectOf(e), e.category, "", "", "", "", "", -e.amount,
  ])));
  return rows.join("\n") + "\n";
}

export const sameKey = (a: { itemId: string | null; groupId: string | null }, key: string) => keyOf(a) === key;
