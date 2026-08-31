import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import ValidationInterfaceClient from './ValidationInterfaceClient';
import { mapSurveyToCase } from '@/lib/surveys/mapper';
import { signStorageRefsDeep } from '@/lib/storage/signing';

export default async function ValidatePage({ params }: { params: Promise<{ id: string }> }) {
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

  return <ValidationInterfaceClient caseData={caseData} user={{ name: user.email || 'User', role: 'OT' }} />;
}
