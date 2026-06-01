import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect, notFound } from 'next/navigation';
import JobDetailClient from './JobDetailClient';

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: job } = await supabase
    .from('harvest_jobs')
    .select('id, original_filename, status, total_properties, processed_count, failed_count')
    .eq('id', jobId)
    .single();
  if (!job) notFound();

  return <JobDetailClient jobId={jobId} initialJob={job} />;
}
