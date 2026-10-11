// The list rows used across screens, and helpers for what a record belongs to.
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ActionSheetIOS, Platform, Text, View } from "react-native";
import { groupKeys, isActive, itemsIn, nextDue, totalsFor, type ExpenseRow, type Range, type SaleRow } from "../lib/calc";
import { FREQS, keyOf, shortDate, type Group, type Item, type Link, type Recurring, type Snapshot } from "../lib/model";
import { usePremium, type LimitKind } from "../lib/premium";
import { useStore } from "../lib/store";
import { FREE_LIMITS } from "../lib/config";
import { C, F } from "../theme";
import { ItemBadge, Lead, Row, StatusDot, tap, type Option } from "./ui";

/* ---------- names ---------- */
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
export const byCreated = (a: { createdAt: number }, b: { createdAt: number }) => a.createdAt - b.createdAt;
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function linkLabel(d: Snapshot, r: Link) {
  if (r.itemId) return d.items.find((i) => i.id === r.itemId)?.name || "General";
  if (r.groupId) return `${d.groups.find((g) => g.id === r.groupId)?.name || "Project"} (shared)`;
  return "General";
}

// Choices for what something belongs to, grouped by project.
export function linkOptions(d: Snapshot, withAll = false): Option[] {
  const out: Option[] = [];
  if (withAll) out.push({ value: "all", label: "Everything" });
  out.push({ value: "general", label: "General (not linked)" });
  [...d.groups].sort(byCreated).forEach((g) => {
    out.push({ value: "g:" + g.id, label: `${g.name} (shared)`, section: g.name });
    itemsIn(d, g.id).forEach((p) => out.push({ value: "p:" + p.id, label: p.name, section: g.name }));
  });
  itemsIn(d, null).forEach((p) => out.push({ value: "p:" + p.id, label: p.name, section: "Not in a project" }));
  return out;
}
export const validLink = (d: Snapshot, k: string) =>
  k === "general" || (k.startsWith("g:") && d.groups.some((g) => "g:" + g.id === k)) || (k.startsWith("p:") && d.items.some((i) => "p:" + i.id === k));

/* ---------- rows ---------- */
export function SaleItem({ s, first }: { s: SaleRow; first?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const link = keyOf(s) !== "general" ? " · " + linkLabel(data, s) : "";
  return (
    <Row first={first} lead={<Lead icon="arrow-up" tone="sale" />} title={s.productName}
      sub={`${shortDate(s.date)} · ${s.channel}${link}`} amount={money.money(s.net)} tone="gain"
      amountSub={s.feeAmount || s.discount ? `of ${money.money(s.gross)}` : undefined}
      onPress={() => nav.navigate("Sale", { id: s.id })} />
  );
}

export function ExpenseItem({ e, first }: { e: ExpenseRow; first?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  return (
    <Row first={first} lead={e.recurringId ? <Lead icon="repeat" tone="recur" /> : <Lead icon="arrow-down" tone="exp" />}
      title={e.description} sub={`${shortDate(e.date)} · ${linkLabel(data, e)}`} amount={money.money(e.amount)}
      onPress={() => nav.navigate("Expense", e.recurringId ? { id: e.recurringId, recurring: true } : { id: e.id })} />
  );
}

export function RecurringItem({ r, first }: { r: Recurring; first?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const f = FREQS[r.frequency] || FREQS.monthly, active = isActive(r), nd = active ? nextDue(r) : null;
  return (
    <Row first={first} lead={<Lead icon="repeat" tone="recur" />} title={r.description}
      sub={active ? `${f.label}${nd ? " · next " + shortDate(nd) : ""} · ${linkLabel(data, r)}` : "Stopped"}
      amount={money.money(r.amount)} tone={active ? undefined : "muted"}
      onPress={() => nav.navigate("Expense", { id: r.id, recurring: true })} />
  );
}

export function GroupItem({ g, rg, showMonthly, first }: { g: Group; rg: Range; showMonthly?: boolean; first?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const t = totalsFor(data, groupKeys(data, g.id), rg);
  return (
    <Row first={first} lead={<Lead icon="folder-outline" />} title={g.name} sub={plural(itemsIn(data, g.id).length, "item")}
      amount={money.signed(t.net)} tone={t.net >= 0 ? "gain" : "loss"}
      amountSub={showMonthly && t.monthly ? `${money.money(t.monthly)}/mo` : undefined}
      onPress={() => nav.push("GroupDetail", { id: g.id })} />
  );
}

export function ItemRow({ p, rg, first }: { p: Item; rg: Range; first?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const t = totalsFor(data, new Set(["p:" + p.id]), rg);
  return (
    <Row first={first} lead={<ItemBadge item={p} />} title={p.name}
      sub={<View style={{ flexDirection: "row", alignItems: "center" }}><StatusDot status={p.status} /><Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.muted }}>{p.status}</Text></View>}
      amount={money.signed(t.net)} tone={t.net >= 0 ? "gain" : "loss"} amountSub={t.monthly ? `${money.money(t.monthly)}/mo` : undefined}
      onPress={() => nav.push("ItemDetail", { id: p.id })} />
  );
}

export const activeRecurringFor = (d: Snapshot, keys: Set<string>) => d.recurring.filter((r) => keys.has(keyOf(r)) && isActive(r));

/* ---------- adding things ---------- */
const LIMIT_TEXT: { [k in LimitKind]: string } = {
  groups: `The free plan includes ${plural(FREE_LIMITS.groups, "project")}. Go Premium for as many as you need.`,
  items: `The free plan includes ${plural(FREE_LIMITS.items, "item")}. Go Premium for as many as you need.`,
  recurring: `The free plan includes ${plural(FREE_LIMITS.recurring, "recurring cost")}. Go Premium for as many as you need.`,
};
export type AddKind = "sale" | "expense" | "recurring" | "product" | "group" | "item" | "customer";

// Opens the right form, or the upgrade screen when the free plan's limit is reached.
export function useAdd() {
  const nav = useNavigation<any>();
  const { canAdd } = usePremium();
  return (kind: AddKind, params: any = {}, replace = false) => {
    const go = (r: string, p: any) => (replace ? nav.replace(r, p) : nav.navigate(r, p));
    const limit: LimitKind | null = kind === "group" ? "groups" : kind === "item" ? "items" : kind === "recurring" ? "recurring" : null;
    if (limit && !canAdd(limit)) { go("Paywall", { reason: LIMIT_TEXT[limit] }); return; }
    const route = { sale: "Sale", expense: "Expense", recurring: "Expense", product: "Product", group: "Group", item: "Item", customer: "Customer" }[kind];
    go(route, { ...params, recurring: kind === "recurring" || undefined });
  };
}

// The + button's menu: a native action sheet on iPhone, a screen elsewhere.
export function useAddMenu(link?: string) {
  const nav = useNavigation<any>();
  const add = useAdd();
  return () => {
    tap();
    const choices: [string, AddKind][] = [["Sale", "sale"], ["Expense", "expense"], ["Recurring cost", "recurring"], ["Product", "product"], ["Project", "group"]];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...choices.map((c) => c[0]), "Cancel"], cancelButtonIndex: choices.length, userInterfaceStyle: "dark", tintColor: C.ember },
        (i) => { if (i < choices.length) add(choices[i][1], link ? { link } : {}); },
      );
    } else nav.navigate("Add", { link });
  };
}
