import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { linkLabel } from "../components/rows";
import { Cell, Screen, Section, Tile } from "../components/ui";
import { taxData, taxReportHtml, taxYears, type TaxYear } from "../lib/taxReport";
import { useStore } from "../lib/store";
import { usePalette } from "../theme";
import { APP_NAME } from "../lib/config";

export function TaxReportScreen() {
  const { data, money } = useStore();
  const [busy, setBusy] = useState<number | null>(null);
  const years = taxYears(data, data.settings.fyStartMonth);
  const c = usePalette();

  const make = async (ty: TaxYear) => {
    if (busy != null) return;
    setBusy(ty.start);
    try {
      const html = taxReportHtml(data, ty, money.money, { linkLabel: (r) => linkLabel(data, r) });
      if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
      const { uri } = await Print.printToFileAsync({ html });
      // Give the file a name that makes sense in Files, email or the accountant's inbox.
      const name = `${APP_NAME} ${ty.short.replace("–", "-")} financial year.pdf`;
      let file = uri;
      try {
        const dest = (FileSystem.cacheDirectory || "") + name;
        await FileSystem.deleteAsync(dest, { idempotent: true });
        await FileSystem.moveAsync({ from: uri, to: dest });
        file = dest;
      } catch {}
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: name });
      } else {
        await Print.printAsync({ uri: file });
      }
    } catch {
      Alert.alert("Couldn't make the report", "Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Section>
        {years.map((ty) => {
          const t = taxData(data, ty);
          const empty = !t.sales.length && !t.exps.length;
          return (
            <Cell key={ty.start}
              lead={busy === ty.start ? <View style={{ width: 30, alignItems: "center" }}><ActivityIndicator color={c.accent} /></View> : <Tile icon="document-text" color="#FF3B30" />}
              title={`${ty.short} Financial Year`} subtitle={ty.label}
              value={empty ? undefined : money.signed(t.profit)} tone={t.profit < 0 ? "loss" : "secondary"}
              onPress={() => make(ty)} />
          );
        })}
      </Section>
    </Screen>
  );
}
