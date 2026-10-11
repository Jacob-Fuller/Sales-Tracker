// Premium through Apple in-app purchases: a monthly subscription or a one-off
// lifetime purchase. Free users get every feature with a cap on projects, items
// and recurring costs (FREE_LIMITS in config.ts).
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IAP from "expo-iap";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { DEFAULT_PRICES, FREE_LIMITS, PREMIUM_ENFORCED, PREMIUM_LIFETIME, PREMIUM_MONTHLY } from "./config";
import type { Snapshot } from "./model";
import { useStore } from "./store";
import { sb } from "./supabase";

const KEY = "profitPocket.premium";
type Status = { active: boolean; kind: "" | "monthly" | "lifetime" | "complimentary"; until: number };
export type LimitKind = keyof typeof FREE_LIMITS;

type Ctx = {
  status: Status;
  locked: boolean;
  supported: boolean;
  prices: { monthly: string; lifetime: string };
  loadPrices: () => void;
  buy: (kind: "monthly" | "lifetime") => Promise<boolean>;
  restore: () => Promise<boolean>;
  busy: boolean;
  error: string;
  // True if one more of this kind can be added on the current plan.
  canAdd: (kind: LimitKind) => boolean;
};
const PremiumCtx = createContext<Ctx | null>(null);
export const usePremium = () => {
  const c = useContext(PremiumCtx);
  if (!c) throw new Error("usePremium outside PremiumProvider");
  return c;
};

const supported = Platform.OS === "ios";

function statusFrom(purchases: any[]): Status {
  const now = Date.now();
  let next: Status = { active: false, kind: "", until: 0 };
  (purchases || []).forEach((p) => {
    if (p.productId === PREMIUM_LIFETIME) next = { active: true, kind: "lifetime", until: 0 };
    else if (p.productId === PREMIUM_MONTHLY && next.kind !== "lifetime") {
      const exp = p.expirationDateIOS ? +p.expirationDateIOS : 0;
      if (!exp || exp > now) next = { active: true, kind: "monthly", until: exp || now + 86400000 };
    }
  });
  return next;
}

export const countOf = (d: Snapshot, kind: LimitKind) =>
  kind === "groups" ? d.groups.length : kind === "items" ? d.items.length : d.recurring.length;

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { user, data } = useStore();
  const [status, setStatus] = useState<Status>({ active: false, kind: "", until: 0 });
  const [prices, setPrices] = useState({ ...DEFAULT_PRICES });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connected = useRef(false);
  const loadPricesRef = useRef<() => void>(() => {});

  // Complimentary Premium for emails listed in Supabase (complimentary_access).
  const [comp, setComp] = useState(false);
  useEffect(() => {
    if (!user || !sb) { setComp(false); return; }
    const k = "profitPocket.comp." + user.id;
    AsyncStorage.getItem(k).then((v) => { if (v === "1") setComp(true); }).catch(() => {});
    sb.from("complimentary_access").select("email").limit(1).then((r) => {
      if (r.error) return;
      const on = !!(r.data && r.data.length);
      setComp(on);
      AsyncStorage.setItem(k, on ? "1" : "0").catch(() => {});
    });
  }, [user]);

  const save = useCallback((s: Status) => { setStatus(s); AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, []);

  const refresh = useCallback(async () => {
    if (!supported || !connected.current) return;
    try {
      const list = await IAP.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      save(statusFrom((list as any[]) || []));
    } catch {}
  }, [save]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      try { const s = raw ? JSON.parse(raw) : null; if (s && (s.kind === "lifetime" || s.until > Date.now())) setStatus(s); } catch {}
    }).catch(() => {});
    if (!supported) return;
    let subs: { remove: () => void }[] = [];
    (async () => {
      try {
        await IAP.initConnection();
        connected.current = true;
        loadPricesRef.current();
        subs.push(IAP.purchaseUpdatedListener(async (p: any) => {
          try { await IAP.finishTransaction({ purchase: p, isConsumable: false }); } catch {}
          await refresh();
        }));
        subs.push(IAP.purchaseErrorListener(() => {}));
        await refresh();
      } catch {}
    })();
    return () => { subs.forEach((s) => s.remove()); subs = []; IAP.endConnection().catch(() => {}); };
  }, [refresh]);

  const loadPrices = useCallback(async () => {
    setError("");
    if (!supported || !connected.current) return;
    try {
      const subsList = ((await IAP.fetchProducts({ skus: [PREMIUM_MONTHLY], type: "subs" })) as any[]) || [];
      const once = ((await IAP.fetchProducts({ skus: [PREMIUM_LIFETIME], type: "in-app" })) as any[]) || [];
      setPrices((p) => ({
        monthly: subsList[0] && subsList[0].displayPrice ? subsList[0].displayPrice : p.monthly,
        lifetime: once[0] && once[0].displayPrice ? once[0].displayPrice : p.lifetime,
      }));
    } catch {}
  }, []);

  loadPricesRef.current = loadPrices;

  const buy = useCallback(async (kind: "monthly" | "lifetime") => {
    if (!supported || busy) return false;
    setBusy(true); setError("");
    try {
      if (kind === "monthly") await IAP.requestPurchase({ request: { apple: { sku: PREMIUM_MONTHLY } }, type: "subs" });
      else await IAP.requestPurchase({ request: { apple: { sku: PREMIUM_LIFETIME } }, type: "in-app" });
      return true; // the purchase listener finishes the transaction and refreshes the status
    } catch (e: any) {
      if (!IAP.isUserCancelledError(e)) setError("The purchase didn't go through. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const restore = useCallback(async () => {
    if (!supported) return false;
    try { await IAP.restorePurchases(); } catch {}
    try {
      const list = await IAP.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      const s = statusFrom((list as any[]) || []);
      save(s);
      return s.active;
    } catch { return false; }
  }, [save]);

  const effective: Status = comp && !status.active ? { active: true, kind: "complimentary", until: 0 } : status;
  // Premium is only sold on iPhone for now; elsewhere everything is unlocked.
  const locked = PREMIUM_ENFORCED && supported && !effective.active;

  const canAdd = useCallback((kind: LimitKind) => !locked || countOf(data, kind) < FREE_LIMITS[kind], [locked, data]);

  const value = useMemo<Ctx>(() => ({
    status: effective, locked, supported, prices, loadPrices, buy, restore, busy, error, canAdd,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [effective.active, effective.kind, effective.until, locked, prices, loadPrices, buy, restore, busy, error, canAdd]);

  return <PremiumCtx.Provider value={value}>{children}</PremiumCtx.Provider>;
}
