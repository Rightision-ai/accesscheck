# LAHR tables

Source: **London Accessible Housing Register — A good practice guide for social housing landlords** (Royal Borough of Kensington and Chelsea / GLA, 2011). The PDF is at [`public/lahr_good_practice_guide_2011.pdf`](../../../../public/lahr_good_practice_guide_2011.pdf).

These JSON files are the single source of truth for every LAHR threshold, band definition, and business rule used by the app. Criterion evaluators and the band classifier read from these files — there are no magic numbers elsewhere.

## Files

| File | Source in PDF | What it contains |
|---|---|---|
| [`band-definitions.json`](./band-definitions.json) | pp. 18-20 and p. 28 (Overall Property Categorisation) | The seven LAHR bands (A, B, C, D, E, E+, F, G) with labels, design-standard references, and the aggregation rule (lowest band wins; G overrides). |
| [`comparison-table.json`](./comparison-table.json) | Appendix 1, pp. 24-26 | Per-band design-feature thresholds: ramp gradients, lift counts, door widths, step counts, threshold heights, corridor widths, two-storey requirements, wheelchair storage, toilet transfer space, bathroom features, turning circles. |
| [`business-rules.json`](./business-rules.json) | Appendix 2, pp. 27-41 (plus assessor notes on p. 42) | All 110 numbered business rules. Each has a natural-language description, a logical condition, and the cap band it applies when true. Grouped into 14 sections matching the PDF. |
| [`field-mapping.json`](./field-mapping.json) | Mapping to our schema | Maps the LAHR variable names (`CommunalRampGradient`, `HallwayHead`, etc.) to columns in the Supabase `surveys` table. Used by the evaluators to read values out of `surveys` and by the question graph to write answers back. |

## Raw extraction

Running `pdftotext -layout` on the PDF produced [`../raw/full.txt`](../raw/full.txt) and [`../raw/categories_and_rules.txt`](../raw/categories_and_rules.txt). These are kept for audit so the JSON can be re-derived if the source PDF is updated.

## Review notes

The extraction is from a 2011 PDF built with Adobe InDesign. During transcription the following corrections were applied (see `$source` hints in each JSON):

- **Rule 29.** The PDF prose says "77.5cm or wider" but the machine-readable condition is `PropertyFrontDoorWidth < 75`. JSON preserves the condition verbatim; the text notes the discrepancy.
- **Rule 45.** The bracketed logic around essential facilities in the PDF uses ambiguous curly braces; translated to a single boolean expression using "must have at least one bedroom AND at least one WC facility AND living room AND kitchen on the access level".
- **Rule 59.** Uses 100cm / 70cm bounds where rules 57/58 use 120cm / 70cm — preserved as-is.
- **Rule 70.** The PDF references `PropertyEntranceLevel` then notes "should be `PropertyEntryLevel`" — we use `PropertyEntryLevel` throughout.
- **Rule 89, 90, 106, 107, 108.** G-series rules are only evaluated if none of the STOP NOWs prior have triggered — encoded directly in the condition.
- **Gradient encoding.** LAHR uses ratio notation (e.g. 1:12). Stored as a percentage-style number using `100 / ratio_denominator`, so `1:12 == 8.33`, `1:10 == 10`, `1:15 == 6.66`, `1:20 == 5`. This matches the numeric comparisons used in the PDF rules.
- **Units.** LAHR uses cm throughout Appendix 2. We preserve cm in the business rules JSON. The comparison table uses mm (as the PDF does) — the criterion evaluators convert when needed.

## Updating

If a new LAHR revision supersedes the 2011 guide:

1. Drop the new PDF into `public/`.
2. Regenerate [`../raw/full.txt`](../raw/full.txt) with `pdftotext -layout`.
3. Update the JSONs, bump a `version` field at the top of each, and re-review against the new page numbers.
4. Unit tests on `lib/accessibility/lahr/criteria/*.ts` are the safety net — they must still pass.
