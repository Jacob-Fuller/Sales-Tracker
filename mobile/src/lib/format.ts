// Money formatting in the person's chosen currency.
export type Money = {
  money: (n: number) => string;
  signed: (n: number) => string;
  compact: (n: number) => string;
  whole: (n: number) => string; // no cents, for small stat cells
  symbol: string;
};

const cache: { [k: string]: Money } = {};

// hide: amounts show as dots (the eye button), so the app can be opened in front of people.
export function makeMoney(currency: string, hide = false): Money {
  const ck = currency + (hide ? ":h" : "");
  if (cache[ck]) return cache[ck];
  let nf: Intl.NumberFormat | null = null, nf0: Intl.NumberFormat | null = null;
  try { nf = new Intl.NumberFormat(undefined, { style: "currency", currency }); } catch {}
  try { nf0 = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }); } catch {}
  const plain = (n: number) => Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmtAbs = (n: number) => {
    const v = Math.abs(Number(n) || 0);
    if (nf) { try { return nf.format(v); } catch {} }
    return "$" + plain(v);
  };
  let symbol = "$";
  try { symbol = fmtAbs(0).replace(/[\d.,\s  ]/g, "") || "$"; } catch {}
  const dots = () => symbol + "•••";
  const whole = (n: number) => {
    const v = Math.round(Math.abs(Number(n) || 0));
    let out = symbol + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (nf0) { try { out = nf0.format(v); } catch {} }
    return (n <= -0.5 ? "-" : "") + out;
  };
  const m: Money = hide ? { money: dots, signed: dots, compact: dots, whole: dots, symbol } : {
    money: fmtAbs,
    whole,
    signed: (n) => (n < 0 ? "-" : "") + fmtAbs(n),
    compact: (n) => {
      const v = Math.abs(n);
      const s = v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(Math.round(v));
      return (n < 0 ? "-" : "") + symbol + s;
    },
    symbol,
  };
  cache[ck] = m;
  return m;
}

export const CURRENCIES = [
  ["AUD", "Australian dollar"], ["USD", "US dollar"], ["EUR", "Euro"], ["GBP", "British pound"], ["NZD", "New Zealand dollar"],
  ["CAD", "Canadian dollar"], ["SGD", "Singapore dollar"], ["HKD", "Hong Kong dollar"], ["JPY", "Japanese yen"], ["CNY", "Chinese yuan"],
  ["INR", "Indian rupee"], ["ZAR", "South African rand"], ["CHF", "Swiss franc"], ["SEK", "Swedish krona"], ["NOK", "Norwegian krone"],
  ["DKK", "Danish krone"], ["PLN", "Polish zloty"], ["BRL", "Brazilian real"], ["MXN", "Mexican peso"], ["PHP", "Philippine peso"],
  ["MYR", "Malaysian ringgit"], ["IDR", "Indonesian rupiah"], ["THB", "Thai baht"], ["KRW", "South Korean won"], ["AED", "UAE dirham"],
] as const;
