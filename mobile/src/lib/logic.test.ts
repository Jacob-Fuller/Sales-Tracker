// Checks the money maths, sync merge and delete rules.
// Run: node --experimental-strip-types src/lib/logic.test.ts
import assert from "node:assert/strict";
import { addRecord, patchRecord, removeRecord } from "./actions.ts";
import { expensesAll, groupKeys, nextDue, occurrences, range, recurringMonthly, salesJoined, totalsFor, trend } from "./calc.ts";
import { mergeSnapshots, sameSnapshot, buildHistory } from "./merge.ts";
import { emptySnapshot, normaliseSnapshot, keyOf, parseKey, type Snapshot } from "./model.ts";
import { taxData, taxReportHtml, taxYear, taxYears } from "./taxReport.ts";
import { comingUp, figures, monthly, sumBy, taxAside, toCsv, topWithRest } from "./insights.ts";

let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };

function sample(): Snapshot {
  const d = emptySnapshot();
  const g = addRecord(d, "groups", { name: "iOS Applications" }, 1);
  const a = addRecord(d, "items", { name: "Roster App", groupId: g, status: "Live", logo: null, iconText: null, iconHue: null }, 1);
  const b = addRecord(d, "items", { name: "Learning App", groupId: g, status: "Live", logo: null, iconText: null, iconHue: null }, 1);
  const p = addRecord(d, "products", { name: "Monthly", price: 10, itemId: a, groupId: null }, 1);
  addRecord(d, "products", { name: "Lifetime", price: 50, itemId: b, groupId: null }, 1);
  addRecord(d, "sales", { productId: p, customerId: null, quantity: 3, discount: 10, fee: 15, channel: "App Store", date: "2026-08-05" }, 2);
  addRecord(d, "expenses", { amount: 20, description: "Icons", category: "Other", vendor: "", date: "2026-08-10", itemId: a, groupId: null }, 3);
  addRecord(d, "recurring", { amount: 30, description: "AI subscription", category: "AI tools", vendor: "", frequency: "monthly",
    startDate: "2026-01-31", endDate: null, itemId: null, groupId: g }, 4);
  return d;
}

test("sale after discount and store fee", () => {
  const s = salesJoined(sample())[0];
  assert.equal(s.gross.toFixed(2), "27.00");
  assert.equal(s.feeAmount.toFixed(2), "4.05");
  assert.equal(s.net.toFixed(2), "22.95");
});

test("monthly payments land on the last day in short months", () => {
  const r = sample().recurring[0];
  assert.deepEqual(occurrences(r, "2026-04-30"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.equal(nextDue(r, "2026-02-28"), "2026-03-31");
});

test("weekly and stopped recurring costs", () => {
  const d = sample();
  const r = { ...d.recurring[0], frequency: "weekly" as const, startDate: "2026-01-01", endDate: "2026-01-20" };
  assert.deepEqual(occurrences(r, "2026-12-31"), ["2026-01-01", "2026-01-08", "2026-01-15"]);
  d.recurring[0].endDate = "2000-01-01";
  assert.equal(recurringMonthly(d), 0);
});

test("financial year ranges", () => {
  assert.deepEqual(range("fy", 7, new Date(2026, 9, 11)), { from: "2026-07-01", to: "2027-07-01" });
  assert.deepEqual(range("fy", 7, new Date(2026, 2, 1)), { from: "2025-07-01", to: "2026-07-01" });
  assert.deepEqual(range("fy", 1, new Date(2026, 2, 1)), { from: "2026-01-01", to: "2027-01-01" });
  assert.deepEqual(range("month", 7, new Date(2026, 11, 15)), { from: "2026-12-01", to: "2027-01-01" });
});

test("shared project costs count for the project but not its items", () => {
  const d = sample();
  const all = { from: "0000", to: "9999" };
  const g = d.groups[0].id, a = d.items[0].id;
  const proj = totalsFor(d, groupKeys(d, g), all);
  const item = totalsFor(d, new Set(["p:" + a]), all);
  assert.ok(proj.exps.some((e) => e.recurringId));
  assert.ok(!item.exps.some((e) => e.recurringId));
  assert.equal(item.spent, 20);
  assert.equal(proj.monthly, 30);
  assert.equal(item.monthly, 0);
});

test("trend covers the last six months", () => {
  const d = sample();
  const t = trend(salesJoined(d), expensesAll(d, "2026-10-11"), 6, new Date(2026, 9, 11));
  assert.deepEqual(t.map((x) => x.k), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.equal(t[3].rev.toFixed(2), "22.95");
  assert.equal(t[3].exp, 50);
});

test("deleting an item moves its costs to General", () => {
  const d = sample();
  const a = d.items[0].id;
  const tombs: string[] = [];
  removeRecord(d, "items", a, (id) => tombs.push(id), 9);
  assert.equal(d.items.length, 1);
  assert.equal(d.products[0].itemId, null);
  assert.equal(keyOf(d.expenses[0]), "general");
  assert.deepEqual(tombs, [a]);
});

test("deleting a project keeps its items", () => {
  const d = sample();
  removeRecord(d, "groups", d.groups[0].id, () => {}, 9);
  assert.equal(d.items.length, 2);
  assert.ok(d.items.every((i) => i.groupId === null));
  assert.equal(d.recurring[0].groupId, null);
});

test("merge keeps both devices' new records and the newest edit", () => {
  const base = sample();
  const phone = JSON.parse(JSON.stringify(base)) as Snapshot;
  const ipad = JSON.parse(JSON.stringify(base)) as Snapshot;
  addRecord(phone, "customers", { name: "A", email: "", phone: "" }, 10);
  addRecord(ipad, "customers", { name: "B", email: "", phone: "" }, 11);
  patchRecord(phone, "groups", base.groups[0].id, { name: "Old name" }, 12);
  patchRecord(ipad, "groups", base.groups[0].id, { name: "New name" }, 13);
  const m = mergeSnapshots(phone, normaliseSnapshot(ipad));
  assert.equal(m.customers.length, 2);
  assert.equal(m.groups[0].name, "New name");
});

test("merge respects deletions but not later edits", () => {
  const base = sample();
  const phone = JSON.parse(JSON.stringify(base)) as Snapshot;
  const ipad = JSON.parse(JSON.stringify(base)) as Snapshot;
  const id = base.expenses[0].id;
  removeRecord(phone, "expenses", id, (x) => { phone.tombstones[x] = 20; }, 20);
  let m = mergeSnapshots(phone, normaliseSnapshot(ipad));
  assert.ok(!m.expenses.some((e) => e.id === id));
  patchRecord(ipad, "expenses", id, { amount: 99 }, 30);
  m = mergeSnapshots(phone, normaliseSnapshot(ipad));
  assert.equal(m.expenses.find((e) => e.id === id)?.amount, 99);
});

test("normalise survives junk and keeps settings", () => {
  const s = normaliseSnapshot({ sales: [null, { id: "x" }], settings: { currency: "usd", fyStartMonth: 40, channels: [] }, groups: "nope" });
  assert.equal(s.sales.length, 0);
  assert.equal(s.groups.length, 0);
  assert.equal(s.settings.currency, "AUD");
  assert.equal(s.settings.fyStartMonth, 12);
  assert.ok(s.settings.channels.length > 0);
  assert.ok(sameSnapshot(s, normaliseSnapshot(JSON.parse(JSON.stringify(s)))));
});

test("links round-trip", () => {
  assert.equal(keyOf(parseKey("g:abc")), "g:abc");
  assert.equal(keyOf(parseKey("p:abc")), "p:abc");
  assert.equal(keyOf(parseKey("general")), "general");
});

test("backup history only adds when there is data", () => {
  assert.equal(buildHistory(emptySnapshot()).length, 0);
  assert.equal(buildHistory(sample()).length, 1);
});

test("financial year ranges and labels", () => {
  const au = taxYear(2025, 7);
  assert.deepEqual(au.range, { from: "2025-07-01", to: "2026-07-01" });
  assert.equal(au.short, "2025–26");
  assert.equal(au.label, "1 Jul 2025 to 30 Jun 2026");
  const us = taxYear(2026, 1);
  assert.equal(us.short, "2026");
  assert.equal(us.label, "1 Jan 2026 to 31 Dec 2026");
});

test("tax years go back to the earliest record", () => {
  const d = sample();
  const ys = taxYears(d, 7, new Date(2026, 9, 12));
  assert.deepEqual(ys.map((y) => y.short), ["2026–27", "2025–26"]);
});

test("tax report totals", () => {
  const d = sample();
  const t = taxData(d, taxYear(2026, 7), "2026-10-12");
  assert.equal(t.sales.length, 1);
  assert.equal(t.gross.toFixed(2), "27.00");
  assert.equal(t.fees.toFixed(2), "4.05");
  // icons 20 + AI subscription Jul, Aug, Sep, Oct (31st clamps) = 20 + 30*3 (Jul 31, Aug 31, Sep 30); Oct 31 not yet due
  assert.equal(t.spent, 20 + 90);
  assert.equal(t.profit.toFixed(2), (22.95 - 110).toFixed(2));
  assert.equal(t.byMonth.length, 12);
  assert.equal(t.byMonth[1].label, "Aug 2026");
  assert.equal(t.byCategory[0].name, "AI tools");
  const html = taxReportHtml(d, taxYear(2026, 7), (n) => "$" + n.toFixed(2), { linkLabel: () => "x", generated: new Date(2026, 9, 12) });
  assert.ok(html.includes("2026–27") && html.includes("$22.95"));
});

test("insights: totals by key, top-n with rest", () => {
  const rows = [{ k: "a", v: 5 }, { k: "b", v: 1 }, { k: "a", v: 2 }, { k: "c", v: 3 }, { k: "d", v: 0.5 }];
  const s = sumBy(rows, (r) => r.k, (r) => r.k.toUpperCase(), (r) => r.v);
  assert.deepEqual(s.map((x) => [x.key, x.v]), [["a", 7], ["c", 3], ["b", 1], ["d", 0.5]]);
  const t = topWithRest(s, 2);
  assert.deepEqual(t.map((x) => [x.name, x.v]), [["A", 7], ["C", 3], ["Everything else", 1.5]]);
  assert.equal(topWithRest(s, 3).length, 4); // one left over: shown as itself
});

test("insights: monthly figures and headline numbers", () => {
  const d = sample();
  const m = monthly(d, 12, new Date(2026, 7, 20));
  assert.equal(m.length, 12);
  assert.equal(m[11].key, "2026-08");
  assert.equal(m[11].label, "Aug");
  assert.equal(m[11].kept.toFixed(2), "22.95");
  assert.equal(m[11].spent, 20 + 30); // icons + the Aug 31 AI payment (past by the real today)
  const f = figures(salesJoined(d), [{ amount: 20, date: "2026-08-10" } as any]);
  assert.equal(f.count, 1);
  assert.equal(f.units, 3);
  assert.equal(f.average.toFixed(2), "22.95");
  assert.equal(f.fees.toFixed(2), "4.05");
  assert.equal(f.discounts.toFixed(2), "3.00");
  assert.equal((f.margin as number).toFixed(4), ((22.95 - 20) / 22.95).toFixed(4));
});

test("coming up: next payment of each repeating cost within the window", () => {
  const d = sample();
  addRecord(d, "recurring", { amount: 5, description: "Weekly", category: "Other", vendor: "", frequency: "weekly",
    startDate: "2026-08-03", endDate: null, itemId: null, groupId: null }, 5);
  addRecord(d, "recurring", { amount: 9, description: "Stopped", category: "Other", vendor: "", frequency: "monthly",
    startDate: "2026-01-01", endDate: "2026-03-01", itemId: null, groupId: null }, 5);
  const u = comingUp(d, 30, "2026-08-20");
  assert.deepEqual(u.map((x) => [x.r.description, x.date, x.inDays]), [["Weekly", "2026-08-24", 4], ["AI subscription", "2026-08-31", 11]]);
  assert.equal(comingUp(d, 3, "2026-08-20").length, 0);
});

test("tax set-aside and CSV export", () => {
  assert.equal(taxAside(1000, 25), 250);
  assert.equal(taxAside(-50, 25), 0);
  assert.equal(taxAside(1000, 0), 0);
  const d = sample();
  d.products[0].name = 'Monthly, "Pro"';
  const csv = toCsv(d, range("all"), () => "Roster App");
  const lines = csv.trim().split("\n");
  assert.equal(lines[0].split(",")[0], "Type");
  assert.ok(lines.some((l) => l.startsWith('Sale,2026-08-05,"Monthly, ""Pro""",Roster App,App Store,3,10.00,15.00,27.00,4.05,22.95')));
  assert.ok(lines.some((l) => l.startsWith("Expense,2026-08-10,Icons,Roster App,Other,,,,,,-20.00")));
});

test("old saved data gets the new fields", () => {
  const d = normaliseSnapshot({ items: [{ id: "x", name: "A" }], groups: [{ id: "g", name: "G", color: "teal" }], settings: { taxRate: 99 } });
  assert.equal(d.items[0].color, null);
  assert.equal(d.groups[0].color, "teal");
  assert.equal(d.settings.taxRate, 60);
  assert.equal(normaliseSnapshot({}).settings.taxRate, 0);
});

console.log(`${n} checks passed`);
