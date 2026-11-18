import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { TribesMark } from "@/components/tribes/tribes-mark";
import { Navbar } from "@/components/tribes/navbar";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 font-heading font-extrabold text-foreground"><TribesMark className="size-5 text-[#315b35]" /> Tribes</Link>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/faq" className="hover:text-foreground">Dúvidas</Link>
            <Link href="/lista-de-espera" className="hover:text-foreground">Lista de espera</Link>
            <Link href="/metricas" className="inline-flex items-center gap-1.5 hover:text-foreground"><BarChart3 className="size-3.5" /> Métricas MVP</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-20">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
    </div>
  );
}
