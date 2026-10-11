import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { linkLabel } from "../components/rows";
import { Lead, List, Note, Row, Screen } from "../components/ui";
import { taxData, taxReportHtml, taxYears, type TaxYear } from "../lib/taxReport";
import { useStore } from "../lib/store";
import { C } from "../theme";

export function TaxReportScreen() {
  const { data, money } = useStore();
  const [busy, setBusy] = useState<number | null>(null);
  const years = taxYears(data, data.settings.fyStartMonth);

  const make = async (ty: TaxYear) => {
    if (busy != null) return;
    setBusy(ty.start);
    try {
      const html = taxReportHtml(data, ty, money.money, { linkLabel: (r) => linkLabel(data, r) });
      if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
      const { uri } = await Print.printToFileAsync({ html });
      // Give the file a name that makes sense in Files, email or the accountant's inbox.
      const name = `Profit Pocket ${ty.short.replace("–", "-")} financial year.pdf`;
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
      Alert.alert("Couldn't make the report", "Try again.", undefined, { userInterfaceStyle: "dark" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Note>Every sale and expense for the year, with totals, as a PDF.</Note>
      <List>
        {years.map((ty) => {
          const t = taxData(data, ty);
          const empty = !t.sales.length && !t.exps.length;
          return (
            <Row key={ty.start}
              lead={busy === ty.start ? <View style={{ width: 36, alignItems: "center" }}><ActivityIndicator color={C.ember} /></View> : <Lead icon="document-text-outline" tone="ember" />}
              title={`${ty.short} financial year`} sub={ty.label}
              amount={empty ? undefined : money.signed(t.profit)} tone={t.profit >= 0 ? "gain" : "loss"} amountSub={empty ? undefined : "profit"}
              onPress={() => make(ty)} />
          );
        })}
      </List>
    </Screen>
  );
}
