import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { byName, colorOf, ExpenseCell, plural, projectName, projects, RecurringCell, SaleCell, useAdd, type AddKind } from "../components/rows";
import { AddRow, BarButton, Cell, Dot, Empty, Screen, SearchField, Section, TopBar } from "../components/ui";
import { derive, groupByMonth, isActive, perMonth, totalsFor, range } from "../lib/calc";
import { FREQS } from "../lib/model";
import { useStore } from "../lib/store";
import { NUM, usePalette } from "../theme";
import { HideButton } from "./HomeScreens";

// Case-insensitive match on any of the words typed.
function matcher(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return (...fields: (string | null | undefined)[]) => {
    const hay = fields.filter(Boolean).join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  };
}

/* ---------- Sales ---------- */
export function SalesScreen() {
  const { data, money } = useStore();
  const add = useAdd();
  const c = usePalette();
  const [q, setQ] = useState("");
  const all = derive(data).sales;
  const shown = useMemo(() => {
    if (!q.trim()) return all;
    const m = matcher(q);
    return all.filter((s) => m(s.productName, s.channel, projectName(data, s)));
  }, [all, q, data]);
  const months = groupByMonth(shown, (s) => s.net);
  const bar = <TopBar title="Sales" right={<><HideButton /><BarButton icon="add" label="Add Sale" onPress={() => add("sale")} /></>} />;
  if (!all.length) {
    return <View style={{ flex: 1, backgroundColor: c.bg }}>{bar}<Screen header><Empty icon="bag-handle-outline" title="No sales yet"
      text="Each sale is kept after its discount and the store's fee." button={{ label: "Add a Sale", onPress: () => add("sale") }} /></Screen></View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {bar}
      <Screen header>
        <SearchField value={q} onChange={setQ} placeholder="Search sales" />
        {q.trim() ? <Found n={shown.length} word="sale" total={money.money(shown.reduce((a, s) => a + s.net, 0))} /> : null}
        {months.map((m) => (
          <Section key={m.label} title={m.label} right={money.money(m.total)}>
            {m.rows.map((s) => <SaleCell key={s.id} s={s} />)}
          </Section>
        ))}
      </Screen>
    </View>
  );
}

/* ---------- Expenses ---------- */
export function ExpensesScreen() {
  const { data, money } = useStore();
  const add = useAdd();
  const c = usePalette();
  const [q, setQ] = useState("");
  const m = matcher(q);
  const exps = derive(data).exps.filter((e) => !q.trim() || m(e.description, e.category, projectName(data, e)));
  const months = groupByMonth(exps, (e) => e.amount);
  const rec = [...data.recurring]
    .filter((r) => !q.trim() || m(r.description, r.category, projectName(data, r), (FREQS as any)[r.frequency]?.label))
    .sort((a, b) => (Number(isActive(b)) - Number(isActive(a))) || perMonth(b) - perMonth(a));
  const monthly = rec.filter((r) => isActive(r)).reduce((t, r) => t + perMonth(r), 0);
  const bar = <TopBar title="Expenses" right={<><HideButton /><BarButton icon="add" label="Add Expense" onPress={() => add("expense")} /></>} />;
  if (!data.expenses.length && !data.recurring.length) {
    return <View style={{ flex: 1, backgroundColor: c.bg }}>{bar}<Screen header><Empty icon="receipt-outline" title="No expenses yet"
      text="One-off costs and repeating ones like subscriptions." button={{ label: "Add an Expense", onPress: () => add("expense") }} /></Screen></View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {bar}
      <Screen header>
        <SearchField value={q} onChange={setQ} placeholder="Search expenses" />
        {q.trim() ? <Found n={exps.length} word="payment" total={money.money(exps.reduce((a, e) => a + e.amount, 0))} /> : null}
        <Section title="Repeating" right={`${money.money(monthly)} a month`}>
          {rec.map((r) => <RecurringCell key={r.id} r={r} />)}
        </Section>
        {months.map((mo) => (
          <Section key={mo.label} title={mo.label} right={money.money(mo.total)}>
            {mo.rows.map((e) => <ExpenseCell key={e.id} e={e} />)}
          </Section>
        ))}
      </Screen>
    </View>
  );
}

function Found({ n, word, total }: { n: number; word: string; total: string }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: -8 }}>
      <Txt color={c.secondary}>{n ? plural(n, word) + " found" : `No ${word}s match`}</Txt>
      {n ? <Txt color={c.text} bold>{total}</Txt> : null}
    </View>
  );
}
const Txt = ({ color, bold, children }: { color: string; bold?: boolean; children: React.ReactNode }) => (
  <Text style={[{ fontSize: 13.5, color, fontWeight: bold ? "600" : "400" }, NUM]}>{children}</Text>
);

/* ---------- Projects (from Settings) ---------- */
export function ProjectsScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const c = usePalette();
  const all = range("all");
  const list = projects(data);
  return (
    <Screen>
      <Section title="All time">
        {list.map((p) => {
          const t = totalsFor(data, new Set([p.key]), all);
          return <Cell key={p.key} lead={<Dot color={c.sw[p.color]} />} title={p.name} value={money.signed(t.net)} tone={t.net < 0 ? "loss" : "secondary"} chevron
            onPress={() => nav.push("ProjectDetail", { key: p.key })} />;
        })}
      </Section>
      <AddRow label="Add project" onPress={() => add("project")} />
    </Screen>
  );
}

/* ---------- Products (from Settings) ---------- */
export function ProductsScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const c = usePalette();
  return (
    <Screen>
      <Section>
        {[...data.products].sort(byName).map((p) => {
          const n = data.sales.filter((s) => s.productId === p.id).length;
          return <Cell key={p.id} lead={<Dot color={colorOf(c, data, p)} size={8} />} title={p.name}
            subtitle={[projectName(data, p), n ? plural(n, "sale") : null].filter(Boolean).join(" · ") || undefined}
            value={money.money(p.price)} tone="secondary" chevron onPress={() => nav.navigate("Product", { id: p.id })} />;
        })}
      </Section>
      <AddRow label="Add product" onPress={() => add("product")} />
    </Screen>
  );
}

/* ---------- Add (where there's no native action sheet) ---------- */
export function AddScreen() {
  const add = useAdd();
  const params = useRoute<any>().params || {};
  const choices: [AddKind, string][] = [["sale", "Sale"], ["expense", "Expense"]];
  return (
    <Screen>
      <Section>{choices.map(([k, t]) => <Cell key={k} title={t} chevron onPress={() => add(k, params, true)} />)}</Section>
    </Screen>
  );
}
