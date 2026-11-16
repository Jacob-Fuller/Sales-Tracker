// Building blocks in Budget Board's style: rounded cards with hairline borders,
// a dark hero card with a gold glow, a segmented control, and form rows with the
// label on the left. Charts are plain SVG.
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { longDate, parseYmd, ymd } from "../lib/model";
import { mix, NUM, usePalette } from "../theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export { Ionicons };

export const tap = () => { if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {}); };
export const success = () => { if (Platform.OS === "ios") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };

export const HAIR = StyleSheet.hairlineWidth;
// react-native-svg text needs the font named on the web preview; on iPhone it uses the system font.
const SVG_FONT = Platform.OS === "web" ? "-apple-system, system-ui, Segoe UI, Roboto, sans-serif" : undefined;
const CAPS: TextStyle = { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" };

/* ---------- screens ---------- */
export function Screen({ children, header, gap = 20 }: { children: React.ReactNode; header?: boolean; gap?: number }) {
  const c = usePalette();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior={header ? "never" : "automatic"}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: header ? 4 : 8, paddingBottom: 48, gap }}
    >
      <View style={{ width: "100%", maxWidth: 760, alignSelf: "center", gap }}>{children}</View>
    </ScrollView>
  );
}

// The app's own header on each tab: emblem, title, then icon buttons; anything
// passed as children (the period switch) sits underneath.
export function TopBar({ title, right, children }: { title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 12, gap: 12, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, width: "100%", maxWidth: 760, alignSelf: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <Emblem />
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 20, fontWeight: "700", letterSpacing: -0.5, color: c.text, flexShrink: 1 }}>{title}</Text>
        </View>
        {right}
      </View>
      {children ? <View style={{ width: "100%", maxWidth: 760, alignSelf: "center" }}>{children}</View> : null}
    </View>
  );
}

// The little gold ledger mark beside the title (same idea as Budget Board's).
export function Emblem({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={7} fill="#1C1A16" />
      <Rect x={5.4} y={13.2} width={2.6} height={5} rx={0.6} fill="#E2B862" />
      <Rect x={9.4} y={10.2} width={2.6} height={8} rx={0.6} fill="#E2B862" />
      <Rect x={13.4} y={11.8} width={2.6} height={6.4} rx={0.6} fill="#E2B862" />
      <Rect x={17.4} y={7.4} width={1.6} height={10.8} rx={0.5} fill="#E2B862" opacity={0.55} />
      <Path d="M5.6 9.6l4.6-3.4 3.6 2.4 4.8-3.6" stroke="#E2B862" strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={4.6} y={18.8} width={14.8} height={1.3} rx={0.4} fill="#E2B862" />
    </Svg>
  );
}

export function BarButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.fill : "transparent" })}>
      <Ionicons name={icon} size={icon === "add" ? 28 : 22} color={icon === "add" ? c.accent : c.text} />
    </Pressable>
  );
}

/* ---------- cards ---------- */
// A titled card. color tints the header like Budget Board's sections.
export function Section({ title, right, footer, color, onTitlePress, children }: {
  title?: string; right?: string; footer?: string; color?: string; onTitlePress?: () => void; children: React.ReactNode;
}) {
  const c = usePalette();
  const kids = React.Children.toArray(children).filter(Boolean) as React.ReactElement<any>[];
  if (!kids.length) return null;
  const head = title && color ? (
    <Pressable disabled={!onTitlePress} onPress={onTitlePress} accessibilityRole={onTitlePress ? "button" : undefined}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: mix(color, c.card, pressed ? 0.24 : 0.15) })}>
      <Dot color={color} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: "700", color: c.text }}>{title}</Text>
      {right ? <Text style={[{ fontSize: 15, fontWeight: "600", color: c.text }, NUM]}>{right}</Text> : null}
      {onTitlePress ? <Ionicons name="chevron-forward" size={16} color={c.tertiary} /> : null}
    </Pressable>
  ) : null;
  return (
    <View>
      {title && !color ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 8 }}>
          <Text style={[CAPS, { color: c.secondary }]}>{title}</Text>
          {right ? <Text style={[{ fontSize: 13, color: c.secondary, fontWeight: "500" }, NUM]}>{right}</Text> : null}
        </View>
      ) : null}
      <View style={{ backgroundColor: c.card, borderRadius: 18, borderWidth: HAIR, borderColor: c.line, overflow: "hidden" }}>
        {head}
        {kids.map((k, i) => React.cloneElement(k, { first: i === 0 && !head }))}
      </View>
      {footer ? <Text style={{ fontSize: 13, color: c.secondary, paddingHorizontal: 4, marginTop: 8, lineHeight: 18 }}>{footer}</Text> : null}
    </View>
  );
}

// A plain padded card (charts, figures).
export function Block({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const c = usePalette();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, minHeight: 18 }}>
        <Text style={[CAPS, { color: c.secondary }]}>{title}</Text>
        {right}
      </View>
      <View style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: HAIR, borderRadius: 18, padding: 18, gap: 12 }}>{children}</View>
    </View>
  );
}

// Column labels across the top of a card ("Item  ·  Amount").
export function ColumnHead({ left, right, first }: { left: string; right: string; first?: boolean }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 16, backgroundColor: c.sunk,
      borderTopWidth: first ? 0 : HAIR, borderTopColor: c.line }}>
      <Text style={[CAPS, { fontSize: 11, color: c.secondary }]}>{left}</Text>
      <Text style={[CAPS, { fontSize: 11, color: c.secondary }]}>{right}</Text>
    </View>
  );
}

// A total row at the bottom of a card.
export function TotalRow({ label, value, tone, first }: { label: string; value: string; tone?: "gain" | "loss"; first?: boolean }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16,
      backgroundColor: c.sunk, borderTopWidth: first ? 0 : HAIR, borderTopColor: c.line }}>
      <Text style={{ fontWeight: "700", fontSize: 15.5, color: c.text }}>{label}</Text>
      <Text style={[{ fontWeight: "700", fontSize: 15.5, color: tone === "gain" ? c.gain : tone === "loss" ? c.loss : c.text }, NUM]}>{value}</Text>
    </View>
  );
}

export const Dot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
);

export function Tag({ text, color }: { text: string; color?: string }) {
  const c = usePalette();
  return (
    <View style={{ backgroundColor: color ? mix(color, c.card, 0.16) : c.fill, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: color || c.secondary }}>{text}</Text>
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

export function Cell({ title, subtitle, value, tone, lead, onPress, chevron, first, accent, destructive, center, strong }: {
  title: string; subtitle?: string; value?: string; tone?: "gain" | "loss" | "secondary";
  lead?: React.ReactNode; onPress?: () => void; chevron?: boolean; first?: boolean;
  accent?: boolean; destructive?: boolean; center?: boolean; strong?: boolean;
}) {
  const c = usePalette();
  const titleColor = destructive ? c.loss : accent ? c.accent : c.text;
  const valueColor = tone === "gain" ? c.gain : tone === "loss" ? c.loss : tone === "secondary" ? c.secondary : c.text;
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? c.pressed : c.card, flexDirection: "row", alignItems: "center", paddingLeft: 16 })}>
      {lead ? <View style={{ marginRight: 12 }}>{lead}</View> : null}
      <View style={{
        flex: 1, flexDirection: "row", alignItems: "center", minHeight: subtitle ? 56 : 46, paddingVertical: 9, paddingRight: 16,
        borderTopWidth: first ? 0 : HAIR, borderTopColor: c.line, gap: 10,
      }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: accent || destructive ? "600" : "500", color: titleColor, textAlign: center ? "center" : "left" }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ fontSize: 13, color: c.secondary, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {value != null ? <Text numberOfLines={1} style={[{ fontSize: 15.5, fontWeight: strong === false ? "400" : "600", color: valueColor, maxWidth: "55%" }, NUM]}>{value}</Text> : null}
        {chevron ? <Ionicons name="chevron-forward" size={17} color={c.tertiary} /> : null}
      </View>
    </Pressable>
  );
}

/* ---------- segmented control ---------- */
export function Segmented<T extends string>({ value, options, onChange, small }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; small?: boolean }) {
  const c = usePalette();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.fill, borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { if (!on) { tap(); onChange(o.value); } }}
            style={{
              flex: 1, alignItems: "center", paddingVertical: small ? 5 : 8, paddingHorizontal: 8, borderRadius: 9,
              backgroundColor: on ? (c.dark ? "#36332C" : "#FFFFFF") : "transparent",
              shadowColor: "#000", shadowOpacity: on ? (c.dark ? 0.3 : 0.08) : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
            }}>
            <Text numberOfLines={1} style={{ fontSize: small ? 13 : 14, fontWeight: "600", color: on ? c.text : c.secondary }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- the hero card ---------- */
// Dark card with a gold glow (Budget Board's total card): a big figure with
// small cents, and a row of stat cells underneath.
export function Hero({ label, value, negative, stats, note }: {
  label: string; value: string; negative?: boolean; stats: { k: string; v: string; tone?: "gain" | "loss" }[]; note?: string;
}) {
  const c = usePalette();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const m = value.match(/^(.*?)([.,]\d{2})$/);
  const whole = m ? m[1] : value, cents = m ? m[2] : "";
  return (
    <View onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ borderRadius: 22, padding: 20, gap: 16, overflow: "hidden", borderWidth: HAIR, borderColor: "rgba(255,255,255,0.12)", backgroundColor: c.hero }}>
      <Svg style={{ position: "absolute", left: 0, top: 0 }} width={size.w} height={size.h} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.hero} />
            <Stop offset="1" stopColor={c.hero2} />
          </LinearGradient>
          <RadialGradient id="heroGlow" cx="100" cy="0" r="85" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#D4A946" stopOpacity={0.26} />
            <Stop offset="1" stopColor="#D4A946" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#heroBg)" />
        <Rect width="100" height="100" fill="url(#heroGlow)" />
      </Svg>
      <View>
        <Text style={{ color: c.heroMuted, fontSize: 13, fontWeight: "500" }}>{label}</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[{ fontSize: 50, fontWeight: "600", letterSpacing: -2, marginTop: 2, color: negative ? c.heroNeg : c.heroInk }, NUM]}>
          {whole}
          {cents ? <Text style={{ fontSize: 26, color: c.heroMuted, fontWeight: "500", letterSpacing: -0.5 }}>{cents}</Text> : null}
        </Text>
        {note ? <Text style={{ color: c.heroMuted, fontSize: 13, marginTop: 2 }}>{note}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", gap: HAIR, borderRadius: 13, overflow: "hidden", backgroundColor: c.heroLine }}>
        {stats.map((s) => (
          <View key={s.k} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, minWidth: 0, backgroundColor: c.heroCell }}>
            <Text numberOfLines={1} style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: "#BDB4A3", fontWeight: "600" }}>{s.k}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 16, fontWeight: "600", letterSpacing: -0.3, marginTop: 1,
              color: s.tone === "loss" ? c.heroNeg : s.tone === "gain" ? c.heroGain : c.heroInk }, NUM]}>{s.v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------- search ---------- */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.fill, borderRadius: 12, paddingHorizontal: 10, gap: 6 }}>
      <Ionicons name="search" size={17} color={c.secondary} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.secondary}
        selectionColor={c.accent} keyboardAppearance={c.dark ? "dark" : "light"} returnKeyType="search" clearButtonMode="while-editing"
        autoCorrect={false} accessibilityLabel={placeholder}
        style={{ flex: 1, fontSize: 16, color: c.text, paddingVertical: 9, outlineWidth: 0 } as TextStyle} />
      {value && Platform.OS !== "ios" ? (
        <Pressable onPress={() => onChange("")} accessibilityLabel="Clear" hitSlop={8}><Ionicons name="close-circle" size={17} color={c.tertiary} /></Pressable>
      ) : null}
    </View>
  );
}

/* ---------- charts ---------- */
export type Part = { name: string; v: number; color: string };

// One horizontal bar split into parts.
export function StackBar({ parts, total }: { parts: Part[]; total?: number }) {
  const c = usePalette();
  const base = total || parts.reduce((a, x) => a + Math.max(0, x.v), 0) || 1;
  return (
    <View style={{ flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", gap: 2, backgroundColor: c.sunk }}>
      {parts.filter((x) => x.v > 0).map((x, i) => (
        <View key={i} style={{ width: `${Math.max((x.v / base) * 100, 0.8)}%` as `${number}%`, backgroundColor: x.color }} />
      ))}
    </View>
  );
}

export function Legend({ parts, total, money }: { parts: Part[]; total: number; money: (n: number) => string }) {
  const c = usePalette();
  return (
    <View style={{ gap: 10 }}>
      {parts.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: x.color }} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, color: c.text }}>{x.name}</Text>
          <Text style={[{ fontSize: 14.5, color: c.text }, NUM]}>{money(x.v)}</Text>
          <Text style={[{ width: 40, textAlign: "right", fontSize: 12.5, color: c.secondary }, NUM]}>{total ? Math.round((x.v / total) * 100) : 0}%</Text>
        </View>
      ))}
    </View>
  );
}

export function Donut({ parts, label, value }: { parts: Part[]; label: string; value: string }) {
  const c = usePalette();
  const R = 56, C = 2 * Math.PI * R;
  const total = parts.reduce((a, x) => a + x.v, 0) || 1;
  let acc = 0;
  return (
    <Svg width={170} height={170} viewBox="0 0 150 150" accessibilityLabel={label}>
      <Circle cx={75} cy={75} r={R} fill="none" stroke={c.sunk} strokeWidth={18} />
      {parts.map((x, i) => {
        const len = (x.v / total) * C;
        const el = (
          <Circle key={i} cx={75} cy={75} r={R} fill="none" stroke={x.color} strokeWidth={18}
            strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`} strokeDashoffset={-acc} rotation={-90} origin="75, 75" />
        );
        acc += len;
        return el;
      })}
      <SvgText x={75} y={70} textAnchor="middle" fill={c.secondary} fontSize={11} fontFamily={SVG_FONT}>{label}</SvgText>
      <SvgText x={75} y={91} textAnchor="middle" fill={c.text} fontSize={18} fontWeight="600" fontFamily={SVG_FONT}>{value}</SvgText>
    </Svg>
  );
}

// Money in and out side by side for each month, with the profit line's dots.
export function MonthBars({ months, money, selected, onSelect }: {
  months: { label: string; kept: number; spent: number; net: number }[];
  money: (n: number) => string; selected: number; onSelect: (i: number) => void;
}) {
  const c = usePalette();
  const [w, setW] = useState(0);
  const H = 132;
  const max = Math.max(1, ...months.map((m) => Math.max(m.kept, m.spent)));
  const slot = w / Math.max(1, months.length);
  const bw = Math.max(3, Math.min(11, slot * 0.3));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? <Svg width={w} height={H + 20}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <Rect key={f} x={0} y={H - H * f} width={w} height={HAIR} fill={c.line} />
        ))}
        {months.map((m, i) => {
          const x = slot * i + slot / 2;
          const hk = (m.kept / max) * (H - 6), hs = (m.spent / max) * (H - 6);
          const on = i === selected;
          return (
            <React.Fragment key={i}>
              {on ? <Rect x={slot * i + 1} y={0} width={slot - 2} height={H + 18} rx={8} fill={mix(c.accent, c.card, 0.12)} /> : null}
              <Rect x={x - bw - 1} y={H - hk} width={bw} height={Math.max(hk, m.kept > 0 ? 2 : 0)} rx={bw / 3} fill={c.gain} opacity={on ? 1 : 0.75} />
              <Rect x={x + 1} y={H - hs} width={bw} height={Math.max(hs, m.spent > 0 ? 2 : 0)} rx={bw / 3} fill={c.loss} opacity={on ? 1 : 0.75} />
              <SvgText x={x} y={H + 14} textAnchor="middle" fill={on ? c.text : c.secondary} fontSize={10} fontWeight={on ? "700" : "400"} fontFamily={SVG_FONT}>{m.label.slice(0, 1)}</SvgText>
              <Rect x={slot * i} y={0} width={slot} height={H + 20} fill="transparent" onPress={() => onSelect(i)} />
            </React.Fragment>
          );
        })}
      </Svg> : <View style={{ height: H + 20 }} />}
      {months[selected] ? (
        <View style={{ flexDirection: "row", marginTop: 10, paddingTop: 12, borderTopWidth: HAIR, borderTopColor: c.line }}>
          {([["In", months[selected].kept, c.gain], ["Out", months[selected].spent, c.loss], ["Profit", months[selected].net, months[selected].net < 0 ? c.loss : c.text]] as const).map(([k, v, col]) => (
            <View key={k} style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: c.secondary }}>{k === "In" ? `${months[selected].label} · In` : k}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 16, fontWeight: "600", color: col, marginTop: 1 }, NUM]}>{(v < 0 ? "-" : "") + money(v)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- the profit summary (kept for older screens) ---------- */
export function Summary({ net, moneyIn, moneyOut, label = "Profit" }: { net: string; moneyIn: string; moneyOut: string; label?: string }) {
  return <Hero label={label} value={net} negative={net.startsWith("-")} stats={[{ k: "Money in", v: moneyIn }, { k: "Money out", v: moneyOut }]} />;
}

/* ---------- empty states ---------- */
export function Empty({ icon, title, text, button }: { icon: IconName; title: string; text?: string; button?: { label: string; onPress: () => void } }) {
  const c = usePalette();
  return (
    <View style={{ alignItems: "center", paddingTop: 56, paddingHorizontal: 24, gap: 8 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.card, borderWidth: HAIR, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={34} color={c.accent} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "600", color: c.text, marginTop: 8, textAlign: "center" }}>{title}</Text>
      {text ? <Text style={{ fontSize: 15, color: c.secondary, textAlign: "center", lineHeight: 20, maxWidth: 300 }}>{text}</Text> : null}
      {button ? <Button title={button.label} onPress={button.onPress} style={{ marginTop: 14, alignSelf: "center", paddingHorizontal: 24 }} /> : null}
    </View>
  );
}

// The dashed "add" button under a list (Budget Board's "Add section").
export function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: pressed ? c.accent : c.line })}>
      <Ionicons name="add" size={18} color={c.secondary} />
      <Text style={{ color: c.secondary, fontWeight: "600", fontSize: 15 }}>{label}</Text>
    </Pressable>
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
