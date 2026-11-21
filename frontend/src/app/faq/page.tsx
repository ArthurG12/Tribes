import { FAQ_ITEMS } from "@/lib/tribes-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";

export default function FAQPage() {
  return <PageShell><PageIntro eyebrow="Tire suas dúvidas" title="Perguntas frequentes." description="Entenda como a Tribes funciona, para quem foi criada e o que esperar do lançamento." /><div className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><div className="rounded-3xl border border-[#c8d3be] bg-white px-6 py-2"><Accordion className="w-full">{FAQ_ITEMS.map((item,index) => <AccordionItem key={item.question} value={`faq-${index}`}><AccordionTrigger className="py-5 text-left font-heading text-base font-bold text-foreground hover:no-underline">{item.question}</AccordionTrigger><AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.answer}</AccordionContent></AccordionItem>)}</Accordion></div></div></PageShell>;
}
