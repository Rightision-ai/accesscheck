import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import ReportViewClient from './ReportViewClient';
import { mapSurveyToCase } from '@/lib/surveys/mapper';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: survey, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !survey) {
    console.error('Error fetching survey:', error);
    redirect('/');
  }

  const caseData = mapSurveyToCase(survey);

  return <ReportViewClient caseData={caseData} />;
}
