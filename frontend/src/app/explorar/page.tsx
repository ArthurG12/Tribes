"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TribeExplorer } from "@/components/tribes/tribe-explorer";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { trackMvpEvent } from "@/lib/mvp-tracker";

export default function ExplorePage() {
  const router = useRouter();
  useEffect(() => { void trackMvpEvent({ event: "page_view" }); }, []);
  return <PageShell><PageIntro eyebrow="Catálogo de comunidades" title="Explore as tribos." description="Encontre grupos por interesse e refine sua busca por formato e atividade." /><div className="mx-auto mt-8 max-w-6xl px-4 pb-20 sm:px-6"><TribeExplorer onSelectTribeForSignup={() => { router.push("/cadastro"); }} onExplorerInteract={(interest) => { void trackMvpEvent({ event: "explorer_interaction", interests: interest ? [interest] : undefined }); }} /></div></PageShell>;
}
