import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useLayoutEffect, useMemo } from "react";
import { View } from "react-native";
import { TrendChart } from "../components/Chart";
import {
  activeRecurringFor, byCreated, ExpenseItem, GroupItem, ItemRow, plural, RecurringItem, SaleItem, useAdd, useAddMenu,
} from "../components/rows";
import { AddRow, Button, Empty, HeaderButton, Hero, ItemBadge, Lead, List, Muted, Note, Pills, Row, Screen, SectionHead, StatusDot } from "../components/ui";
import { derive, groupKeys, isActive, itemsIn, perMonth, range, totalsFor, trend } from "../lib/calc";
import { keyOf } from "../lib/model";
import { useStore } from "../lib/store";

/* ---------- Home ---------- */
export function HomeScreen() {
  const { data, prefs, setPrefs } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const menu = useAddMenu();
  const fy = data.settings.fyStartMonth;
  const rg = range(prefs.period, fy);
  const d = derive(data);
  const t = useMemo(() => totalsFor(data, undefined, rg), [data, rg.from, rg.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = [...data.groups].sort(byCreated);
  if (!data.sales.length && !data.expenses.length && !data.recurring.length) {
    return (
      <Screen>
        <Empty title="Welcome to Profit Pocket" text="Add your first sale or expense and your numbers will show up here."
          button={{ label: "Add something", onPress: menu }} />
        {!data.products.length ? (
          <Note>Start with a product (something you sell), then record sales against it. Costs can be one-off or recurring.</Note>
        ) : (
          <Button kind="soft" title="Record a sale" icon="arrow-up" onPress={() => add("sale")} />
        )}
      </Screen>
    );
  }
  return (
    <Screen>
      <Pills value={prefs.period} onChange={(p) => setPrefs({ period: p })} fyStartMonth={fy} />
      <Hero t={t} />
      <TrendChart data={trend(d.sales, d.exps)} />
      {groups.length ? (
        <>
          <SectionHead title="Projects" action={{ label: "See all", onPress: () => nav.navigate("ProjectsTab") }} />
          <List>{groups.map((g) => <GroupItem key={g.id} g={g} rg={rg} />)}</List>
        </>
      ) : null}
    </Screen>
  );
}

/* ---------- Projects ---------- */
export function ProjectsScreen() {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const add = useAdd();
  const all = range("all");
  const groups = [...data.groups].sort(byCreated);
  const loose = itemsIn(data, null);
  const general = totalsFor(data, new Set(["general"]), all);
  return (
    <Screen>
      {!groups.length ? <Note>Create a project, like "iOS Applications" or "Market stall", then add each thing you make or sell inside it.</Note> : null}
      <List>
        {groups.map((g) => <GroupItem key={g.id} g={g} rg={all} showMonthly />)}
        <AddRow text="New project" onPress={() => add("group")} />
      </List>
      {loose.length ? (
        <>
          <SectionHead title="Not in a project" />
          <List>{loose.map((p) => <ItemRow key={p.id} p={p} rg={all} />)}</List>
        </>
      ) : null}
      {general.kept || general.spent || general.monthly ? (
        <>
          <SectionHead title="General" />
          <List>
            <Row lead={<Lead icon="home-outline" />} title="General" sub="Not linked to a project or item"
              amount={money.signed(general.net)} tone={general.net >= 0 ? "gain" : "loss"}
              onPress={() => nav.push("ItemDetail", { id: "general" })} />
          </List>
        </>
      ) : null}
      {groups.length ? <Note>Profit shown is all time.</Note> : null}
    </Screen>
  );
}

/* ---------- One project (a group of items) ---------- */
export function GroupScreen() {
  const { data, prefs, setPrefs, money } = useStore();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const add = useAdd();
  const g = data.groups.find((x) => x.id === id);
  const menu = useAddMenu("g:" + id);
  useLayoutEffect(() => {
    nav.setOptions({
      title: g ? g.name : "Project",
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {g ? <HeaderButton icon="create-outline" label="Edit project" onPress={() => nav.navigate("Group", { id })} /> : null}
          <HeaderButton icon="add" label="Add" primary onPress={menu} />
        </View>
      ),
    });
  }, [nav, g && g.name]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return <Screen><Empty title="Project deleted" text="That project no longer exists." /></Screen>;
  const items = itemsIn(data, g.id);
  const rg = range(prefs.period, data.settings.fyStartMonth);
  const keys = groupKeys(data, g.id);
  const rec = activeRecurringFor(data, keys).sort((a, b) => perMonth(b) - perMonth(a));
  return (
    <Screen>
      <Pills value={prefs.period} onChange={(p) => setPrefs({ period: p })} fyStartMonth={data.settings.fyStartMonth} />
      <Hero t={totalsFor(data, keys, rg)} label="Overall profit" />
      <SectionHead title="Inside this project" meta={plural(items.length, "item")} />
      <List>
        {items.map((p) => <ItemRow key={p.id} p={p} rg={rg} />)}
        <AddRow text="Add item" onPress={() => add("item", { groupId: g.id })} />
      </List>
      <SectionHead title="Recurring costs" meta={`${money.money(rec.reduce((s, r) => s + perMonth(r), 0))}/mo`} />
      <List>
        {rec.map((r) => <RecurringItem key={r.id} r={r} />)}
        <AddRow text="Add recurring cost" onPress={() => add("recurring", { link: "g:" + g.id })} />
      </List>
      <Note>Costs that cover everything in this project, like a subscription, can be set to "{g.name} (shared)".</Note>
    </Screen>
  );
}

/* ---------- One item (or General) ---------- */
export function ItemScreen() {
  const { data, prefs, setPrefs } = useStore();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const add = useAdd();
  const general = id === "general";
  const p = general ? null : data.items.find((x) => x.id === id);
  const key = general ? "general" : "p:" + id;
  const menu = useAddMenu(key);
  useLayoutEffect(() => {
    nav.setOptions({
      title: general ? "General" : p ? p.name : "Item",
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {p ? <HeaderButton icon="create-outline" label="Edit item" onPress={() => nav.navigate("Item", { id })} /> : null}
          <HeaderButton icon="add" label="Add" primary onPress={menu} />
        </View>
      ),
    });
  }, [nav, p && p.name]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!general && !p) return <Screen><Empty title="Item deleted" text="That item no longer exists." /></Screen>;
  const g = p && p.groupId ? data.groups.find((x) => x.id === p.groupId) : null;
  const t = totalsFor(data, new Set([key]), range(prefs.period, data.settings.fyStartMonth));
  const rec = data.recurring.filter((r) => keyOf(r) === key && isActive(r));
  const activity = [
    ...t.sales.map((s) => ({ d: s.date, c: s.createdAt, el: <SaleItem key={s.id} s={s} /> })),
    ...t.exps.map((e) => ({ d: e.date, c: e.createdAt, el: <ExpenseItem key={e.id} e={e} /> })),
  ].sort((a, b) => b.d.localeCompare(a.d) || b.c - a.c).slice(0, 40);
  return (
    <Screen>
      {p ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 4 }}>
          <ItemBadge item={p} size={56} />
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <StatusDot status={p.status} />
            <Muted style={{ fontSize: 14 }} numberOfLines={1}>{p.status}{g ? " · in " + g.name : ""}</Muted>
          </View>
        </View>
      ) : null}
      <Pills value={prefs.period} onChange={(x) => setPrefs({ period: x })} fyStartMonth={data.settings.fyStartMonth} />
      <Hero t={t} />
      <SectionHead title="Recurring" />
      <List>
        {rec.map((r) => <RecurringItem key={r.id} r={r} />)}
        <AddRow text="Add recurring cost" onPress={() => add("recurring", { link: key })} />
      </List>
      <SectionHead title="Activity" />
      {activity.length ? <List>{activity.map((a) => a.el)}</List> : <Note>Nothing in this period.</Note>}
    </Screen>
  );
}

