import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { byName, ExpenseCell, plural, projectName, projects, RecurringCell, SaleCell, useAdd, type AddKind } from "../components/rows";
import { Cell, Empty, Screen, Section } from "../components/ui";
import { derive, groupByMonth, isActive, perMonth, totalsFor, range } from "../lib/calc";
import { useStore } from "../lib/store";

/* ---------- Sales ---------- */
export function SalesScreen() {
  const { data, money } = useStore();
  const add = useAdd();
  const months = groupByMonth(derive(data).sales, (s) => s.net);
  if (!months.length) return <Screen><Empty icon="bag-handle-outline" title="No sales yet" button={{ label: "Add a Sale", onPress: () => add("sale") }} /></Screen>;
  return (
    <Screen>
      {months.map((m) => (
        <Section key={m.label} title={m.label} right={money.money(m.total)}>
          {m.rows.map((s) => <SaleCell key={s.id} s={s} />)}
        </Section>
      ))}
    </Screen>
  );
}

/* ---------- Expenses ---------- */
export function ExpensesScreen() {
  const { data, money } = useStore();
  const add = useAdd();
  const months = groupByMonth(derive(data).exps, (e) => e.amount);
  const rec = [...data.recurring].sort((a, b) => (Number(isActive(b)) - Number(isActive(a))) || perMonth(b) - perMonth(a));
  const monthly = rec.filter((r) => isActive(r)).reduce((t, r) => t + perMonth(r), 0);
  if (!months.length && !rec.length) return <Screen><Empty icon="receipt-outline" title="No expenses yet" button={{ label: "Add an Expense", onPress: () => add("expense") }} /></Screen>;
  return (
    <Screen>
      <Section title="Repeating" right={`${money.money(monthly)} a month`}>
        {rec.map((r) => <RecurringCell key={r.id} r={r} />)}
      </Section>
      {months.map((m) => (
        <Section key={m.label} title={m.label} right={money.money(m.total)}>
          {m.rows.map((e) => <ExpenseCell key={e.id} e={e} />)}
        </Section>
      ))}
    </Screen>
  );
}

/* ---------- Projects (from Settings) ---------- */
export function ProjectsScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const all = range("all");
  return (
    <Screen>
      <Section>
        {projects(data).map((p) => {
          const t = totalsFor(data, new Set([p.key]), all);
          return <Cell key={p.key} title={p.name} value={money.signed(t.net)} tone={t.net < 0 ? "loss" : "secondary"} chevron
            onPress={() => nav.push("ProjectDetail", { key: p.key })} />;
        })}
        <Cell title="Add Project" accent onPress={() => add("project")} />
      </Section>
    </Screen>
  );
}

/* ---------- Products (from Settings) ---------- */
export function ProductsScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  return (
    <Screen>
      <Section>
        {[...data.products].sort(byName).map((p) => {
          const n = data.sales.filter((s) => s.productId === p.id).length;
          return <Cell key={p.id} title={p.name} subtitle={[projectName(data, p), n ? plural(n, "sale") : null].filter(Boolean).join(" · ") || undefined}
            value={money.money(p.price)} tone="secondary" chevron onPress={() => nav.navigate("Product", { id: p.id })} />;
        })}
        <Cell title="Add Product" accent onPress={() => add("product")} />
      </Section>
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
