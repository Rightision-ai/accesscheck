import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCsv, createJobWithProperties } from '@/lib/evidence-harvester/harvestJobService';
import type { ColumnMapping } from '@/lib/evidence-harvester/types';

export const maxDuration = 60;

/**
 * Create a harvest job from a CSV the client already uploaded to the private bucket.
 * Body: { file_path, original_filename, column_mapping }.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const filePath: string | undefined = body?.file_path;
  const mapping: ColumnMapping | undefined = body?.column_mapping;
  const originalFilename: string = body?.original_filename ?? 'upload.csv';

  if (!filePath || !mapping?.address || !mapping?.postcode) {
    return NextResponse.json(
      { error: 'file_path and a column_mapping with address + postcode are required.' },
      { status: 400 },
    );
  }

  // Read the CSV back from the user's own private folder (RLS-scoped).
  const { data: file, error: dlErr } = await supabase.storage
    .from('property-csv-uploads')
    .download(filePath);
  if (dlErr || !file) {
    return NextResponse.json({ error: `Could not read uploaded file: ${dlErr?.message}` }, { status: 400 });
  }

  const csvText = await file.text();
  const rows = parseCsv(csvText, mapping);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data rows found in CSV.' }, { status: 400 });
  }

  try {
    const { jobId, total } = await createJobWithProperties(supabase, {
      userId: user.id,
      filePath,
      originalFilename,
      mapping,
      rows,
    });
    return NextResponse.json({ jobId, total, status: 'queued' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
