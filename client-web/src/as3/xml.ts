/**
 * Minimal E4X (XML / XMLList) covering what the client uses: parsing, element
 * and attribute access, filtering, appending and serialisation. The converter
 * rewrites `x.@a` to x.attribute("a"), `x.child` to x.child("child") and
 * `x.(pred)` to x.filter(...).
 */

type Kind = "element" | "text" | "attribute";

export class XML {
  kind: Kind;
  name: string;
  value: string;
  attrs: [string, string][];
  kids: XML[];
  parentNode: XML | null;

  constructor(v: any = "") {
    const src = v instanceof XML ? v.toXMLString() : String(v ?? "");
    const parsed = src.trim().startsWith("<") ? parseXml(src) : null;
    this.kind = parsed?.kind ?? "text";
    this.name = parsed?.name ?? "";
    this.value = parsed?.value ?? src;
    this.attrs = parsed?.attrs ?? [];
    this.kids = parsed?.kids ?? [];
    this.parentNode = null;
    for (const k of this.kids) k.parentNode = this;
  }

  static from(v: any): XML {
    return v instanceof XML ? v : v instanceof XMLList ? v.items[0] ?? new XML("") : new XML(v);
  }
  static node(kind: Kind, name: string, value = ""): XML {
    const x = Object.create(XML.prototype) as XML;
    x.kind = kind; x.name = name; x.value = value; x.attrs = []; x.kids = []; x.parentNode = null;
    return x;
  }

  attribute(n: string): XMLList {
    if (n === "*") return new XMLList(this.attrs.map(([k, v]) => XML.node("attribute", k, v)));
    const a = this.attrs.find(([k]) => k === n);
    return new XMLList(a ? [XML.node("attribute", a[0], a[1])] : []);
  }
  setAttribute(n: string, v: any): void {
    const s = String(v);
    const a = this.attrs.find(([k]) => k === n);
    if (a) a[1] = s; else this.attrs.push([n, s]);
  }
  child(n: string): XMLList { return new XMLList(this.kids.filter((k) => k.kind === "element" && (n === "*" || k.name === n))); }
  children(): XMLList { return new XMLList(this.kids.slice()); }
  elements(n = "*"): XMLList { return this.child(n); }
  descendants(n = "*"): XMLList {
    const out: XML[] = [];
    const walk = (x: XML) => { for (const k of x.kids) { if (k.kind === "element" && (n === "*" || k.name === n)) out.push(k); walk(k); } };
    walk(this);
    return new XMLList(out);
  }
  appendChild(c: any): XML {
    const x = c instanceof XML ? c : new XML(c);
    x.parentNode = this;
    this.kids.push(x);
    return this;
  }
  filter(pred: (n: XML) => any): XMLList { return new XMLList([this].filter(pred)); }
  length(): number { return 1; }
  localName(): string { return this.name; }
  nodeKind(): string { return this.kind; }
  parent(): XML | undefined { return this.parentNode ?? undefined; }
  hasSimpleContent(): boolean { return this.kind !== "element" || this.kids.every((k) => k.kind === "text"); }
  hasComplexContent(): boolean { return !this.hasSimpleContent(); }
  text(): XMLList { return new XMLList(this.kids.filter((k) => k.kind === "text")); }
  toString(): string {
    if (this.kind !== "element") return this.value;
    return this.hasSimpleContent() ? this.kids.map((k) => k.value).join("") : this.toXMLString();
  }
  valueOf(): string { return this.toString(); }
  toXMLString(): string {
    if (this.kind === "text") return escapeText(this.value);
    if (this.kind === "attribute") return escapeAttr(this.value);
    const attrs = this.attrs.map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join("");
    if (!this.kids.length) return `<${this.name}${attrs}/>`;
    return `<${this.name}${attrs}>${this.kids.map((k) => k.toXMLString()).join("")}</${this.name}>`;
  }
}

export class XMLList {
  items: XML[];
  constructor(items: any = []) {
    this.items = Array.isArray(items) ? items : items instanceof XMLList ? items.items.slice() : items instanceof XML ? [items] : [];
  }
  static from(v: any): XMLList { return v instanceof XMLList ? v : new XMLList(v instanceof XML ? [v] : v == null ? [] : [new XML(v)]); }
  length(): number { return this.items.length; }
  attribute(n: string): XMLList { return new XMLList(this.items.flatMap((i) => i.attribute(n).items)); }
  child(n: string): XMLList { return new XMLList(this.items.flatMap((i) => i.child(n).items)); }
  children(): XMLList { return new XMLList(this.items.flatMap((i) => i.kids)); }
  descendants(n = "*"): XMLList { return new XMLList(this.items.flatMap((i) => i.descendants(n).items)); }
  filter(pred: (n: XML) => any): XMLList { return new XMLList(this.items.filter(pred)); }
  setAttribute(n: string, v: any): void { this.items[0]?.setAttribute(n, v); }
  appendChild(c: any): XMLList { this.items[0]?.appendChild(c); return this; }
  toString(): string {
    if (this.items.every((i) => i.hasSimpleContent())) return this.items.map((i) => i.toString()).join("");
    return this.toXMLString();
  }
  valueOf(): string { return this.toString(); }
  toXMLString(): string { return this.items.map((i) => i.toXMLString()).join("\n"); }
  *$forEachValues(): Generator<XML> { yield* this.items; }
  [Symbol.iterator](): Iterator<XML> { return this.items[Symbol.iterator](); }
}

function escapeText(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s: string): string { return escapeText(s).replace(/"/g, "&quot;"); }
function unescape(s: string): string {
  return s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) =>
    e === "lt" ? "<" : e === "gt" ? ">" : e === "amp" ? "&" : e === "quot" ? '"' : e === "apos" ? "'" :
    String.fromCharCode(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
}

function parseXml(src: string): XML {
  let i = 0;
  const n = src.length;
  const skipMisc = () => {
    for (;;) {
      while (i < n && /\s/.test(src[i])) i++;
      if (src.startsWith("<?", i)) { i = src.indexOf("?>", i) + 2; continue; }
      if (src.startsWith("<!--", i)) { i = src.indexOf("-->", i) + 3; continue; }
      break;
    }
  };
  const element = (): XML => {
    const m = /^<([A-Za-z_][\w.:-]*)/.exec(src.slice(i, i + 200))!;
    const el = XML.node("element", m[1]);
    i += m[0].length;
    for (;;) {
      while (/\s/.test(src[i])) i++;
      if (src[i] === "/" && src[i + 1] === ">") { i += 2; return el; }
      if (src[i] === ">") { i++; break; }
      const a = /^([\w.:-]+)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(i));
      if (!a) throw new TypeError("Error #1090: XML parser failure: element is malformed.");
      el.attrs.push([a[1], unescape(a[3] ?? a[4] ?? "")]);
      i += a[0].length;
    }
    while (i < n) {
      if (src.startsWith("</", i)) { i = src.indexOf(">", i) + 1; return el; }
      if (src.startsWith("<![CDATA[", i)) {
        const e = src.indexOf("]]>", i);
        const t = XML.node("text", "", src.slice(i + 9, e));
        t.parentNode = el; el.kids.push(t); i = e + 3; continue;
      }
      if (src.startsWith("<!--", i)) { i = src.indexOf("-->", i) + 3; continue; }
      if (src[i] === "<") { const c = element(); c.parentNode = el; el.kids.push(c); continue; }
      const e = src.indexOf("<", i);
      const raw = src.slice(i, e < 0 ? n : e);
      if (raw.trim()) { const t = XML.node("text", "", unescape(raw.trim())); t.parentNode = el; el.kids.push(t); }
      i = e < 0 ? n : e;
    }
    return el;
  };
  skipMisc();
  return element();
}
