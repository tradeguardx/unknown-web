import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Chat Anonim dengan AI — Ngobrol Tanpa Daftar | unknown.chat" },
  description:
    "Ngobrol anonim sama AI yang terasa seperti manusia — tanpa daftar, tanpa login. Buat curhat, teman ngobrol malam, atau chat random. Gratis, persona baru tiap obrolan.",
  alternates: {
    canonical: `${SITE_URL}/id`,
    languages: {
      en: SITE_URL,
      id: `${SITE_URL}/id`,
      "pt-BR": `${SITE_URL}/pt`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: "unknown.chat — chat anonim sama AI, tanpa daftar",
    description: "Ngobrol anonim sama orang asing AI yang terasa seperti manusia. Tanpa daftar, tanpa jejak.",
    url: `${SITE_URL}/id`,
    locale: "id_ID",
    type: "website",
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Apa itu unknown.chat?",
    a: "unknown.chat adalah tempat ngobrol anonim sama AI yang terasa seperti manusia — tanpa daftar, tanpa login, tanpa aplikasi. Setiap obrolan adalah persona AI baru dengan mood, negara, dan bahasanya sendiri. Tutup tab, obrolannya hilang selamanya.",
  },
  {
    q: "Orang asingnya manusia atau AI?",
    a: "AI. unknown.chat dibangun dari persona AI yang ngetik, berubah mood, dan kadang ghosting seperti orang asli — dan kami kasih tahu dari awal kalau ini AI. Di sini AI-nya memang inti dari semuanya, bukan cuma cadangan pas nggak ada orang.",
  },
  {
    q: "Perlu daftar?",
    a: "Nggak. Ini chat anonim tanpa daftar dan tanpa email. Sekali tap, sekitar 5 detik kamu udah mulai ngobrol.",
  },
  {
    q: "Bisa buat curhat?",
    a: "Bisa. Banyak yang pakai unknown.chat buat curhat sama orang asing secara anonim — tanpa akun, tanpa jejak, nggak ada yang disimpan.",
  },
  {
    q: "Ada teman ngobrol jam 3 pagi?",
    a: "Ada. Selalu ada yang 'online'. unknown.chat cocok buat malam-malam pas kamu pengen ngobrol tapi nggak ada teman yang lagi bangun.",
  },
  {
    q: "Alternatif Omegle?",
    a: "Ya — alternatif Omegle tanpa video dan tanpa kamera. Cuma teks, tanpa akun, dan orang asingnya AI, jadi nggak perlu antre nunggu manusia.",
  },
  {
    q: "Gratis?",
    a: "Gratis. Chat AI anonim tanpa daftar, tanpa email, tanpa bayar buat mulai ngobrol.",
  },
];

export default function IndonesiaPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "id",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col" lang="id">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Chat anonim sama <span className="font-serif italic font-normal text-red">orang asing AI</span>
          </h1>

          <section className="mt-6 space-y-4 text-ink-soft leading-relaxed">
            <p>
              unknown.chat adalah tempat ngobrol sama AI yang terasa seperti manusia — chat anonim
              tanpa daftar, tanpa login. Mau chat dengan orang asing online, curhat sama orang asing,
              atau cuma chat random tanpa akun pas bosen — tinggal buka dan mulai. Setiap obrolan
              persona baru; tutup tab, semuanya hilang.
            </p>
            <p>
              Buat yang lagi pengen curhat anonim tanpa daftar atau butuh teman ngobrol online anonim
              jam 3 pagi, di sini selalu ada yang bisa diajak ngobrol — chat AI seperti manusia, gratis.
            </p>
          </section>

          <div className="mt-8">
            <Link
              href="/chat"
              className="inline-block rounded-xl border-2 border-ink bg-red text-paper-cool px-5 py-2.5 font-sans font-bold tracking-tight shadow-hard"
            >
              Mulai ngobrol →
            </Link>
          </div>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Pertanyaan yang sering ditanya</h2>
          <div className="mt-5 space-y-2.5">
            {FAQS.map((f, i) => (
              <details key={i} className="group rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-sans text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 text-xl leading-none text-red transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 font-display text-[14px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
