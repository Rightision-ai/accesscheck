# Adaptation Plans — delivery roadmap

Spec: [`.claude/AccessCheck_Adaptation_Plans_Spec.md`](../.claude/AccessCheck_Adaptation_Plans_Spec.md) (§11 defines the phasing).

This file records what has shipped and what each remaining phase involves, with the code paths
that constrain it. It exists so the sequencing survives outside a planning session.

---

## Phase 1 — credibility · **shipped**

The plan is no longer three budget-shaped guesses repaired after the fact.

- **Candidate pool, not per-tier generation.** One engine call returns every feasible adaptation
  with no budget framing; the three DFG tiers are then selected deterministically by
  [`lib/adaptation-plans/selector.ts`](../lib/adaptation-plans/selector.ts). Cumulativity and band
  monotonicity are structural — `enforceCumulativeTiers()`, the tier-collapse fallback and the
  band-regression guard are gone.
- **Cost ranges** (`CostRange`) replacing point estimates, and a seeded built-in **schedule of rates**
  ([`lib/rate-cards/`](../lib/rate-cards/)) so every price has provenance.
- **Per-line confidence** and a "verify on site" flag, replacing the plan-level bar.
- **Engine model registry** ([`lib/engine/models.ts`](../lib/engine/models.ts)) — one place to
  choose a model, with a per-task env override.

Three defects fixed along the way: the band-source mismatch (the API classified the raw DB row
while every UI surface classified a rebuilt one), the prompt's contradictory patch whitelist, and
three patch keys the classifier never read.

## Phase 1.5 — custom schedules of rates · **in progress**

Upload, versioning and use of an authority's own schedule of rates; plus locking plan
regeneration on a completed case. Pulled forward out of Phase 2 because pricing provenance is
worth little if every authority is stuck on AccessCheck estimation figures.

---

## Phase 2 — the professional in the loop

- **Editable lines** — add, remove, re-quantify, re-price, annotate. `adaptation_plan_lines.source`
  (`ai_suggested | professional_amended | professional_added`) already exists for this; no
  migration needed to start.
- **Free-text justification** captured on amendment.
- **Plan states** `draft → under review → approved → issued → works complete`, following the
  `surveys.status` pattern: a DB CHECK plus a trigger plus the TypeScript mirror in
  [`lib/assessments/workflow.ts`](../lib/assessments/workflow.ts), whose doc comment says to change
  both together.
- **Immutable audit trail**, modelled on `assessment_status_events`.
- **Versioned digital sign-off**, extending the surveyor signature block already rendered in
  `ReportView`.
- **Standalone exports** — schedule of works and DFG pack first. The CSV route at
  `app/api/evidence-harvester/jobs/[jobId]/export/route.ts` is the existing precedent.

## Phase 3 — the person

- **Occupant needs profile** as a new wizard step, inserted after Safety and before Analysis.
  Note every downstream branch in `AssessmentWizard.tsx` compares `step` to numeric literals, so
  replace the `step === 8` special cases with a named constant *before* inserting anything.
- **Needs-led objective function** swapped into `selectTiers` — it already takes
  `budgets: readonly number[]`, so arbitrary budgets are a call-site change, not a refactor.
- **Dual-mode view**: "for this occupant" vs "for general re-let".
- **Interactive budget scenario** — cheap once the candidate pool is persisted, since
  `classifyLahr` is pure and already runs client-side.

Settle spec §12 Q2 first: is the profile attached to the case, or to a person who may be matched
to several properties? The latter is required for waiting-list matching in Phase 4.

## Phase 4 — the portfolio

- **Options appraisal** — adapt in situ / transfer / transfer plus light adaptation / do nothing,
  with candidate properties drawn from the authority's own banded stock.
- **Then** property value context — Price Paid indexed on UK HPI, LSOA median fallback, authority
  override — as a proportionality flag only, never a decision rule.
- **Portfolio roll-up**, **waiting-list matching**, and **actual-cost feedback** into the schedule of rates.

The spec is explicit that the appraisal comes **before** the valuation: the appraisal works
entirely on the customer's own data and delivers the differentiating answer on its own, whereas
starting with valuation spends the first sprint on address matching.
