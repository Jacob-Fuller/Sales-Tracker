// Apple-style look: the system font, grouped lists, and colours that follow
// the phone's light or dark mode. Ember is the accent; green is money in.
import { useColorScheme } from "react-native";

export type Palette = {
  dark: boolean;
  bg: string;        // grouped background
  card: string;      // rows and cards
  fill: string;      // input wells, segmented track
  pressed: string;
  text: string;
  secondary: string;
  tertiary: string;
  separator: string;
  accent: string;
  onAccent: string;
  gain: string;
  loss: string;
};

export const LIGHT: Palette = {
  dark: false,
  bg: "#F2F2F7",
  card: "#FFFFFF",
  fill: "#E9E9EE",
  pressed: "#E5E5EA",
  text: "#000000",
  secondary: "#6C6C70",
  tertiary: "#AEAEB2",
  separator: "#C6C6C8",
  accent: "#E5580C",
  onAccent: "#FFFFFF",
  gain: "#248A3D",
  loss: "#D70015",
};

export const DARK: Palette = {
  dark: true,
  bg: "#000000",
  card: "#1C1C1E",
  fill: "#2C2C2E",
  pressed: "#2C2C2E",
  text: "#FFFFFF",
  secondary: "#98989F",
  tertiary: "#636366",
  separator: "#38383A",
  accent: "#FF7A45",
  onAccent: "#FFFFFF",
  gain: "#30D158",
  loss: "#FF453A",
};

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

// Money figures line up in columns.
export const NUM = { fontVariant: ["tabular-nums" as const] };
