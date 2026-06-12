import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Chat Anônimo com IA — Conversar sem Cadastro | unknown.chat" },
  description:
    "Converse com um estranho de IA de forma anônima — sem cadastro, sem login. Para desabafar, conversa de madrugada ou chat aleatório. Grátis, uma nova persona a cada conversa.",
  alternates: {
    canonical: `${SITE_URL}/pt`,
    languages: {
      en: SITE_URL,
      id: `${SITE_URL}/id`,
      "pt-BR": `${SITE_URL}/pt`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: "unknown.chat — chat anônimo com IA, sem cadastro",
    description: "Converse com um estranho de IA que parece humano. Sem cadastro, sem rastro.",
    url: `${SITE_URL}/pt`,
    locale: "pt_BR",
    type: "website",
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "O que é unknown.chat?",
    a: "unknown.chat é onde você conversa com um estranho de IA de forma anônima — sem cadastro, sem login, sem app. Cada conversa é uma nova persona de IA, com humor, país e idioma próprios. Fechou a aba, a conversa some para sempre.",
  },
  {
    q: "O estranho é uma pessoa real ou uma IA?",
    a: "É uma IA. O unknown.chat é feito de personas de IA que digitam, mudam de humor e somem como uma pessoa de verdade — e avisamos logo de cara que é IA. Aqui a IA é o ponto principal, não só um reserva quando não tem gente online.",
  },
  {
    q: "Preciso me cadastrar?",
    a: "Não. É um chat anônimo sem cadastro e sem e-mail. Um toque e em uns 5 segundos você já está conversando.",
  },
  {
    q: "Posso desabafar?",
    a: "Pode. Muita gente usa o unknown.chat para desabafar com um estranho online de forma anônima — sem conta, sem rastro, nada salvo.",
  },
  {
    q: "Tem alguém para conversar de madrugada?",
    a: "Tem. Sempre há um estranho 'acordado'. O unknown.chat é feito para a madrugada, quando você quer falar com alguém mas não tem ninguém por perto.",
  },
  {
    q: "É uma alternativa ao Omegle?",
    a: "Sim — uma alternativa ao Omegle sem vídeo e sem câmera. Só texto, sem conta, e um estranho de IA em vez de ficar na fila esperando uma pessoa.",
  },
  {
    q: "É grátis?",
    a: "Sim, grátis e sem cadastro. Chat anônimo com IA, sem e-mail e sem pagar para começar a conversar.",
  },
];

export default function PortuguesePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "pt-BR",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col" lang="pt-BR">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Chat anônimo com um <span className="font-serif italic font-normal text-red">estranho de IA</span>
          </h1>

          <section className="mt-6 space-y-4 text-ink-soft leading-relaxed">
            <p>
              unknown.chat é onde você conversa com estranhos de forma anônima — um chat anônimo sem
              cadastro, com IA que parece humano. Seja para conversar com estranhos, desabafar com um
              estranho online ou só um chat aleatório sem login quando bate o tédio — é só abrir e
              começar. Cada conversa é uma nova persona; fechou a aba, acabou.
            </p>
            <p>
              Para quem quer desabafar de madrugada ou falar com uma IA que parece humano quando
              ninguém está por perto, aqui sempre tem alguém para conversar — de graça.
            </p>
          </section>

          <div className="mt-8">
            <Link
              href="/chat"
              className="inline-block rounded-xl border-2 border-ink bg-red text-paper-cool px-5 py-2.5 font-sans font-bold tracking-tight shadow-hard"
            >
              Começar a conversar →
            </Link>
          </div>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Perguntas frequentes</h2>
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
