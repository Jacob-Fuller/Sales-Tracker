import Constants from "expo-constants";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddRow, Button, Card, Field, Input, Ionicons, List, Muted, Note, Row, Screen, SectionHead, Select, success } from "../components/ui";
import { ACCOUNTS_ENABLED, APP_NAME, APPLE_EULA_URL, PRIVACY_URL, SUPPORT_URL } from "../lib/config";
import { CURRENCIES } from "../lib/format";
import { MONTHS, type Settings } from "../lib/model";
import { usePremium } from "../lib/premium";
import { useStore } from "../lib/store";
import { C, F } from "../theme";

function useSettings() {
  const { data, update } = useStore();
  const set = (p: Partial<Settings>) => update((d) => { d.settings = { ...d.settings, ...p, updatedAt: Date.now() }; });
  return [data.settings, set] as const;
}

/* ---------- Settings ---------- */
export function SettingsScreen() {
  const nav = useNavigation<any>();
  const { user, sync } = useStore();
  const premium = usePremium();
  const [s, set] = useSettings();
  const version = Constants.expoConfig?.version || "1.0";
  const plan = premium.status.kind === "lifetime" ? "Lifetime" : premium.status.kind === "monthly" ? "Monthly" : premium.status.kind === "complimentary" ? "Complimentary" : "";
  return (
    <Screen>
      {premium.supported ? (
        <>
          <SectionHead title="Premium" />
          {premium.status.active ? (
            <List><Row lead={<Ionicons name="star" size={20} color={C.ember} />} title="Premium" sub={plan ? `${plan} plan` : undefined} /></List>
          ) : (
            <List>
              <Row lead={<Ionicons name="star-outline" size={20} color={C.ember} />} title="Go Premium" sub="Unlimited projects, items and recurring costs" chevron
                onPress={() => nav.navigate("Paywall", {})} />
              <Row title="Restore purchases" onPress={async () => {
                const ok = await premium.restore();
                Alert.alert(ok ? "Purchases restored" : "No purchases found", ok ? undefined : "Nothing to restore for this Apple ID.", undefined, { userInterfaceStyle: "dark" });
              }} />
            </List>
          )}
        </>
      ) : null}

      {ACCOUNTS_ENABLED ? (
        <>
          <SectionHead title="Account" />
          <List>
            <Row lead={<Ionicons name={user ? "cloud-done-outline" : "cloud-outline"} size={20} color={user ? C.gain : C.muted} />}
              title={user ? user.email || "Signed in" : "Back up and sync"}
              sub={user ? syncLine(sync) : "Sign in to keep your numbers safe and on every device"} chevron
              onPress={() => nav.push("Account")} />
          </List>
        </>
      ) : null}

      <SectionHead title="Tax" />
      <List>
        <Row lead={<Ionicons name="document-text-outline" size={20} color={C.ember} />} title="Tax reports" sub="PDF for each financial year" chevron
          onPress={() => nav.push("TaxReports")} />
      </List>

      <SectionHead title="Money" />
      <Field label="Currency">
        <Select value={s.currency} onChange={(v) => set({ currency: v })}
          options={[...CURRENCIES.map(([code, name]) => ({ value: code, label: `${name} (${code})` })),
            ...(CURRENCIES.some((c) => c[0] === s.currency) ? [] : [{ value: s.currency, label: s.currency }])]} />
      </Field>
      <Field label="Financial year starts">
        <Select value={String(s.fyStartMonth)} onChange={(v) => set({ fyStartMonth: +v })}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: `1 ${m}` }))} />
      </Field>
      <List>
        <Row title="Sales channels" sub={s.channels.map((c) => c.name).join(", ")} chevron onPress={() => nav.push("Channels")} />
        <Row title="Expense categories" sub={s.categories.join(", ")} chevron onPress={() => nav.push("Categories")} />
      </List>

      <SectionHead title="Help" />
      <List>
        <Row title="Support" chevron onPress={() => Linking.openURL(SUPPORT_URL)} />
        <Row title="Privacy policy" chevron onPress={() => Linking.openURL(PRIVACY_URL)} />
      </List>
      <Muted style={{ textAlign: "center", marginTop: 8 }}>{APP_NAME} {version}</Muted>
    </Screen>
  );
}

function syncLine(sync: { state: string; lastSync: number; dirty: boolean }) {
  if (sync.state === "syncing") return "Syncing…";
  if (sync.state === "authLost") return "Sign in again to keep syncing";
  if (sync.state === "failed") return sync.dirty ? "Waiting to sync" : "Couldn't reach the server";
  if (sync.lastSync) return "Synced " + ago(sync.lastSync);
  return "Synced";
}
function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return new Date(t).toLocaleDateString();
}

/* ---------- Sales channels ---------- */
export function ChannelsScreen() {
  const [s, set] = useSettings();
  const list = s.channels;
  const change = (i: number, p: Partial<{ name: string; fee: number }>) => set({ channels: list.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  return (
    <Screen gap={12}>
      <Note>Where you sell, and the cut each one takes. The fee fills in automatically when you record a sale.</Note>
      {list.map((c, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}><Input value={c.name} onChangeText={(v) => change(i, { name: v })} placeholder="Name" /></View>
          <View style={{ width: 92, flexDirection: "row", alignItems: "center" }}>
            <FeeInput value={c.fee} onCommit={(fee) => change(i, { fee })} />
            <Text style={{ position: "absolute", right: 12, fontFamily: F.semi, color: C.muted }}>%</Text>
          </View>
          <RemoveButton disabled={list.length <= 1} onPress={() => set({ channels: list.filter((_, j) => j !== i) })} />
        </View>
      ))}
      <List><AddRow text="Add channel" onPress={() => set({ channels: [...list, { name: "", fee: 0 }] })} /></List>
    </Screen>
  );
}

/* ---------- Expense categories ---------- */
export function CategoriesScreen() {
  const [s, set] = useSettings();
  const list = s.categories;
  return (
    <Screen gap={12}>
      {list.map((c, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}><Input value={c} onChangeText={(v) => set({ categories: list.map((x, j) => (j === i ? v : x)) })} placeholder="Category" /></View>
          <RemoveButton disabled={list.length <= 1} onPress={() => set({ categories: list.filter((_, j) => j !== i) })} />
        </View>
      ))}
      <List><AddRow text="Add category" onPress={() => set({ categories: [...list, ""] })} /></List>
    </Screen>
  );
}

// Typed freely (so "2.5" works), saved when the field is left.
function FeeInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  React.useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => { const n = parseFloat(text); const v = isFinite(n) ? Math.min(100, Math.max(0, n)) : 0; setText(String(v)); if (v !== value) onCommit(v); };
  return <Input style={{ flex: 1, textAlign: "right", paddingRight: 28 }} value={text} onChangeText={setText} onEndEditing={commit} onBlur={commit} keyboardType="decimal-pad" />;
}

function RemoveButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Remove" disabled={disabled} onPress={onPress} hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2, opacity: disabled ? 0.35 : 1 }}>
      <Ionicons name="remove" size={20} color={C.loss} />
    </Pressable>
  );
}

/* ---------- Account (email + code) ---------- */
export function AccountScreen() {
  const { user, sync, syncNow, sendCode, verifyCode, signOut, deleteAccount } = useStore();
  const nav = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setBusy(true); setError("");
    const r = await fn().catch((e) => ({ ok: false, error: String((e && e.message) || e) }));
    setBusy(false);
    if (!r.ok) setError(r.error || "Something went wrong");
    else if (after) after();
  };

  if (user) {
    return (
      <Screen>
        <Card style={{ padding: 18, gap: 4 }}>
          <Muted>Signed in as</Muted>
          <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}>{user.email}</Text>
          <Muted style={{ marginTop: 6 }}>{syncLine(sync)}</Muted>
        </Card>
        <Button kind="soft" title="Sync now" icon="sync" onPress={() => syncNow()} />
        <Button kind="soft" title="Sign out" onPress={() => {
          Alert.alert("Sign out?", sync.dirty ? "Some changes haven't synced yet and will be lost on this phone." : "Your numbers stay safe in your account.", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", style: "destructive", onPress: () => run(signOut, () => nav.goBack()) },
          ], { userInterfaceStyle: "dark" });
        }} />
        <Button kind="danger" title="Delete account" onPress={() => {
          Alert.alert("Delete your account?", "This permanently deletes your account and everything saved in it. It can't be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => run(deleteAccount, () => nav.goBack()) },
          ], { userInterfaceStyle: "dark" });
        }} />
        {error ? <Text style={{ color: C.loss, fontFamily: F.semi, textAlign: "center" }}>{error}</Text> : null}
      </Screen>
    );
  }
  return (
    <Screen>
      <Note>Sign in with your email to back up your numbers and use them on more than one device. Anything you've already added comes with you.</Note>
      <Field label="Email">
        <Input value={email} onChangeText={(v) => { setEmail(v); setSent(false); }} keyboardType="email-address" autoCapitalize="none"
          autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" editable={!busy} />
      </Field>
      {sent ? (
        <Field label="Code" hint={`We emailed a 6-digit code to ${email.trim()}.`}>
          <Input value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
            maxLength={8} placeholder="123456" editable={!busy} autoFocus />
        </Field>
      ) : null}
      {busy ? <ActivityIndicator color={C.ember} /> : sent ? (
        <>
          <Button title="Sign in" disabled={code.trim().length < 6} onPress={() => run(() => verifyCode(email, code), () => { success(); nav.goBack(); })} />
          <Button kind="soft" title="Send a new code" onPress={() => run(() => sendCode(email))} />
        </>
      ) : (
        <Button title="Email me a code" disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} onPress={() => run(() => sendCode(email), () => setSent(true))} />
      )}
      {error ? <Text style={{ color: C.loss, fontFamily: F.semi, textAlign: "center" }}>{error}</Text> : null}
    </Screen>
  );
}

/* ---------- Premium ---------- */
const PERKS = ["Unlimited projects", "Unlimited items", "Unlimited recurring costs"];

export function PaywallScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const reason = (useRoute<any>().params || {}).reason;
  const { prices, loadPrices, buy, restore, busy, error, status, supported } = usePremium();
  React.useEffect(() => { loadPrices(); }, [loadPrices]);
  React.useEffect(() => { if (status.active) nav.goBack(); }, [status.active, nav]);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 28 }}>
      <View style={{ alignItems: "flex-end" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => nav.goBack()} hitSlop={10}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={18} color={C.muted} />
        </Pressable>
      </View>
      <Text style={{ fontFamily: F.bold, color: C.ember, letterSpacing: 1.2, fontSize: 12 }}>PREMIUM</Text>
      <Text style={{ fontFamily: F.display, fontSize: 30, color: C.text, marginTop: 4, marginBottom: 8 }}>Profit Pocket Premium</Text>
      {reason ? <Muted style={{ fontSize: 15, lineHeight: 21, marginBottom: 14 }}>{reason}</Muted> : null}
      <View style={{ gap: 12, marginVertical: 10 }}>
        {PERKS.map((p) => (
          <View key={p} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Ionicons name="checkmark-circle" size={21} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.semi, color: C.text, fontSize: 15.5 }}>{p}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 14 }}>
        <Plan title="Monthly" sub="Cancel anytime" price={`${prices.monthly} / month`} primary onPress={() => buy("monthly")} disabled={busy || !supported} />
        <Plan title="Lifetime" sub="One payment, yours forever" price={prices.lifetime} onPress={() => buy("lifetime")} disabled={busy || !supported} />
      </View>
      {busy ? <ActivityIndicator color={C.ember} style={{ marginTop: 12 }} /> : null}
      {error ? <Text style={{ color: C.loss, fontFamily: F.semi, textAlign: "center", marginTop: 10 }}>{error}</Text> : null}
      <Button kind="soft" style={{ marginTop: 14 }} title="Restore purchases" onPress={async () => {
        const ok = await restore();
        if (!ok) Alert.alert("No purchases found", "Nothing to restore for this Apple ID.", undefined, { userInterfaceStyle: "dark" });
      }} />
      <Muted style={{ marginTop: 18, lineHeight: 18, fontSize: 12 }}>
        Monthly is an auto-renewing subscription charged to your Apple ID. It renews each month unless cancelled at least 24 hours before the end of the current period. Manage or cancel it in your Apple ID settings. Lifetime is a one-off purchase.
      </Muted>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 14 }}>
        <Link title="Terms of Use" url={APPLE_EULA_URL} />
        <Link title="Privacy Policy" url={PRIVACY_URL} />
      </View>
    </ScrollView>
  );
}

const Link = ({ title, url }: { title: string; url: string }) => (
  <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)} hitSlop={8}>
    <Text style={{ fontFamily: F.semi, color: C.ember, fontSize: 13.5 }}>{title}</Text>
  </Pressable>
);

function Plan({ title, sub, price, onPress, disabled, primary }: { title: string; sub: string; price: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 18,
        backgroundColor: primary ? C.ember : C.surface, borderWidth: primary ? 0 : 1, borderColor: C.lineStrong,
        opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
      })}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 16.5, color: primary ? C.emberInk : C.text }}>{title}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: primary ? C.emberInk : C.muted, marginTop: 2 }}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: F.mono, fontSize: 16, color: primary ? C.emberInk : C.text }}>{price}</Text>
    </Pressable>
  );
}
