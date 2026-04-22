# Run the detection-v2 pipeline locally

End-to-end setup for the new LAHR-driven flow: YOLOv8 + SAM + PaddleOCR detection service, Next.js app with the v2 feature flag on, Supabase migration applied.

## 0. What v2 changes

- Wizard: steps 5–8 (Property / Circulation / Facilities / Safety) collapse into a single dynamic follow-up step driven by [lib/wizard/questionGraph.ts](../lib/wizard/questionGraph.ts).
- Detection runs after Smart Capture — fires against already-uploaded URLs.
- Report: LAHR appendix at the top ([LahrAppendix.tsx](../app/components/report/LahrAppendix.tsx)) with band badge, section results, and annotated images.
- Classifier: [classifyLahr](../lib/accessibility/lahr/classifier.ts) runs in [buildSurveyData](../lib/surveys/buildSurveyData.ts) and writes `raw_ai_data.lahr` + `ai_field_provenance`.
- v1 code paths (flowchart, AccessibilityBadge, old steps) stay live — flag-gated.

## 1. Prereqs

- Node 20+, pnpm (or npm)
- Python 3.11
- Docker (optional — only if you want to run the detection service in a container)
- Supabase CLI (`brew install supabase/tap/supabase`) if you want to apply the migration locally

## 2. Clone + install

```bash
git clone <repo>
cd homingo-ot-2
pnpm install
cp .env.example .env.local
```

## 3. Apply the Supabase migration

The v2 classifier reads three new ramp-type columns and writes provenance into a new JSONB column; the report reads from a new `survey_annotations` table.

```bash
supabase link --project-ref <your-project>
supabase db push   # applies supabase/migrations/20260420120000_add_lahr_detection_fields.sql
```

Or paste the migration SQL into the Supabase SQL editor.

After migration, regenerate the TypeScript types so the new columns show up:

```bash
supabase gen types typescript --project-id <ref> > types/supabase.ts
```

## 4. Run the detection service (local CPU)

Cold-start the Python service first so the Next app has something to call. Works without model weights — it returns empty detections + a warning, which is enough to smoke-test the full wizard + report flow.

```bash
cd services/detection
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install --no-deps git+https://github.com/facebookresearch/segment-anything.git

export HOMINGO_SERVICE_TOKEN=dev-local-secret
uvicorn app.main:app --reload --port 8080
```

Sanity check:

```bash
curl -s http://localhost:8080/health
# {"ok": true, "models": {"floorplan": false, "photo": false, "sam": false, "ocr": true}}
```

(Models=false is fine — you haven't put weights in `services/detection/weights/`. OCR works without weights.)

### Optional: add weights

Drop fine-tuned weights into `services/detection/weights/`:

```
floorplan.pt    # YOLOv8-seg on CubiCasa5K
photos.pt       # YOLOv8 on Open Images + ADE20K + Roboflow
sam_vit_h.pth   # SAM ViT-H (official Facebook checkpoint)
```

See [services/detection/README.md](../services/detection/README.md) for training recipes.

## 5. Configure the Next app for v2

Edit `.env.local`:

```bash
# Existing Supabase + Gemini keys stay as-is.

# v2 toggle
NEXT_PUBLIC_DETECTION_V2=true

# Detection backend — "fastapi" points at your local service
DETECTION_PROVIDER=fastapi
DETECTION_BASE_URL=http://localhost:8080
DETECTION_BEARER_TOKEN=dev-local-secret   # must match HOMINGO_SERVICE_TOKEN from step 4
```

For Replicate instead of local FastAPI:

```bash
DETECTION_PROVIDER=replicate
REPLICATE_API_TOKEN=r8_xxx
REPLICATE_MODEL_VERSION=<cog-deployed-version-hash>
```

## 6. Start the Next app

```bash
pnpm dev
```

Visit http://localhost:3000 and open the wizard from the dashboard.

## 7. Verify the v2 flow

You should see:

1. **Progress bar shows 6 steps** (Client → Units → Plan → Capture → Follow-ups → Analysis) — not 9. That confirms the flag is on.
2. Upload a floor plan in step 3 and a few evidence photos in step 4, then click **Analyze Photos** (v1 Gemini path still runs for now — harmless, just slower).
3. Click **Continue** from Capture. The button label flips to **Detecting…** while the detection service runs. With no weights this returns in < 1s.
4. Step 5 shows the dynamic follow-ups. With empty detection you'll see `0 follow-ups remaining` and a **Continue to report** button — the graph only asks questions when detection surfaces ambiguity.
5. The final step generates the AI narrative report. Open it — the LAHR appendix should appear at the top with a band badge (probably **G — Not Assessed** until you fill the form).

### Known-good smoke test with no weights

- Wizard runs end-to-end.
- LAHR classifier returns `G` (gaps in the G-series rules, by design).
- Appendix table populates — click a row to expand triggered rules.

### With weights + a real UK-style floor plan

- Room polygons and door widths show in the annotated image.
- Dynamic wizard skips questions that detection already answered.
- LAHR band converges on A–F depending on detected geometry.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Wizard still shows 9 steps | `NEXT_PUBLIC_DETECTION_V2` wasn't set before `pnpm dev` started. Stop, re-export, restart. Next.js inlines `NEXT_PUBLIC_*` at build/dev start. |
| `503 Detection v2 disabled` from `/api/detect/*` | Same — flag isn't on in the server runtime. |
| `401` on `/api/detect/*` → backend | `DETECTION_BEARER_TOKEN` doesn't match `HOMINGO_SERVICE_TOKEN`. |
| `ECONNREFUSED 127.0.0.1:8080` | Detection service isn't running. Start it (step 4). |
| LAHR appendix says **G — Not Assessed** forever | Expected when required fields are null. Check the Gaps tab or fill the form — band recomputes on save. |
| TypeScript errors on `communal_ramp_type` etc. | Regenerate Supabase types (step 3 last command). |
| OCR slow on first call | PaddleOCR downloads its own weights on first use (~200 MB). Cache once, subsequent calls are fast. |
| Report renders but no annotations on images | `survey_annotations` table is empty. The detection service emits annotation payloads; persisting them to Supabase is wired up but requires the new migration — make sure step 3 ran. |

## 9. Toggling back to v1

```bash
# In .env.local
NEXT_PUBLIC_DETECTION_V2=false
```

Restart the dev server. Nothing else to do — the v1 code paths stayed intact.

## 10. Cheat sheet

```bash
# Terminal 1 — detection service
cd services/detection && source .venv/bin/activate
HOMINGO_SERVICE_TOKEN=dev-local-secret uvicorn app.main:app --reload --port 8080

# Terminal 2 — Next app
pnpm dev

# Health check
curl -s localhost:8080/health | jq
curl -s -X POST localhost:3000/api/detect/floor-plan \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://picsum.photos/800/600"}' | jq
```

## Related docs

- [services/detection/README.md](../services/detection/README.md) — detection service internals, training.
- [services/detection/DEPLOY.md](../services/detection/DEPLOY.md) — production deployment (Replicate, Modal, AWS, Azure).
- [docs/assessment-methodology.md](./assessment-methodology.md) — OT/caseworker-facing pipeline explanation.
