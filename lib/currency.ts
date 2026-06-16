"use client";

// Localized price display. Dodo bills in the customer's local currency via
// real-time FX (adaptive currency) and exposes no pre-checkout price API, so we
// approximate it ourselves for display: convert the USD base with a live FX rate
// and format with Intl. The EXACT amount is always confirmed on Dodo's checkout
// page — we treat this as a close estimate. Falls back to USD when the country/
// currency/rate is unknown.

import { detectCountry } from "./geo";

// ISO country → ISO 4217 currency. Covers our markets + common ones; anything
// not listed (or that maps to USD) falls back to the USD label.
const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR", PK: "PKR", ID: "IDR", PH: "PHP",
  GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD", SG: "SGD", HK: "HKD",
  JP: "JPY", CN: "CNY", KR: "KRW", TW: "TWD", TH: "THB", MY: "MYR", VN: "VND",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", IL: "ILS",
  TR: "TRY", RU: "RUB", UA: "UAH", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON",
  SE: "SEK", NO: "NOK", DK: "DKK", CH: "CHF", IS: "ISK",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", UY: "UYU",
  ZA: "ZAR", NG: "NGN", EG: "EGP", KE: "KES", GH: "GHS", MA: "MAD", DZ: "DZD", TN: "TND",
  BD: "BDT", LK: "LKR", NP: "NPR",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR",
  IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", SK: "EUR", SI: "EUR", LT: "EUR",
  LV: "EUR", EE: "EUR", LU: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  // USD (explicit → use the plain USD label)
  US: "USD", EC: "USD", SV: "USD", PA: "USD",
};

interface FxCache {
  rates: Record<string, number>;
  ts: number;
}
const FX_TTL = 12 * 60 * 60 * 1000; // 12h
const FX_LS = "uc:fx:v1";
let fxMem: FxCache | null = null;

async function getRates(): Promise<Record<string, number> | null> {
  if (fxMem && Date.now() - fxMem.ts < FX_TTL) return fxMem.rates;
  try {
    const ls = localStorage.getItem(FX_LS);
    if (ls) {
      const p = JSON.parse(ls) as FxCache;
      if (p?.rates && Date.now() - p.ts < FX_TTL) {
        fxMem = p;
        return p.rates;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const j = (await res.json()) as { rates?: Record<string, number> };
      if (j?.rates) {
        fxMem = { rates: j.rates, ts: Date.now() };
        try {
          localStorage.setItem(FX_LS, JSON.stringify(fxMem));
        } catch {
          /* ignore */
        }
        return j.rates;
      }
    }
  } catch {
    /* network/abort — fall through */
  }
  return null;
}

// Round the converted amount to something that reads like a price.
function niceRound(a: number): number {
  if (a >= 1000) return Math.round(a / 100) * 100; // e.g. Rp 48,000
  if (a >= 100) return Math.round(a); // e.g. ₹249
  return Math.round(a * 100) / 100; // e.g. €2.76
}

export interface LocalPrice {
  label: string; // e.g. "₹249", "Rp 48,000"
  currency: string; // e.g. "INR"
  amount: number;
}

// Convert a USD amount to the visitor's local currency for display. Returns null
// (→ caller shows the USD label) when we can't resolve a non-USD currency/rate.
export async function localizeUsd(usd: number): Promise<LocalPrice | null> {
  const country = await detectCountry();
  if (!country) return null;
  const currency = COUNTRY_CURRENCY[country.toUpperCase()];
  if (!currency || currency === "USD") return null;

  const rates = await getRates();
  const rate = rates?.[currency];
  if (!rate) return null;

  const amount = niceRound(usd * rate);
  try {
    const label = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount < 100 ? 2 : 0,
      minimumFractionDigits: 0,
    }).format(amount);
    return { label, currency, amount };
  } catch {
    return null;
  }
}
