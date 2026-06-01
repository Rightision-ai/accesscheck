import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRentalProviderConfigured } from '@/lib/evidence-harvester/listingHistoryService';

/** Full evidence profile for a property: identity, sources, features, listings, status + mapping. */
export async function GET(_req: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();
  if (error || !property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const [{ data: sources }, { data: features }, { data: listings }, { data: status }] = await Promise.all([
    supabase.from('evidence_sources').select('*').eq('property_id', propertyId).order('created_at', { ascending: true }),
    supabase.from('property_features').select('*').eq('property_id', propertyId),
    supabase.from('property_listings').select('*').eq('property_id', propertyId).order('event_date', { ascending: false }),
    supabase.from('property_assessment_status').select('*').eq('property_id', propertyId).maybeSingle(),
  ]);

  // Sign the private image paths so the page can display them.
  const sign = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from('property-images').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };
  const [streetViewImageUrl, mapImageUrl] = await Promise.all([
    sign(property.street_view_image_path),
    sign(property.map_image_path),
  ]);

  return NextResponse.json({
    property,
    evidence_sources: sources ?? [],
    features: features ?? [],
    listings: listings ?? [],
    assessment_status: status ?? null,
    rental_provider_configured: isRentalProviderConfigured(),
    street_view_image_url: streetViewImageUrl,
    map_image_url: mapImageUrl,
    google_maps_key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null,
  });
}
