/**
 * Permanently delete every finalised case, with its stored images.
 *
 * All five foreign keys to `surveys` are ON DELETE CASCADE, so removing a survey also removes
 * its `survey_evidences`, `floor_plan_detections`, `survey_annotations`,
 * `assessment_status_events` and `cost_estimation_plans` (and through those, the adaptation
 * rows). Storage objects do NOT cascade, so they are removed first — while the rows that name
 * them still exist. Deleting the rows first would strand the images with nothing pointing at
 * them.
 *
 * The object path has to be derived from the stored reference. Rows written since the media
 * buckets went private hold a `storage://<bucket>/<path>` reference; older rows still hold the
 * public URL `getPublicUrl` used to return. Either way legacy objects sit at
 * `wizard/<timestamp>-<random>.jpg` with no survey id anywhere in the path — so a prefix-based
 * delete would miss them and the row is the only link between a case and its files.
 *
 * Usage (from the repo root):
 *
 *   npx tsx --env-file=.env.local scripts/purge-complete-cases.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/purge-complete-cases.ts --confirm
 *
 * Flags:
 *   --dry-run     list what would be deleted, delete nothing (default)
 *   --confirm     actually delete — required, because none of this is recoverable
 *   --limit N     stop after N surveys
 *   --org UUID    restrict to one organisation
 *
 * There is no undo. Take a `supabase db dump` first, and note that a database dump does not
 * contain storage objects — deleted images are gone for good.
 */
import { createClient } from "@supabase/supabase-js";
import { parseStorageRef } from "../lib/storage/refs";

type Args = {
  confirm: boolean;
  limit: number | null;
  organisationId: string | null;
};

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const limit = value("--limit");
  return {
    // Opt in, not out: the default of a destructive script should be to do nothing.
    confirm: argv.includes("--confirm"),
    limit: limit ? Number(limit) : null,
    organisationId: value("--org") ?? null,
  };
}

/** Tables holding a storage URL for a survey, and the bucket that URL must live in. */
const IMAGE_SOURCES = [
  { table: "survey_evidences", column: "file_url", bucket: "evidences" },
  { table: "floor_plan_detections", column: "image_url", bucket: "floor-plan-detections" },
] as const;

/**
 * Turn a stored reference into a `bucket`-relative object path.
 *
 * Handles all three shapes the database holds: the canonical `storage://` reference written
 * since the buckets went private, and the legacy public and signed URLs on older rows.
 * Returns null for anything that is not an object in the expected bucket of this project —
 * the harvester stores third-party URLs in adjacent columns, and a stray `data:` URL from an
 * old wizard build would otherwise be handed to `storage.remove()` as a literal path.
 */
export function toStoragePath(rawUrl: string, bucket: string): string | null {
  const ref = parseStorageRef(rawUrl);
  return ref && ref.bucket === bucket ? ref.path : null;
}

/** `storage.remove()` caps at 1000 paths per call. */
const REMOVE_BATCH = 500;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  // Say which database, every time. This script is run against production by hand and the
  // difference between environments is one line in an env file.
  console.log(`Target: ${url}`);
  console.log(args.confirm ? "Mode:   DELETE (--confirm)" : "Mode:   dry run");

  const supabase = createClient(url, serviceKey);

  let query = supabase
    .from("surveys")
    .select("id, status, organisation_id, door_number, street, postcode")
    .eq("status", "complete")
    .order("id", { ascending: true });
  if (args.organisationId) query = query.eq("organisation_id", args.organisationId);
  if (args.limit) query = query.limit(args.limit);

  const { data: surveys, error } = await query;
  if (error) throw new Error(`Failed to list surveys: ${error.message}`);

  const ids = (surveys ?? []).map((survey) => survey.id);
  if (ids.length === 0) {
    console.log("\nNo finalised cases found. Nothing to do.");
    return;
  }

  console.log(`\nFinalised cases to delete: ${ids.length}`);
  for (const survey of surveys ?? []) {
    const address = [survey.door_number, survey.street, survey.postcode]
      .filter(Boolean)
      .join(" ");
    console.log(`  #${survey.id}  ${address || "(no address)"}`);
  }

  // Gather storage paths before anything is deleted.
  const toRemove = new Map<string, string[]>();
  for (const source of IMAGE_SOURCES) {
    const { data, error: readError } = await supabase
      .from(source.table)
      .select(`${source.column}`)
      .in("survey_id", ids);
    if (readError) {
      throw new Error(`Failed to read ${source.table}: ${readError.message}`);
    }

    const paths: string[] = [];
    let unrecognised = 0;
    for (const row of data ?? []) {
      const raw = (row as Record<string, unknown>)[source.column];
      if (typeof raw !== "string") continue;
      const path = toStoragePath(raw, source.bucket);
      if (path) paths.push(path);
      else unrecognised += 1;
    }
    // De-duplicate: `upsert: true` means two rows can name the same object, and removing the
    // same path twice reports a spurious failure on the second attempt.
    toRemove.set(source.bucket, [...new Set(paths)]);
    console.log(
      `  ${source.table}: ${data?.length ?? 0} row(s), ${new Set(paths).size} object(s) in "${source.bucket}"` +
        (unrecognised > 0 ? `, ${unrecognised} URL(s) not in that bucket — left alone` : ""),
    );
  }

  if (!args.confirm) {
    console.log("\nDry run — nothing was deleted. Re-run with --confirm to delete.");
    return;
  }

  // Storage first, while the rows still name the objects.
  let removed = 0;
  for (const [bucket, paths] of toRemove) {
    for (let index = 0; index < paths.length; index += REMOVE_BATCH) {
      const batch = paths.slice(index, index + REMOVE_BATCH);
      const { data, error: removeError } = await supabase.storage.from(bucket).remove(batch);
      if (removeError) {
        // Stop rather than press on: deleting the rows after a failed object delete would
        // strand the images permanently, with nothing left pointing at them.
        throw new Error(
          `Failed to remove objects from "${bucket}": ${removeError.message}. ` +
            `No survey rows have been deleted; fix and re-run.`,
        );
      }
      removed += data?.length ?? 0;
    }
  }
  console.log(`\nRemoved ${removed} storage object(s).`);

  const { error: deleteError } = await supabase.from("surveys").delete().in("id", ids);
  if (deleteError) throw new Error(`Failed to delete surveys: ${deleteError.message}`);

  console.log(`Deleted ${ids.length} survey(s); cascades removed their evidence, detections, annotations, status history and plans.`);
}

// Only when run directly. `toStoragePath` is exported so the path derivation can be checked
// against real URLs without the import kicking off a delete.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
