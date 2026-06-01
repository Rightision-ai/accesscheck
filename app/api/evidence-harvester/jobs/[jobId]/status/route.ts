import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Current job progress — polled by the job-detail UI. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('harvest_jobs')
    .select('id, status, total_properties, processed_count, failed_count, job_status')
    .eq('id', jobId)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json(data);
}
