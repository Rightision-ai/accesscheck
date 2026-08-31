import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import ReportViewClient from './ReportViewClient';
import { mapSurveyToCase } from '@/lib/surveys/mapper';
import { loadAdaptationPlanSet } from '@/lib/adaptation-plans/repository';
import { loadActiveRateCardRef } from '@/lib/rate-cards/repository';
import { signStorageRefsDeep } from '@/lib/storage/signing';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: survey, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', Number(id))
    .single();

  if (error || !survey) {
    console.error('Error fetching survey:', error);
    redirect('/dashboard');
  }

  // The survey was loaded through the RLS-scoped client above, so reaching here
  // means the viewer may see it — only then are its private media refs signed.
  const caseData = await signStorageRefsDeep(mapSurveyToCase(survey));
  const costEstimation = await loadAdaptationPlanSet(supabase, Number(id));
  const activeRateCard = survey.organisation_id
    ? await loadActiveRateCardRef(supabase, survey.organisation_id)
    : null;

  return <ReportViewClient caseData={caseData} costEstimation={costEstimation} activeRateCard={activeRateCard} />;
}
