import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import type { Period, Totals } from "../lib/calc";
import { periodLabel } from "../lib/calc";
import { hue, initials, longDate, parseYmd, STATUS_COLOR, ymd, type Item } from "../lib/model";
import { useStore } from "../lib/store";
import { C, F } from "../theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export { Ionicons };

export const tap = () => { if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {}); };
export const success = () => { if (Platform.OS === "ios") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };

/* ---------- text ---------- */
type TxtProps = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const Txt = ({ children, style, numberOfLines }: TxtProps) => (
  <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.body, fontSize: 15, color: C.text }, style]}>{children}</Text>
);
export const Muted = ({ children, style, numberOfLines }: TxtProps) => (
  <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.body, fontSize: 13, color: C.muted }, style]}>{children}</Text>
);
export const Mono = ({ children, style, numberOfLines }: TxtProps) => (
  <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.mono, fontSize: 15, color: C.text, fontVariant: ["tabular-nums"] }, style]}>{children}</Text>
);
export const Note = ({ children }: { children: React.ReactNode }) => (
  <Muted style={{ marginHorizontal: 4, fontSize: 13.5, lineHeight: 19 }}>{children}</Muted>
);

/* ---------- screen ---------- */
// A scrolling screen under the large native title.
export function Screen({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap }}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 18, overflow: "hidden" }, style]}>{children}</View>;
}

export function SectionHead({ title, meta, action }: { title: string; meta?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 4, marginTop: 8, marginBottom: -6, gap: 12 }}>
      <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.text }}>{title}</Text>
      {meta ? <Mono style={{ color: C.muted, fontSize: 13, fontFamily: F.monoMedium }}>{meta}</Mono> : null}
      {action ? <Pressable hitSlop={10} onPress={action.onPress} accessibilityRole="button"><Text style={{ fontFamily: F.bold, color: C.ember, fontSize: 14 }}>{action.label}</Text></Pressable> : null}
    </View>
  );
}

export function MonthHead({ label, total }: { label: string; total: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 4, marginTop: 6, marginBottom: -8 }}>
      <Text style={{ fontFamily: F.bold, color: C.muted, fontSize: 13 }}>{label}</Text>
      <Mono style={{ color: C.muted, fontSize: 13, fontFamily: F.monoMedium }}>{total}</Mono>
    </View>
  );
}

/* ---------- list rows ---------- */
export function Row({ lead, title, sub, amount, tone, amountSub, onPress, first, chevron }: {
  lead?: React.ReactNode; title: string; sub?: React.ReactNode; amount?: string; tone?: "gain" | "loss" | "muted";
  amountSub?: string; onPress?: () => void; first?: boolean; chevron?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.lineStrong,
        backgroundColor: pressed ? "rgba(255,255,255,0.04)" : "transparent",
      })}
    >
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 15.5, color: C.text }}>{title}</Text>
        {sub == null ? null : typeof sub === "string"
          ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{sub}</Text>
          : <View style={{ marginTop: 2 }}>{sub}</View>}
      </View>
      {amount != null ? (
        <View style={{ alignItems: "flex-end" }}>
          <Mono style={{ color: tone === "gain" ? C.gain : tone === "loss" ? C.loss : tone === "muted" ? C.muted : C.text }}>{amount}</Mono>
          {amountSub ? <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.muted, marginTop: 2 }}>{amountSub}</Text> : null}
        </View>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={17} color={C.faint} /> : null}
    </Pressable>
  );
}

// Rows inside one card, with dividers between them.
export function List({ children }: { children: React.ReactNode }) {
  const kids = React.Children.toArray(children).filter(Boolean) as React.ReactElement<any>[];
  return <Card>{kids.map((k, i) => React.cloneElement(k, { first: i === 0 }))}</Card>;
}

export function AddRow({ text, onPress, first }: { text: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.lineStrong, backgroundColor: pressed ? "rgba(255,255,255,0.04)" : "transparent",
      })}>
      <Lead icon="add" tone="ember" />
      <Text style={{ fontFamily: F.bold, fontSize: 15.5, color: C.ember }}>{text}</Text>
    </Pressable>
  );
}

/* ---------- leading badges ---------- */
const TONES = {
  plain: { bg: C.surface2, fg: C.muted },
  sale: { bg: C.gainSoft, fg: C.gain },
  exp: { bg: C.lossSoft, fg: C.loss },
  recur: { bg: C.recurSoft, fg: C.recur },
  ember: { bg: C.emberSoft, fg: C.ember },
};
export function Lead({ icon, tone = "plain", size = 36 }: { icon: IconName; tone?: keyof typeof TONES; size?: number }) {
  const t = TONES[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.48} color={t.fg} />
    </View>
  );
}
export function Letters({ text, h, size = 36 }: { text: string; h: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor: `hsl(${h}, 40%, 20%)`, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.display, fontSize: size * 0.36, color: `hsl(${h}, 85%, 74%)` }}>{text}</Text>
    </View>
  );
}
export const Avatar = ({ name }: { name: string }) => <Letters text={initials(name)} h={hue(name)} />;
export function ItemBadge({ item, size = 36 }: { item: Pick<Item, "name" | "logo" | "iconText" | "iconHue">; size?: number }) {
  if (item.logo) return <Image source={{ uri: item.logo }} style={{ width: size, height: size, borderRadius: size * 0.28 }} />;
  const text = (item.iconText || initials(item.name || "?")).slice(0, 3);
  return <Letters text={text} h={item.iconHue ?? hue(item.name || "")} size={size} />;
}
export const StatusDot = ({ status }: { status: string }) => (
  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STATUS_COLOR[status] || C.faint, marginRight: 6, marginTop: 1 }} />
);

/* ---------- money summary ---------- */
export function Pills({ value, onChange, fyStartMonth }: { value: Period; onChange: (p: Period) => void; fyStartMonth: number }) {
  const opts: Period[] = ["month", "fy", "all"];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {opts.map((p) => {
        const on = p === value;
        return (
          <Pressable key={p} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { tap(); onChange(p); }}
            style={{ backgroundColor: on ? C.text : C.surface, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: on ? C.bg : C.muted }}>{periodLabel(p, fyStartMonth)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Hero({ t, label = "Profit" }: { t: Totals; label?: string }) {
  const { money } = useStore();
  return (
    <Card style={{ padding: 22 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.muted }}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1}
        style={{ fontFamily: F.mono, fontSize: 38, letterSpacing: -1, marginTop: 6, marginBottom: 14, color: t.net >= 0 ? C.gain : C.loss, fontVariant: ["tabular-nums"] }}>
        {money.signed(t.net)}
      </Text>
      <View style={{ flexDirection: "row", gap: 28 }}>
        <Stat label="Money in" value={money.money(t.kept)} />
        <Stat label="Money out" value={money.money(t.spent)} />
      </View>
      <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line, flexDirection: "row", justifyContent: "space-between" }}>
        <Muted style={{ fontSize: 14 }}>Recurring costs</Muted>
        <Mono style={{ fontSize: 14 }}>{money.money(t.monthly)}/mo</Mono>
      </View>
    </Card>
  );
}
const Stat = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.muted }}>{label}</Text>
    <Mono style={{ fontSize: 17, marginTop: 2 }}>{value}</Mono>
  </View>
);

export function Empty({ title, text, button }: { title: string; text: string; button?: { label: string; onPress: () => void } }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 20, gap: 12 }}>
      <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{title}</Text>
      <Muted style={{ fontSize: 14.5, textAlign: "center", maxWidth: 280, lineHeight: 20 }}>{text}</Muted>
      {button ? <Button title={button.label} icon="add" onPress={button.onPress} style={{ marginTop: 4 }} /> : null}
    </Card>
  );
}

/* ---------- buttons ---------- */
export function Button({ title, onPress, kind = "primary", icon, disabled, style }: {
  title: string; onPress: () => void; kind?: "primary" | "soft" | "danger"; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === "primary" ? C.ember : kind === "soft" ? C.surface2 : "transparent";
  const fg = kind === "primary" ? C.emberInk : kind === "soft" ? C.text : C.loss;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 18, borderRadius: 13,
        backgroundColor: bg, borderWidth: kind === "danger" ? 1 : 0, borderColor: "rgba(251,113,133,0.35)", opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      }, style]}>
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: 15, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function HeaderButton({ icon, label, onPress, primary, disabled }: { icon?: IconName; label?: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  if (icon) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress}
        style={({ pressed }) => ({
          width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
          backgroundColor: primary ? C.ember : C.surface2, opacity: pressed ? 0.8 : 1,
        })}>
        <Ionicons name={icon} size={primary ? 22 : 19} color={primary ? C.emberInk : C.text} />
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} disabled={disabled}>
      <Text style={{ fontFamily: primary ? F.bold : F.semi, fontSize: 16.5, color: disabled ? C.faint : primary ? C.ember : C.text }}>{label}</Text>
    </Pressable>
  );
}

/* ---------- form pieces ---------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.muted }}>{label}</Text>
      {children}
      {hint ? <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint }}>{hint}</Text> : null}
    </View>
  );
}

const inputStyle: TextStyle = {
  borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, color: C.text, borderRadius: 13,
  paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 13 : 10, fontSize: 16, fontFamily: F.body,
};

export function Input(props: TextInputProps & { amount?: boolean }) {
  const { amount, style, ...rest } = props;
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={C.faint}
      selectionColor={C.ember}
      keyboardAppearance="dark"
      {...rest}
      onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
      onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
      style={[inputStyle, focus && { borderColor: C.ember }, amount && { fontFamily: F.mono, fontSize: 22 }, style]}
    />
  );
}

export type Option = { value: string; label: string; section?: string };
// A select that opens a list of choices in place (works inside sheets).
export function Select({ value, options, onChange, placeholder }: { value: string; options: Option[]; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  let lastSection: string | undefined;
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { tap(); setOpen((o) => !o); }}
        style={[inputStyle, { flexDirection: "row", alignItems: "center", gap: 8 }, open && { borderColor: C.ember }]}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.body, fontSize: 16, color: cur ? C.text : C.faint }}>{cur ? cur.label : placeholder || "Choose"}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
      </Pressable>
      {open ? (
        <Card style={{ marginTop: 6 }}>
          {options.map((o, i) => {
            const head = o.section && o.section !== lastSection ? o.section : null;
            lastSection = o.section;
            const on = o.value === value;
            return (
              <View key={o.value}>
                {head ? <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.faint, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>{head}</Text> : null}
                <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { tap(); onChange(o.value); setOpen(false); }}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 10,
                    borderTopWidth: i === 0 || head ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.lineStrong,
                    backgroundColor: pressed ? "rgba(255,255,255,0.04)" : "transparent",
                  })}>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: on ? F.bold : F.body, fontSize: 15.5, color: on ? C.ember : C.text }}>{o.label}</Text>
                  {on ? <Ionicons name="checkmark" size={18} color={C.ember} /> : null}
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}
    </View>
  );
}

// The phone's own date picker ("YYYY-MM-DD" in and out).
export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web") return <Input value={value} onChangeText={onChange} placeholder="2026-01-31" />;
  if (Platform.OS === "ios") {
    return (
      <View style={{ flexDirection: "row" }}>
        <DateTimePicker mode="date" display="compact" value={parseYmd(value)} themeVariant="dark" accentColor={C.ember}
          onChange={(_, d) => { if (d) onChange(ymd(d)); }} />
      </View>
    );
  }
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={inputStyle}>
        <Text style={{ fontFamily: F.body, fontSize: 16, color: C.text }}>{longDate(value)}</Text>
      </Pressable>
      {open ? <DateTimePicker mode="date" value={parseYmd(value)} onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(ymd(d)); }} /> : null}
    </View>
  );
}

export function More({ children, startOpen }: { children: React.ReactNode; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, gap: 14 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { tap(); setOpen((o) => !o); }} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={open ? "remove" : "add"} size={16} color={C.ember} />
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.muted }}>More options</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

// Form screen body: fields stacked with even spacing, inside a sheet.
export function Form({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
      {children}
    </ScrollView>
  );
}
