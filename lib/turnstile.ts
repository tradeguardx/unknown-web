// Cloudflare Turnstile (anti-bot) verification helper.
// Free service, privacy-friendly (no third-party tracking like reCAPTCHA).
// If TURNSTILE_SECRET_KEY is not set, captcha is treated as "disabled"
// (everything passes). Lets the app run locally without signup.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isCaptchaEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha disabled — bypass

  if (!token) return false;

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}
