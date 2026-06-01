import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** List the current user's harvest jobs, most recent first. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('harvest_jobs')
    .select('id, original_filename, status, total_properties, processed_count, failed_count, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
