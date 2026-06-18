import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { fetchPortalFile } from '@/lib/evidence-harvester/portalSession';
import { cacheDocBytes } from '@/lib/evidence-harvester/planningCacheService';

const PLANNING_DOCS_BUCKET = 'planning-docs';

// Streams a planning-portal document. Idox (and similar) serve /files/ URLs only within an active
// portal session, so a cold direct link 404s. fetchPortalFile re-establishes the session (cookie jar
// across redirect hops), then we cache the bytes so repeat opens are served from our own storage.
export const runtime = 'nodejs';
export const maxDuration = 60;

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

/**
 * When we can't serve the file itself, hand back the council application page. For a top-level
 * navigation (the "Open"/"Download" links) a redirect is ideal; but for a programmatic fetch()
 * (the "Use as floor plan" action) a cross-origin redirect is blocked by CORS — so return the URL
 * as same-origin JSON instead and let the client open it.
 */
function fallback(req: Request, applicationUrl: string | null): NextResponse {
  const isFetch = req.headers.get('sec-fetch-dest') === 'empty';
  if (isPortalUrl(applicationUrl)) {
    if (isFetch) {
      return NextResponse.json(
        { error: 'Document is only available on the council portal.', applicationUrl },
        { status: 409 },
      );
    }
    return NextResponse.redirect(applicationUrl);
  }
  return NextResponse.json(
    { error: 'Re-run "Find floor plans" to refresh this document link.' },
    { status: 409 },
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
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

  // Prefer a cached copy from the planning-docs bucket (no live council session needed).
  if (fileUrl) {
    const cached = await serveCachedDoc(fileUrl);
    if (cached) return cached;
  }

  if (!isPortalUrl(fileUrl)) {
    // Old rows (saved before the session fix) may lack a usable file URL — hand back the
    // application page (redirect for navigation, JSON for fetch).
    return fallback(req, docsUrl);
  }

  // Fetch the file through an established portal session (cookie jar across redirects).
  const file = await fetchPortalFile(isPortalUrl(docsUrl) ? docsUrl : null, fileUrl, { timeoutMs: 25000 });
  if (!file) return fallback(req, docsUrl);

  // Cache the bytes so the next open is served from our bucket and never touches the council again.
  after(() => cacheDocBytes(createServiceClient(), fileUrl, file.buffer, file.contentType).catch(() => null));

  const ext = file.contentType.includes('pdf') ? 'pdf' : file.contentType.includes('png') ? 'png' : 'jpg';
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="floorplan.${ext}"`,
      'Content-Length': String(file.buffer.byteLength),
      'Cache-Control': 'private, max-age=300',
    },
  });
}

/** Serve the PDF from the planning-docs bucket if we've cached it; otherwise null (fall through to live fetch). */
async function serveCachedDoc(fileUrl: string): Promise<NextResponse | null> {
  try {
    const service = createServiceClient();
    const { data: doc } = await service
      .from('planning_application_documents')
      .select('stored_path')
      .eq('doc_url', fileUrl)
      .not('stored_path', 'is', null)
      .limit(1)
      .maybeSingle();
    const path = doc?.stored_path;
    if (!path) return null;
    const { data: blob } = await service.storage.from(PLANNING_DOCS_BUCKET).download(path);
    if (!blob) return null;
    const buf = Buffer.from(await blob.arrayBuffer());
    const ext = path.split('.').pop()?.toLowerCase() ?? 'pdf';
    const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="floorplan.${ext}"`,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return null;
  }
}
