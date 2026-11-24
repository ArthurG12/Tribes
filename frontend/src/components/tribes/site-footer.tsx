import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { TribesMark } from "@/components/tribes/tribes-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <Link href="/" aria-label="Tribes — página inicial" className="flex items-center gap-2 font-heading font-extrabold text-foreground">
          <TribesMark className="size-5 text-primary" /> Tribes
        </Link>
        <nav aria-label="Links do rodapé" className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
          <Link href="/faq" className="transition-colors hover:text-foreground">Dúvidas</Link>
          <Link href="/criadores" className="transition-colors hover:text-foreground">Criadores</Link>
          <Link href="/metricas" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"><BarChart3 className="size-3.5" /> Métricas</Link>
        </nav>
      </div>
    </footer>
  );
}
