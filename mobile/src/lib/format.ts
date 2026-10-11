// Money formatting in the person's chosen currency.
export type Money = {
  money: (n: number) => string;
  signed: (n: number) => string;
  compact: (n: number) => string;
  symbol: string;
};

const cache: { [k: string]: Money } = {};

export function makeMoney(currency: string): Money {
  if (cache[currency]) return cache[currency];
  let nf: Intl.NumberFormat | null = null;
  try { nf = new Intl.NumberFormat(undefined, { style: "currency", currency }); } catch {}
  const plain = (n: number) => Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmtAbs = (n: number) => {
    const v = Math.abs(Number(n) || 0);
    if (nf) { try { return nf.format(v); } catch {} }
    return "$" + plain(v);
  };
  let symbol = "$";
  try { symbol = fmtAbs(0).replace(/[\d.,\s  ]/g, "") || "$"; } catch {}
  const m: Money = {
    money: fmtAbs,
    signed: (n) => (n < 0 ? "-" : "") + fmtAbs(n),
    compact: (n) => {
      const v = Math.abs(n);
      const s = v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(Math.round(v));
      return (n < 0 ? "-" : "") + symbol + s;
    },
    symbol,
  };
  cache[currency] = m;
  return m;
}

export const CURRENCIES = [
  ["AUD", "Australian dollar"], ["USD", "US dollar"], ["EUR", "Euro"], ["GBP", "British pound"], ["NZD", "New Zealand dollar"],
  ["CAD", "Canadian dollar"], ["SGD", "Singapore dollar"], ["HKD", "Hong Kong dollar"], ["JPY", "Japanese yen"], ["CNY", "Chinese yuan"],
  ["INR", "Indian rupee"], ["ZAR", "South African rand"], ["CHF", "Swiss franc"], ["SEK", "Swedish krona"], ["NOK", "Norwegian krone"],
  ["DKK", "Danish krone"], ["PLN", "Polish zloty"], ["BRL", "Brazilian real"], ["MXN", "Mexican peso"], ["PHP", "Philippine peso"],
  ["MYR", "Malaysian ringgit"], ["IDR", "Indonesian rupiah"], ["THB", "Thai baht"], ["KRW", "South Korean won"], ["AED", "UAE dirham"],
] as const;
