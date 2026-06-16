"use client";

// Client-side country detection for geo pricing ($2.99 IN/PK/ID/PH, $4.99 rest).
//
// Why this exists: api.unknown.chat is a direct AWS API Gateway (NOT behind
// Cloudflare), so the backend never receives a `cf-ipcountry` header and can't
// geolocate on its own. We detect the country in the browser and pass it to
// /pricing (display) and /checkout (which tier to bill).
//
// Order: a fast IP lookup (accurate to the actual connection), falling back to
// the device timezone for the discount countries if the lookup is blocked/slow.
// Cached in memory + localStorage so we hit the network at most once per device.

const LS_KEY = "uc:country:v1";

// Timezones that map cleanly to the tier-3 (cheaper) countries. Used only as a
// fallback — enough to get the discount right offline for IN/PK/ID/PH.
const TZ_COUNTRY: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Karachi": "PK",
  "Asia/Jakarta": "ID",
  "Asia/Pontianak": "ID",
  "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Manila": "PH",
};

function timezoneCountry(): string | null {
  try {
    return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}

let cached: string | null | undefined;

export async function detectCountry(): Promise<string | null> {
  if (cached !== undefined) return cached;

  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && /^[A-Z]{2}$/.test(stored)) {
      cached = stored;
      return cached;
    }
  } catch {
    /* localStorage unavailable — fine */
  }

  // IP-based lookup (reflects the real connection, not the device clock).
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://ipapi.co/country/", { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const c = (await res.text()).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(c)) {
        cached = c;
        try {
          localStorage.setItem(LS_KEY, c);
        } catch {
          /* ignore */
        }
        return cached;
      }
    }
  } catch {
    /* network/abort/CORS — fall through to timezone */
  }

  // Fallback: timezone (gets the discount countries right; null elsewhere → $4.99).
  cached = timezoneCountry();
  return cached;
}
