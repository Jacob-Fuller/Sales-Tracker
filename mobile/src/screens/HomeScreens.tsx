import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useLayoutEffect } from "react";
import { findProject, projects, useAdd } from "../components/rows";
import { Button, Cell, Empty, HeaderText, Screen, Section, Segmented, Summary } from "../components/ui";
import { range, totalsFor, type Period } from "../lib/calc";
import { useStore } from "../lib/store";
import { SaleCell, ExpenseCell } from "../components/rows";

export function usePeriod() {
  const { data, prefs, setPrefs } = useStore();
  const fy = data.settings.fyStartMonth;
  const options: { value: Period; label: string }[] = [
    { value: "month", label: "This month" },
    { value: "fy", label: fy === 1 ? "This year" : "Financial year" },
    { value: "all", label: "All time" },
  ];
  return { period: prefs.period, setPeriod: (p: Period) => setPrefs({ period: p }), rg: range(prefs.period, fy), options };
}

/* ---------- Home ---------- */
export function HomeScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const p = usePeriod();
  if (!data.sales.length && !data.expenses.length && !data.recurring.length) {
    return (
      <Screen>
        <Empty icon="wallet-outline" title="No sales or expenses yet" button={{ label: "Add a Sale", onPress: () => add("sale") }} />
        <Button plain title="Add an Expense" onPress={() => add("expense")} style={{ alignSelf: "center", marginTop: -14, paddingHorizontal: 24 }} />
      </Screen>
    );
  }
  const t = totalsFor(data, undefined, p.rg);
  const rows = projects(data)
    .map((pr) => ({ pr, t: totalsFor(data, new Set([pr.key]), p.rg) }))
    .filter((x) => x.t.sales.length || x.t.exps.length);
  const none = totalsFor(data, new Set(["general"]), p.rg);
  return (
    <Screen>
      <Segmented value={p.period} options={p.options} onChange={p.setPeriod} />
      <Summary net={money.signed(t.net)} moneyIn={money.money(t.kept)} moneyOut={money.money(t.spent)} />
      <Section title="Projects">
        {rows.map(({ pr, t: pt }) => (
          <Cell key={pr.key} title={pr.name} value={money.signed(pt.net)} tone={pt.net < 0 ? "loss" : undefined} chevron
            onPress={() => nav.push("ProjectDetail", { key: pr.key })} />
        ))}
        {rows.length && (none.sales.length || none.exps.length) ? (
          <Cell title="No project" value={money.signed(none.net)} tone={none.net < 0 ? "loss" : "secondary"} chevron
            onPress={() => nav.push("ProjectDetail", { key: "general" })} />
        ) : null}
      </Section>
    </Screen>
  );
}

/* ---------- One project ---------- */
export function ProjectDetailScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const { key } = useRoute<any>().params;
  const p = usePeriod();
  const pr = key === "general" ? null : findProject(data, key);
  useLayoutEffect(() => {
    nav.setOptions({
      title: key === "general" ? "No project" : pr ? pr.name : "Project",
      headerRight: pr ? () => <HeaderText label="Edit" onPress={() => nav.navigate("Project", { key })} /> : undefined,
    });
  }, [nav, key, pr && pr.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const gone = key !== "general" && !pr;
  useEffect(() => { if (gone && nav.canGoBack()) nav.goBack(); }, [gone, nav]);
  if (gone) return <Screen><Empty icon="folder-open-outline" title="Project deleted" /></Screen>;
  const t = totalsFor(data, new Set([key]), p.rg);
  const activity = [
    ...t.sales.map((s) => ({ d: s.date, c: s.createdAt, el: <SaleCell key={s.id} s={s} inProject /> })),
    ...t.exps.map((e) => ({ d: e.date, c: e.createdAt, el: <ExpenseCell key={e.id} e={e} inProject /> })),
  ].sort((a, b) => b.d.localeCompare(a.d) || b.c - a.c).slice(0, 60);
  return (
    <Screen>
      <Segmented value={p.period} options={p.options} onChange={p.setPeriod} />
      <Summary net={money.signed(t.net)} moneyIn={money.money(t.kept)} moneyOut={money.money(t.spent)} />
      <Section title="Activity">{activity.map((a) => a.el)}</Section>
    </Screen>
  );
}
