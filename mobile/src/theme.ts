// Apple-style look: the system font, grouped lists, and colours that follow
// the phone's light or dark mode. Gold is the accent; green is money in.
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
  bg: "#F4F2EE",
  card: "#FFFFFF",
  fill: "#ECE9E3",
  pressed: "#E6E2DA",
  text: "#17150F",
  secondary: "#6B665C",
  tertiary: "#ABA59A",
  separator: "#D3CEC4",
  accent: "#2A2722",
  onAccent: "#F5EFE3",
  gain: "#248A3D",
  loss: "#D70015",
};

export const DARK: Palette = {
  dark: true,
  bg: "#121214",
  card: "#1B1B1E",
  fill: "#26262A",
  pressed: "#2A2A2F",
  text: "#F3EFE6",
  secondary: "#A8A39A",
  tertiary: "#6F6B64",
  separator: "#2F2F34",
  accent: "#D4A946",
  onAccent: "#17130A",
  gain: "#30D158",
  loss: "#FF453A",
};

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

// Money figures line up in columns.
export const NUM = { fontVariant: ["tabular-nums" as const] };
