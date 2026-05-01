import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { Case } from '@/types/dashboard';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: surveys, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching surveys:', error);
    // Handle error gracefully or redirect
  }

  const cases: Case[] = (surveys || []).map((s: any) => ({
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
    thumbnail: s.thumbnail_url || '',
    evidence: s.raw_ai_data?.evidence || [], 
    description: s.comments || '',
    mlData: s.raw_ai_data || {}
  }));

  // If no cases, we can use mockCases for demo if needed, but better to show empty state handled by DashboardClient
  // The Dashboard component handles empty state.

  return <DashboardClient user={{ name: user.email || 'User', role: 'OT' }} initialCases={cases} />;
}
