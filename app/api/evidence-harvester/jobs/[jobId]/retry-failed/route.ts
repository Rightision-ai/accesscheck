import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { retryFailedItems, runJobBatch } from '@/lib/evidence-harvester/harvestJobService';

export const maxDuration = 300;

/** Re-queue failed items and kick off processing again. */
export async function POST(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: job } = await supabase.from('harvest_jobs').select('id').eq('id', jobId).single();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const service = createServiceClient();
  const requeued = await retryFailedItems(service, jobId);

  after(async () => {
    try {
      await runJobBatch(service, jobId);
    } catch (err) {
      console.error(`[evidence-harvester] retry batch failed for job ${jobId}:`, (err as Error).message);
    }
  });

  return NextResponse.json({ status: 'running', requeued }, { status: 202 });
}
