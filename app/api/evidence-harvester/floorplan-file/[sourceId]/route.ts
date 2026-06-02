import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Streams a planning-portal document. Idox (and similar) serve /files/ URLs only within an active
// portal session, so a cold direct link 404s. We re-establish the session by first fetching the
// application's documents page (to obtain its cookie), then fetch the file with that cookie.
export const runtime = 'nodejs';
export const maxDuration = 60;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Only proxy council planning-portal URLs (these are the only URLs we ever store) — guards against SSRF.
const ALLOWED = /\/online-applications\/|\/PlanningExplorer\/|\/Northgate\/|\/generic\//i;

function isPortalUrl(u: string | null): u is string {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && ALLOWED.test(u);
  } catch {
    return false;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: source } = await supabase
    .from('evidence_sources')
    .select('source_url, raw_metadata_json')
    .eq('id', sourceId)
    .eq('source_type', 'planning_portal')
    .single();
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fileUrl = source.source_url;
  const docsUrl = (source.raw_metadata_json as { docs_url?: string } | null)?.docs_url ?? null;
  if (!isPortalUrl(fileUrl)) {
    // Old rows (saved before the session fix) may lack a usable file URL — send the user to the
    // application page if we have one, otherwise report it.
    return isPortalUrl(docsUrl)
      ? NextResponse.redirect(docsUrl)
      : NextResponse.json({ error: 'Re-run "Find floorplans" to refresh this document link.' }, { status: 409 });
  }

  try {
    // 1) Establish the portal session by visiting the documents page; capture its cookies.
    let cookie = '';
    if (isPortalUrl(docsUrl)) {
      const session = await fetch(docsUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      const setCookies = session.headers.getSetCookie?.() ?? [];
      cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    }

    // 2) Fetch the file with that session cookie.
    const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/pdf,image/*,*/*' };
    if (cookie) headers.Cookie = cookie;
    if (docsUrl) headers.Referer = docsUrl;
    const res = await fetch(fileUrl, { headers, redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';

    // If the portal still returned an error/HTML page, send the user to the application page instead.
    if (!res.ok || /text\/html/i.test(contentType)) {
      if (isPortalUrl(docsUrl)) return NextResponse.redirect(docsUrl);
      return NextResponse.json({ error: 'Document unavailable on the portal' }, { status: 404 });
    }

    // Buffer the file (planning docs are small) — more reliable than piping an external stream.
    const buf = Buffer.from(await res.arrayBuffer());
    const isPdf = /pdf/i.test(contentType) || buf.subarray(0, 4).toString() === '%PDF';
    const ext = isPdf ? 'pdf' : contentType.includes('png') ? 'png' : 'jpg';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': isPdf ? 'application/pdf' : contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="floorplan.${ext}"`,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    if (isPortalUrl(docsUrl)) return NextResponse.redirect(docsUrl);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 502 });
  }
}
