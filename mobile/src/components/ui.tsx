// Building blocks in the style of Apple's own apps: grouped lists, plain rows,
// a segmented control and form rows with the label on the left.
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { longDate, parseYmd, ymd } from "../lib/model";
import { NUM, usePalette } from "../theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export { Ionicons };

export const tap = () => { if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {}); };
export const success = () => { if (Platform.OS === "ios") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };

const HAIR = StyleSheet.hairlineWidth;

/* ---------- screens ---------- */
export function Screen({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, gap: 24 }}
    >
      {children}
    </ScrollView>
  );
}

/* ---------- grouped sections ---------- */
export function Section({ title, right, footer, children }: { title?: string; right?: string; footer?: string; children: React.ReactNode }) {
  const c = usePalette();
  const kids = React.Children.toArray(children).filter(Boolean) as React.ReactElement<any>[];
  if (!kids.length) return null;
  return (
    <View>
      {title ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 7 }}>
          <Text style={{ fontSize: 13, color: c.secondary, textTransform: "uppercase", letterSpacing: 0.2 }}>{title}</Text>
          {right ? <Text style={[{ fontSize: 13, color: c.secondary }, NUM]}>{right}</Text> : null}
        </View>
      ) : null}
      <View style={{ backgroundColor: c.card, borderRadius: 12, overflow: "hidden" }}>
        {kids.map((k, i) => React.cloneElement(k, { first: i === 0 }))}
      </View>
      {footer ? <Text style={{ fontSize: 13, color: c.secondary, paddingHorizontal: 16, marginTop: 7, lineHeight: 18 }}>{footer}</Text> : null}
    </View>
  );
}

// A small coloured square with a white symbol, like the Settings app.
export function Tile({ icon, color, size = 30 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.6} color="#FFFFFF" />
    </View>
  );
}

export function Cell({ title, subtitle, value, tone, lead, onPress, chevron, first, accent, destructive, center }: {
  title: string; subtitle?: string; value?: string; tone?: "gain" | "loss" | "secondary";
  lead?: React.ReactNode; onPress?: () => void; chevron?: boolean; first?: boolean;
  accent?: boolean; destructive?: boolean; center?: boolean;
}) {
  const c = usePalette();
  const titleColor = destructive ? c.loss : accent ? c.accent : c.text;
  const valueColor = tone === "gain" ? c.gain : tone === "loss" ? c.loss : tone === "secondary" ? c.secondary : c.text;
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? c.pressed : c.card, flexDirection: "row", alignItems: "center", paddingLeft: 16 })}>
      {lead ? <View style={{ marginRight: 12 }}>{lead}</View> : null}
      <View style={{
        flex: 1, flexDirection: "row", alignItems: "center", minHeight: subtitle ? 58 : 46, paddingVertical: 9, paddingRight: 14,
        borderTopWidth: first ? 0 : HAIR, borderTopColor: c.separator, gap: 10,
      }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 17, color: titleColor, textAlign: center ? "center" : "left" }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ fontSize: 14, color: c.secondary, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {value != null ? <Text numberOfLines={1} style={[{ fontSize: 17, color: valueColor, maxWidth: "55%" }, NUM]}>{value}</Text> : null}
        {chevron ? <Ionicons name="chevron-forward" size={18} color={c.tertiary} /> : null}
      </View>
    </Pressable>
  );
}

/* ---------- segmented control ---------- */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const c = usePalette();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.fill, borderRadius: 9, padding: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { if (!on) { tap(); onChange(o.value); } }}
            style={{
              flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 7,
              backgroundColor: on ? (c.dark ? "#636366" : "#FFFFFF") : "transparent",
              shadowColor: "#000", shadowOpacity: on && !c.dark ? 0.12 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
            }}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: on ? "600" : "500", color: c.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- the profit summary ---------- */
export function Summary({ net, moneyIn, moneyOut, label = "Profit" }: { net: string; moneyIn: string; moneyOut: string; label?: string; negative?: boolean }) {
  const c = usePalette();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 18 }}>
      <Text style={{ fontSize: 15, color: c.secondary }}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[{ fontSize: 40, fontWeight: "700", letterSpacing: -0.8, color: net.startsWith("-") ? c.loss : c.text, marginTop: 2 }, NUM]}>{net}</Text>
      <View style={{ flexDirection: "row", marginTop: 14, paddingTop: 14, borderTopWidth: HAIR, borderTopColor: c.separator }}>
        <Figure label="Money in" value={moneyIn} />
        <View style={{ width: HAIR, backgroundColor: c.separator, marginHorizontal: 16 }} />
        <Figure label="Money out" value={moneyOut} />
      </View>
    </View>
  );
}
function Figure({ label, value }: { label: string; value: string }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, color: c.secondary }}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[{ fontSize: 20, fontWeight: "600", color: c.text, marginTop: 2 }, NUM]}>{value}</Text>
    </View>
  );
}

/* ---------- empty states ---------- */
export function Empty({ icon, title, text, button }: { icon: IconName; title: string; text?: string; button?: { label: string; onPress: () => void } }) {
  const c = usePalette();
  return (
    <View style={{ alignItems: "center", paddingTop: 72, paddingHorizontal: 24, gap: 8 }}>
      <Ionicons name={icon} size={46} color={c.tertiary} />
      <Text style={{ fontSize: 20, fontWeight: "600", color: c.text, marginTop: 6, textAlign: "center" }}>{title}</Text>
      {text ? <Text style={{ fontSize: 15, color: c.secondary, textAlign: "center", lineHeight: 20, maxWidth: 300 }}>{text}</Text> : null}
      {button ? <Button title={button.label} onPress={button.onPress} style={{ marginTop: 14, alignSelf: "center", paddingHorizontal: 24 }} /> : null}
    </View>
  );
}

/* ---------- buttons ---------- */
export function Button({ title, onPress, disabled, plain, style }: { title: string; onPress: () => void; disabled?: boolean; plain?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{
        alignItems: "center", justifyContent: "center", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12,
        backgroundColor: plain ? c.card : c.accent, opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      }, style]}>
      <Text style={{ fontSize: 17, fontWeight: "600", color: plain ? c.accent : c.onAccent }}>{title}</Text>
    </Pressable>
  );
}

export function HeaderIcon({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 4 })}>
      <Ionicons name={icon} size={icon === "add" ? 30 : 24} color={c.accent} />
    </Pressable>
  );
}

export function HeaderText({ label, onPress, bold, disabled }: { label: string; onPress: () => void; bold?: boolean; disabled?: boolean }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 4 })}>
      <Text style={{ fontSize: 17, fontWeight: bold ? "600" : "400", color: disabled ? c.tertiary : c.accent }}>{label}</Text>
    </Pressable>
  );
}

/* ---------- form rows (label on the left, value on the right) ---------- */
function FormRow({ label, first, children, onPress, tall }: { label: string; first?: boolean; children: React.ReactNode; onPress?: () => void; tall?: boolean }) {
  const c = usePalette();
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => ({ backgroundColor: pressed && onPress ? c.pressed : c.card, paddingLeft: 16 })}>
      <View style={{
        flexDirection: "row", alignItems: "center", minHeight: tall ? 56 : 46, paddingRight: 16, gap: 12,
        borderTopWidth: first ? 0 : HAIR, borderTopColor: c.separator,
      }}>
        <Text style={{ fontSize: 17, color: c.text }}>{label}</Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>{children}</View>
      </View>
    </Pressable>
  );
}

export function TextRow({ label, first, money, style, ...rest }: TextInputProps & { label: string; first?: boolean; money?: boolean }) {
  const c = usePalette();
  return (
    <FormRow label={label} first={first}>
      <TextInput
        placeholderTextColor={c.tertiary}
        selectionColor={c.accent}
        keyboardAppearance={c.dark ? "dark" : "light"}
        {...rest}
        style={[{ fontSize: 17, color: c.text, textAlign: "right", paddingVertical: 11, width: "100%", outlineWidth: 0 } as TextStyle, money ? NUM : null, style]}
      />
    </FormRow>
  );
}

// A large amount entry at the top of a form.
export function AmountField({ value, onChangeText, symbol, autoFocus }: { value: string; onChangeText: (v: string) => void; symbol: string; autoFocus?: boolean }) {
  const c = usePalette();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 34, fontWeight: "600", color: value ? c.text : c.tertiary }}>{symbol}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder="0.00" placeholderTextColor={c.tertiary} keyboardType="decimal-pad"
        autoFocus={autoFocus} selectionColor={c.accent} keyboardAppearance={c.dark ? "dark" : "light"} accessibilityLabel="Amount"
        style={[{ fontSize: 34, fontWeight: "600", color: c.text, minWidth: 90, paddingVertical: 0, outlineWidth: 0 } as TextStyle, NUM]} />
    </View>
  );
}

export type Option = { value: string; label: string };

// Tapping the row opens the choices right under it, checkmark on the current one.
export function PickerRow({ label, value, options, onChange, first, disabled }: {
  label: string; value: string; options: Option[]; onChange: (v: string) => void; first?: boolean; disabled?: boolean;
}) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <View>
      <FormRow label={label} first={first} onPress={disabled ? undefined : () => { tap(); setOpen((o) => !o); }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ fontSize: 17, color: open ? c.accent : c.secondary, maxWidth: 220 }}>{cur ? cur.label : "None"}</Text>
          {disabled ? null : <Ionicons name="chevron-expand" size={16} color={open ? c.accent : c.tertiary} />}
        </View>
      </FormRow>
      {open ? options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }}
            onPress={() => { tap(); onChange(o.value); setOpen(false); }}
            style={({ pressed }) => ({ backgroundColor: pressed ? c.pressed : c.card, paddingLeft: 32 })}>
            <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, paddingRight: 16, borderTopWidth: HAIR, borderTopColor: c.separator }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: c.text }}>{o.label}</Text>
              {on ? <Ionicons name="checkmark" size={20} color={c.accent} /> : null}
            </View>
          </Pressable>
        );
      }) : null}
    </View>
  );
}

export function DateRow({ label = "Date", value, onChange, first }: { label?: string; value: string; onChange: (v: string) => void; first?: boolean }) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "ios") {
    return (
      <FormRow label={label} first={first}>
        <DateTimePicker mode="date" display="compact" value={parseYmd(value)} themeVariant={c.dark ? "dark" : "light"} accentColor={c.accent}
          onChange={(_, d) => { if (d) onChange(ymd(d)); }} />
      </FormRow>
    );
  }
  if (Platform.OS === "web") {
    return (
      <FormRow label={label} first={first}>
        <Text style={{ fontSize: 17, color: c.secondary }}>{longDate(value)}</Text>
      </FormRow>
    );
  }
  return (
    <>
      <FormRow label={label} first={first} onPress={() => setOpen(true)}>
        <Text style={{ fontSize: 17, color: c.secondary }}>{longDate(value)}</Text>
      </FormRow>
      {open ? <DateTimePicker mode="date" value={parseYmd(value)} onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(ymd(d)); }} /> : null}
    </>
  );
}

export function StepperRow({ label, value, onChange, min = 1, first }: { label: string; value: number; onChange: (n: number) => void; min?: number; first?: boolean }) {
  const c = usePalette();
  const btn = (icon: IconName, d: number, off: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={d > 0 ? "More" : "Fewer"} disabled={off} hitSlop={6}
      onPress={() => { tap(); onChange(value + d); }}
      style={({ pressed }) => ({ width: 44, height: 32, alignItems: "center", justifyContent: "center", opacity: off ? 0.3 : pressed ? 0.5 : 1 })}>
      <Ionicons name={icon} size={20} color={c.text} />
    </Pressable>
  );
  return (
    <FormRow label={label} first={first}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={[{ fontSize: 17, color: c.secondary, minWidth: 24, textAlign: "right" }, NUM]}>{value}</Text>
        <View style={{ flexDirection: "row", backgroundColor: c.fill, borderRadius: 9, alignItems: "center" }}>
          {btn("remove", -1, value <= min)}
          <View style={{ width: HAIR, height: 18, backgroundColor: c.tertiary }} />
          {btn("add", 1, false)}
        </View>
      </View>
    </FormRow>
  );
}

// Form screen body inside a sheet.
export function Form({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 24 }}>
      {children}
    </ScrollView>
  );
}
