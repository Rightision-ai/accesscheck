/**
 * Best-effort repair for the JSON malformations Gemini produces despite responseMimeType:
 * trailing commas, unterminated strings at truncation points, and missing closing brackets when
 * the response was cut off. Not a general-purpose JSON repairer — scoped to what we observe.
 */
export type EngineJsonParse<T> = {
  /** The parsed object, or null when nothing usable could be recovered. */
  result: T | null;
  /** True when `repairJson` had to close a truncated response to get here. */
  recovered: boolean;
};

/**
 * Parse the JSON object out of a raw model response.
 *
 * The routes used to do `text.match(/\{[\s\S]*\}/)` + `JSON.parse`, which fails on the most
 * common real failure: the model hits `maxOutputTokens` mid-object. The greedy match then ends
 * at some closing brace deep inside the payload (or finds nothing at all), and a response whose
 * fields were almost entirely complete is thrown away.
 *
 * A truncated response is worth recovering — the fields the model emitted before it ran out are
 * still valid — so a straight parse is tried first and `repairJson` is the fallback. Callers get
 * `recovered` so they can tell a clean answer from a salvaged one.
 */
export function parseEngineJson<T = Record<string, unknown>>(
  rawText: string,
): EngineJsonParse<T> {
  const start = rawText.indexOf("{");
  if (start === -1) return { result: null, recovered: false };

  const end = rawText.lastIndexOf("}");
  if (end > start) {
    try {
      return { result: JSON.parse(rawText.slice(start, end + 1)) as T, recovered: false };
    } catch {
      // Fall through to the repair path — a brace inside a truncated payload is not the end.
    }
  }

  try {
    return { result: JSON.parse(repairJson(rawText.slice(start))) as T, recovered: true };
  } catch {
    return { result: null, recovered: false };
  }
}

export function repairJson(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let lastSafeIndex = -1; // last index after a complete key:value or element

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") {
      stack.push(c);
    } else if (c === "}" || c === "]") {
      stack.pop();
      lastSafeIndex = i;
    } else if (c === "," && stack.length > 0) {
      lastSafeIndex = i - 1;
    }
  }

  // If we ended inside a string, truncate back to the last safe element/comma boundary so we
  // discard the partial token entirely instead of trying to close it.
  if (inString && lastSafeIndex >= 0) {
    s = s.slice(0, lastSafeIndex + 1);
    // Recompute bracket stack against the truncated source.
    stack.length = 0;
    inString = false;
    escape = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === "{" || c === "[") stack.push(c);
      else if (c === "}" || c === "]") stack.pop();
    }
  }

  // Drop trailing commas before close brackets, then close any still-open containers.
  s = s.replace(/,(\s*[}\]])/g, "$1");
  while (stack.length) {
    const open = stack.pop();
    s += open === "{" ? "}" : "]";
  }
  return s;
}
