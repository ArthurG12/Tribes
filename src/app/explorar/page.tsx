"use client";

import { useEffect } from "react";
import { TribeExplorer } from "@/components/tribes/tribe-explorer";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { trackMvpEvent } from "@/lib/mvp-tracker";

export default function ExplorePage() {
  useEffect(() => { void trackMvpEvent({ event: "page_view" }); }, []);
  return <PageShell><PageIntro eyebrow="Descubra sua comunidade" title="Encontre sua próxima tribo." description="Explore grupos por interesse, conheça comunidades e encontre pessoas para viver seus hobbies fora do feed." /><div className="mx-auto mt-8 max-w-6xl px-4 pb-20 sm:px-6"><TribeExplorer onSelectTribeForWaitlist={() => { window.location.href = "/lista-de-espera"; }} onExplorerInteract={(interest) => { void trackMvpEvent({ event: "explorer_interaction", interests: interest ? [interest] : undefined }); }} /></div></PageShell>;
}
