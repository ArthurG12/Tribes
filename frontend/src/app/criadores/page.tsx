import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { TribesMark } from "@/components/tribes/tribes-mark";

export default function CreatorsPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Por trás da ideia" title="Quem criou a Tribes?" description="Um projeto construído para aproximar pessoas, transformar interesses em comunidades e tirar encontros do papel." />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-[0_12px_35px_rgba(65,35,30,0.06)] sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10"><TribesMark className="size-10" /></div>
          <h2 className="mt-5 font-heading text-2xl font-bold text-foreground">Equipe Tribes</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">A Tribes nasceu como um projeto colaborativo. Esta página reúne os créditos de criação e desenvolvimento da plataforma.</p>
        </div>
      </section>
    </PageShell>
  );
}
