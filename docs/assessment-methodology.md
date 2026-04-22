# Assessment methodology — Homingo LAHR pipeline

**Audience:** occupational therapists, housing caseworkers, internal assessors.
**Scope:** how Homingo goes from uploaded floor plans + photos to a LAHR band with defensible evidence.

---

## 1. What we assess and why

The output is a **LAHR band** (A → F, plus G = not assessed) as defined in the *London Accessible Housing Register Good Practice Guide 2011*. LAHR aggregates three earlier standards:

| Band | Standard | Short description |
|---|---|---|
| A | Wheelchair Housing Design Guide (2nd ed. 2006) | Fully wheelchair-accessible throughout |
| B | Housing Corporation SDS | Wheelchair-accessible to essential rooms |
| C | Lifetime Homes (JRF) | Level approach, wide doorways, stair-lift-ready |
| D | Mobility Standard / Part M (2000) | Level approach, wider doors, more space |
| E | Step-free | No published guide; level throughout |
| E+ | Minimal steps | ≤ 4 steps to the front door |
| F | General needs | Doesn't meet the above |
| G | Not assessed | Data incomplete — fill gaps to get a band |

The band assignment comes from the LAHR business rules in
`lib/accessibility/lahr/tables/business-rules.json` — 110 rules across seven
sections. The aggregation algorithm follows p.28 of the guide verbatim
(see [lib/accessibility/lahr/classifier.ts](lib/accessibility/lahr/classifier.ts)).

---

## 2. The detection pipeline

The goal is to fill the survey form with values the assessor can defend with
on-image evidence. The pipeline has three stages.

### 2.1 Floor plan — YOLOv8-seg + SAM + PaddleOCR

1. **YOLOv8-seg** (trained on CubiCasa5K) produces room polygons and fixture
   boxes: living room, kitchen, bathroom, WC, bedrooms, hallway, stairs, lift,
   doors, windows, external doors.
2. **SAM** refines each room polygon so area and turning-circle fits are
   measured against the true wall line, not the YOLO bounding box.
3. **PaddleOCR** extracts every text box. A regex pass classifies each as a
   dimension (`"800"`, `"762 mm"`, `"2.4 m"`), a room label, or a scale
   (`"1:50"`). Dimension-to-wall-segment matching uses RANSAC to fit
   pixels-per-mm; door and hallway widths then land on the form as
   `source: "ocr"` values.

What the pipeline **can** tell us: which rooms are on the access level, door
widths where a dimension is drawn on the door, stair presence and rough width,
whether a lift is drawn.

What it **cannot**: anything that needs a site visit — floor-surface grip,
lighting, socket heights, whether a handrail feels stable.

### 2.2 Photos — YOLOv8

Trained on a mix of Open Images V7, ADE20K, and Roboflow Universe sets, plus a
small internal set for rare classes. Detects: grab rail, handrail, stairlift,
through-floor lift, level-access shower, shower-over-bath, bathtub, WC, basin,
ramp, threshold step.

Low-confidence detections render with a **dashed bounding box** in the report —
that is your cue to review and override.

### 2.3 Gemini as fallback reasoner

Gemini no longer estimates measurements. It is used only to:

- Narrate findings and rationale for the report prose.
- Label rooms that YOLO returned as unlabelled polygons.
- Fill fields the CV stack left unknown — stamped `source: "llm"` so you can
  see at a glance which numbers came from an LLM guess.

---

## 3. The criterion set

Every criterion maps to a LAHR rule. The full list is machine-generated from
`lib/accessibility/lahr/tables/business-rules.json` — so this table can never
drift from the code.

Each row in the appendix table in the report shows:

- **Section** — which LAHR section (main access, internal circulation, etc.).
- **Cap** — the worst band this section can produce on its own.
- **Status** — pass / partial / fail / unknown.
- **Triggered rules** — expand to see the rule number, description, and the
  band it caps at.

A criterion with status `unknown` means one or more inputs were null. That is
always an opportunity to improve the band by filling the gap — the classifier
returns **G (Not assessed)** if a G-series gap remains.

---

## 4. LAHR band scale

See [lib/accessibility/lahr/tables/band-definitions.json](lib/accessibility/lahr/tables/band-definitions.json).
That JSON is the single source of truth; the legend in the report is rendered
directly from it.

Aggregation rule (p.28):

1. Within each section, the **lowest** qualifying band wins (i.e. the worst
   value is the section category).
2. Compare the **highest** of *main-access category* and *second-exit category*
   — if the property has a second exit to the street — to get the **easiest
   access category**.
3. Compare *easiest access* with the remaining section categories; the lowest
   wins and becomes the **overall property category**.
4. If any G rule triggered anywhere, the overall category is G.

---

## 5. How to read and override the report

### Source chips

Every field has a source chip:

| Chip | Meaning |
|---|---|
| `ocr` | Read from dimension text on the floor plan |
| `yolo` | Detected from object segmentation |
| `sam` | Mask-refined measurement |
| `user` | Typed by the assessor in the wizard or via override |
| `llm` | Gemini best guess — always review |

Confidence appears as a percentage next to the chip. Anything under 60% is
shown dashed — please verify.

### Overrides

Click any field value to edit it. Overrides persist to
`surveys.ai_field_provenance` so a later reviewer can see that you changed it,
from what, to what, and when.

### Annotated images

Hovering a detection box in the floor plan or a photo highlights the linked
form field (and vice versa). Click a detection to jump the report to that
field. This is what makes the report defensible — every number traces back to
a pixel on an image.

---

## 6. Assessor checklist — things the CV stack cannot cover

These need a site visit, a photo set with the right angles, or a measuring
tape:

- **Floor surface grip** — bathroom, kitchen, ramp approach.
- **Lighting** — is the entrance lit, are corridors bright enough.
- **Socket and switch heights** — not captured by any current detector.
- **Handrail stability** — visible in photos, but "feels solid" is
  assessor-only.
- **Clutter / storage state** — a 1200 mm hallway full of shoes is a 600 mm
  hallway in practice.
- **Behaviour of adaptations** — does the stair lift actually work.
- **Condition** — damp, draughts, window operation, door closers.

When these matter, use the "Assessor notes" section of the report.

---

## 7. Limitations

- **Scale-bar-free plans.** Without a dimension annotation or a `1:n` scale
  marker, OCR cannot calibrate pixels-per-mm and measurements are returned as
  unknown.
- **Low-resolution photos.** Below roughly 800 px on the short edge, fixture
  detection recall drops sharply.
- **Unusual stair geometries.** Spiral and irregular winders are classified
  conservatively — expect the wizard to ask follow-up questions.
- **HMOs.** The pipeline assumes a single dwelling per plan; multi-dwelling
  conversions need manual sectioning.
- **Stairlift / through-floor lift.** Public training data is thin. Until the
  internal labelled set grows, these detections are low-confidence by default.

---

## 8. Versioning

- The LAHR JSON files are versioned via git. A change to `business-rules.json`
  produces a new band classification in the next deploy.
- This document is generated from the same JSON the runtime uses — sections 3
  and 4 will always match what the classifier is actually doing.
- A band cached in Supabase from before a rule change is **not** retroactively
  re-classified; re-running the report regenerates it.

---

## 9. Where things live

| Concern | Path |
|---|---|
| LAHR rule tables | [lib/accessibility/lahr/tables/](../lib/accessibility/lahr/tables/) |
| Rule evaluator | [lib/accessibility/lahr/evaluator.ts](../lib/accessibility/lahr/evaluator.ts) |
| Classifier | [lib/accessibility/lahr/classifier.ts](../lib/accessibility/lahr/classifier.ts) |
| Detection TypeScript types | [lib/detection/types.ts](../lib/detection/types.ts) |
| Detection service (Python) | [services/detection/](../services/detection/) |
| Deployment guide | [services/detection/DEPLOY.md](../services/detection/DEPLOY.md) |
| Dynamic wizard graph | [lib/wizard/questionGraph.ts](../lib/wizard/questionGraph.ts) |
| Report LAHR appendix | [app/components/report/LahrAppendix.tsx](../app/components/report/LahrAppendix.tsx) |
| Annotated image component | [app/components/report/AnnotatedImage.tsx](../app/components/report/AnnotatedImage.tsx) |
