"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WaitlistSection } from "@/components/tribes/waitlist-section";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { type PlanId, type SegmentId, type InterestId } from "@/lib/tribes-data";
import { trackMvpEvent } from "@/lib/mvp-tracker";

export default function WaitlistPage() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plano");
  const validPlans: PlanId[] = ["participante", "organizador", "parceiro"];
  const [segment, setSegment] = useState<SegmentId>("participante");
  const [interests, setInterests] = useState<InterestId[]>(["esportes", "rpg"]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | undefined>(validPlans.includes(planParam as PlanId) ? planParam as PlanId : undefined);
  useEffect(() => { void trackMvpEvent({ event: "page_view" }); }, []);
  return <PageShell><PageIntro eyebrow="Acesso antecipado" title="Sua próxima comunidade começa aqui." description="Entre na lista de espera e acompanhe as novidades do lançamento da Tribes." /><div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6"><WaitlistSection segment={segment} onSegmentChange={setSegment} selectedInterests={interests} onToggleInterest={(interest) => setInterests(current => current.includes(interest) ? current.filter(item => item !== interest) : [...current, interest])} preselectedPlan={selectedPlan} /></div></PageShell>;
}
