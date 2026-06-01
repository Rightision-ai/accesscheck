import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { runJobBatch } from '@/lib/evidence-harvester/harvestJobService';

// Pro Fluid honours up to 300s; one batch of HARVEST_BATCH_SIZE items must fit inside this.
export const maxDuration = 300;

/**
 * Start (or continue) a harvest job. Returns 202 immediately and processes one batch of pending
 * items in the background via after(). The client re-POSTs to drive subsequent batches until the
 * job reports a terminal status — keeping each invocation under the platform time limit.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Authorize: the job must belong to this user (RLS-scoped read).
  const { data: job } = await supabase
    .from('harvest_jobs')
    .select('id, status')
    .eq('id', jobId)
    .single();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  await supabase.from('harvest_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId);

  after(async () => {
    const service = createServiceClient();
    try {
      await runJobBatch(service, jobId);
    } catch (err) {
      console.error(`[evidence-harvester] batch failed for job ${jobId}:`, (err as Error).message);
      await service.from('harvest_jobs').update({
        status: 'failed',
        job_status: { status: 'failed', startedAt: '', error: (err as Error).message?.slice(0, 500) } as never,
      }).eq('id', jobId);
    }
  });

  return NextResponse.json({ status: 'running', jobId }, { status: 202 });
}
