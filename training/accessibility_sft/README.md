# Accessibility-tag fine-tuning (Gemini SFT on Vertex AI)

Supervised-fine-tune **Gemini 2.5 Flash** to read all of a property's photos and emit the
15 accessibility tags as JSON — a drop-in, cheaper/faster replacement for the zero-shot
Gemini prompts in `app/api/engine/*` and `lib/engine/prompts/*`.

Source data is the human-reviewed `dataset/` produced by `build_training_dataset.py`
(one folder per property: `image-*.jpeg` + `metadata.json`). Labels are **property-level**,
which matches a VLM that takes the whole image set and returns one JSON — so no per-image /
bounding-box annotation is needed.

## Why Vertex AI

Multimodal supervised tuning for Gemini 2.5 runs on **Vertex AI**, and images must be
referenced from **Cloud Storage** (`gs://`). The AI-Studio `generativelanguage` API used by the
app today does not do image tuning. Vertex tuning is serverless (no GPU to provision) and billed
per training token — so it also answers the "compute undecided" question. A self-hosted Gemma-3
LoRA alternative is sketched at the bottom.

## Prerequisites

- A GCP project with the Vertex AI API enabled and a billing account.
- A GCS bucket (e.g. `rightision-sft`).
- `pip install -r requirements.txt`
- Auth: `gcloud auth application-default login` (or a service-account key in
  `GOOGLE_APPLICATION_CREDENTIALS`).

## Pipeline

Run from this directory (the scripts import sibling modules by name).

```bash
cd training/accessibility_sft
export DATASET=~/Projects/Rightision/Code/AccessCheck/Code/accesscheck/dataset
export BUCKET=rightision-sft
export GCS_PREFIX=gs://$BUCKET/properties

# 0. Sanity-check the label schema (stdlib only)
python label_schema.py

# 1. Select trainable properties + stratified property-level split
python select_and_split.py --dataset "$DATASET" --out ./artifacts

# 2. Stage images for the split properties into GCS
python upload_images_gcs.py --dataset "$DATASET" --bucket "$BUCKET" --prefix properties \
  --split-file ./artifacts/splits/train.txt ./artifacts/splits/val.txt ./artifacts/splits/test.txt

# 3. Build tuning JSONL (start with a ~5k subset; oversample rare classes in TRAIN only)
python build_tuning_jsonl.py --dataset "$DATASET" --gcs-prefix "$GCS_PREFIX" \
  --split-file ./artifacts/splits/train.txt --out ./artifacts/train.jsonl \
  --max-images 16 --oversample-rare 4 --limit 5000
python build_tuning_jsonl.py --dataset "$DATASET" --gcs-prefix "$GCS_PREFIX" \
  --split-file ./artifacts/splits/val.txt --out ./artifacts/val.jsonl --max-images 16

# 4. Upload the JSONL to GCS, then launch tuning
gsutil cp ./artifacts/train.jsonl ./artifacts/val.jsonl gs://$BUCKET/jsonl/
python run_tuning.py --project MY_PROJECT --location us-central1 \
  --train gs://$BUCKET/jsonl/train.jsonl --val gs://$BUCKET/jsonl/val.jsonl \
  --base-model gemini-2.5-flash --epochs 2 --display-name accesscheck-tagger-v1

# 5. Evaluate the tuned model AND baselines on the identical test set
python evaluate.py --project MY_PROJECT --location us-central1 --dataset "$DATASET" \
  --split-file ./artifacts/splits/test.txt --gcs-prefix "$GCS_PREFIX" \
  --model <TUNED_MODEL_RESOURCE_NAME> --out ./artifacts/eval_tuned.json
python evaluate.py --project MY_PROJECT --location us-central1 --dataset "$DATASET" \
  --split-file ./artifacts/splits/test.txt --gcs-prefix "$GCS_PREFIX" \
  --model gemini-2.5-flash --out ./artifacts/eval_flash_base.json
python evaluate.py ... --model gemini-2.5-pro --out ./artifacts/eval_pro_base.json
```

`artifacts/` is git-ignored working output (splits, JSONL, eval reports).

## Modules

| file | role |
|------|------|
| `label_schema.py` | 15 tags: canonical enums + `normalize()` that cleans dirty raw values; `unknown` = abstain |
| `prompt.py` | system instruction + user turn, shared by tuning and eval (no train/serve skew) |
| `select_and_split.py` | filter `COMPLETED` + ≥1 image + ≥1 real label; deterministic stratified split by property |
| `build_tuning_jsonl.py` | Vertex SFT JSONL; even image sampling, per-example image cap, rare-class oversampling |
| `upload_images_gcs.py` | idempotent parallel upload of split images to GCS |
| `run_tuning.py` | launch `vertexai.tuning.sft` job |
| `evaluate.py` | per-tag accuracy + macro-F1 + abstention + confusion, over `gold != unknown` |
| `estimate_cost.py` | training-token volume + $ estimate before you commit |
| `audit_nulls.py` | tests the `null → "unknown"` assumption without vision |

## Cost (measured on this dataset)

`estimate_cost.py` at `--max-images 16 --oversample-rare 4 --epochs 2 --img-tokens 516`:

| run | examples | training tokens | @ \$5/1M* |
|-----|----------|-----------------|-----------|
| 5k subset  | ~7,000  | ~99M  | ~\$500   |
| full 11k   | ~16,100 | ~228M | ~\$1,140 |

\*Price is illustrative — pass the current Vertex Gemini-2.5-Flash **tuning** price with
`--price-per-1m`. Levers that cut cost most: `--img-tokens` (downscale photos before upload),
`--max-images`, `--epochs`, `--limit`. **Do the 5k run first**; only scale if the eval justifies it.

## `null` semantics — READ BEFORE TUNING

`audit_nulls.py` (whole dataset) shows nulls are **not** uniform:

- **Entrance / outdoor tags → low "suspicious" %** (entrance_path 3%, balcony 17%, garden 35%):
  when null, the whole group is usually null too → the area wasn't photographed → `null == "unknown"`
  is legitimate. Keep default mode.
- **Bathroom measurement tags → ~99% "suspicious", huge null counts** (shower_dimensions ~8.3k,
  bathroom_door_width ~9.1k): the bathroom was clearly seen but the field is blank. Training these
  as `"unknown"` teaches the model to abstain most of the time. **Use `--omit-unknown`** so blank
  fields are dropped from the target instead of supervised as abstentions.
- Low-null bathroom tags (shower_type, grab_bars, toilet_type) are fine either way.

`--omit-unknown` (on `build_tuning_jsonl.py` **and** `evaluate.py`, and `ENGINE_TAGGER_OMIT_UNKNOWN`
in the app — all three must agree) switches the whole pipeline to "omit what you can't determine"
mode. Recommended given the audit.

## App integration (ready, env-gated, OFF by default)

- `lib/engine/accessibilityTags.ts` — canonical enums + validator, the TS mirror of `label_schema.py`.
- `lib/engine/accessibilityTaggerService.ts` — `tagProperty(images)` calls the tuned model on
  Vertex AI and returns validated tags, or `null` (→ caller keeps the current path). Enable by
  installing `google-auth-library`, `gcloud auth application-default login`, and setting:

  ```
  ENGINE_TAGGER_MODEL=projects/<proj>/locations/us-central1/endpoints/<id>
  ENGINE_TAGGER_PROJECT=<proj>
  ENGINE_TAGGER_LOCATION=us-central1
  ENGINE_TAGGER_OMIT_UNKNOWN=true   # only if tuned with --omit-unknown
  ```

  Do not route the live report path through it until it clears the quality gate below.

## Data facts that shaped the design

- 14,334 `COMPLETED` properties; `FAILED` ones are dropped.
- Severe imbalance (e.g. Grab Bars 13,826 "No" vs 461 installed; Toilet Type 13,731 vs 53 Wash&Dry)
  → `select_and_split.py` forces rare positives into val/test, `build_tuning_jsonl.py` oversamples
  them in train.
- `null` tag = "not assessable from images" → target is `"unknown"`; eval scores only
  `gold != "unknown"` so the model earns no credit for blanket abstaining.
- Dirty vocab (`Step`/`Steps`, `Flat/Flush`/`Flat/No steps`, stray `+ 10 cm`) is folded in
  `label_schema.py`.

## Quality gate before wiring into the app

Tuned Flash must beat untuned Flash on macro-F1 for the learnable tags, and match Pro on
Shower Type / Internal Levels / Hallway Width. Then expose the tuned model behind an
`ENGINE_TAGGER_MODEL` env and route the tag-extraction call to Vertex, keeping the current
prompt path as fallback.

## Self-hosted alternative (Gemma 3 LoRA)

If you'd rather own the weights / avoid per-call cost: reuse steps 1 & 3 (point `--gcs-prefix`
at local paths instead), then LoRA-fine-tune Gemma 3 with TRL/PEFT on a rented or local GPU and
serve it next to `services/detection`. More ops, no managed dependency.
