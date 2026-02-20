import { Case } from '@/types/dashboard';

export function mapSurveyToCase(s: any): Case {
  return {
    id: s.id.toString(),
    applicantName: s.inspector_name || 'Unknown',
    address: [s.door_number, s.street_number, s.building_name, s.street].filter(Boolean).join(' ') || 'Address Pending',
    city: s.city || '', 
    postcode: s.postcode || '',
    assessmentDate: s.inspection_date || s.created_at,
    aiScore: s.compliance_score ? Number(s.compliance_score) : null,
    status: s.status || 'Draft',
    source: 'AI Assessment',
    date: s.created_at,
    thumbnail: s.thumbnail_url || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80',
    evidence: s.raw_ai_data?.evidence || s.raw_ai_data?.photos || s.raw_ai_data?.wizardData?.photos || [], 
    description: s.comments || '',
    mlData: s.raw_ai_data || {}
  };
}
