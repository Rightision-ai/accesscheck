/**
 * ExteriorVisionService — runs Gemini vision over Street View images to extract exterior
 * accessibility features as strict JSON. Mirrors the Gemini call/parse approach used in
 * app/api/engine/cost-estimation/route.ts (responseMimeType JSON + defensive parsing).
 *
 * Returns null on any failure or weak evidence so the harvest pipeline degrades gracefully.
 */
import { fetchWithRetry } from './http';
import { buildExteriorVisionPrompt } from '@/lib/engine/prompts/exteriorVisionPrompt';
import type { ExteriorObservations, FrontPathSlope } from './types';

const ENGINE_API_KEY = process.env.ENGINE_API_KEY;
const MODEL = process.env.ENGINE_VISION_MODEL || 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type ImageInput = { mime: string; base64: string };

export async function analyseExterior(images: ImageInput[]): Promise<ExteriorObservations | null> {
  if (!ENGINE_API_KEY || images.length === 0) return null;

  const parts = [
    { text: buildExteriorVisionPrompt() },
    ...images.map((img) => ({ inline_data: { mime_type: img.mime, data: img.base64 } })),
  ];

  const res = await fetchWithRetry(
    `${API_URL}?key=${ENGINE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' },
      }),
    },
    { timeoutMs: 30000 },
  );
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  return normalise(raw);
}

const SLOPES: FrontPathSlope[] = ['flat', 'slight_slope', 'steady_slope', 'steep_slope', 'unknown'];

/** Validate + coerce the model output into a typed, safe shape before it touches the DB. */
function normalise(raw: Record<string, unknown>): ExteriorObservations {
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const bool = (v: unknown): boolean => v === true;
  const oneOf = <T extends string>(v: unknown, allowed: T[], fallback: T): T =>
    typeof v === 'string' && (allowed as string[]).includes(v) ? (v as T) : fallback;

  return {
    entrance_visible: bool(raw.entrance_visible),
    visible_steps_count: num(raw.visible_steps_count),
    ramp_visible: bool(raw.ramp_visible),
    handrail_visible: bool(raw.handrail_visible),
    front_path_slope: oneOf(raw.front_path_slope, SLOPES, 'unknown'),
    threshold_risk: oneOf(raw.threshold_risk, ['low', 'medium', 'high', 'unknown'], 'unknown'),
    visual_property_type: typeof raw.visual_property_type === 'string' ? raw.visual_property_type : null,
    communal_entrance_visible: bool(raw.communal_entrance_visible),
    parking_or_dropoff_visible: bool(raw.parking_or_dropoff_visible),
    image_quality: oneOf(raw.image_quality, ['low', 'medium', 'high', 'unknown'], 'unknown'),
    confidence: Math.max(0, Math.min(1, num(raw.confidence) ?? 0.5)),
    justification: typeof raw.justification === 'string' ? raw.justification.slice(0, 600) : undefined,
  };
}
