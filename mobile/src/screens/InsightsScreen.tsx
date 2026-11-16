// Insights: twelve months at a glance, where the money comes from and goes,
// the best sellers and the headline numbers. Uses Budget Board's charts.
import React, { useState } from "react";
import { Text, View } from "react-native";
import { projectName, projects } from "../components/rows";
import { Block, Donut, Empty, HAIR, Legend, MonthBars, Screen, Segmented, StackBar, TopBar, type Part } from "../components/ui";
import { totalsFor } from "../lib/calc";
import { figures, monthly, sumBy, topWithRest } from "../lib/insights";
import { keyOf } from "../lib/model";
import { useStore } from "../lib/store";
import { NUM, usePalette, type Swatch } from "../theme";
import { HideButton, SettingsButton, usePeriod } from "./HomeScreens";

const CHART: Swatch[] = ["blue", "teal", "brass", "rose", "violet", "orange", "green", "slate"];

export function InsightsScreen() {
  const { data, money, prefs, setPrefs } = useStore();
  const c = usePalette();
  const p = usePeriod();
  const months = monthly(data, 12);
  const [sel, setSel] = useState(months.length - 1);
  const t = totalsFor(data, undefined, p.rg);
  const bar = (
    <TopBar title="Insights" right={<><HideButton /><SettingsButton /></>}>
      <Segmented value={p.period} options={p.options} onChange={p.setPeriod} />
    </TopBar>
  );
  if (!data.sales.length && !data.expenses.length && !data.recurring.length) {
    return <View style={{ flex: 1, backgroundColor: c.bg }}>{bar}<Screen header><Empty icon="stats-chart-outline" title="Nothing to show yet"
      text="Charts of your sales and costs appear once you've added some." /></Screen></View>;
  }

  // Where money comes from: by project (in each project's own colour) or by sales channel.
  const projColor = new Map(projects(data).map((x) => [x.key, c.sw[x.color]]));
  const sources = prefs.insightsBy === "project"
    ? sumBy(t.sales, (s) => keyOf(s), (s) => projectName(data, s) || "No project", (s) => s.net)
    : sumBy(t.sales, (s) => s.channel, (s) => s.channel, (s) => s.net);
  const inParts: Part[] = topWithRest(sources, 6).map((x, i) => ({
    name: x.name, v: x.v,
    color: x.key === "__rest" ? c.other : prefs.insightsBy === "project" ? (projColor.get(x.key) || c.other) : c.sw[CHART[i % CHART.length]],
  }));

  // Where money goes: by category.
  const costParts: Part[] = topWithRest(sumBy(t.exps, (e) => e.category, (e) => e.category, (e) => e.amount), 6)
    .map((x, i) => ({ name: x.name, v: x.v, color: x.key === "__rest" ? c.other : c.sw[CHART[i % CHART.length]] }));

  const best = sumBy(t.sales, (s) => s.productId, (s) => s.productName, (s) => s.net).slice(0, 5);
  const unitsOf = (id: string) => t.sales.filter((s) => s.productId === id).reduce((a, s) => a + s.quantity, 0);
  const f = figures(t.sales, t.exps);
  const topBest = best.length ? best[0].v : 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {bar}
      <Screen header gap={22}>
        <Block title="Last 12 months" right={<Key />}>
          <MonthBars months={months} money={money.money} selected={Math.min(sel, months.length - 1)} onSelect={setSel} />
        </Block>

        <Block title="Where money comes from">
          <Segmented small value={prefs.insightsBy} onChange={(v) => setPrefs({ insightsBy: v })}
            options={[{ value: "project", label: "By project" }, { value: "channel", label: "By channel" }]} />
          {inParts.length ? (
            <>
              <StackBar parts={inParts} />
              <Legend parts={inParts} total={t.kept} money={money.money} />
            </>
          ) : <Text style={{ color: c.secondary }}>No sales {p.label}</Text>}
        </Block>

        <Block title="Where money goes">
          {costParts.length ? (
            <View style={{ alignItems: "center", gap: 18 }}>
              <Donut parts={costParts} label={p.period === "month" ? "This month" : p.period === "all" ? "All time" : "This year"} value={money.compact(t.spent)} />
              <View style={{ alignSelf: "stretch" }}><Legend parts={costParts} total={t.spent} money={money.money} /></View>
            </View>
          ) : <Text style={{ color: c.secondary }}>No expenses {p.label}</Text>}
        </Block>

        {best.length ? (
          <Block title="Best sellers">
            {best.map((b, i) => (
              <View key={b.key} style={{ gap: 6, paddingTop: i ? 10 : 0, borderTopWidth: i ? HAIR : 0, borderTopColor: c.line }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: "600", color: c.text }}>{b.name}</Text>
                  <Text style={[{ fontSize: 13, color: c.secondary }, NUM]}>{unitsOf(b.key)} sold</Text>
                  <Text style={[{ fontSize: 15, fontWeight: "600", color: c.gain, minWidth: 80, textAlign: "right" }, NUM]}>{money.money(b.v)}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: c.sunk, overflow: "hidden" }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: c.accent, width: `${Math.max(3, (b.v / topBest) * 100)}%` as `${number}%` }} />
                </View>
              </View>
            ))}
          </Block>
        ) : null}

        <Block title={`Key figures · ${p.label}`}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 16 }}>
            <Fig k="Sales" v={String(f.count)} />
            <Fig k="Units sold" v={String(f.units)} />
            <Fig k="Average sale" v={money.money(f.average)} />
            <Fig k="Profit margin" v={f.margin == null ? "—" : `${Math.round(f.margin * 100)}%`} tone={f.margin != null && f.margin < 0 ? "loss" : undefined} />
            <Fig k="Store fees paid" v={money.money(f.fees)} />
            <Fig k="Discounts given" v={money.money(f.discounts)} />
          </View>
          {f.best ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12, borderTopWidth: HAIR, borderTopColor: c.line }}>
              <Text style={{ fontSize: 14, color: c.secondary }}>Best month</Text>
              <Text style={[{ fontSize: 14, color: c.text, fontWeight: "600" }, NUM]}>{f.best.label} · {money.money(f.best.net)}</Text>
            </View>
          ) : null}
        </Block>
      </Screen>
    </View>
  );
}

function Fig({ k, v, tone }: { k: string; v: string; tone?: "loss" }) {
  const c = usePalette();
  return (
    <View style={{ width: "50%", paddingRight: 8 }}>
      <Text style={{ fontSize: 12.5, color: c.secondary }}>{k}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 20, fontWeight: "600", letterSpacing: -0.4, color: tone === "loss" ? c.loss : c.text, marginTop: 1 }, NUM]}>{v}</Text>
    </View>
  );
}

function Key() {
  const c = usePalette();
  const item = (col: string, label: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: col }} />
      <Text style={{ fontSize: 12, color: c.secondary }}>{label}</Text>
    </View>
  );
  return <View style={{ flexDirection: "row", gap: 12 }}>{item(c.gain, "In")}{item(c.loss, "Out")}</View>;
}
