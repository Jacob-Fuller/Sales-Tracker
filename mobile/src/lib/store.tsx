// App state: saved on the phone, and synced to the person's account when they
// sign in. Sync rules (same as Roster Board):
//  * never upload unless the cloud copy was just read and merged, so a phone
//    with old data can't overwrite newer data;
//  * remember unsynced changes across restarts and keep retrying;
//  * compare-and-swap on updated_at, so two devices saving at once both survive;
//  * keep up to 10 earlier cloud copies as a safety net.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { getLocales } from "expo-localization";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { Period } from "./calc";
import { makeMoney, type Money } from "./format";
import { buildHistory, mergeSnapshots, pruneTombstones, sameSnapshot, stripHistory } from "./merge";
import { defaultSettings, emptySnapshot, normaliseSnapshot, type Settings, type Snapshot } from "./model";
import { sb } from "./supabase";

const K = {
  data: "profitPocket.data",
  owner: "profitPocket.owner",
  dirty: "profitPocket.unsynced",
  last: "profitPocket.lastSync",
  prefs: "profitPocket.prefs",
};

export type Prefs = { period: Period };
const DEFAULT_PREFS: Prefs = { period: "fy" };
export type SyncState = "idle" | "syncing" | "ok" | "failed" | "authLost";
type Tomb = (id: string) => void;

type Ctx = {
  ready: boolean;
  data: Snapshot;
  money: Money;
  user: User | null;
  sync: { state: SyncState; lastSync: number; dirty: boolean };
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  update: (fn: (d: Snapshot, tomb: Tomb) => void) => void;
  syncNow: () => Promise<void>;
  sendCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
};

const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
async function getNum(k: string) { return +((await AsyncStorage.getItem(k).catch(() => null)) || 0) || 0; }

function localDefaults(): Settings {
  try {
    const l = getLocales()[0];
    return defaultSettings(l?.currencyCode || "AUD", l?.regionCode || "AU");
  } catch { return defaultSettings(); }
}

function friendlyAuthError(msg: string) {
  if (/rate|too many|seconds/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  if (/expired|invalid|otp|token/i.test(msg)) return "That code didn't work. Check it, or send a new one.";
  if (/network|fetch/i.test(msg)) return "No connection. Check your internet and try again.";
  return msg || "Something went wrong. Try again.";
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot>(() => emptySnapshot(localDefaults()));
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [sync, setSync] = useState<{ state: SyncState; lastSync: number; dirty: boolean }>({ state: "idle", lastSync: 0, dirty: false });

  const dataRef = useRef<Snapshot>(data);
  const userRef = useRef<User | null>(null);
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((next: Snapshot, persist = true) => {
    dataRef.current = next;
    setData(next);
    if (persist) AsyncStorage.setItem(K.data, JSON.stringify(next)).catch(() => {});
  }, []);

  const refreshSyncFlags = useCallback(async (state?: SyncState) => {
    const [dirty, last] = await Promise.all([getNum(K.dirty), getNum(K.last)]);
    setSync((s) => ({ state: state || s.state, lastSync: last, dirty: !!dirty }));
  }, []);

  /* ---------- one sync: read, merge, write back ---------- */
  const syncOnce = useCallback(async (uid: string): Promise<"same" | "saved" | "conflict"> => {
    if (!sb) return "same";
    const res = await sb.from("app_data").select("data, updated_at").eq("user_id", uid).maybeSingle();
    if (res.error) throw res.error;
    const row: any = res.data || null;
    const remoteRaw = (row && row.data) || null;
    const remote = remoteRaw ? normaliseSnapshot(stripHistory(remoteRaw), dataRef.current.settings) : null;
    const merged = mergeSnapshots(dataRef.current, remote);
    apply(merged);
    if (!userRef.current || userRef.current.id !== uid) throw { message: "account changed" };
    if (remote && sameSnapshot(merged, remote)) return "same";
    const toUpload: any = { ...merged, history: buildHistory(remoteRaw) };
    const stamp = new Date().toISOString();
    if (!row) {
      const r = await sb.from("app_data").insert({ user_id: uid, data: toUpload, updated_at: stamp });
      if (r.error) { if ((r.error as any).code === "23505") return "conflict"; throw r.error; }
    } else {
      let q = sb.from("app_data").update({ data: toUpload, updated_at: stamp }).eq("user_id", uid);
      q = row.updated_at ? q.eq("updated_at", row.updated_at) : q.is("updated_at", null);
      const r = await q.select("user_id");
      if (r.error) throw r.error;
      if (!(r.data && r.data.length)) return "conflict";
    }
    return "saved";
  }, [apply]);

  const scheduleRetry = useRef<() => void>(() => {});
  const syncNow = useCallback(async () => {
    const u = userRef.current;
    if (!u || !sb) return;
    if (inFlight.current) { scheduleRetry.current(); return; }
    inFlight.current = true;
    const startedAt = Date.now();
    setSync((s) => ({ ...s, state: "syncing" }));
    try {
      const { data: sess } = await sb.auth.getSession();
      const session = sess.session;
      if (!session || !session.expires_at || session.expires_at * 1000 - Date.now() < 120000) {
        const r = await sb.auth.refreshSession();
        if (!r.data.session) throw { authLost: true };
      }
      for (let attempt = 0; ; attempt++) {
        const result = await syncOnce(u.id);
        if (result !== "conflict") break;
        if (attempt >= 4) throw { message: "sync conflict" };
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
      }
      if ((await getNum(K.dirty)) <= startedAt) await AsyncStorage.removeItem(K.dirty).catch(() => {});
      await AsyncStorage.setItem(K.last, String(Date.now())).catch(() => {});
      failures.current = 0;
      await refreshSyncFlags("ok");
    } catch (err: any) {
      failures.current++;
      const msg = String((err && (err.message || err.code)) || "");
      const authLost = (err && err.authLost) || /jwt|token|auth|401|403/i.test(msg);
      await refreshSyncFlags(authLost ? "authLost" : "failed");
      scheduleRetry.current();
    } finally {
      inFlight.current = false;
    }
  }, [syncOnce, refreshSyncFlags]);
  scheduleRetry.current = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const delay = Math.min(5 * 60000, 15000 * Math.pow(2, Math.min(failures.current, 4)));
    retryTimer.current = setTimeout(() => { syncNow(); }, delay);
  };

  /* ---------- edits ---------- */
  const update = useCallback((fn: (d: Snapshot, tomb: Tomb) => void) => {
    const next = clone(dataRef.current);
    const now = Date.now();
    fn(next, (id) => { if (id) next.tombstones[id] = now; });
    apply(next);
    if (userRef.current) {
      AsyncStorage.setItem(K.dirty, String(now)).catch(() => {});
      setSync((s) => ({ ...s, dirty: true }));
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => { syncNow(); }, 1200);
    }
  }, [apply, syncNow]);

  /* ---------- account (email + 6-digit code) ---------- */
  const onSignedIn = useCallback(async (u: User) => {
    if (userRef.current && userRef.current.id === u.id) return;
    const owner = await AsyncStorage.getItem(K.owner).catch(() => null);
    if (owner && owner !== u.id) {
      // Another account used this phone before: never mix its data into this one.
      apply(emptySnapshot(localDefaults()));
      await AsyncStorage.multiRemove([K.dirty, K.last]).catch(() => {});
    }
    // Otherwise whatever was entered before signing in is merged into the account.
    await AsyncStorage.setItem(K.owner, u.id).catch(() => {});
    userRef.current = u;
    setUser(u);
    syncNow();
  }, [apply, syncNow]);

  const wipeLocal = useCallback(async () => {
    userRef.current = null;
    setUser(null);
    apply(emptySnapshot(localDefaults()), false);
    await AsyncStorage.multiRemove([K.data, K.owner, K.dirty, K.last]).catch(() => {});
    setSync({ state: "idle", lastSync: 0, dirty: false });
  }, [apply]);

  const sendCode = useCallback(async (email: string) => {
    if (!sb) return { ok: false, error: "Accounts aren't available yet." };
    const r = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    return r.error ? { ok: false, error: friendlyAuthError(r.error.message) } : { ok: true };
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!sb) return { ok: false, error: "Accounts aren't available yet." };
    const r = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (r.error || !r.data.user) return { ok: false, error: friendlyAuthError(r.error ? r.error.message : "") };
    await onSignedIn(r.data.user);
    return { ok: true };
  }, [onSignedIn]);

  const signOut = useCallback(async () => {
    if (!sb) return { ok: true };
    const r = await sb.auth.signOut({ scope: "local" });
    if (r.error) return { ok: false, error: r.error.message };
    await wipeLocal();
    return { ok: true };
  }, [wipeLocal]);

  const deleteAccount = useCallback(async () => {
    if (!sb) return { ok: false, error: "Not signed in" };
    const r = await sb.rpc("delete_my_account");
    if (r.error) return { ok: false, error: r.error.message };
    await sb.auth.signOut().catch(() => {});
    await wipeLocal();
    return { ok: true };
  }, [wipeLocal]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      AsyncStorage.setItem(K.prefs, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /* ---------- start-up ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [raw, rawPrefs] = await Promise.all([
        AsyncStorage.getItem(K.data).catch(() => null),
        AsyncStorage.getItem(K.prefs).catch(() => null),
      ]);
      if (cancelled) return;
      let snap = emptySnapshot(localDefaults());
      try { if (raw) snap = normaliseSnapshot(JSON.parse(raw), localDefaults()); } catch {}
      pruneTombstones(snap.tombstones);
      apply(snap, false);
      try { if (rawPrefs) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) }); } catch {}
      loaded.current = true;
      await refreshSyncFlags();
      setReady(true);
      if (!sb) return;
      const { data: s } = await sb.auth.getSession().catch(() => ({ data: { session: null } } as any));
      if (!cancelled && s && s.session && s.session.user) onSignedIn(s.session.user);
    })();
    const sub = sb ? sb.auth.onAuthStateChange((event, session) => {
      if (!loaded.current) return;
      if (session && session.user) onSignedIn(session.user);
      else if (event === "SIGNED_OUT" && userRef.current) wipeLocal();
    }).data.subscription : null;
    const appSub = AppState.addEventListener("change", (s) => { if (s === "active" && userRef.current) syncNow(); });
    return () => { cancelled = true; if (sub) sub.unsubscribe(); appSub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = useMemo(() => makeMoney(data.settings.currency), [data.settings.currency]);

  const value = useMemo<Ctx>(() => ({
    ready, data, money, user, sync, prefs, setPrefs, update, syncNow, sendCode, verifyCode, signOut, deleteAccount,
  }), [ready, data, money, user, sync, prefs, setPrefs, update, syncNow, sendCode, verifyCode, signOut, deleteAccount]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
