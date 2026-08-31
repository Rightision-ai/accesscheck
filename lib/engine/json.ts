/**
 * Best-effort repair for the JSON malformations Gemini produces despite responseMimeType:
 * trailing commas, unterminated strings at truncation points, and missing closing brackets when
 * the response was cut off. Not a general-purpose JSON repairer — scoped to what we observe.
 */
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
