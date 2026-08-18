/**
 * AccessibilityTaggerService — runs the FINE-TUNED Gemini model over a property's images and
 * returns the 15 accessibility tags as a validated JSON record.
 *
 * Mirrors the call/parse pattern of lib/evidence-harvester/exteriorVisionService.ts, but targets
 * a tuned model, which lives on **Vertex AI** (not the AI-Studio `generativelanguage` endpoint the
 * rest of the app uses). Vertex requires an OAuth bearer token rather than an API key.
 *
 * Gated by env — a no-op (returns null) until you set it, so callers fall back to the existing
 * prompt path with zero behaviour change:
 *   ENGINE_TAGGER_MODEL   the tuned model resource, e.g.
 *                         projects/<proj>/locations/<loc>/endpoints/<id>   (or a base id to A/B)
 *   ENGINE_TAGGER_PROJECT GCP project id
 *   ENGINE_TAGGER_LOCATION Vertex region (default us-central1)
 *   ENGINE_TAGGER_OMIT_UNKNOWN "true" if the model was tuned in omit-unknown mode (must match)
 *
 * Auth: obtains a token via `google-auth-library` (Application Default Credentials). That package
 * is imported dynamically so the app builds without it; install it before enabling the service:
 *   npm i google-auth-library
 */
import { buildAccessibilityTagsPrompt, normaliseTags } from "./accessibilityTags";
import type { AccessibilityTags } from "./accessibilityTags";

type ImageInput = { mime: string; base64: string };

const MODEL = process.env.ENGINE_TAGGER_MODEL;
const PROJECT = process.env.ENGINE_TAGGER_PROJECT;
const LOCATION = process.env.ENGINE_TAGGER_LOCATION || "us-central1";
const OMIT_UNKNOWN = process.env.ENGINE_TAGGER_OMIT_UNKNOWN === "true";

export function isTaggerEnabled(): boolean {
  return Boolean(MODEL && PROJECT);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  try {
    // Dynamic import via a non-literal specifier keeps this optional dep out of the type/build
    // graph until it is installed (`npm i google-auth-library`).
    const pkg = "google-auth-library";
    // Minimal structural type — avoids a hard dependency on the package's own types.
    const { GoogleAuth } = (await import(pkg)) as {
      GoogleAuth: new (opts: { scopes: string[] }) => {
        getClient(): Promise<{ getAccessToken(): Promise<{ token?: string | null }> }>;
      };
    };
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token) return null;
    // ADC tokens are ~1h; cache conservatively for 50 min.
    cachedToken = { value: token, expiresAt: Date.now() + 50 * 60_000 };
    return token;
  } catch (err) {
    console.error(
      "[Tagger] Could not obtain a Google access token. Is google-auth-library installed and " +
        "ADC configured (gcloud auth application-default login)?",
      err,
    );
    return null;
  }
}

function endpointUrl(): string {
  // Tuned models are addressed by their full resource name under the regional aiplatform host.
  const resource = MODEL!.includes("/")
    ? MODEL!
    : `projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}`;
  return `https://${LOCATION}-aiplatform.googleapis.com/v1/${resource}:generateContent`;
}

/**
 * Analyse a property's images and return validated accessibility tags, or null on any failure
 * (disabled / auth / network / parse) so callers degrade gracefully to the existing pipeline.
 */
export async function tagProperty(
  images: ImageInput[],
): Promise<AccessibilityTags | null> {
  if (!isTaggerEnabled() || images.length === 0) return null;

  const token = await accessToken();
  if (!token) return null;

  const parts = [
    { text: "Assess this property's accessibility from the images and return the JSON object." },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mime, data: img.base64 },
    })),
  ];

  const body = {
    systemInstruction: { parts: [{ text: buildAccessibilityTagsPrompt(OMIT_UNKNOWN) }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  let res: Response;
  try {
    res = await fetch(endpointUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[Tagger] request failed:", err);
    return null;
  }
  if (!res.ok) {
    console.error("[Tagger] Vertex error", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return normaliseTags(JSON.parse(match[0]) as Record<string, unknown>);
  } catch {
    return null;
  }
}
