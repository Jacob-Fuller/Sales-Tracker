import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useLayoutEffect } from "react";
import { Text, View } from "react-native";
import { ExpenseCell, findProject, plural, projects, RecurringCell, SaleCell, useAdd, useAddMenu } from "../components/rows";
import {
  AddRow, BarButton, Button, Cell, ColumnHead, Dot, Empty, HeaderText, Hero, Screen, Section, Segmented, TopBar, TotalRow,
} from "../components/ui";
import { isActive, perMonth, range, totalsFor, type Period } from "../lib/calc";
import { comingUp, sumBy, taxAside } from "../lib/insights";
import { keyOf, shortDate } from "../lib/model";
import { useStore } from "../lib/store";
import { usePalette } from "../theme";

export function usePeriod() {
  const { data, prefs, setPrefs } = useStore();
  const fy = data.settings.fyStartMonth;
  const options: { value: Period; label: string }[] = [
    { value: "month", label: "This month" },
    { value: "fy", label: fy === 1 ? "This year" : "Financial year" },
    { value: "all", label: "All time" },
  ];
  const label = { month: "this month", fy: fy === 1 ? "this year" : "this financial year", all: "all time" }[prefs.period];
  return { period: prefs.period, setPeriod: (p: Period) => setPrefs({ period: p }), rg: range(prefs.period, fy), options, label };
}

// The eye button: shows amounts as dots, for opening the app in front of people.
export function HideButton() {
  const { prefs, setPrefs } = useStore();
  return <BarButton icon={prefs.hide ? "eye-off-outline" : "eye-outline"} label={prefs.hide ? "Show amounts" : "Hide amounts"}
    onPress={() => setPrefs({ hide: !prefs.hide })} />;
}
export function SettingsButton() {
  const nav = useNavigation<any>();
  return <BarButton icon="settings-outline" label="Settings" onPress={() => nav.push("Settings")} />;
}

const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

/* ---------- Home ---------- */
export function HomeScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const menu = useAddMenu();
  const c = usePalette();
  const p = usePeriod();
  const bar = (
    <TopBar title="Accounting Board" right={<><HideButton /><SettingsButton /><BarButton icon="add" label="Add" onPress={menu} /></>}>
      <Segmented value={p.period} options={p.options} onChange={p.setPeriod} />
    </TopBar>
  );
  if (!data.sales.length && !data.expenses.length && !data.recurring.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {bar}
        <Screen header>
          <Empty icon="wallet-outline" title="No sales or expenses yet" text="Log a sale or an expense and your profit shows up here."
            button={{ label: "Add a Sale", onPress: () => add("sale") }} />
          <Button plain title="Add an Expense" onPress={() => add("expense")} style={{ alignSelf: "center", marginTop: -14, paddingHorizontal: 24 }} />
        </Screen>
      </View>
    );
  }
  const t = totalsFor(data, undefined, p.rg);
  const rate = data.settings.taxRate;
  const aside = taxAside(t.net, rate);
  const margin = t.kept > 0 ? t.net / t.kept : null;
  const rows = projects(data)
    .map((pr) => ({ pr, t: totalsFor(data, new Set([pr.key]), p.rg) }))
    .filter((x) => x.t.sales.length || x.t.exps.length)
    .sort((a, b) => b.t.net - a.t.net);
  const none = totalsFor(data, new Set(["general"]), p.rg);
  const due = comingUp(data, 30);
  const dueTotal = due.reduce((a, x) => a + x.r.amount, 0);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {bar}
      <Screen header>
        <Hero label={`Profit ${p.label}`} value={money.signed(t.net)} negative={t.net < 0}
          note={rate > 0 ? (aside > 0 ? `Put aside ${money.money(aside)} for tax (${rate}%)` : "No tax to put aside on a loss") : undefined}
          stats={[
            { k: "In", v: money.whole(t.kept) },
            { k: "Out", v: money.whole(t.spent) },
            { k: "Margin", v: pct(margin), tone: margin != null && margin < 0 ? "loss" : undefined },
          ]} />

        {rows.length || none.sales.length || none.exps.length ? (
          <Section title="Projects">
            <ColumnHead left="Project" right="Profit" />
            {rows.map(({ pr, t: pt }) => (
              <Cell key={pr.key} lead={<Dot color={c.sw[pr.color]} />} title={pr.name}
                subtitle={`In ${money.whole(pt.kept)} · Out ${money.whole(pt.spent)}`}
                value={money.signed(pt.net)} tone={pt.net < 0 ? "loss" : "gain"}
                onPress={() => nav.push("ProjectDetail", { key: pr.key })} />
            ))}
            {none.sales.length || none.exps.length ? (
              <Cell lead={<Dot color={c.other} />} title="No project" subtitle={`In ${money.whole(none.kept)} · Out ${money.whole(none.spent)}`}
                value={money.signed(none.net)} tone={none.net < 0 ? "loss" : "gain"}
                onPress={() => nav.push("ProjectDetail", { key: "general" })} />
            ) : null}
            <TotalRow label="Total" value={money.signed(t.net)} tone={t.net < 0 ? "loss" : "gain"} />
          </Section>
        ) : null}

        {due.length ? (
          <Section title="Coming up" right={`${money.money(dueTotal)} in 30 days`}>
            {due.slice(0, 5).map((x) => (
              <Cell key={x.r.id} lead={<DateBadge date={x.date} />} title={x.r.description}
                subtitle={x.inDays === 0 ? "Today" : x.inDays === 1 ? "Tomorrow" : `In ${plural(x.inDays, "day")}`}
                value={money.money(x.r.amount)} onPress={() => nav.navigate("Expense", { id: x.r.id, recurring: true })} />
            ))}
          </Section>
        ) : null}

        <AddRow label="Add project" onPress={() => add("project")} />
      </Screen>
    </View>
  );
}

// A small calendar-style day badge.
function DateBadge({ date }: { date: string }) {
  const c = usePalette();
  const [d, m] = shortDate(date).split(" ");
  return (
    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.sunk, alignItems: "center", justifyContent: "center" }}>
      <Text10 color={c.accent}>{m.toUpperCase()}</Text10>
      <Text16 color={c.text}>{d}</Text16>
    </View>
  );
}
const Text10 = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <Text style={{ fontSize: 9.5, fontWeight: "700", letterSpacing: 0.6, color, marginBottom: -1 }}>{children}</Text>
);
const Text16 = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <Text style={{ fontSize: 16, fontWeight: "700", color }}>{children}</Text>
);

/* ---------- One project ---------- */
export function ProjectDetailScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const c = usePalette();
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
  const color = pr ? c.sw[pr.color] : c.other;
  const t = totalsFor(data, new Set([key]), p.rg);
  const rec = data.recurring.filter((r) => keyOf(r) === key)
    .sort((a, b) => (Number(isActive(b)) - Number(isActive(a))) || perMonth(b) - perMonth(a));
  const monthly = rec.filter((r) => isActive(r)).reduce((a, r) => a + perMonth(r), 0);
  const best = sumBy(t.sales, (s) => s.productId, (s) => s.productName, (s) => s.net).slice(0, 5);
  const units = (id: string) => t.sales.filter((s) => s.productId === id).reduce((a, s) => a + s.quantity, 0);
  const activity = [
    ...t.sales.map((s) => ({ d: s.date, c: s.createdAt, el: <SaleCell key={s.id} s={s} inProject /> })),
    ...t.exps.map((e) => ({ d: e.date, c: e.createdAt, el: <ExpenseCell key={e.id} e={e} inProject /> })),
  ].sort((a, b) => b.d.localeCompare(a.d) || b.c - a.c).slice(0, 40);
  const params = { key };
  return (
    <Screen>
      <Segmented value={p.period} options={p.options} onChange={p.setPeriod} />
      <Hero label={`Profit ${p.label}`} value={money.signed(t.net)} negative={t.net < 0}
        stats={[{ k: "In", v: money.whole(t.kept) }, { k: "Out", v: money.whole(t.spent) }, { k: "Costs / mo", v: money.whole(monthly) }]} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Add Sale" onPress={() => add("sale", params)} style={{ flex: 1 }} />
        <Button plain title="Add Expense" onPress={() => add("expense", params)} style={{ flex: 1 }} />
      </View>
      {best.length ? (
        <Section title="Best sellers" color={color}>
          <ColumnHead left="Product" right="Earned" />
          {best.map((b) => <Cell key={b.key} title={b.name} subtitle={plural(units(b.key), "unit") + " sold"} value={money.money(b.v)} tone="gain" />)}
        </Section>
      ) : null}
      <Section title="Repeating costs" right={`${money.money(monthly)} a month`}>
        {rec.map((r) => <RecurringCell key={r.id} r={r} inProject />)}
      </Section>
      <Section title="Activity">{activity.map((a) => a.el)}</Section>
      {!activity.length && !rec.length ? <Empty icon="receipt-outline" title={`Nothing ${p.label}`} text="Sales and expenses for this project show up here." /> : null}
    </Screen>
  );
}

