import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import ReportViewClient from './ReportViewClient';
import { mapSurveyToCase } from '@/lib/surveys/mapper';
import { loadCostEstimation } from '@/lib/accessibility/cost-estimation/repository';

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

  const caseData = mapSurveyToCase(survey);
  const costEstimation = await loadCostEstimation(supabase, Number(id));

  return <ReportViewClient caseData={caseData} costEstimation={costEstimation} />;
}
