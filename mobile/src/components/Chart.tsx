import React from "react";
import { Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { MONTHS } from "../lib/model";
import { useStore } from "../lib/store";
import { C, F } from "../theme";
import { Card } from "./ui";

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

// Money in and out for each of the last six months.
export function TrendChart({ data }: { data: { k: string; rev: number; exp: number }[] }) {
  const { money } = useStore();
  const W = 600, H = 210, L = 76, R = 4, T = 10, B = 32;
  const max = niceMax(Math.max(...data.map((x) => Math.max(x.rev, x.exp))));
  const cw = (W - L - R) / data.length, bw = Math.min(20, cw * 0.25), ih = H - T - B;
  const label = data.map((x) => `${MONTHS[+x.k.slice(5) - 1]}: in ${money.money(x.rev)}, out ${money.money(x.exp)}`).join(". ");
  return (
    <Card style={{ paddingTop: 18, paddingHorizontal: 14, paddingBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Last 6 months</Text>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Key color={C.gain} label="In" />
          <Key color={C.loss} label="Out" />
        </View>
      </View>
      <View accessible accessibilityLabel={label} style={{ width: "100%", aspectRatio: W / H }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          {[0, 1, 2].map((i) => {
            const v = (max * i) / 2, y = T + ih - (v / max) * ih;
            return (
              <G key={"g" + i}>
                <Line x1={L} x2={W - R} y1={y} y2={y} stroke={C.line} strokeWidth={1.5} />
                <SvgText x={L - 10} y={y + 6} textAnchor="end" fill={C.faint} fontSize={17} fontFamily={F.semi}>{money.compact(v)}</SvgText>
              </G>
            );
          })}
          {data.map((x, i) => {
            const cx = L + cw * i + cw / 2;
            const hr = Math.max(3, (x.rev / max) * ih), he = Math.max(3, (x.exp / max) * ih);
            return (
              <G key={x.k}>
                <Rect x={cx - bw - 2} y={T + ih - hr} width={bw} height={hr} rx={5} fill={C.gain} />
                <Rect x={cx + 2} y={T + ih - he} width={bw} height={he} rx={5} fill={C.loss} />
                <SvgText x={cx} y={H - 8} textAnchor="middle" fill={C.faint} fontSize={17} fontFamily={F.semi}>{MONTHS[+x.k.slice(5) - 1].slice(0, 3)}</SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </Card>
  );
}

const Key = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.muted }}>{label}</Text>
  </View>
);
