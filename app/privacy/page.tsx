import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "privacy",
  description: "Privacy policy for unknown.chat — what we collect (very little), what we don't (almost everything), and how chat data flows.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: "privacy · unknown.chat",
    description: "Privacy policy for unknown.chat.",
    url: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">privacy policy</h1>
          <p className="mt-2 text-sm text-ink-mute">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <div className="prose prose-neutral mt-8 space-y-6 text-ink-soft leading-relaxed">
            <Section title="The short version">
              <ul className="list-disc pl-6 space-y-1">
                <li>We don't have user accounts, so we don't ask for your name, email, or any other identifier.</li>
                <li>We run our own privacy-friendly, aggregate analytics — no advertising, no third-party trackers, no selling of data. We record coarse, de-identified usage (page views, chat events, approximate country) to understand how the site is used.</li>
                <li>Live sessions are in-memory and gone when the chat ends. For quality, we keep a short AI-generated summary of each chat and a redacted transcript of each chat — all de-identified and auto-deleted after ~30 days.</li>
                <li>Your chat messages <em>are</em> sent to Anthropic's Claude API for processing — that's how the AI personas work. Their privacy policy applies for that data flow.</li>
                <li>Your local preferences (country, language, intent, age confirmation, sound, notification permission) are stored in your browser's local storage on your device. We don't have a copy.</li>
              </ul>
            </Section>

            <Section title="What we collect">
              <h3 className="font-medium text-ink">IP address (transient, never stored)</h3>
              <p>
                Your IP address is visible to our servers when you make a request — that's how the
                internet works. We use it for two things, both in-memory only and dropped on
                server restart:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Rate limiting (per-IP cap on how many chats you can start per minute, to prevent abuse).</li>
                <li>Captcha gating (counter of how many chats you've started since your last captcha verification).</li>
                <li>Approximate <strong>country</strong> lookup for aggregate analytics (e.g. "visitors by country"). We derive only the country code and discard the IP — we never store your IP alongside it.</li>
              </ul>
              <p>We do not log IP addresses to disk and do not associate them with any other identifier. Country is derived locally using GeoLite2 data created by MaxMind (<a href="https://www.maxmind.com" target="_blank" rel="noopener noreferrer" className="underline">maxmind.com</a>).</p>

              <h3 className="font-medium text-ink mt-4">Chat messages (transient, processed by Anthropic)</h3>
              <p>
                When you send a message to a "stranger," the message is forwarded to Anthropic's
                Claude API along with the persona's system prompt and the recent message history
                of that chat. Anthropic processes the message and returns a reply. Their data
                handling is governed by{" "}
                <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline">Anthropic's privacy policy</a>{" "}
                and you should review it.
              </p>
              <p>
                We do not retain your full chat by default beyond the active session. To improve
                the AI personas, two things are kept in our own analytics store and{" "}
                <strong>auto-deleted after about 30 days</strong>:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>A short, AI-generated <strong>summary</strong> of each chat (what it was about, how it went) — not the raw messages.</li>
                <li>A <strong>redacted transcript</strong> of each chat. Before storage we strip obvious identifiers like emails and phone numbers, and keep only the most recent part of the conversation. We never store who you are alongside it.</li>
              </ul>

              <h3 className="font-medium text-ink mt-4">Our own privacy-friendly analytics</h3>
              <p>
                We run our own lightweight analytics to understand aggregate usage of the site
                (how many people visit, which pages, approximate country, device type) — never
                anything that personally identifies you. We do not use advertising networks or
                third-party trackers, and we never sell data.
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  To tell apart new vs. returning visitors we set a single first-party identifier
                  and derive a per-day, salted hash of your IP + device. The salt rotates every
                  24 hours, so these cannot be tied back to you over time.
                </li>
                <li>We do not track you across other websites.</li>
                <li>
                  We record coarse, aggregate events — a page view, a chat starting and ending
                  (with the reason and a rough duration), and when our content filter blocks a
                  message. These contain no message content, no name, and no stored raw IP address.
                </li>
              </ul>
              <p>
                These exist so we can see whether the product is working — funnel conversion,
                average chat length, abuse rates — not to track individuals.
              </p>

              <h3 className="font-medium text-ink mt-4">Cloudflare Turnstile (captcha)</h3>
              <p>
                Roughly every 5 chats we present a captcha challenge from Cloudflare Turnstile to
                verify you're a human. Cloudflare is the data processor for that challenge; their
                privacy practices are governed by{" "}
                <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="underline">Cloudflare's privacy policy</a>.
                Turnstile is privacy-friendly compared to Google reCAPTCHA — it does not track you
                across sites.
              </p>
            </Section>

            <Section title="What we don't collect">
              <ul className="list-disc pl-6 space-y-1">
                <li>No accounts, names, emails, or phone numbers.</li>
                <li>No Google Analytics, no Mixpanel, no Facebook Pixel, no advertising trackers, no third-party fingerprinting.</li>
                <li>No persistent server-side history of your chats.</li>
                <li>No advertising or cross-site tracking cookies — only the first-party identifier described in the analytics note above.</li>
              </ul>
            </Section>

            <Section title="Cookies and local storage">
              <p>
                We use your browser's <code className="bg-paper-warm px-1 py-0.5 rounded text-sm">localStorage</code>{" "}
                to remember your preferences (country, language, gender, interest, intent, AI
                acknowledgment, age confirmation, sound on/off, notification preference). These
                are stored on your device. Clearing your browser data deletes them.
              </p>
              <p>
                Cloudflare Turnstile may set short-lived cookies as part of the captcha challenge
                process. These are managed by Cloudflare.
              </p>
            </Section>

            <Section title="Data retention">
              <p>
                <strong>Chat sessions:</strong> in-memory only, deleted on chat end or server restart.<br />
                <strong>Local preferences:</strong> retained on your device until you clear them.<br />
                <strong>Server logs:</strong> minimal operational logs (errors, request counts) are retained for up to 7 days for debugging. We do not log message content or IPs.
              </p>
            </Section>

            <Section title="Children">
              <p>
                unknown.chat is not intended for children under 13. Adult-coded conversation modes
                (flirt, love) require self-attestation that you are 18 or older. If we become
                aware that we have inadvertently collected data from a child below the applicable
                age, we will delete it.
              </p>
            </Section>

            <Section title="Your rights">
              <p>
                Because we don't store an identifiable record of you, there's typically nothing
                for us to "give you a copy of" or "delete on request." Your data lives on your
                device. You can:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Clear your local preferences by clearing your browser's site data for unknown.chat.</li>
                <li>Stop using the service at any time.</li>
                <li>Contact us with any questions (see <Link href="/about" className="underline hover:text-ink">about</Link>).</li>
              </ul>
              <p>
                For data flowing through Anthropic, you may exercise data-subject rights with
                Anthropic directly per their privacy policy.
              </p>
            </Section>

            <Section title="International users">
              <p>
                If you're using unknown.chat from outside the country where our servers are
                hosted, your data is transferred internationally. Anthropic's API may also
                transfer data to the United States or other regions for processing. By using the
                service you consent to these transfers.
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p>
                If we change this policy in any material way, we'll update the "Last updated" date
                above. Continued use after changes means you accept the updated policy.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                For privacy questions or concerns, see the contact details on our{" "}
                <Link href="/about" className="underline hover:text-ink">about</Link> page.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
