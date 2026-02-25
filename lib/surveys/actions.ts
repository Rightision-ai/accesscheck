'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { buildSurveyData } from './buildSurveyData';

export async function saveSurvey(caseData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const wizardData = caseData.mlData?.wizardData || {};
  const overrides = caseData.mlData?.userOverrides || {};
  const rawAhr = caseData.mlData?.rawAhr || {};

  const surveyData = buildSurveyData(wizardData, overrides, rawAhr, caseData, user.id);

  // Check if we are updating an existing real record (numeric ID)
  // The wizard uses temporary IDs like "H-..." which should be treated as new inserts
  const isExistingRecord = caseData.id && !isNaN(Number(caseData.id));

  let error;
  let newId = caseData.id;

  if (isExistingRecord) {
    const { error: updateError } = await supabase
      .from('surveys')
      .update(surveyData as any)
      .eq('id', Number(caseData.id));
    error = updateError;
  } else {
    // For new records, we insert and select to get the generated ID
    const { data: insertedData, error: insertError } = await supabase
      .from('surveys')
      .insert(surveyData as any)
      .select('id')
      .single();

    if (insertedData) {
      newId = insertedData.id.toString();
    }
    error = insertError;
  }

  if (error) {
    console.error('Error saving survey:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true, id: newId };
}

/**
 * Delete a survey (case/assessment) by id. Only the owning user can delete (enforced by RLS).
 */
export async function deleteSurvey(caseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const surveyId = parseInt(caseId, 10);
  if (Number.isNaN(surveyId)) return { error: 'Invalid case ID' };

  const { error } = await supabase
    .from('surveys')
    .delete()
    .eq('id', surveyId);

  if (error) {
    console.error('Error deleting survey:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
