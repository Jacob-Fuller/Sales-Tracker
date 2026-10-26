// List rows used across screens, and what a record belongs to.
//
// Projects: earlier versions had projects ("groups") holding items. Both are
// shown here as one flat list of projects, so everything already saved keeps
// its project. New projects are saved as items with no group.
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ActionSheetIOS, Platform } from "react-native";
import { isActive, nextDue, type ExpenseRow, type SaleRow } from "../lib/calc";
import { FREE_LIMITS } from "../lib/config";
import { FREQS, keyOf, shortDate, type Link, type LinkKey, type Recurring, type Snapshot } from "../lib/model";
import { usePremium, type LimitKind } from "../lib/premium";
import { useStore } from "../lib/store";
import { usePalette } from "../theme";
import { Cell, tap, type Option } from "./ui";

export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* ---------- projects ---------- */
export type Project = { key: LinkKey; id: string; name: string; kind: "items" | "groups" };

export function projects(d: Snapshot): Project[] {
  return [
    ...d.items.map((i) => ({ key: "p:" + i.id, id: i.id, name: i.name, kind: "items" as const })),
    ...d.groups.map((g) => ({ key: "g:" + g.id, id: g.id, name: g.name, kind: "groups" as const })),
  ].sort(byName);
}
export const findProject = (d: Snapshot, key: LinkKey) => projects(d).find((p) => p.key === key);
export const projectName = (d: Snapshot, r: Link) => (keyOf(r) === "general" ? null : findProject(d, keyOf(r))?.name || null);
export const projectOptions = (d: Snapshot): Option[] => [{ value: "general", label: "None" }, ...projects(d).map((p) => ({ value: p.key, label: p.name }))];
export const validLink = (d: Snapshot, k: string) => k === "general" || !!findProject(d, k);
// Used by the tax report.
export const linkLabel = (d: Snapshot, r: Link) => projectName(d, r) || "—";

const dot = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");

/* ---------- rows ---------- */
export function SaleCell({ s, first, inProject }: { s: SaleRow; first?: boolean; inProject?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  return (
    <Cell first={first} title={s.productName} subtitle={dot(shortDate(s.date), s.channel, inProject ? null : projectName(data, s))}
      value={"+" + money.money(s.net)} tone="gain" onPress={() => nav.navigate("Sale", { id: s.id })} />
  );
}

export function ExpenseCell({ e, first, inProject }: { e: ExpenseRow; first?: boolean; inProject?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const freq = e.frequency ? (FREQS as any)[e.frequency]?.label : null;
  return (
    <Cell first={first} title={e.description} subtitle={dot(shortDate(e.date), freq, inProject ? null : projectName(data, e))}
      value={money.money(e.amount)} onPress={() => nav.navigate("Expense", e.recurringId ? { id: e.recurringId, recurring: true } : { id: e.id })} />
  );
}

export function RecurringCell({ r, first }: { r: Recurring; first?: boolean }) {
  const { data, money } = useStore();
  const nav = useNavigation<any>();
  const f = FREQS[r.frequency] || FREQS.monthly, active = isActive(r), nd = active ? nextDue(r) : null;
  return (
    <Cell first={first} title={r.description}
      subtitle={active ? dot(f.label, nd ? "next " + shortDate(nd) : null, projectName(data, r)) : "Stopped"}
      value={money.money(r.amount)} tone={active ? undefined : "secondary"}
      onPress={() => nav.navigate("Expense", { id: r.id, recurring: true })} />
  );
}

/* ---------- adding ---------- */
const LIMIT_TEXT: { [k in LimitKind]: string } = {
  groups: `The free plan includes ${plural(FREE_LIMITS.items, "project")}.`,
  items: `The free plan includes ${plural(FREE_LIMITS.items, "project")}.`,
  recurring: `The free plan includes ${plural(FREE_LIMITS.recurring, "repeating expense")}.`,
};
export const limitText = (k: LimitKind) => LIMIT_TEXT[k];

export type AddKind = "sale" | "expense" | "product" | "project";

// Opens the right form, or Premium when the free plan's limit is reached.
export function useAdd() {
  const nav = useNavigation<any>();
  const { canAdd } = usePremium();
  return (kind: AddKind, params: any = {}, replace = false) => {
    const go = (r: string, p: any) => (replace ? nav.replace(r, p) : nav.navigate(r, p));
    if (kind === "project" && !canAdd("items")) { go("Paywall", { reason: LIMIT_TEXT.items }); return; }
    go({ sale: "Sale", expense: "Expense", product: "Product", project: "Project" }[kind], params);
  };
}

// The + on Home: a native action sheet on iPhone, a small screen elsewhere.
export function useAddMenu(params: any = {}) {
  const nav = useNavigation<any>();
  const add = useAdd();
  const c = usePalette();
  return () => {
    tap();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Sale", "Expense", "Cancel"], cancelButtonIndex: 2, tintColor: c.accent },
        (i) => { if (i === 0) add("sale", params); if (i === 1) add("expense", params); },
      );
    } else nav.navigate("Add", params);
  };
}

export const activeRecurring = (d: Snapshot, key?: LinkKey) => d.recurring.filter((r) => isActive(r) && (!key || keyOf(r) === key));
