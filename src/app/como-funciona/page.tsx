import { Compass, CalendarCheck2, HeartHandshake } from "lucide-react";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";

const steps = [
  { number: "01", icon: Compass, title: "Descubra sua tribo", text: "Escolha seus hobbies e sua região. Encontre grupos ativos no seu bairro, campus ou online — inclusive comunidades abertas a iniciantes." },
  { number: "02", icon: CalendarCheck2, title: "Combine sem confusão", text: "Veja data, horário, local, custo e vagas em um só lugar. Confirme presença sem precisar procurar informações perdidas no chat." },
  { number: "03", icon: HeartHandshake, title: "Viva o encontro", text: "Conheça pessoas com interesses em comum, participe no seu ritmo e mantenha a comunidade ativa com encontros recorrentes." },
];

export default function HowItWorksPage() {
  return <PageShell><PageIntro eyebrow="Do interesse ao encontro" title="É simples encontrar pessoas que curtem o mesmo que você." description="A Tribes organiza a jornada para que conhecer gente nova e marcar atividades seja leve, claro e acessível." /><div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 md:grid-cols-3 sm:px-6">{steps.map(({number,icon:Icon,title,text}) => <article key={number} className="rounded-3xl border border-[#dce8c8] bg-white p-7"><span className="font-mono text-xs font-bold text-primary">PASSO {number}</span><div className="mt-4 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary"><Icon className="size-6" /></div><h2 className="mt-5 font-heading text-xl font-bold text-foreground">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></PageShell>;
}
