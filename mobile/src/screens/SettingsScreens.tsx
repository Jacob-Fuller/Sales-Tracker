import Constants from "expo-constants";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Cell, Ionicons, PickerRow, Screen, Section, TextRow, Tile, success } from "../components/ui";
import { APP_NAME, APPLE_EULA_URL, PRIVACY_URL, SUPPORT_URL } from "../lib/config";
import { CURRENCIES } from "../lib/format";
import { MONTHS, type Settings } from "../lib/model";
import { usePremium } from "../lib/premium";
import { useStore } from "../lib/store";
import { NUM, usePalette } from "../theme";

function useSettings() {
  const { data, update } = useStore();
  const set = (p: Partial<Settings>) => update((d) => { d.settings = { ...d.settings, ...p, updatedAt: Date.now() }; });
  return [data.settings, set] as const;
}

/* ---------- Settings ---------- */
export function SettingsScreen() {
  const nav = useNavigation<any>();
  const premium = usePremium();
  const [s, set] = useSettings();
  const c = usePalette();
  const version = Constants.expoConfig?.version || "1.0";
  const plan = { lifetime: "Lifetime", monthly: "Monthly", complimentary: "Complimentary", "": "" }[premium.status.kind];
  const currencies = [...CURRENCIES.map(([code, name]) => ({ value: code, label: `${name}` })),
    ...(CURRENCIES.some((x) => x[0] === s.currency) ? [] : [{ value: s.currency, label: s.currency }])];
  return (
    <Screen>
      {premium.supported ? (
        <Section>
          {premium.status.active
            ? <Cell lead={<Tile icon="star" color="#FF9500" />} title="Premium" value={plan} tone="secondary" />
            : <Cell lead={<Tile icon="star" color="#FF9500" />} title="Go Premium" chevron onPress={() => nav.navigate("Paywall", {})} />}
          {premium.status.active ? null : (
            <Cell title="Restore Purchases" accent onPress={async () => {
              const ok = await premium.restore();
              Alert.alert(ok ? "Purchases restored" : "No purchases found");
            }} />
          )}
        </Section>
      ) : null}

      <Section>
        <Cell lead={<Tile icon="folder" color="#5856D6" />} title="Projects" chevron onPress={() => nav.push("Projects")} />
        <Cell lead={<Tile icon="pricetag" color="#34C759" />} title="Products" chevron onPress={() => nav.push("Products")} />
        <Cell lead={<Tile icon="document-text" color="#FF3B30" />} title="Tax Reports" chevron onPress={() => nav.push("TaxReports")} />
      </Section>

      <Section>
        <PickerRow label="Currency" value={s.currency} options={currencies} onChange={(v) => set({ currency: v })} />
        <PickerRow label="Financial Year" value={String(s.fyStartMonth)} onChange={(v) => set({ fyStartMonth: +v })}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: `Starts 1 ${m}` }))} />
        <Cell title="Sales Channels" chevron onPress={() => nav.push("Channels")} />
        <Cell title="Expense Categories" chevron onPress={() => nav.push("Categories")} />
      </Section>

      <Section>
        <Cell title="Support" chevron onPress={() => Linking.openURL(SUPPORT_URL)} />
        <Cell title="Privacy Policy" chevron onPress={() => Linking.openURL(PRIVACY_URL)} />
      </Section>
      <Text style={{ textAlign: "center", color: c.secondary, fontSize: 13 }}>{APP_NAME} {version}</Text>
    </Screen>
  );
}

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return new Date(t).toLocaleDateString();
}

/* ---------- editable lists (channels, categories) ---------- */
function EditRow({ first, children, onRemove, canRemove }: { first?: boolean; children: React.ReactNode; onRemove: () => void; canRemove: boolean }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.card, paddingLeft: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Remove" disabled={!canRemove} onPress={onRemove} hitSlop={8} style={{ opacity: canRemove ? 1 : 0.3 }}>
        <Ionicons name="remove-circle" size={22} color={c.loss} />
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 12, paddingRight: 16, minHeight: 46, borderTopWidth: first ? 0 : 0.5, borderTopColor: c.separator }}>
        {children}
      </View>
    </View>
  );
}

function PlainInput(props: React.ComponentProps<typeof TextInput>) {
  const c = usePalette();
  return <TextInput placeholderTextColor={c.tertiary} selectionColor={c.accent} keyboardAppearance={c.dark ? "dark" : "light"} {...props}
    style={[{ fontSize: 17, color: c.text, paddingVertical: 11 }, props.style]} />;
}

export function ChannelsScreen() {
  const [s, set] = useSettings();
  const c = usePalette();
  const list = s.channels;
  const change = (i: number, p: Partial<{ name: string; fee: number }>) => set({ channels: list.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <Screen>
      <Section title="Channel" right="Fee">
        {list.map((ch, i) => (
          <EditRow key={i} canRemove={list.length > 1} onRemove={() => set({ channels: list.filter((_, j) => j !== i) })}>
            <PlainInput style={{ flex: 1 }} value={ch.name} onChangeText={(v) => change(i, { name: v })} placeholder="Name" />
            <FeeInput value={ch.fee} onCommit={(fee) => change(i, { fee })} />
            <Text style={{ fontSize: 17, color: c.secondary }}>%</Text>
          </EditRow>
        ))}
        <Cell title="Add Channel" accent onPress={() => set({ channels: [...list, { name: "", fee: 0 }] })} />
      </Section>
    </Screen>
  );
}

export function CategoriesScreen() {
  const [s, set] = useSettings();
  const list = s.categories;
  return (
    <Screen>
      <Section>
        {list.map((cat, i) => (
          <EditRow key={i} canRemove={list.length > 1} onRemove={() => set({ categories: list.filter((_, j) => j !== i) })}>
            <PlainInput style={{ flex: 1 }} value={cat} onChangeText={(v) => set({ categories: list.map((x, j) => (j === i ? v : x)) })} placeholder="Category" />
          </EditRow>
        ))}
        <Cell title="Add Category" accent onPress={() => set({ categories: [...list, ""] })} />
      </Section>
    </Screen>
  );
}

// Typed freely (so "2.5" works), saved when the field is left.
function FeeInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  React.useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => { const n = parseFloat(text); const v = isFinite(n) ? Math.min(100, Math.max(0, n)) : 0; setText(String(v)); if (v !== value) onCommit(v); };
  return <PlainInput style={[{ width: 56, textAlign: "right", marginRight: 2 }, NUM]} value={text} onChangeText={setText} onEndEditing={commit} onBlur={commit} keyboardType="decimal-pad" />;
}

/* ---------- Premium ---------- */
const PERKS = ["Unlimited projects", "Unlimited repeating expenses"];

export function PaywallScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  const reason = (useRoute<any>().params || {}).reason;
  const { prices, loadPrices, buy, restore, busy, error, status, supported } = usePremium();
  React.useEffect(() => { loadPrices(); }, [loadPrices]);
  React.useEffect(() => { if (status.active) nav.goBack(); }, [status.active, nav]);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}>
      <View style={{ alignItems: "flex-end" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => nav.goBack()} hitSlop={10}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={18} color={c.secondary} />
        </Pressable>
      </View>
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="star" size={34} color={c.onAccent} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", color: c.text, marginTop: 16, textAlign: "center" }}>{APP_NAME} Premium</Text>
        {reason ? <Text style={{ fontSize: 15, color: c.secondary, marginTop: 6, textAlign: "center" }}>{reason}</Text> : null}
      </View>
      <View style={{ marginTop: 24 }}>
        <Section>
          {PERKS.map((p) => <Cell key={p} lead={<Ionicons name="checkmark-circle" size={22} color={c.accent} />} title={p} />)}
        </Section>
      </View>
      <View style={{ gap: 10, marginTop: 24 }}>
        <Plan title="Unlock Premium" price={`${prices.lifetime} once`} primary onPress={() => buy("lifetime")} disabled={busy || !supported} />
      </View>
      {busy ? <ActivityIndicator color={c.accent} style={{ marginTop: 12 }} /> : null}
      {error ? <Text style={{ color: c.loss, textAlign: "center", marginTop: 10 }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" style={{ alignSelf: "center", padding: 12, marginTop: 6 }} onPress={async () => {
        const ok = await restore();
        if (!ok) Alert.alert("No purchases found");
      }}>
        <Text style={{ color: c.accent, fontSize: 15 }}>Restore Purchases</Text>
      </Pressable>
      <Text style={{ marginTop: 6, lineHeight: 17, fontSize: 12, color: c.secondary }}>
        A one-off purchase charged to your Apple ID. No subscription.
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 14 }}>
        <LinkText title="Terms of Use" url={APPLE_EULA_URL} />
        <LinkText title="Privacy Policy" url={PRIVACY_URL} />
      </View>
    </ScrollView>
  );
}

function LinkText({ title, url }: { title: string; url: string }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)} hitSlop={8}>
      <Text style={{ color: c.accent, fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

function Plan({ title, price, onPress, disabled, primary }: { title: string; price: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  const c = usePalette();
  const fg = primary ? c.onAccent : c.text;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 18,
        backgroundColor: primary ? c.accent : c.card, opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}>
      <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: fg }}>{title}</Text>
      <Text style={[{ fontSize: 17, color: fg }, NUM]}>{price}</Text>
    </Pressable>
  );
}
