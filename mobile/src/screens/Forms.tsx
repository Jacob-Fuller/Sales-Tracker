import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { byName, findProject, limitText, projectOptions, validLink } from "../components/rows";
import { AmountField, Cell, DateRow, Form, HeaderText, PickerRow, Section, StepperRow, TextRow, success, type Option } from "../components/ui";
import { addRecord, patchRecord, productHasSales, removeRecord } from "../lib/actions";
import { isActive } from "../lib/calc";
import { FREQS, keyOf, parseKey, today, type FreqKey, type Kind } from "../lib/model";
import { usePremium } from "../lib/premium";
import { useStore } from "../lib/store";

const toNum = (s: string) => { const v = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isFinite(v) ? v : NaN; };
const numText = (n: number | undefined | null) => (n == null || !isFinite(n) ? "" : String(Math.round(n * 100) / 100));
const pct = (s: string) => { const v = toNum(s); return isFinite(v) ? Math.min(100, Math.max(0, v)) : 0; };
const missing = (what: string) => Alert.alert(what);

// Cancel and Save in the sheet's header. Save reads the latest form state.
function useSheetHeader(title: string, onSave: () => void) {
  const nav = useNavigation<any>();
  const save = useRef(onSave); save.current = onSave;
  useLayoutEffect(() => {
    nav.setOptions({
      title,
      headerLeft: () => <HeaderText label="Cancel" onPress={() => nav.goBack()} />,
      headerRight: () => <HeaderText label="Save" bold onPress={() => save.current()} />,
    });
  }, [nav, title]);
}

function useDelete(kind: Kind, id: string | undefined, title: string, message?: string) {
  const nav = useNavigation<any>();
  const { update } = useStore();
  return () => {
    if (!id) return;
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { update((d, tomb) => removeRecord(d, kind, id, tomb)); nav.goBack(); } },
    ]);
  };
}

const DeleteSection = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <Section><Cell title={title} destructive center onPress={onPress} /></Section>
);

/* ---------- Sale ---------- */
const NEW = "__new";
export function SaleForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update, money } = useStore();
  const rec = params.id ? data.sales.find((s) => s.id === params.id) : undefined;
  const products = [...data.products].sort(byName);
  const channels = data.settings.channels.filter((c) => c.name.trim());
  const [productId, setProductId] = useState(rec?.productId || (products[0] ? products[0].id : NEW));
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLink, setNewLink] = useState(params.key && validLink(data, params.key) ? params.key : "general");
  const [channel, setChannel] = useState(rec?.channel || (channels[0] && channels[0].name) || "Other");
  const [fee, setFee] = useState(rec ? numText(rec.fee) : numText((channels[0] && channels[0].fee) || 0));
  const [qty, setQty] = useState(rec ? rec.quantity : 1);
  const [discount, setDiscount] = useState(rec && rec.discount ? numText(rec.discount) : "");
  const [date, setDate] = useState(rec?.date || today());
  const del = useDelete("sales", rec?.id, "Delete this sale?");

  useSheetHeader(rec ? "Edit Sale" : "New Sale", () => {
    const isNew = productId === NEW;
    if (isNew) {
      if (!newName.trim()) return missing("Enter the product name");
      if (!(toNum(newPrice) >= 0)) return missing("Enter the price");
    } else if (!data.products.some((p) => p.id === productId)) return missing("Choose a product");
    const out = { channel, date, fee: pct(fee), quantity: Math.max(1, qty), discount: pct(discount), customerId: rec ? rec.customerId : null };
    update((d) => {
      const pid = isNew ? addRecord(d, "products", { name: newName.trim(), price: toNum(newPrice), ...parseKey(validLink(d, newLink) ? newLink : "general") }) : productId;
      if (rec) patchRecord(d, "sales", rec.id, { ...out, productId: pid }); else addRecord(d, "sales", { ...out, productId: pid });
    });
    success();
    nav.goBack();
  });

  const productOpts: Option[] = [...products.map((p) => ({ value: p.id, label: p.name })), { value: NEW, label: "New Product…" }];
  const chOpts: Option[] = channels.map((c) => ({ value: c.name, label: c.name }));
  if (!channels.some((c) => c.name === channel)) chOpts.push({ value: channel, label: channel });
  return (
    <Form>
      <Section>
        <PickerRow label="Product" value={productId} options={productOpts} onChange={setProductId} />
        {productId === NEW ? <TextRow label="Name" value={newName} onChangeText={setNewName} placeholder="Required" autoCapitalize="sentences" autoFocus={!products.length} /> : null}
        {productId === NEW ? <TextRow label="Price" money value={newPrice} onChangeText={setNewPrice} placeholder={money.money(0)} keyboardType="decimal-pad" /> : null}
        {productId === NEW ? <PickerRow label="Project" value={newLink} options={projectOptions(data)} onChange={setNewLink} /> : null}
      </Section>
      <Section>
        <PickerRow label="Sold On" value={channel} options={chOpts} onChange={(v) => {
          setChannel(v);
          const c = channels.find((x) => x.name === v);
          if (c) setFee(numText(c.fee));
        }} />
        <TextRow label="Store Fee %" money value={fee} onChangeText={setFee} placeholder="0" keyboardType="decimal-pad" />
      </Section>
      <Section>
        <StepperRow label="Quantity" value={qty} onChange={setQty} />
        <TextRow label="Discount %" money value={discount} onChangeText={setDiscount} placeholder="0" keyboardType="decimal-pad" />
        <DateRow value={date} onChange={setDate} />
      </Section>
      {rec ? <DeleteSection title="Delete Sale" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Expense (one-off or repeating) ---------- */
export function ExpenseForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update, money } = useStore();
  const { canAdd } = usePremium();
  const editKind: Kind | null = params.id ? (params.recurring ? "recurring" : "expenses") : null;
  const rec: any = editKind ? (data[editKind] as any[]).find((r) => r.id === params.id) : undefined;
  const cats = data.settings.categories.filter((c) => c.trim());
  const [amount, setAmount] = useState(rec ? numText(rec.amount) : "");
  const [description, setDescription] = useState(rec?.description || "");
  const [link, setLink] = useState<string>(rec ? keyOf(rec) : params.key && validLink(data, params.key) ? params.key : "general");
  const [category, setCategory] = useState(rec?.category || cats[0] || "Other");
  const [repeat, setRepeat] = useState<string>(rec ? (editKind === "recurring" ? rec.frequency : "never") : "never");
  const [date, setDate] = useState<string>(rec ? (editKind === "recurring" ? rec.startDate : rec.date) : today());
  const del = useDelete(editKind || "expenses", rec?.id, "Delete this expense?",
    editKind === "recurring" ? "Every past payment of it is removed too." : undefined);

  useSheetHeader(rec ? "Edit Expense" : "New Expense", () => {
    const a = toNum(amount);
    if (amount.trim() === "" || !(a >= 0)) return missing("Enter the amount");
    if (!description.trim()) return missing("Enter a description");
    const repeating = repeat !== "never";
    if (!rec && repeating && !canAdd("recurring")) { nav.navigate("Paywall", { reason: limitText("recurring") }); return; }
    const base = { amount: a, description: description.trim(), category, vendor: rec ? rec.vendor || "" : "", ...parseKey(validLink(data, link) ? link : "general") };
    const kind: Kind = repeating ? "recurring" : "expenses";
    const out = repeating ? { ...base, frequency: repeat as FreqKey, startDate: date, endDate: rec ? rec.endDate : null } : { ...base, date };
    update((d) => { if (rec) patchRecord(d, kind, rec.id, out); else addRecord(d, kind, out); });
    success();
    nav.goBack();
  });

  const catOpts: Option[] = cats.map((c) => ({ value: c, label: c }));
  if (!cats.includes(category)) catOpts.push({ value: category, label: category });
  const freqOpts: Option[] = (Object.keys(FREQS) as FreqKey[]).map((k) => ({ value: k, label: FREQS[k].label }));
  // A saved one-off expense stays one-off and a repeating one keeps repeating.
  const repeatOpts: Option[] = editKind === "recurring" ? freqOpts : [{ value: "never", label: "Never" }, ...freqOpts];
  const active = rec && editKind === "recurring" ? isActive(rec) : true;
  return (
    <Form>
      <AmountField value={amount} onChangeText={setAmount} symbol={money.symbol} autoFocus={!rec} />
      <Section>
        <TextRow label="Description" value={description} onChangeText={setDescription} placeholder="Required" autoCapitalize="sentences" />
        <PickerRow label="Project" value={link} options={projectOptions(data)} onChange={setLink} />
        <PickerRow label="Category" value={category} options={catOpts} onChange={setCategory} />
      </Section>
      <Section>
        <DateRow label={repeat === "never" ? "Date" : "First Payment"} value={date} onChange={setDate} />
        <PickerRow label="Repeats" value={repeat} options={repeatOpts} onChange={setRepeat} disabled={editKind === "expenses"} />
      </Section>
      {rec && editKind === "recurring" ? (
        <Section>
          <Cell title={active ? "Stop Repeating" : "Resume Repeating"} accent center onPress={() => {
            update((d) => patchRecord(d, "recurring", rec.id, { endDate: active ? today() : null }));
            success();
            nav.goBack();
          }} />
        </Section>
      ) : null}
      {rec ? <DeleteSection title="Delete Expense" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Product ---------- */
export function ProductForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update, money } = useStore();
  const rec = params.id ? data.products.find((p) => p.id === params.id) : undefined;
  const [name, setName] = useState(rec?.name || "");
  const [price, setPrice] = useState(rec ? numText(rec.price) : "");
  const [link, setLink] = useState<string>(rec ? keyOf(rec) : "general");
  const delInner = useDelete("products", rec?.id, "Delete this product?");
  const del = () => {
    if (rec && productHasSales(data, rec.id)) { Alert.alert("This product has sales", "Delete its sales first."); return; }
    delInner();
  };
  useSheetHeader(rec ? "Edit Product" : "New Product", () => {
    if (!name.trim()) return missing("Enter the product name");
    const p = toNum(price);
    if (!(p >= 0)) return missing("Enter the price");
    const out = { name: name.trim(), price: p, ...parseKey(validLink(data, link) ? link : "general") };
    update((d) => { if (rec) patchRecord(d, "products", rec.id, out); else addRecord(d, "products", out); });
    success();
    nav.goBack();
  });
  return (
    <Form>
      <Section>
        <TextRow label="Name" value={name} onChangeText={setName} placeholder="Required" autoFocus={!rec} autoCapitalize="sentences" />
        <TextRow label="Price" money value={price} onChangeText={setPrice} placeholder={money.money(0)} keyboardType="decimal-pad" />
        <PickerRow label="Project" value={link} options={projectOptions(data)} onChange={setLink} />
      </Section>
      {rec ? <DeleteSection title="Delete Product" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Project ---------- */
export function ProjectForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update } = useStore();
  const rec = params.key ? findProject(data, params.key) : undefined;
  const [name, setName] = useState(rec?.name || "");
  const del = () => {
    if (!rec) return;
    Alert.alert("Delete this project?", "Its sales and expenses are kept.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        update((d, tomb) => removeRecord(d, rec.kind, rec.id, tomb));
        nav.goBack();
      } },
    ]);
  };
  useSheetHeader(rec ? "Edit Project" : "New Project", () => {
    if (!name.trim()) return missing("Enter the project name");
    update((d) => {
      if (rec) patchRecord(d, rec.kind, rec.id, { name: name.trim() });
      else addRecord(d, "items", { name: name.trim(), groupId: null, status: "Live", logo: null, iconText: null, iconHue: null });
    });
    success();
    nav.goBack();
  });
  return (
    <Form>
      <Section>
        <TextRow label="Name" value={name} onChangeText={setName} placeholder="Required" autoFocus={!rec} autoCapitalize="words" />
      </Section>
      {rec ? <DeleteSection title="Delete Project" onPress={del} /> : null}
    </Form>
  );
}
