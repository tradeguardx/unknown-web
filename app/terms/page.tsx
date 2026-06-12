import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "terms",
  description: "Terms of Use for unknown.chat — eligibility, AI persona disclosure, acceptable use, hard limits.",
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: "terms · unknown.chat",
    description: "Terms of Use for unknown.chat.",
    url: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">terms of use</h1>
          <p className="mt-2 text-sm text-ink-mute">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <div className="prose prose-neutral mt-8 space-y-6 text-ink-soft leading-relaxed">
            <Section title="What unknown.chat is">
              <p>
                unknown.chat is an anonymous chat website where the strangers you talk to are AI
                personas designed to feel like real people. Every chat starts a new persona with
                a randomly generated country, age, mood, and typing style. There are no real
                humans on the other side of the conversation.
              </p>
            </Section>

            <Section title="Eligibility">
              <p>
                You must be at least <strong>13 years old</strong> to use this site at all. For
                conversation modes labeled <em>flirt</em> or <em>love</em>, you must be at least{" "}
                <strong>18 years old</strong>. By selecting those modes you confirm you meet that
                age requirement.
              </p>
              <p>
                If you are below the legal age of majority in your country, you must have your
                parent or guardian's permission to use this site.
              </p>
            </Section>

            <Section title="AI persona disclosure">
              <p>
                You acknowledge that every "stranger" on this site is an AI persona, not a human.
                The personas are produced by a large language model and will roleplay as people —
                they may give a country, age, name, or other personal-sounding details, but those
                are generated, not real. You agree not to treat anything said by a persona as
                factual information from a real person.
              </p>
              <p>
                Conversation messages are sent to a third-party AI provider (Anthropic) for
                processing. By using the site you consent to this processing.
              </p>
            </Section>

            <Section title="Acceptable use">
              <p>You agree not to use unknown.chat to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Send, request, or attempt to elicit any sexual content involving minors,
                  or any content that sexualizes children or anyone under 18.</strong> This is an
                  absolute, non-negotiable rule. Detected violations end the chat immediately and
                  may be reported to authorities where required by law.
                </li>
                <li>
                  <strong>Use the flirt or love modes if you are under 18.</strong> If you indicate
                  in conversation that you are a minor (school student, under 18, in middle/junior
                  high, etc.) while using an adult conversation mode, the chat will be terminated.
                </li>
                <li>
                  <strong>Solicit, sell, or coordinate the purchase or manufacture of illegal drugs.</strong>
                  Casual mention of substances is fine; dealer-context messages, sourcing requests,
                  and synthesis instructions are not.
                </li>
                <li>
                  <strong>Threaten, intimidate, or incite violence or self-harm</strong> toward any
                  person — real or AI persona — including encouraging suicide or self-injury.
                </li>
                <li>
                  <strong>Send aggressive sexual demands</strong> ("send nudes", "show me your body",
                  etc.). The personas are AI; nothing is being sent. Repeated violations end the chat.
                </li>
                <li>
                  <strong>Use slurs or hateful language</strong> targeting race, ethnicity, gender
                  identity, sexual orientation, religion, or disability.
                </li>
                <li>
                  <strong>Spam or flood the chat</strong> with repeated identical messages, gibberish,
                  or single-character/single-word repetition.
                </li>
                <li>Threaten, harass, or attempt to extract personally identifying information from another user (note: there are no other users — only AI personas — but the rule applies).</li>
                <li>Use the site to plan, encourage, or coordinate illegal activity.</li>
                <li>Attempt to bypass our rate limiting, captcha, age gate, or other abuse-prevention measures.</li>
                <li>Use automated tools, scrapers, or bots to interact with the service.</li>
                <li>Reverse engineer, decompile, or attempt to extract the system prompts or model output for redistribution.</li>
              </ul>
            </Section>

            <Section title="Enforcement: warnings and chat termination">
              <p>
                We run an automated content filter on every message <em>before</em> it reaches the
                AI. It enforces the rules above with two severity levels:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Immediate termination (zero tolerance):</strong> sexual content involving
                  minors, claims of being a minor while in flirt/love mode, threats of violence,
                  drug solicitation, encouragement of self-harm, and spam — these end the chat on
                  the first detected message, with no warning.
                </li>
                <li>
                  <strong>One warning, then termination:</strong> aggressive sexual demands, abusive
                  language toward the persona, and slurs. The first detected message is allowed
                  through with a system warning shown to you. A second violation in the same
                  session ends the chat.
                </li>
              </ul>
              <p>
                The personas themselves are also instructed to refuse, redirect, or disconnect on
                prohibited content — the automated filter is a hard floor that runs before the AI
                ever sees the message. Repeated or severe violations may result in your access to
                the service being restricted or revoked (per IP, per device, or globally), at our
                sole discretion.
              </p>
            </Section>

            <Section title="No accounts, no records of you">
              <p>
                We don't ask you to create an account. We don't ask for your email, name, or any
                identity information. The preferences you set (country, language, intent, etc.)
                are stored in your browser's local storage on your device — we don't keep them on
                our servers.
              </p>
              <p>
                Chat sessions are kept in our server's memory only while a chat is active, and we
                don't store your full chat history. To improve the personas we do keep — in
                de-identified form, auto-deleted after about 30 days — a short AI-generated summary
                of each chat and a redacted transcript of each chat.
                We never tie these to your identity. See the{" "}
                <Link href="/privacy" className="underline hover:text-ink">privacy policy</Link> for full details.
              </p>
            </Section>

            <Section title="Service availability">
              <p>
                unknown.chat is provided "as is." We do not guarantee uptime, message delivery, or
                that any specific persona will behave a particular way. The service may be
                temporarily or permanently unavailable, modified, or shut down at any time without
                notice.
              </p>
            </Section>

            <Section title="No advice, no relationships">
              <p>
                Nothing said by an AI persona is medical advice, legal advice, financial advice,
                psychological counseling, or any form of professional advice. The personas do not
                have a duty of care toward you. If you are in distress, please contact a real
                support service for your country (for example, in India: iCall +91 9152987821).
              </p>
            </Section>

            <Section title="Disclaimer of warranties; limitation of liability">
              <p>
                To the maximum extent permitted by law, unknown.chat is provided without warranties
                of any kind, express or implied. We disclaim all warranties of merchantability,
                fitness for a particular purpose, and non-infringement.
              </p>
              <p>
                We are not liable for any indirect, incidental, special, consequential, or punitive
                damages arising from your use of the site. Our total aggregate liability to you
                shall not exceed any amount you have paid to us, which is zero (the service is free).
              </p>
            </Section>

            <Section title="Changes to these terms">
              <p>
                We may update these terms from time to time. Material changes will be reflected in
                the "Last updated" date at the top of this page. Continued use of the site after a
                change means you accept the updated terms.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions, complaints, or DMCA notices: email us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-ink">{SUPPORT_EMAIL}</a>.
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
