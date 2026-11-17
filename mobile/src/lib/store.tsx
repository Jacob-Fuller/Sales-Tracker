// App state, saved on the phone. Profit Board has no accounts: everything
// stays on this device.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Period } from "./calc";
import { makeMoney, type Money } from "./format";
import { defaultSettings, emptySnapshot, normaliseSnapshot, type Settings, type Snapshot } from "./model";

const K = {
  data: "profitPocket.data",
  prefs: "profitPocket.prefs",
};

export type Prefs = { period: Period };
const DEFAULT_PREFS: Prefs = { period: "fy" };
type Tomb = (id: string) => void;

type Ctx = {
  ready: boolean;
  data: Snapshot;
  money: Money;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  update: (fn: (d: Snapshot, tomb: Tomb) => void) => void;
};

const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
// Deletion records older than about a year aren't needed any more.
function pruneTombstones(tombs: { [id: string]: number }) {
  const cutoff = Date.now() - 400 * 24 * 60 * 60 * 1000;
  Object.keys(tombs).forEach((id) => { if (tombs[id] < cutoff) delete tombs[id]; });
}

function localDefaults(): Settings {
  try {
    const l = getLocales()[0];
    return defaultSettings(l?.currencyCode || "AUD", l?.regionCode || "AU");
  } catch { return defaultSettings(); }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot>(() => emptySnapshot(localDefaults()));
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const dataRef = useRef<Snapshot>(data);

  const apply = useCallback((next: Snapshot, persist = true) => {
    dataRef.current = next;
    setData(next);
    if (persist) AsyncStorage.setItem(K.data, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback((fn: (d: Snapshot, tomb: Tomb) => void) => {
    const next = clone(dataRef.current);
    const now = Date.now();
    fn(next, (id) => { if (id) next.tombstones[id] = now; });
    apply(next);
  }, [apply]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      AsyncStorage.setItem(K.prefs, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      const [raw, rawPrefs] = await Promise.all([
        AsyncStorage.getItem(K.data).catch(() => null),
        AsyncStorage.getItem(K.prefs).catch(() => null),
      ]);
      let snap = emptySnapshot(localDefaults());
      try { if (raw) snap = normaliseSnapshot(JSON.parse(raw), localDefaults()); } catch {}
      pruneTombstones(snap.tombstones);
      apply(snap, false);
      try { if (rawPrefs) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) }); } catch {}
      setReady(true);
    })();
  }, [apply]);

  const money = useMemo(() => makeMoney(data.settings.currency), [data.settings.currency]);

  const value = useMemo<Ctx>(() => ({ ready, data, money, prefs, setPrefs, update }),
    [ready, data, money, prefs, setPrefs, update]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
