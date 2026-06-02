import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Delete a property and everything cascaded from it (status, evidence, features, listings, items). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS restricts the delete to the owner's own row.
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
