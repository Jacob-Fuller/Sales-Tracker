// Edits to a snapshot. Each function changes the draft it's given (the store
// passes a copy) and records deletions as tombstones so they sync.
import { newId, type Kind, type Snapshot } from "./model.ts";

export type Tomb = (id: string) => void;

export function addRecord(d: Snapshot, kind: Kind, data: any, now = Date.now()): string {
  const id = newId();
  (d[kind] as any[]).push({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export function patchRecord(d: Snapshot, kind: Kind, id: string, data: any, now = Date.now()) {
  const list = d[kind] as any[];
  const i = list.findIndex((r) => r.id === id);
  if (i >= 0) list[i] = { ...list[i], ...data, id, updatedAt: now };
}

// Deleting keeps history: things that pointed at the deleted record are
// unlinked rather than lost (an item's costs and sales move to General).
export function removeRecord(d: Snapshot, kind: Kind, id: string, tomb: Tomb, now = Date.now()) {
  if (kind === "customers") {
    d.sales.filter((s) => s.customerId === id).forEach((s) => patchRecord(d, "sales", s.id, { customerId: null }, now));
  }
  if (kind === "groups") {
    d.items.filter((r) => r.groupId === id).forEach((r) => patchRecord(d, "items", r.id, { groupId: null }, now));
    (["products", "expenses", "recurring"] as const).forEach((k) =>
      (d[k] as any[]).filter((r) => r.groupId === id).forEach((r) => patchRecord(d, k, r.id, { groupId: null }, now)));
  }
  if (kind === "items") {
    (["products", "expenses", "recurring"] as const).forEach((k) =>
      (d[k] as any[]).filter((r) => r.itemId === id).forEach((r) => patchRecord(d, k, r.id, { itemId: null }, now)));
  }
  (d as any)[kind] = (d[kind] as any[]).filter((r) => r.id !== id);
  tomb(id);
}

export const productHasSales = (d: Snapshot, productId: string) => d.sales.some((s) => s.productId === productId);
