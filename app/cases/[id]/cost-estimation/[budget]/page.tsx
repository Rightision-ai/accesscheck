import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { notFound, redirect } from "next/navigation";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import {
  DFG_BUDGET_TIERS,
  type DfgBudgetGbp,
} from "@/lib/adaptation-plans/types";
import { loadAdaptationPlanSet } from "@/lib/adaptation-plans/repository";
import CostEstimationDetailView from "./CostEstimationDetailView";
import businessRules from "@/lib/accessibility/lahr/tables/business-rules.json";
import { resolveSurveyRowFromDb } from "@/lib/surveys/resolveSurveyRow";

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

  const planSet = await loadAdaptationPlanSet(supabase, surveyId);

  const evaluation = classifyLahr(resolveSurveyRowFromDb(survey));

  const tier = planSet?.tiers.find((t) => t.budgetGbp === tierBudget) ?? null;

  const ruleRefs = collectRulesByNumber();
  const ruleLookup: Record<number, { capBand: string; description: string }> = {};
  if (tier) {
    const rulesToLookup = new Set<number>();
    for (const line of tier.lines) for (const n of line.addressesRules) rulesToLookup.add(n);
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
      planSet={planSet}
      ruleLookup={ruleLookup}
    />
  );
}
