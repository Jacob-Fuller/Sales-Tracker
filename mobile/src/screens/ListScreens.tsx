import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { byName, ExpenseItem, linkLabel, linkOptions, RecurringItem, SaleItem, useAdd, type AddKind } from "../components/rows";
import { AddRow, Avatar, Empty, Lead, List, MonthHead, Note, Row, Screen, SectionHead, Select, type IconName } from "../components/ui";
import { derive, groupByMonth, isActive, perMonth } from "../lib/calc";
import { keyOf } from "../lib/model";
import { useStore } from "../lib/store";
import { C, F } from "../theme";

/* ---------- Sales ---------- */
export function SalesScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const months = groupByMonth(derive(data).sales, (s) => s.net);
  const customers = (
    <Pressable accessibilityRole="button" onPress={() => nav.push("Customers")} style={{ alignSelf: "center", padding: 8 }}>
      <Text style={{ fontFamily: F.bold, color: C.ember, fontSize: 14.5 }}>Customers</Text>
    </Pressable>
  );
  if (!months.length) {
    return (
      <Screen>
        <Empty title="No sales yet" text="Record a sale and it'll appear here, with any store fee already taken off."
          button={{ label: "Record a sale", onPress: () => add("sale") }} />
        {customers}
      </Screen>
    );
  }
  return (
    <Screen>
      {months.map((m) => (
        <React.Fragment key={m.label}>
          <MonthHead label={m.label} total={money.money(m.total)} />
          <List>{m.rows.map((s) => <SaleItem key={s.id} s={s} />)}</List>
        </React.Fragment>
      ))}
      {customers}
    </Screen>
  );
}

/* ---------- Customers ---------- */
export function CustomersScreen() {
  const { data } = useStore();
  const nav = useNavigation<any>();
  const list = [...data.customers].sort(byName);
  return (
    <Screen>
      <List>
        {list.map((c) => {
          const n = data.sales.filter((s) => s.customerId === c.id).length;
          return <Row key={c.id} lead={<Avatar name={c.name} />} title={c.name} sub={c.email || c.phone || undefined}
            amount={String(n)} amountSub={n === 1 ? "sale" : "sales"} onPress={() => nav.navigate("Customer", { id: c.id })} />;
        })}
        <AddRow text="New customer" onPress={() => nav.navigate("Customer", {})} />
      </List>
    </Screen>
  );
}

/* ---------- Expenses ---------- */
export function ExpensesScreen() {
  const { data, money } = useStore();
  const add = useAdd();
  const [filter, setFilter] = useState("all");
  const opts = linkOptions(data, true);
  const f = opts.some((o) => o.value === filter) ? filter : "all";
  const match = (r: any) => f === "all" || keyOf(r) === f;
  const months = groupByMonth(derive(data).exps.filter(match), (e) => e.amount);
  const rec = data.recurring.filter(match).sort((a, b) => (Number(isActive(b)) - Number(isActive(a))) || perMonth(b) - perMonth(a));
  const monthly = rec.filter((r) => isActive(r)).reduce((t, r) => t + perMonth(r), 0);
  return (
    <Screen>
      {data.items.length || data.groups.length ? <Select value={f} options={opts} onChange={setFilter} /> : null}
      <SectionHead title="Recurring" meta={`${money.money(monthly)}/mo`} />
      <List>
        {rec.map((r) => <RecurringItem key={r.id} r={r} />)}
        <AddRow text="Add recurring cost" onPress={() => add("recurring", f !== "all" ? { link: f } : {})} />
      </List>
      {months.length ? months.map((m) => (
        <React.Fragment key={m.label}>
          <MonthHead label={m.label} total={money.money(m.total)} />
          <List>{m.rows.map((e) => <ExpenseItem key={e.id} e={e} />)}</List>
        </React.Fragment>
      )) : <Note>No expenses yet.</Note>}
    </Screen>
  );
}

/* ---------- Products ---------- */
export function ProductsScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const list = [...data.products].sort(byName);
  return (
    <Screen>
      {!list.length ? <Note>Add what you sell, like an app subscription, a print or a pair of earrings, so you can record sales.</Note> : null}
      <List>
        {list.map((p) => <Row key={p.id} lead={<Avatar name={p.name} />} title={p.name} sub={linkLabel(data, p)} amount={money.money(p.price)}
          onPress={() => nav.navigate("Product", { id: p.id })} />)}
        <AddRow text="New product" onPress={() => add("product")} />
      </List>
    </Screen>
  );
}

/* ---------- Add (menu used where there's no native action sheet) ---------- */
export function AddScreen() {
  const add = useAdd();
  const link = (useRoute<any>().params || {}).link;
  const choices: [AddKind, IconName, "sale" | "exp" | "recur" | "plain", string, string][] = [
    ["sale", "arrow-up", "sale", "Sale", "Money coming in"],
    ["expense", "arrow-down", "exp", "Expense", "A one-off cost"],
    ["recurring", "repeat", "recur", "Recurring cost", "A subscription or regular bill"],
    ["product", "cube-outline", "plain", "Product", "Something you sell"],
    ["group", "folder-outline", "plain", "Project", "A group of things you make or sell"],
  ];
  return (
    <Screen>
      <List>
        {choices.map(([k, icon, tone, t, s]) => (
          <Row key={k} lead={<Lead icon={icon} tone={tone} />} title={t} sub={s} chevron
            onPress={() => add(k, link ? { link } : {}, true)} />
        ))}
      </List>
    </Screen>
  );
}
