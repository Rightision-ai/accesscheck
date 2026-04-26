import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { notFound, redirect } from "next/navigation";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import {
  DFG_BUDGET_TIERS,
  type DfgBudgetGbp,
} from "@/lib/accessibility/cost-estimation/types";
import { loadCostEstimation } from "@/lib/accessibility/cost-estimation/repository";
import CostEstimationDetailView from "./CostEstimationDetailView";
import businessRules from "@/lib/accessibility/lahr/tables/business-rules.json";

type RuleRef = { n: number; cap_band: string; description: string };

function collectRulesByNumber(): Map<number, RuleRef> {
  const map = new Map<number, RuleRef>();
  const sections = (businessRules as { sections: { rules: RuleRef[] }[] }).sections;
  for (const s of sections) {
    for (const r of s.rules) map.set(r.n, r);
  }
  return map;
}

export default async function CostEstimationDetailPage({
  params,
}: {
  params: Promise<{ id: string; budget: string }>;
}) {
  const { id, budget } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const surveyId = Number(id);
  const tierBudget = Number(budget) as DfgBudgetGbp;
  if (!Number.isFinite(surveyId) || !DFG_BUDGET_TIERS.includes(tierBudget)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: survey, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .single();

  if (error || !survey) notFound();

  const costEstimation = await loadCostEstimation(supabase, surveyId);
  const evaluation = classifyLahr(survey);

  const tier = costEstimation?.tiers.find((t) => t.budgetGbp === tierBudget) ?? null;

  const ruleRefs = collectRulesByNumber();
  const ruleLookup: Record<number, { capBand: string; description: string }> = {};
  if (tier) {
    const rulesToLookup = new Set<number>();
    for (const a of tier.adaptations) for (const n of a.addressesRules) rulesToLookup.add(n);
    for (const n of rulesToLookup) {
      const r = ruleRefs.get(n);
      if (r) ruleLookup[n] = { capBand: r.cap_band, description: r.description };
    }
  }

  return (
    <CostEstimationDetailView
      surveyId={surveyId}
      currentBand={evaluation.band}
      tier={tier}
      tierBudget={tierBudget}
      estimation={costEstimation}
      ruleLookup={ruleLookup}
    />
  );
}
