// Profit Pocket's data. Everything lives in one snapshot that is saved on the
// phone and, when signed in, synced to the account. Records are merged by id
// (see merge.ts), so every record carries an id and an updatedAt stamp.
//
// Names: a "group" is a Project you create (e.g. "iOS Applications"); an
// "item" is one thing inside it (each app or game). Costs, products and sales
// belong to an item, to a whole group ("shared"), or to nothing ("General").

export type Rec = { id: string; createdAt: number; updatedAt: number };

export type Link = { itemId: string | null; groupId: string | null };

export type Group = Rec & { name: string };
export type Item = Rec & {
  name: string; groupId: string | null; status: Status;
  logo: string | null; iconText: string | null; iconHue: number | null;
};
export type Product = Rec & Link & { name: string; price: number };
export type Customer = Rec & { name: string; email: string; phone: string };
export type Sale = Rec & {
  productId: string; customerId: string | null; quantity: number;
  discount: number; fee: number; channel: string; date: string;
};
export type Expense = Rec & Link & { amount: number; description: string; category: string; vendor: string; date: string };
export type Recurring = Rec & Link & {
  amount: number; description: string; category: string; vendor: string;
  frequency: FreqKey; startDate: string; endDate: string | null;
};
export type Channel = { name: string; fee: number };
export type Settings = {
  currency: string; fyStartMonth: number; // 1 = January
  channels: Channel[]; categories: string[]; updatedAt: number;
};

export type Snapshot = {
  groups: Group[]; items: Item[]; products: Product[]; customers: Customer[];
  sales: Sale[]; expenses: Expense[]; recurring: Recurring[];
  settings: Settings; tombstones: { [id: string]: number };
};
export type Kind = "groups" | "items" | "products" | "customers" | "sales" | "expenses" | "recurring";
export const KINDS: Kind[] = ["groups", "items", "products", "customers", "sales", "expenses", "recurring"];

export const STATUSES = ["Idea", "In development", "Live", "Paused", "Retired"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_COLOR: { [k: string]: string } = {
  "Idea": "#FBBF24", "In development": "#60A5FA", "Live": "#2DD4BF", "Paused": "#5F6580", "Retired": "#5F6580",
};

export type FreqKey = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
export const FREQS: { [k in FreqKey]: { label: string; days?: number; months?: number; perMonth: number } } = {
  weekly: { label: "Weekly", days: 7, perMonth: 52 / 12 },
  fortnightly: { label: "Fortnightly", days: 14, perMonth: 26 / 12 },
  monthly: { label: "Monthly", months: 1, perMonth: 1 },
  quarterly: { label: "Quarterly", months: 3, perMonth: 1 / 3 },
  yearly: { label: "Yearly", months: 12, perMonth: 1 / 12 },
};

export const DEFAULT_CHANNELS: Channel[] = [
  { name: "In person", fee: 0 },
  { name: "Website", fee: 3 },
  { name: "App Store", fee: 15 },
  { name: "Google Play", fee: 15 },
  { name: "Steam", fee: 30 },
  { name: "itch.io", fee: 10 },
  { name: "Etsy", fee: 10 },
  { name: "eBay", fee: 13 },
  { name: "Other", fee: 0 },
];
export const DEFAULT_CATEGORIES = [
  "Stock & materials", "Software & subscriptions", "AI tools", "Hosting & domains", "Developer accounts",
  "Marketing", "Shipping & postage", "Equipment", "Other",
];

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ---------- dates ("YYYY-MM-DD") ---------- */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => ymd(new Date());
export function parseYmd(s: string): Date {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}
export const monthLabel = (ds: string) => { const [y, m] = ds.split("-"); return `${MONTHS[+m - 1]} ${y}`; };
export const shortDate = (ds: string) => { const [, m, d] = ds.split("-"); return `${+d} ${MONTHS[+m - 1].slice(0, 3)}`; };
export const longDate = (ds: string) => { const [y, m, d] = ds.split("-"); return `${+d} ${MONTHS[+m - 1].slice(0, 3)} ${y}`; };

/* ---------- ids ---------- */
export function newId(): string {
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === "function") return g.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

/* ---------- defaults & cleaning ---------- */
// Financial year start by country (month number); everywhere else starts in January.
const FY_BY_REGION: { [cc: string]: number } = { AU: 7, NZ: 4, GB: 4, IN: 4, JP: 4, HK: 4, ZA: 3, EG: 7, PK: 7, KE: 7, BD: 7 };
export function defaultSettings(currency = "AUD", region = "AU"): Settings {
  return {
    currency: currency || "AUD",
    fyStartMonth: FY_BY_REGION[(region || "").toUpperCase()] || 1,
    channels: DEFAULT_CHANNELS.map((c) => ({ ...c })),
    categories: DEFAULT_CATEGORIES.slice(),
    updatedAt: 0,
  };
}

export function emptySnapshot(settings?: Settings): Snapshot {
  return {
    groups: [], items: [], products: [], customers: [], sales: [], expenses: [], recurring: [],
    settings: settings || defaultSettings(), tombstones: {},
  };
}

const num = (v: any, d = 0) => (typeof v === "number" && isFinite(v) ? v : isFinite(parseFloat(v)) ? parseFloat(v) : d);
const str = (v: any, d = "") => (typeof v === "string" ? v : v == null ? d : String(v));
const strOrNull = (v: any) => (typeof v === "string" && v ? v : null);
const isDate = (v: any) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const base = (r: any): Rec => ({ id: str(r.id), createdAt: num(r.createdAt), updatedAt: num(r.updatedAt) });
const link = (r: any): Link => ({ itemId: strOrNull(r.itemId), groupId: r.itemId ? null : strOrNull(r.groupId) });
const FREQ_KEYS = Object.keys(FREQS);

// Makes any stored or synced copy safe to use, whatever version wrote it.
export function normaliseSnapshot(raw: any, fallbackSettings?: Settings): Snapshot {
  const r = raw && typeof raw === "object" ? raw : {};
  const arr = (k: string) => (Array.isArray(r[k]) ? r[k].filter((x: any) => x && typeof x === "object" && x.id) : []);
  const fs = fallbackSettings || defaultSettings();
  const s = r.settings && typeof r.settings === "object" ? r.settings : {};
  const channels: Channel[] = Array.isArray(s.channels)
    ? s.channels.filter((c: any) => c && c.name).map((c: any) => ({ name: str(c.name), fee: Math.min(100, Math.max(0, num(c.fee))) }))
    : fs.channels;
  const categories: string[] = Array.isArray(s.categories) ? s.categories.filter((c: any) => typeof c === "string" && c) : fs.categories;
  return {
    groups: arr("groups").map((g: any) => ({ ...base(g), name: str(g.name, "Project") })),
    items: arr("items").map((p: any) => ({
      ...base(p), name: str(p.name, "Item"), groupId: strOrNull(p.groupId),
      status: (STATUSES as readonly string[]).includes(p.status) ? p.status : "In development",
      logo: strOrNull(p.logo), iconText: strOrNull(p.iconText), iconHue: typeof p.iconHue === "number" ? p.iconHue : null,
    })),
    products: arr("products").map((p: any) => ({ ...base(p), ...link(p), name: str(p.name, "Product"), price: Math.max(0, num(p.price)) })),
    customers: arr("customers").map((c: any) => ({ ...base(c), name: str(c.name, "Customer"), email: str(c.email), phone: str(c.phone) })),
    sales: arr("sales").filter((x: any) => x.productId).map((x: any) => ({
      ...base(x), productId: str(x.productId), customerId: strOrNull(x.customerId),
      quantity: Math.max(1, Math.round(num(x.quantity, 1))), discount: Math.min(100, Math.max(0, num(x.discount))),
      fee: Math.min(100, Math.max(0, num(x.fee))), channel: str(x.channel, "Other"), date: isDate(x.date) ? x.date : today(),
    })),
    expenses: arr("expenses").map((e: any) => ({
      ...base(e), ...link(e), amount: Math.max(0, num(e.amount)), description: str(e.description, "Expense"),
      category: str(e.category, "Other"), vendor: str(e.vendor), date: isDate(e.date) ? e.date : today(),
    })),
    recurring: arr("recurring").map((e: any) => ({
      ...base(e), ...link(e), amount: Math.max(0, num(e.amount)), description: str(e.description, "Recurring cost"),
      category: str(e.category, "Other"), vendor: str(e.vendor),
      frequency: FREQ_KEYS.includes(e.frequency) ? e.frequency : "monthly",
      startDate: isDate(e.startDate) ? e.startDate : today(), endDate: isDate(e.endDate) ? e.endDate : null,
    })),
    settings: {
      currency: /^[A-Z]{3}$/.test(s.currency) ? s.currency : fs.currency,
      fyStartMonth: Math.min(12, Math.max(1, Math.round(num(s.fyStartMonth, fs.fyStartMonth)))),
      channels: channels.length ? channels : fs.channels,
      categories: categories.length ? categories : fs.categories,
      updatedAt: num(s.updatedAt),
    },
    tombstones: r.tombstones && typeof r.tombstones === "object" ? { ...r.tombstones } : {},
  };
}

/* ---------- links ("general", "g:<group>", "p:<item>") ---------- */
export type LinkKey = string;
export const keyOf = (r: Link): LinkKey => (r.itemId ? "p:" + r.itemId : r.groupId ? "g:" + r.groupId : "general");
export const parseKey = (k: LinkKey): Link =>
  k && k.startsWith("g:") ? { itemId: null, groupId: k.slice(2) }
    : k && k.startsWith("p:") ? { itemId: k.slice(2), groupId: null } : { itemId: null, groupId: null };

/* ---------- item badges ---------- */
export const ICON_HUES = [0, 25, 45, 95, 160, 195, 225, 265, 300];
export function initials(name: string) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : String(name || "?").slice(0, 2)).toUpperCase();
}
export function hue(name: string) { let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
