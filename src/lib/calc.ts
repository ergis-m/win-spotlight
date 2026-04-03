/**
 * Safe math expression evaluator (no eval).
 * Supports: +, -, *, /, %, ^ (power), parentheses, decimals, negative numbers.
 */

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9._]/.test(expr[i])) {
        if (expr[i] !== "_") num += expr[i];
        i++;
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if ("+-*/%^".includes(ch)) {
      // Handle unary minus/plus
      if (
        (ch === "-" || ch === "+") &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === "op" ||
          tokens[tokens.length - 1].type === "lparen")
      ) {
        let num = ch === "-" ? "-" : "";
        i++;
        while (i < expr.length && /[0-9._]/.test(expr[i])) {
          if (expr[i] !== "_") num += expr[i];
          i++;
        }
        if (num === "-" || num === "") return []; // invalid
        tokens.push({ type: "number", value: parseFloat(num) });
        continue;
      }
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    // Unknown character — not a math expression
    return [];
  }
  return tokens;
}

// Recursive descent parser: expr → term ((+|-) term)*
// term → factor ((*|/|%) factor)*
// factor → base (^ factor)?   (right-associative)
// base → NUMBER | '(' expr ')' | unary

function parse(tokens: Token[]): number | null {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }
  function consume(): Token {
    return tokens[pos++];
  }

  function peekOp(): string | undefined {
    const t = peek();
    return t?.type === "op" ? t.value : undefined;
  }

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peekOp() === "+") {
      consume();
      const right = parseTerm();
      if (right === null) return null;
      left = left + right;
    }
    while (peekOp() === "-") {
      consume();
      const right = parseTerm();
      if (right === null) return null;
      left = left - right;
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    while (peekOp() && "*/%".includes(peekOp()!)) {
      const op = (consume() as Extract<Token, { type: "op" }>).value;
      const right = parseFactor();
      if (right === null) return null;
      if (op === "*") left = left * right;
      else if (op === "/") left = left / right;
      else left = left % right;
    }
    return left;
  }

  function parseFactor(): number | null {
    const base = parseBase();
    if (base === null) return null;
    if (peekOp() === "^") {
      consume();
      const exp = parseFactor(); // right-associative
      if (exp === null) return null;
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseBase(): number | null {
    const t = peek();
    if (!t) return null;
    if (t.type === "number") {
      consume();
      return t.value;
    }
    if (t.type === "lparen") {
      consume();
      const val = parseExpr();
      if (val === null) return null;
      if (peek()?.type !== "rparen") return null;
      consume();
      return val;
    }
    return null;
  }

  const result = parseExpr();
  if (pos !== tokens.length) return null; // leftover tokens
  return result;
}

import { getUserLocale } from "./locale";

/** Format a number nicely (strip trailing zeros, limit decimals). */
function formatResult(n: number): string {
  if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
  if (isNaN(n)) return "NaN";
  // Use up to 10 significant digits, strip trailing zeros
  return parseFloat(n.toPrecision(10)).toLocaleString(getUserLocale().language, {
    maximumFractionDigits: 10,
    useGrouping: true,
  });
}

/**
 * Try to evaluate a string as a math expression.
 * Returns the formatted result string, or null if it's not a valid expression.
 */
export function tryCalc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Must contain at least one operator or parens to be considered math
  if (!/[+\-*/%^()]/.test(trimmed)) return null;
  // Quick reject: if it looks like just a plain word/sentence
  if (/[a-zA-Z]/.test(trimmed)) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length < 2) return null; // need at least "number op number"

  const result = parse(tokens);
  if (result === null) return null;

  return formatResult(result);
}
