import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { byCreated, byName, linkOptions, validLink } from "../components/rows";
import { Button, Empty, Field, Form, HeaderButton, Input, ItemBadge, More, Select, DateInput, success, tap, type Option } from "../components/ui";
import { addRecord, patchRecord, productHasSales, removeRecord } from "../lib/actions";
import { isActive } from "../lib/calc";
import { pickLogo } from "../lib/logo";
import { FREQS, ICON_HUES, initials, keyOf, parseKey, STATUSES, today, type FreqKey, type Kind } from "../lib/model";
import { useStore } from "../lib/store";
import { C, F } from "../theme";

const toNum = (s: string) => { const v = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isFinite(v) ? v : NaN; };
const numText = (n: number | undefined | null) => (n == null || !isFinite(n) ? "" : String(Math.round(n * 100) / 100));

// Cancel / Save in the sheet's header. Save reads the latest form state.
function useSheetHeader(title: string, onSave: () => void) {
  const nav = useNavigation<any>();
  const save = useRef(onSave); save.current = onSave;
  useLayoutEffect(() => {
    nav.setOptions({
      title,
      headerLeft: () => <HeaderButton label="Cancel" onPress={() => nav.goBack()} />,
      headerRight: () => <HeaderButton label="Save" primary onPress={() => save.current()} />,
    });
  }, [nav, title]);
}

function useDelete(kind: Kind, id: string | undefined, message: string) {
  const nav = useNavigation<any>();
  const { update } = useStore();
  return () => {
    if (!id) return;
    Alert.alert("Delete?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { update((d, tomb) => removeRecord(d, kind, id, tomb)); nav.goBack(); } },
    ], { userInterfaceStyle: "dark" });
  };
}

const missing = (what: string) => Alert.alert(what, undefined, undefined, { userInterfaceStyle: "dark" });

/* ---------- Sale ---------- */
export function SaleForm() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params || {};
  const { data, update, money } = useStore();
  const rec = id ? data.sales.find((s) => s.id === id) : undefined;
  const products = [...data.products].sort(byName);
  const channels = data.settings.channels.filter((c) => c.name.trim());
  const [productId, setProductId] = useState(rec?.productId || (products[0] && products[0].id) || "");
  const [channel, setChannel] = useState(rec?.channel || (channels[0] && channels[0].name) || "Other");
  const [date, setDate] = useState(rec?.date || today());
  const [fee, setFee] = useState(rec ? numText(rec.fee) : numText((channels[0] && channels[0].fee) || 0));
  const [qty, setQty] = useState(rec ? String(rec.quantity) : "1");
  const [discount, setDiscount] = useState(rec ? numText(rec.discount) : "0");
  const [customerId, setCustomerId] = useState(rec?.customerId || "");
  const del = useDelete("sales", id, "This sale will be removed.");

  useSheetHeader(rec ? "Edit sale" : "New sale", () => {
    if (!products.length) { nav.goBack(); return; }
    if (!data.products.some((p) => p.id === productId)) return missing("Choose a product");
    const q = Math.round(toNum(qty));
    if (!(q >= 1)) return missing("Enter a quantity of 1 or more");
    const clamp = (s: string) => { const v = toNum(s); return isFinite(v) ? Math.min(100, Math.max(0, v)) : 0; };
    const out = { productId, channel, date, fee: clamp(fee), quantity: q, discount: clamp(discount), customerId: customerId || null };
    update((d) => { if (rec) patchRecord(d, "sales", rec.id, out); else addRecord(d, "sales", out); });
    success();
    nav.goBack();
  });

  if (!products.length) {
    return (
      <Form>
        <Empty title="Add a product first" text="Sales are recorded against a product, like an app subscription or something you make."
          button={{ label: "Add a product", onPress: () => nav.replace("Product", {}) }} />
      </Form>
    );
  }
  const chOpts: Option[] = channels.map((c) => ({ value: c.name, label: c.fee ? `${c.name} · ${numText(c.fee)}% fee` : c.name }));
  if (!channels.some((c) => c.name === channel)) chOpts.push({ value: channel, label: channel });
  return (
    <Form>
      <Field label="Product">
        <Select value={productId} onChange={setProductId}
          options={products.map((p) => ({ value: p.id, label: `${p.name} · ${money.money(p.price)}` }))} />
      </Field>
      <Field label="Where it sold">
        <Select value={channel} options={chOpts} onChange={(v) => {
          setChannel(v);
          const c = channels.find((x) => x.name === v);
          if (c) setFee(numText(c.fee));
        }} />
      </Field>
      <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
      <More startOpen={!!rec && (rec.quantity > 1 || rec.discount > 0 || !!rec.customerId)}>
        <Field label="Store fee (%)" hint="Filled in with the channel's usual cut">
          <Input value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
        </Field>
        <Field label="Quantity"><Input value={qty} onChangeText={setQty} keyboardType="number-pad" /></Field>
        <Field label="Discount (%)"><Input value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" /></Field>
        <Field label="Customer">
          <Select value={customerId} onChange={setCustomerId}
            options={[{ value: "", label: "Unknown" }, ...[...data.customers].sort(byName).map((c) => ({ value: c.id, label: c.name }))]} />
        </Field>
      </More>
      {rec ? <Button kind="danger" title="Delete sale" icon="trash-outline" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Expense and recurring cost ---------- */
export function ExpenseForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const recurring = !!params.recurring;
  const { data, update } = useStore();
  const kind: Kind = recurring ? "recurring" : "expenses";
  const rec: any = params.id ? (data[kind] as any[]).find((r) => r.id === params.id) : undefined;
  const cats = data.settings.categories.filter((c) => c.trim());
  const startLink = rec ? keyOf(rec) : params.link && validLink(data, params.link) ? params.link : "general";
  const [amount, setAmount] = useState(rec ? numText(rec.amount) : "");
  const [description, setDescription] = useState(rec?.description || "");
  const [frequency, setFrequency] = useState<FreqKey>(rec?.frequency || "monthly");
  const [link, setLink] = useState<string>(startLink);
  const [date, setDate] = useState<string>(rec ? (recurring ? rec.startDate : rec.date) : today());
  const [category, setCategory] = useState(rec?.category || cats[0] || "Other");
  const [vendor, setVendor] = useState(rec?.vendor || "");
  const del = useDelete(kind, rec?.id, recurring ? "This deletes the recurring cost and all its past payments." : "This expense will be removed.");

  useSheetHeader(rec ? (recurring ? "Edit recurring cost" : "Edit expense") : recurring ? "New recurring cost" : "New expense", () => {
    const a = toNum(amount);
    if (!(a >= 0) || amount.trim() === "") return missing("Enter an amount");
    if (!description.trim()) return missing("Say what it was for");
    const base = { amount: a, description: description.trim(), category, vendor: vendor.trim(), ...parseKey(validLink(data, link) ? link : "general") };
    const out = recurring ? { ...base, frequency, startDate: date, endDate: rec ? rec.endDate : null } : { ...base, date };
    update((d) => { if (rec) patchRecord(d, kind, rec.id, out); else addRecord(d, kind, out); });
    success();
    nav.goBack();
  });

  const catOpts: Option[] = cats.map((c) => ({ value: c, label: c }));
  if (!cats.includes(category)) catOpts.push({ value: category, label: category });
  const active = rec && recurring ? isActive(rec) : true;
  return (
    <Form>
      <Field label="Amount">
        <Input amount value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" autoFocus={!rec} />
      </Field>
      <Field label="What was it for?">
        <Input value={description} onChangeText={setDescription} placeholder={recurring ? "e.g. Software subscription" : "e.g. Packaging"} autoCapitalize="sentences" />
      </Field>
      {recurring ? (
        <Field label="How often">
          <Select value={frequency} onChange={(v) => setFrequency(v as FreqKey)}
            options={(Object.keys(FREQS) as FreqKey[]).map((k) => ({ value: k, label: FREQS[k].label }))} />
        </Field>
      ) : null}
      <Field label="For"><Select value={link} onChange={setLink} options={linkOptions(data)} /></Field>
      <Field label={recurring ? "First payment date" : "Date"}><DateInput value={date} onChange={setDate} /></Field>
      <More startOpen={!!rec && !!rec.vendor}>
        <Field label="Category"><Select value={category} onChange={setCategory} options={catOpts} /></Field>
        <Field label="Paid to"><Input value={vendor} onChangeText={setVendor} /></Field>
      </More>
      {rec && recurring ? (
        <Button kind="soft" title={active ? "Stop payments" : "Resume payments"} icon={active ? "pause" : "play"} onPress={() => {
          update((d) => patchRecord(d, "recurring", rec.id, { endDate: active ? today() : null }));
          success();
          nav.goBack();
        }} />
      ) : null}
      {rec ? <Button kind="danger" title="Delete" icon="trash-outline" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Product ---------- */
export function ProductForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update } = useStore();
  const rec = params.id ? data.products.find((p) => p.id === params.id) : undefined;
  const [name, setName] = useState(rec?.name || "");
  const [price, setPrice] = useState(rec ? numText(rec.price) : "");
  const [link, setLink] = useState<string>(rec ? keyOf(rec) : params.link && validLink(data, params.link) ? params.link : "general");
  const del = () => {
    if (rec && productHasSales(data, rec.id)) {
      Alert.alert("Can't delete yet", "This product has sales recorded. Delete its sales first.", undefined, { userInterfaceStyle: "dark" });
      return;
    }
    delInner();
  };
  const delInner = useDelete("products", rec?.id, "This product will be removed.");
  useSheetHeader(rec ? "Edit product" : "New product", () => {
    if (!name.trim()) return missing("Give it a name");
    const p = toNum(price);
    if (!(p >= 0)) return missing("Enter a price");
    const out = { name: name.trim(), price: p, ...parseKey(validLink(data, link) ? link : "general") };
    update((d) => { if (rec) patchRecord(d, "products", rec.id, out); else addRecord(d, "products", out); });
    success();
    nav.goBack();
  });
  return (
    <Form>
      <Field label="Name"><Input value={name} onChangeText={setName} placeholder="e.g. Monthly subscription" autoFocus={!rec} autoCapitalize="sentences" /></Field>
      <Field label="Price"><Input amount value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" /></Field>
      <Field label="For"><Select value={link} onChange={setLink} options={linkOptions(data)} /></Field>
      {rec ? <Button kind="danger" title="Delete product" icon="trash-outline" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Project (group) ---------- */
export function GroupForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update } = useStore();
  const rec = params.id ? data.groups.find((g) => g.id === params.id) : undefined;
  const [name, setName] = useState(rec?.name || "");
  const del = useDelete("groups", rec?.id, "The project is removed. Its items and costs are kept.");
  useSheetHeader(rec ? "Edit project" : "New project", () => {
    if (!name.trim()) return missing("Give the project a name");
    update((d) => { if (rec) patchRecord(d, "groups", rec.id, { name: name.trim() }); else addRecord(d, "groups", { name: name.trim() }); });
    success();
    nav.goBack();
  });
  return (
    <Form>
      <Field label="Project name"><Input value={name} onChangeText={setName} placeholder="e.g. iOS Applications" autoFocus={!rec} autoCapitalize="words" /></Field>
      {rec ? <Button kind="danger" title="Delete project" icon="trash-outline" onPress={del} /> : null}
    </Form>
  );
}

/* ---------- Item ---------- */
export function ItemForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update } = useStore();
  const rec = params.id ? data.items.find((i) => i.id === params.id) : undefined;
  const [name, setName] = useState(rec?.name || "");
  const [groupId, setGroupId] = useState<string>(rec ? rec.groupId || "" : params.groupId || "");
  const [status, setStatus] = useState<string>(rec?.status || "In development");
  const [logo, setLogo] = useState<string | null>(rec?.logo || null);
  const [letters, setLetters] = useState(rec?.iconText || "");
  const [iconHue, setIconHue] = useState<number | null>(rec ? rec.iconHue : null);
  const del = useDelete("items", rec?.id, "The item is removed. Its costs and sales move to General.");
  useSheetHeader(rec ? "Edit item" : "Add item", () => {
    if (!name.trim()) return missing("Give it a name");
    const out = {
      name: name.trim(), groupId: data.groups.some((g) => g.id === groupId) ? groupId : null, status,
      logo, iconText: letters.trim() || null, iconHue,
    };
    update((d) => { if (rec) patchRecord(d, "items", rec.id, out); else addRecord(d, "items", out); });
    success();
    nav.goBack();
  });
  const choose = async () => {
    try { const l = await pickLogo(); if (l) setLogo(l); }
    catch { Alert.alert("That picture couldn't be used", "Try a different one.", undefined, { userInterfaceStyle: "dark" }); }
  };
  const preview = { name, logo, iconText: letters.trim() || null, iconHue };
  return (
    <Form>
      <Field label="Name"><Input value={name} onChangeText={setName} placeholder="e.g. My first app" autoFocus={!rec} autoCapitalize="words" /></Field>
      <Field label="Project">
        <Select value={groupId} onChange={setGroupId}
          options={[{ value: "", label: "Not in a project" }, ...[...data.groups].sort(byCreated).map((g) => ({ value: g.id, label: g.name }))]} />
      </Field>
      <Field label="Status"><Select value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: s }))} /></Field>
      <Field label="Icon">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ItemBadge item={preview} size={64} />
          <Button kind="soft" title={logo ? "Change logo" : "Upload logo"} icon="image-outline" onPress={choose} />
          {logo ? <Button kind="soft" title="Remove" onPress={() => setLogo(null)} /> : null}
        </View>
      </Field>
      {!logo ? (
        <>
          <Field label="Letters" hint="Up to 3. Leave blank to use the name's initials.">
            <Input value={letters} onChangeText={(v) => setLetters(v.slice(0, 3))} placeholder={initials(name || "My app")} autoCapitalize="characters" maxLength={3} />
          </Field>
          <Field label="Colour">
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Swatch on={iconHue == null} onPress={() => setIconHue(null)} label="Auto" />
              {ICON_HUES.map((h) => <Swatch key={h} on={iconHue === h} onPress={() => setIconHue(h)} h={h} />)}
            </View>
          </Field>
        </>
      ) : null}
      {rec ? <Button kind="danger" title="Delete item" icon="trash-outline" onPress={del} /> : null}
    </Form>
  );
}

function Swatch({ on, onPress, h, label }: { on: boolean; onPress: () => void; h?: number; label?: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label || `Colour ${h}`} onPress={() => { tap(); onPress(); }}
      style={{
        width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2,
        borderColor: on ? C.text : "transparent", backgroundColor: h == null ? C.surface2 : `hsl(${h}, 40%, 20%)`,
      }}>
      <Text style={{ fontFamily: F.bold, fontSize: label ? 11 : 13, color: h == null ? C.muted : `hsl(${h}, 85%, 74%)` }}>{label || "Aa"}</Text>
    </Pressable>
  );
}

/* ---------- Customer ---------- */
export function CustomerForm() {
  const nav = useNavigation<any>();
  const params = useRoute<any>().params || {};
  const { data, update } = useStore();
  const rec = params.id ? data.customers.find((c) => c.id === params.id) : undefined;
  const [name, setName] = useState(rec?.name || "");
  const [email, setEmail] = useState(rec?.email || "");
  const [phone, setPhone] = useState(rec?.phone || "");
  const del = useDelete("customers", rec?.id, "The customer is removed. Their sales are kept.");
  useSheetHeader(rec ? "Edit customer" : "New customer", () => {
    if (!name.trim()) return missing("Enter a name");
    const out = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    update((d) => { if (rec) patchRecord(d, "customers", rec.id, out); else addRecord(d, "customers", out); });
    success();
    nav.goBack();
  });
  return (
    <Form>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus={!rec} autoCapitalize="words" textContentType="name" /></Field>
      <Field label="Email"><Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" /></Field>
      <Field label="Phone"><Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" /></Field>
      {rec ? <Button kind="danger" title="Delete customer" icon="trash-outline" onPress={del} /> : null}
    </Form>
  );
}
