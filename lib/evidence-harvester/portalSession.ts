/**
 * portalSession — fetch a council planning-portal document through an established session.
 *
 * Idox (and similar) serve their `/files/` URLs only to a request that carries the session cookie
 * (JSESSIONID) set while browsing the application. That cookie is often set on a REDIRECT hop, and
 * `fetch(..., { redirect: 'follow' })` discards intermediate Set-Cookie headers — which is why a cold
 * proxy fetch returns an HTML login/agreement page instead of the PDF.
 *
 * This module follows redirects MANUALLY with a cookie jar: it warms the session by visiting the
 * application documents page, accumulating every cookie, then fetches the file with the full jar +
 * Referer. Server-side, so cross-origin redirects are fine (no browser CORS).
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

type Jar = Map<string, string>;

export type PortalFile = { buffer: Buffer; contentType: string };

function readSetCookies(res: Response, jar: Jar): void {
  const headers = res.headers as unknown as { getSetCookie?: () => string[] };
  const list = headers.getSetCookie?.() ?? [];
  const raw = list.length ? list : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
  for (const c of raw) {
    const pair = c.split(';')[0] ?? '';
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Jar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** GET `url`, manually following redirects (capturing cookies at every hop). Returns the final response. */
async function getWithJar(
  url: string,
  jar: Jar,
  referer: string | undefined,
  timeoutMs: number,
  maxHops = 6,
): Promise<Response> {
  let current = url;
  let ref = referer;
  for (let hop = 0; hop < maxHops; hop++) {
    const headers: Record<string, string> = {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/pdf,image/*,*/*;q=0.8',
    };
    const cookie = cookieHeader(jar);
    if (cookie) headers.Cookie = cookie;
    if (ref) headers.Referer = ref;

    const res = await timedFetch(current, { headers, redirect: 'manual' }, timeoutMs);
    readSetCookies(res, jar);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.arrayBuffer().catch(() => undefined); // drain to free the socket
      if (!loc) return res;
      ref = current;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
}

/**
 * Fetch an HTML page through a warmed portal session (cookie jar across redirects). Used to scrape the
 * application documents tab, which on modern Idox needs the JSESSIONID set by first visiting the
 * application (warmUrl). Returns null on failure so the caller can fall back to no documents.
 */
export async function fetchPortalHtml(
  url: string,
  opts: { timeoutMs?: number; warmUrl?: string } = {},
): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const jar: Jar = new Map();
  try {
    if (opts.warmUrl && opts.warmUrl !== url) {
      const warm = await getWithJar(opts.warmUrl, jar, undefined, timeoutMs);
      await warm.arrayBuffer().catch(() => undefined);
    }
    const res = await getWithJar(url, jar, opts.warmUrl, timeoutMs);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function sniff(contentType: string, buf: Buffer): string | null {
  if (/pdf/i.test(contentType) || buf.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  if (/image\/png/i.test(contentType) || (buf[0] === 0x89 && buf[1] === 0x50)) return 'image/png';
  if (/image\/jpeg/i.test(contentType) || (buf[0] === 0xff && buf[1] === 0xd8)) return 'image/jpeg';
  return null;
}

/**
 * Fetch a portal document with a warmed session. Returns null when the portal won't serve the file
 * (HTML/agreement page, non-2xx, empty) so the caller can fall back. Never throws on a bad portal.
 */
export async function fetchPortalFile(
  docsUrl: string | null,
  fileUrl: string,
  opts: { timeoutMs?: number } = {},
): Promise<PortalFile | null> {
  const timeoutMs = opts.timeoutMs ?? 20000;
  const jar: Jar = new Map();
  try {
    // 1) Warm the session: visiting the application documents page sets the cookie that authorises /files/.
    if (docsUrl) {
      const page = await getWithJar(docsUrl, jar, undefined, timeoutMs);
      await page.arrayBuffer().catch(() => undefined);
    }
    // 2) Fetch the file itself with the warmed jar + Referer.
    const res = await getWithJar(fileUrl, jar, docsUrl ?? undefined, timeoutMs);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (/text\/html/i.test(contentType)) return null; // portal returned a page, not the file
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 1024) return null; // placeholder / error stub
    const mime = sniff(contentType, buffer);
    if (!mime) return null; // not a PDF/image (likely an HTML login page without the html content-type)
    return { buffer, contentType: mime };
  } catch {
    return null;
  }
}
