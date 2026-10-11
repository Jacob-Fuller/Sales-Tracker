// Sync merge rules (same approach as Roster Board): records are unioned by id,
// the newer copy of a record wins, and a record is only dropped when a
// tombstone says it was deliberately deleted after it was last saved.
import { KINDS, type Rec, type Settings, type Snapshot } from "./model.ts";

type Tombs = { [id: string]: number };

export function mergeTombstones(a?: Tombs, b?: Tombs): Tombs {
  const out: Tombs = {};
  Object.keys(a || {}).forEach((id) => { out[id] = a![id]; });
  Object.keys(b || {}).forEach((id) => { if (!out[id] || b![id] > out[id]) out[id] = b![id]; });
  return out;
}

const survives = (item: Rec, tombs: Tombs) => { const t = tombs[item.id]; return !t || (item.updatedAt || 0) > t; };

export function mergeArrayById<T extends Rec>(local?: T[], remote?: T[], tombs: Tombs = {}): T[] {
  const picked: { [id: string]: T } = {};
  const order: string[] = [];
  (local || []).forEach((item) => {
    if (!item || !item.id || picked[item.id]) return;
    picked[item.id] = item; order.push(item.id);
  });
  (remote || []).forEach((item) => {
    if (!item || !item.id) return;
    const cur = picked[item.id];
    if (!cur) { picked[item.id] = item; order.push(item.id); return; }
    if ((item.updatedAt || 0) > (cur.updatedAt || 0)) picked[item.id] = item;
  });
  const out: T[] = [];
  order.forEach((id) => {
    const item = picked[id];
    if (!survives(item, tombs)) return;
    if (tombs[id]) delete tombs[id];
    out.push(item);
  });
  return out;
}

function mergeSettings(local: Settings, remote?: Settings): Settings {
  if (!remote) return local;
  return (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
}

// remote must already be normalised (or null).
export function mergeSnapshots(local: Snapshot, remote: Snapshot | null): Snapshot {
  if (!remote) return local;
  const tombs = mergeTombstones(local.tombstones, remote.tombstones);
  const out: any = { settings: mergeSettings(local.settings, remote.settings), tombstones: tombs };
  KINDS.forEach((k) => { out[k] = mergeArrayById<any>(local[k] as any, remote[k] as any, tombs); });
  return out as Snapshot;
}

/* ---------- comparing ---------- */
export function stableStringify(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => (x === undefined ? "null" : stableStringify(x))).join(",") + "]";
  return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}
function canonical(snap: any) {
  const out: any = {};
  const byId = (x: any, y: any) => { const a = (x && x.id) || "", b = (y && y.id) || ""; return a < b ? -1 : a > b ? 1 : 0; };
  Object.keys(snap || {}).forEach((k) => {
    if (k === "history") return;
    out[k] = (KINDS as string[]).includes(k) ? (snap[k] || []).slice().sort(byId) : snap[k];
  });
  return out;
}
export const sameSnapshot = (a: any, b: any) => stableStringify(canonical(a)) === stableStringify(canonical(b));

/* ---------- earlier cloud copies ---------- */
export const HISTORY_MAX = 10;
const HISTORY_GAP = 6 * 3600000;
export function stripHistory(d: any) {
  const out: any = {};
  Object.keys(d || {}).forEach((k) => { if (k !== "history") out[k] = d[k]; });
  return out;
}
export const snapshotHasData = (d: any) => !!d && KINDS.some((k) => Array.isArray(d[k]) && d[k].length > 0);
export function buildHistory(remote: any, now = Date.now()) {
  const h = ((remote && remote.history) || []).slice(0, HISTORY_MAX);
  if (snapshotHasData(remote) && (!h.length || now - (h[0].at || 0) > HISTORY_GAP)) h.unshift({ at: now, data: stripHistory(remote) });
  return h.slice(0, HISTORY_MAX);
}

export function pruneTombstones(tombs: Tombs, now = Date.now()) {
  const cutoff = now - 400 * 24 * 60 * 60 * 1000;
  Object.keys(tombs).forEach((id) => { if (tombs[id] < cutoff) delete tombs[id]; });
  return tombs;
}
