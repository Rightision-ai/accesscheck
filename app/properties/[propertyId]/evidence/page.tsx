import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import PropertyEvidenceClient from './PropertyEvidenceClient';

export default async function PropertyEvidencePage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  return <PropertyEvidenceClient propertyId={propertyId} />;
}
