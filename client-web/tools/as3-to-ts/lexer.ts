/**
 * ActionScript 3 lexer.
 *
 * Produces a flat token list. Comments are not tokens: they are attached to the
 * following token (`comments`) so the emitter can carry them into the TypeScript
 * output. `nl` records whether a line break preceded the token, which the parser
 * needs for automatic semicolon insertion.
 */

export type TokKind = "id" | "num" | "str" | "regex" | "xml" | "p" | "eof";

export interface Token {
  k: TokKind;
  /** Identifier name, punctuator, or raw literal text. */
  v: string;
  pos: number;
  line: number;
  /** A line terminator appeared between the previous token and this one. */
  nl: boolean;
  /** Comments (raw, including delimiters) that appear before this token. */
  comments?: string[];
  /** Blank line appeared before this token (used to keep vertical spacing). */
  blank?: boolean;
}

const PUNCTS = [
  ">>>=", "...", "===", "!==", ">>>", "<<=", ">>=", "&&=", "||=",
  "::", ".<", "..", "==", "!=", "<=", ">=", "&&", "||", "++", "--",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>",
  "{", "}", "(", ")", "[", "]", ";", ",", "<", ">", "+", "-", "*", "/",
  "%", "&", "|", "^", "!", "~", "?", ":", "=", ".", "@",
];

/** Keywords after which a `/` starts a regular expression and `<` starts XML. */
const EXPR_KEYWORDS = new Set([
  "return", "typeof", "case", "do", "else", "in", "instanceof", "new",
  "delete", "void", "throw", "is", "as", "each",
]);

export class LexError extends Error {}

function isIdStart(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c > 127;
}
function isIdPart(c: number): boolean {
  return isIdStart(c) || (c >= 48 && c <= 57);
}
function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

export function tokenize(src: string, file = "<input>"): Token[] {
  const toks: Token[] = [];
  let i = 0;
  let line = 1;
  let nl = false;
  let blank = false;
  let lineStartCount = 0; // line breaks seen since last token
  let comments: string[] | undefined;
  const n = src.length;

  const prevAllowsExpression = (): boolean => {
    const p = toks[toks.length - 1];
    if (!p) return true;
    if (p.k === "num" || p.k === "str" || p.k === "regex" || p.k === "xml") return false;
    if (p.k === "id") return EXPR_KEYWORDS.has(p.v);
    // punctuators: an expression may follow unless it closes one
    return !(p.v === ")" || p.v === "]" || p.v === "}" || p.v === "++" || p.v === "--");
  };

  const push = (k: TokKind, v: string, pos: number) => {
    const t: Token = { k, v, pos, line, nl };
    if (comments) {
      t.comments = comments;
      comments = undefined;
    }
    if (blank) t.blank = true;
    toks.push(t);
    nl = false;
    blank = false;
    lineStartCount = 0;
  };

  while (i < n) {
    const c = src.charCodeAt(i);
    // whitespace
    if (c === 10) {
      line++;
      nl = true;
      lineStartCount++;
      if (lineStartCount >= 2) blank = true;
      i++;
      continue;
    }
    if (c === 13 || c === 32 || c === 9 || c === 11 || c === 12 || c === 0xfeff || c === 0xa0) {
      i++;
      continue;
    }
    // comments
    if (c === 47 /* / */) {
      const c2 = src.charCodeAt(i + 1);
      if (c2 === 47) {
        let j = src.indexOf("\n", i);
        if (j < 0) j = n;
        (comments ??= []).push(src.slice(i, j).replace(/\r$/, ""));
        lineStartCount = 0;
        i = j;
        continue;
      }
      if (c2 === 42) {
        const j = src.indexOf("*/", i + 2);
        if (j < 0) throw new LexError(`${file}:${line}: unterminated comment`);
        const text = src.slice(i, j + 2);
        (comments ??= []).push(text);
        for (let k = i; k < j; k++) if (src.charCodeAt(k) === 10) { line++; nl = true; }
        lineStartCount = 0;
        i = j + 2;
        continue;
      }
      if (prevAllowsExpression()) {
        // regular expression literal
        let j = i + 1;
        let inClass = false;
        while (j < n) {
          const d = src.charCodeAt(j);
          if (d === 92) { j += 2; continue; }
          if (d === 10) throw new LexError(`${file}:${line}: unterminated regex`);
          if (d === 91) inClass = true;
          else if (d === 93) inClass = false;
          else if (d === 47 && !inClass) break;
          j++;
        }
        j++;
        while (j < n && isIdPart(src.charCodeAt(j))) j++;
        push("regex", src.slice(i, j), i);
        i = j;
        continue;
      }
    }
    // XML literal (E4X), only where an expression may start
    if (c === 60 /* < */ && prevAllowsExpression()) {
      const p = toks[toks.length - 1];
      const nextC = src.charCodeAt(i + 1);
      if (!(p && p.k === "id" && p.v === "new") && (isIdStart(nextC))) {
        const end = scanXml(src, i);
        if (end > 0) {
          const text = src.slice(i, end);
          for (let k = i; k < end; k++) if (src.charCodeAt(k) === 10) line++;
          push("xml", text, i);
          i = end;
          continue;
        }
      }
    }
    // identifiers / keywords
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdPart(src.charCodeAt(j))) j++;
      push("id", src.slice(i, j), i);
      i = j;
      continue;
    }
    // numbers
    if (isDigit(c) || (c === 46 && isDigit(src.charCodeAt(i + 1)))) {
      let j = i;
      if (c === 48 && (src[i + 1] === "x" || src[i + 1] === "X")) {
        j += 2;
        while (j < n && /[0-9a-fA-F]/.test(src[j])) j++;
      } else {
        while (j < n && isDigit(src.charCodeAt(j))) j++;
        if (src[j] === "." && src[j + 1] !== ".") {
          j++;
          while (j < n && isDigit(src.charCodeAt(j))) j++;
        }
        if (src[j] === "e" || src[j] === "E") {
          let k = j + 1;
          if (src[k] === "+" || src[k] === "-") k++;
          if (isDigit(src.charCodeAt(k))) {
            j = k;
            while (j < n && isDigit(src.charCodeAt(j))) j++;
          }
        }
      }
      push("num", src.slice(i, j), i);
      i = j;
      continue;
    }
    // strings
    if (c === 34 || c === 39) {
      let j = i + 1;
      while (j < n) {
        const d = src.charCodeAt(j);
        if (d === 92) { j += 2; continue; }
        if (d === c) break;
        if (d === 10) throw new LexError(`${file}:${line}: unterminated string`);
        j++;
      }
      push("str", src.slice(i, j + 1), i);
      i = j + 1;
      continue;
    }
    // punctuators
    let matched = "";
    for (const p of PUNCTS) {
      if (src.startsWith(p, i)) { matched = p; break; }
    }
    if (!matched) throw new LexError(`${file}:${line}: unexpected character ${JSON.stringify(src[i])}`);
    // `.<` is only a type-application when followed by a type name or `*`
    if (matched === ".<" && !/[A-Za-z_$*]/.test(src[i + 2] ?? "")) matched = ".";
    push("p", matched, i);
    i += matched.length;
  }
  push("eof", "", n);
  return toks;
}

/** Returns the end offset of a balanced XML literal starting at `start`, or -1. */
function scanXml(src: string, start: number): number {
  let depth = 0;
  let i = start;
  const n = src.length;
  while (i < n) {
    if (src[i] !== "<") {
      if (depth === 0) return -1;
      i++;
      continue;
    }
    if (depth > 0 && src.startsWith("<![CDATA[", i)) {
      const j = src.indexOf("]]>", i);
      if (j < 0) return -1;
      i = j + 3;
      continue;
    }
    if (depth > 0 && src.startsWith("<!--", i)) {
      const j = src.indexOf("-->", i);
      if (j < 0) return -1;
      i = j + 3;
      continue;
    }
    if (src.startsWith("</", i)) {
      const j = src.indexOf(">", i);
      if (j < 0) return -1;
      depth--;
      i = j + 1;
      if (depth === 0) return i;
      continue;
    }
    const m = /^<([A-Za-z_][\w.:-]*)(\s+[^<>]*?)?(\/?)>/.exec(src.slice(i, i + 400));
    if (!m) return -1;
    i += m[0].length;
    if (m[3] === "/") {
      if (depth === 0) return i;
    } else depth++;
  }
  return -1;
}
