// Financial-year report for tax time: totals, income and expenses broken down,
// and every sale and expense listed. Built as HTML and printed to PDF.
import { expensesAll, inRange, salesJoined, type ExpenseRow, type Range, type SaleRow } from "./calc.ts";
import { longDate, MONTHS, ymd, type Snapshot } from "./model.ts";

export type TaxYear = { start: number; range: Range; label: string; short: string };

// The financial year that starts in `startYear` (e.g. 2025 → 1 Jul 2025 to 30 Jun 2026).
export function taxYear(startYear: number, fyStartMonth: number): TaxYear {
  const sm = fyStartMonth - 1;
  const from = new Date(startYear, sm, 1), to = new Date(startYear, sm + 12, 1), last = new Date(startYear, sm + 12, 0);
  const crosses = fyStartMonth !== 1;
  return {
    start: startYear,
    range: { from: ymd(from), to: ymd(to) },
    label: `${longDate(ymd(from))} to ${longDate(ymd(last))}`,
    short: crosses ? `${startYear}–${String(startYear + 1).slice(2)}` : String(startYear),
  };
}

// Financial years that have any records, newest first (always includes the current one).
export function taxYears(d: Snapshot, fyStartMonth: number, now = new Date()): TaxYear[] {
  const sm = fyStartMonth - 1;
  const fyOf = (dt: Date) => (dt.getMonth() >= sm ? dt.getFullYear() : dt.getFullYear() - 1);
  const current = fyOf(now);
  let earliest = current;
  const dates = [...d.sales.map((s) => s.date), ...d.expenses.map((e) => e.date), ...d.recurring.map((r) => r.startDate)];
  for (const ds of dates) {
    const [y, m] = ds.split("-").map(Number);
    if (y && m) earliest = Math.min(earliest, fyOf(new Date(y, m - 1, 1)));
  }
  earliest = Math.max(earliest, current - 15);
  const out: TaxYear[] = [];
  for (let y = current; y >= earliest; y--) out.push(taxYear(y, fyStartMonth));
  return out;
}

export type TaxData = {
  sales: SaleRow[]; exps: ExpenseRow[];
  gross: number; fees: number; net: number; spent: number; profit: number;
  byMonth: { label: string; income: number; expenses: number }[];
  byCategory: { name: string; amount: number; count: number }[];
  byChannel: { name: string; gross: number; fees: number; net: number; count: number }[];
};

export function taxData(d: Snapshot, ty: TaxYear, today = ymd(new Date())): TaxData {
  const sales = salesJoined(d).filter((s) => inRange(s.date, ty.range)).sort((a, b) => a.date.localeCompare(b.date));
  const exps = expensesAll(d, today).filter((e) => inRange(e.date, ty.range)).sort((a, b) => a.date.localeCompare(b.date));
  const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
  const gross = sum(sales.map((s) => s.gross)), fees = sum(sales.map((s) => s.feeAmount)), net = gross - fees;
  const spent = sum(exps.map((e) => e.amount));
  const byMonth: TaxData["byMonth"] = [];
  const [fy, fm] = ty.range.from.split("-").map(Number);
  for (let i = 0; i < 12; i++) {
    const dt = new Date(fy, fm - 1 + i, 1), k = ymd(dt).slice(0, 7);
    byMonth.push({
      label: `${MONTHS[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`,
      income: sum(sales.filter((s) => s.date.startsWith(k)).map((s) => s.net)),
      expenses: sum(exps.filter((e) => e.date.startsWith(k)).map((e) => e.amount)),
    });
  }
  const cat: { [k: string]: { amount: number; count: number } } = {};
  exps.forEach((e) => { const c = (cat[e.category || "Other"] = cat[e.category || "Other"] || { amount: 0, count: 0 }); c.amount += e.amount; c.count++; });
  const ch: { [k: string]: { gross: number; fees: number; count: number } } = {};
  sales.forEach((s) => { const c = (ch[s.channel || "Other"] = ch[s.channel || "Other"] || { gross: 0, fees: 0, count: 0 }); c.gross += s.gross; c.fees += s.feeAmount; c.count++; });
  return {
    sales, exps, gross, fees, net, spent, profit: net - spent, byMonth,
    byCategory: Object.entries(cat).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount),
    byChannel: Object.entries(ch).map(([name, v]) => ({ name, ...v, net: v.gross - v.fees })).sort((a, b) => b.net - a.net),
  };
}

const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function taxReportHtml(d: Snapshot, ty: TaxYear, money: (n: number) => string, opts: { generated?: Date; linkLabel: (r: any) => string }): string {
  const t = taxData(d, ty);
  const m = (n: number) => esc(money(n));
  const signed = (n: number) => (n < 0 ? "−" : "") + m(Math.abs(n));
  const customers: { [id: string]: string } = {};
  d.customers.forEach((c) => { customers[c.id] = c.name; });
  const gen = opts.generated || new Date();
  const row = (cells: string[], cls = "") => `<tr${cls ? ` class="${cls}"` : ""}>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  const head = (cells: string[]) => `<tr>${cells.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const empty = (n: number, text: string) => `<tr><td colspan="${n}" class="none">${text}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #141824; font-size: 9.5pt; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 2pt; letter-spacing: -0.3pt; }
  h2 { font-size: 12pt; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 1.5pt solid #FF7A45; }
  .sub { color: #5b6275; font-size: 10pt; }
  .brand { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3pt solid #141824; padding-bottom: 8pt; margin-bottom: 12pt; }
  .brand .app { font-weight: 800; color: #FF7A45; font-size: 10pt; letter-spacing: 0.5pt; text-transform: uppercase; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; }
  .tile { border: 1pt solid #dfe2ea; border-radius: 6pt; padding: 8pt 10pt; }
  .tile .l { color: #5b6275; font-size: 8.5pt; }
  .tile .v { font-size: 14pt; font-weight: 700; margin-top: 2pt; font-variant-numeric: tabular-nums; }
  .tile.hero { background: #141824; color: #fff; border-color: #141824; }
  .tile.hero .l { color: #c6cbe0; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th { text-align: left; font-size: 8pt; color: #5b6275; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3pt; padding: 4pt 5pt; border-bottom: 1pt solid #c9cdd8; }
  td { padding: 4pt 5pt; border-bottom: 0.5pt solid #e7e9ef; vertical-align: top; }
  th.n, td.n, .num td:nth-child(n+2), .num th:nth-child(n+2) { text-align: right; }
  tr.total td { font-weight: 700; border-top: 1pt solid #141824; border-bottom: none; }
  td.none { color: #8a90a3; text-align: center; padding: 10pt; }
  .r { text-align: right; }
  .muted { color: #8a90a3; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .foot { margin-top: 16pt; color: #8a90a3; font-size: 8pt; }
  </style></head><body>
  <div class="brand"><div><h1>Financial year ${esc(ty.short)}</h1><div class="sub">${esc(ty.label)}</div></div><div class="app">Profit Pocket</div></div>

  <div class="tiles">
    <div class="tile"><div class="l">Sales (before fees)</div><div class="v">${m(t.gross)}</div></div>
    <div class="tile"><div class="l">Store fees</div><div class="v">${m(t.fees)}</div></div>
    <div class="tile"><div class="l">Income after fees</div><div class="v">${m(t.net)}</div></div>
    <div class="tile"><div class="l">Expenses</div><div class="v">${m(t.spent)}</div></div>
    <div class="tile"><div class="l">Number of sales</div><div class="v">${t.sales.length}</div></div>
    <div class="tile hero"><div class="l">Net profit</div><div class="v">${signed(t.profit)}</div></div>
  </div>

  <h2>By month</h2>
  <table class="num"><thead>${head(["Month", "Income after fees", "Expenses", "Profit"])}</thead><tbody>
    ${t.byMonth.map((x) => row([esc(x.label), m(x.income), m(x.expenses), signed(x.income - x.expenses)])).join("")}
    ${row(["Total", m(t.net), m(t.spent), signed(t.profit)], "total")}
  </tbody></table>

  <h2>Expenses by category</h2>
  <table class="num"><thead>${head(["Category", "Items", "Amount"])}</thead><tbody>
    ${t.byCategory.length ? t.byCategory.map((c) => row([esc(c.name), String(c.count), m(c.amount)])).join("") : empty(3, "No expenses")}
    ${t.byCategory.length ? row(["Total", String(t.exps.length), m(t.spent)], "total") : ""}
  </tbody></table>

  <h2>Sales by channel</h2>
  <table class="num"><thead>${head(["Channel", "Sales", "Before fees", "Fees", "After fees"])}</thead><tbody>
    ${t.byChannel.length ? t.byChannel.map((c) => row([esc(c.name), String(c.count), m(c.gross), m(c.fees), m(c.net)])).join("") : empty(5, "No sales")}
    ${t.byChannel.length ? row(["Total", String(t.sales.length), m(t.gross), m(t.fees), m(t.net)], "total") : ""}
  </tbody></table>

  <h2>All sales</h2>
  <table><thead><tr><th>Date</th><th>Product</th><th>Channel</th><th>Customer</th><th class="n">Qty</th><th class="n">Before fees</th><th class="n">Fee</th><th class="n">After fees</th></tr></thead><tbody>
    ${t.sales.length ? t.sales.map((s) => `<tr><td>${esc(longDate(s.date))}</td><td>${esc(s.productName)}${s.discount ? `<div class="muted">${esc(s.discount)}% discount</div>` : ""}</td><td>${esc(s.channel)}</td><td>${esc(s.customerId ? customers[s.customerId] || "" : "")}</td><td class="r">${s.quantity}</td><td class="r">${m(s.gross)}</td><td class="r">${m(s.feeAmount)}</td><td class="r">${m(s.net)}</td></tr>`).join("") : empty(8, "No sales")}
    ${t.sales.length ? `<tr class="total"><td colspan="5">Total</td><td class="r">${m(t.gross)}</td><td class="r">${m(t.fees)}</td><td class="r">${m(t.net)}</td></tr>` : ""}
  </tbody></table>

  <h2>All expenses</h2>
  <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Paid to</th><th>For</th><th class="n">Amount</th></tr></thead><tbody>
    ${t.exps.length ? t.exps.map((e) => `<tr><td>${esc(longDate(e.date))}</td><td>${esc(e.description)}${e.recurringId ? `<div class="muted">Recurring</div>` : ""}</td><td>${esc(e.category)}</td><td>${esc(e.vendor)}</td><td>${esc(opts.linkLabel(e))}</td><td class="r">${m(e.amount)}</td></tr>`).join("") : empty(6, "No expenses")}
    ${t.exps.length ? `<tr class="total"><td colspan="5">Total</td><td class="r">${m(t.spent)}</td></tr>` : ""}
  </tbody></table>

  <div class="foot">Generated by Profit Pocket on ${esc(longDate(ymd(gen)))}. Amounts as recorded in the app, in ${esc(d.settings.currency)}. Recurring costs are counted on each payment date up to the day this report was made.</div>
  </body></html>`;
}
