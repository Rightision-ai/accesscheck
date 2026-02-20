'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveSurvey(caseData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: 'Not authenticated' };

  // Map caseData to survey
  const wizardData = caseData.mlData?.wizardData || {};

  const surveyData = {
    user_id: user.id, // REQUIRED for RLS and table constraint
    inspector_name: user.email, // OT Name
    inspection_date: caseData.assessmentDate || new Date().toISOString(),
    
    // Address components
    door_number: wizardData.doorNo || '',
    street_number: wizardData.streetNo || '',
    building_name: wizardData.buildingName || '',
    street: wizardData.street || caseData.address || '',
    postcode: wizardData.postcode || caseData.postcode || '',
    
    // AI & Status
    compliance_score: caseData.aiScore,
    status: caseData.status,
    thumbnail_url: caseData.thumbnail,
    raw_ai_data: caseData.mlData, // Stores full JSON including applicantName
    comments: caseData.description,
    overall_grade: caseData.mlData?.aiReport?.Grade,
    ai_confidence: 0.9 // Default confidence
  };

  // Check if we are updating an existing real record (numeric ID)
  // The wizard uses temporary IDs like "H-..." which should be treated as new inserts
  const isExistingRecord = caseData.id && !isNaN(Number(caseData.id));

  let error;
  let newId = caseData.id;

  if (isExistingRecord) {
    const { error: updateError } = await supabase
      .from('surveys')
      .update(surveyData)
      .eq('id', Number(caseData.id));
    error = updateError;
  } else {
    // For new records, we insert and select to get the generated ID
    const { data: insertedData, error: insertError } = await supabase
      .from('surveys')
      .insert(surveyData)
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
