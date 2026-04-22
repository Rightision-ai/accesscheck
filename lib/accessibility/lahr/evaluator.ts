// Tiny expression evaluator for LAHR business-rules conditions.
// Grammar (informal):
//   expr        := or
//   or          := and ('OR' and)*
//   and         := not ('AND' not)*
//   not         := 'NOT' not | comparison
//   comparison  := sum ( (<op> sum)+ | 'is' 'not'? 'blank' )?    // chained comparisons allowed
//   sum         := primary (('+' | '-') primary)*
//   primary     := number | string | 'true' | 'false' | identifier | call | '(' expr ')' | '-' primary
//   call        := ident '(' (expr (',' expr)*)? ')'
//
// Missing/blank identifiers resolve to `undefined`. Special call forms:
//   ANY_DOOR_WIDTH(a, b, ...)  returns a sentinel; comparisons/blank-checks distribute (any-match).
//   ALL_BLANK(a, b, ...)       returns boolean — true if every arg is blank.

export type RuleEnv = Record<string, unknown>;

type Token =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: string }
  | { kind: "kw"; value: "AND" | "OR" | "NOT" | "is" | "not" | "blank" | "true" | "false" }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

const OPS = ["<=", ">=", "==", "!=", "<", ">", "+", "-"];
const CMP_OPS = new Set(["<", "<=", ">", ">=", "==", "!="]);

const TRUTHY = new Set(["yes", "true", "1"]);
const FALSY = new Set(["no", "false", "0"]);

type AnyList = { __kind: "any"; values: unknown[] };

function isAnyList(v: unknown): v is AnyList {
  return !!v && typeof v === "object" && (v as { __kind?: string }).__kind === "any";
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "(") { tokens.push({ kind: "lparen" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "rparen" }); i++; continue; }
    if (c === ",") { tokens.push({ kind: "comma" }); i++; continue; }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      tokens.push({ kind: "str", value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ kind: "num", value: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }
    let matchedOp: string | null = null;
    for (const op of OPS) {
      if (src.startsWith(op, i)) { matchedOp = op; break; }
    }
    if (matchedOp) {
      tokens.push({ kind: "op", value: matchedOp });
      i += matchedOp.length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_*]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const upper = word.toUpperCase();
      if (upper === "AND" || upper === "OR") {
        tokens.push({ kind: "kw", value: upper });
      } else if (upper === "NOT") {
        // `NOT` is the boolean negation; `not` in `is not blank` also normalises here —
        // parseComparison accepts either as the optional negator.
        tokens.push({ kind: "kw", value: "NOT" });
      } else if (word.toLowerCase() === "is" || word.toLowerCase() === "blank") {
        tokens.push({ kind: "kw", value: word.toLowerCase() as "is" | "blank" });
      } else if (upper === "TRUE") {
        tokens.push({ kind: "kw", value: "true" });
      } else if (upper === "FALSE") {
        tokens.push({ kind: "kw", value: "false" });
      } else {
        tokens.push({ kind: "ident", value: word });
      }
      i = j;
      continue;
    }
    throw new Error(`Unexpected character '${c}' at ${i} in: ${src}`);
  }
  return tokens;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (TRUTHY.has(s)) return true;
    if (FALSY.has(s)) return false;
    return s.length > 0;
  }
  return !!v;
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return null;
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null && nb !== null) return na === nb;
  const toYN = (v: unknown): string | null => {
    if (typeof v === "boolean") return v ? "yes" : "no";
    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (TRUTHY.has(s) || s === "yes") return "yes";
      if (FALSY.has(s) || s === "no") return "no";
      return s;
    }
    return null;
  };
  const ya = toYN(a);
  const yb = toYN(b);
  if (ya !== null && yb !== null) return ya === yb;
  return false;
}

function compare(a: unknown, op: string, b: unknown): boolean {
  if (isAnyList(a)) return a.values.some((v) => compare(v, op, b));
  if (isAnyList(b)) return b.values.some((v) => compare(a, op, v));
  if (op === "==") return eq(a, b);
  if (op === "!=") return !eq(a, b);
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na === null || nb === null) return false;
  switch (op) {
    case "<": return na < nb;
    case "<=": return na <= nb;
    case ">": return na > nb;
    case ">=": return na >= nb;
  }
  return false;
}

function callFn(name: string, args: unknown[]): unknown {
  const upper = name.toUpperCase();
  if (upper === "ANY_DOOR_WIDTH") {
    return { __kind: "any", values: args } as AnyList;
  }
  if (upper === "ALL_BLANK") {
    return args.every(isBlank);
  }
  throw new Error(`Unknown function: ${name}`);
}

export function evaluateCondition(expr: string, env: RuleEnv): boolean {
  const tokens = tokenize(expr);
  let pos = 0;

  const peek = (offset = 0): Token | undefined => tokens[pos + offset];
  const consume = (): Token => tokens[pos++];
  const expect = (kind: Token["kind"], value?: string): Token => {
    const t = tokens[pos];
    if (!t || t.kind !== kind || (value !== undefined && (t as { value: string }).value !== value)) {
      throw new Error(`Expected ${kind}${value ? ` '${value}'` : ""} at ${pos} in: ${expr}`);
    }
    pos++;
    return t;
  };
  const isKw = (t: Token | undefined, v: string): boolean =>
    !!t && t.kind === "kw" && (t as { value: string }).value === v;

  function parsePrimary(): unknown {
    const t = peek();
    if (!t) throw new Error(`Unexpected end of expression: ${expr}`);
    if (t.kind === "num") { pos++; return (t as { value: number }).value; }
    if (t.kind === "str") { pos++; return (t as { value: string }).value; }
    if (t.kind === "kw" && ((t as { value: string }).value === "true" || (t as { value: string }).value === "false")) {
      pos++;
      return (t as { value: string }).value === "true";
    }
    if (t.kind === "lparen") {
      pos++;
      const v = parseOr();
      expect("rparen");
      return v;
    }
    if (t.kind === "op" && (t as { value: string }).value === "-") {
      pos++;
      const v = parsePrimary();
      const n = asNumber(v);
      return n === null ? null : -n;
    }
    if (t.kind === "ident") {
      pos++;
      const name = (t as { value: string }).value;
      if (peek()?.kind === "lparen") {
        pos++;
        const args: unknown[] = [];
        if (peek()?.kind !== "rparen") {
          args.push(parseOr());
          while (peek()?.kind === "comma") {
            pos++;
            args.push(parseOr());
          }
        }
        expect("rparen");
        return callFn(name, args);
      }
      return env[name];
    }
    throw new Error(`Unexpected token at ${pos}: ${JSON.stringify(t)} in ${expr}`);
  }

  function parseSum(): unknown {
    let left = parsePrimary();
    while (peek()?.kind === "op" && ((peek() as { value: string }).value === "+" || (peek() as { value: string }).value === "-")) {
      const op = (consume() as { value: string }).value;
      const right = parsePrimary();
      const ln = asNumber(left);
      const rn = asNumber(right);
      left = ln === null || rn === null ? null : (op === "+" ? ln + rn : ln - rn);
    }
    return left;
  }

  function parseComparison(): unknown {
    const first = parseSum();
    if (isKw(peek(), "is")) {
      pos++;
      let negate = false;
      if (isKw(peek(), "NOT")) { pos++; negate = true; }
      expect("kw", "blank");
      let blank: boolean;
      if (isAnyList(first)) blank = first.values.every(isBlank);
      else blank = isBlank(first);
      return negate ? !blank : blank;
    }
    const cmps: { op: string; rhs: unknown }[] = [];
    while (peek()?.kind === "op" && CMP_OPS.has((peek() as { value: string }).value)) {
      const op = (consume() as { value: string }).value;
      const rhs = parseSum();
      cmps.push({ op, rhs });
    }
    if (cmps.length === 0) return first;
    let prev = first;
    for (const { op, rhs } of cmps) {
      if (!compare(prev, op, rhs)) return false;
      prev = rhs;
    }
    return true;
  }

  function parseNot(): unknown {
    if (isKw(peek(), "NOT")) { pos++; return !asBool(parseNot()); }
    return parseComparison();
  }

  function parseAnd(): unknown {
    let left = parseNot();
    while (isKw(peek(), "AND")) { pos++; const right = parseNot(); left = asBool(left) && asBool(right); }
    return left;
  }

  function parseOr(): unknown {
    let left = parseAnd();
    while (isKw(peek(), "OR")) { pos++; const right = parseAnd(); left = asBool(left) || asBool(right); }
    return left;
  }

  const result = parseOr();
  if (pos !== tokens.length) {
    throw new Error(`Trailing tokens at ${pos} in: ${expr}`);
  }
  return asBool(result);
}
