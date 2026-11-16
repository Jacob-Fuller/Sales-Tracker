// The Board apps' look: warm charcoal with gold, light or dark. Gold is the
// accent; green is money in. Matches Budget Board so the apps feel like a set.
import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

export const SWATCHES = ["brass", "blue", "teal", "green", "orange", "rose", "violet", "slate"] as const;
export type Swatch = (typeof SWATCHES)[number];

const SW: Record<"light" | "dark", Record<Swatch, string>> = {
  light: { brass: "#8E6A1F", blue: "#3550C8", teal: "#11817C", green: "#2F7A3A", orange: "#B4561E", rose: "#B13E6B", violet: "#6B48B5", slate: "#56607A" },
  dark: { brass: "#D4A946", blue: "#8193FF", teal: "#3CC2BC", green: "#7BCB6E", orange: "#F0995C", rose: "#E57BA4", violet: "#A889E6", slate: "#9AA4BE" },
};

export type Palette = {
  dark: boolean;
  bg: string;        // screen background
  card: string;      // cards and rows
  sunk: string;      // column headers and totals inside cards
  fill: string;      // input wells, segmented track
  pressed: string;
  text: string;
  secondary: string;
  tertiary: string;
  separator: string;
  line: string;      // card borders
  accent: string;
  onAccent: string;
  gain: string;
  loss: string;
  other: string;     // "everything else" in charts
  sw: Record<Swatch, string>;
  // the dark hero card (same in light and dark mode)
  hero: string; hero2: string; heroInk: string; heroMuted: string; heroLine: string; heroCell: string; heroNeg: string; heroGain: string;
};

const HERO = {
  heroInk: "#F3F0E8", heroMuted: "#A8A194", heroLine: "rgba(255,255,255,0.09)", heroCell: "rgba(10,9,8,0.35)",
  heroNeg: "#F2937F", heroGain: "#7FD69A",
};

export const LIGHT: Palette = {
  dark: false,
  bg: "#F4F2EE",
  card: "#FFFFFF",
  sunk: "#F0EDE7",
  fill: "#E9E5DD",
  pressed: "#ECE8E0",
  text: "#17150F",
  secondary: "#655F55",
  tertiary: "#ABA59A",
  separator: "#E2DED6",
  line: "#E2DED6",
  accent: "#8E6A1F",
  onAccent: "#FFFFFF",
  gain: "#1B8456",
  loss: "#B83D2B",
  other: "#ABA59A",
  sw: SW.light,
  hero: "#1C1A16", hero2: "#0F0E0C", ...HERO,
};

export const DARK: Palette = {
  dark: true,
  bg: "#121214",
  card: "#1B1B1E",
  sunk: "#1F1F23",
  fill: "#242428",
  pressed: "#26262B",
  text: "#F3EFE6",
  secondary: "#A8A39A",
  tertiary: "#6F6B64",
  separator: "#2F2F34",
  line: "#2F2F34",
  accent: "#D4A946",
  onAccent: "#17130A",
  gain: "#4CC48A",
  loss: "#F07C66",
  other: "#6A665F",
  sw: SW.dark,
  hero: "#24221D", hero2: "#151412", ...HERO,
};

export type Appearance = "system" | "light" | "dark";
export const AppearanceContext = createContext<Appearance>("system");

export function usePalette(): Palette {
  const pref = useContext(AppearanceContext);
  const system = useColorScheme();
  const dark = pref === "system" ? system === "dark" : pref === "dark";
  return dark ? DARK : LIGHT;
}

/** Blend colour a into colour b; weight is the share of a (0–1). */
export function mix(a: string, b: string, weight: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v * weight + y[i] * (1 - weight)).toString(16).padStart(2, "0")).join("");
}

// Money figures line up in columns.
export const NUM = { fontVariant: ["tabular-nums" as const] };
