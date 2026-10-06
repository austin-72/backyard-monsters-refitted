/**
 * Minimal ABC (ActionScript Byte Code) reader.
 *
 * Used to extract the public API surface (classes, members and their declared
 * types) of playerglobal.swc so the converter knows the exact AS3 types of the
 * Flash API: e.g. that `getTimer()` returns `int` and `BitmapData.width` is `int`.
 * Method bodies are not decoded.
 */
import { inflateSync } from "node:zlib";

export interface ApiMember {
  kind: "var" | "const" | "method" | "get" | "set";
  type?: string; // var/const/get: value type; set: param type; method: return type
  params?: string[];
  required?: number; // number of required params (methods)
  rest?: boolean;
  /** compile-time value of a const/var slot, when present */
  value?: string | number | boolean | null;
}

export interface ApiClass {
  name: string; // dotted qualified name, e.g. flash.display.MovieClip
  super?: string;
  interfaces: string[];
  isInterface: boolean;
  dynamic: boolean;
  final: boolean;
  inst: Record<string, ApiMember>;
  stat: Record<string, ApiMember>;
  /** constructor parameter types */
  ctor?: { params: string[]; required: number; rest: boolean };
}

export interface ApiDb {
  classes: Record<string, ApiClass>;
  /** package-level functions/vars/consts, keyed by dotted name. */
  globals: Record<string, ApiMember>;
}

class Reader {
  pos = 0;
  constructor(public b: Buffer) {}
  u8(): number { return this.b[this.pos++]; }
  u16(): number { const v = this.b.readUInt16LE(this.pos); this.pos += 2; return v; }
  u32raw(): number { const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v; }
  d64(): number { const v = this.b.readDoubleLE(this.pos); this.pos += 8; return v; }
  u30(): number {
    let result = 0;
    let shift = 0;
    for (let i = 0; i < 5; i++) {
      const byte = this.b[this.pos++];
      result |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7;
    }
    return result >>> 0;
  }
  str(): string {
    const len = this.u30();
    const s = this.b.toString("utf8", this.pos, this.pos + len);
    this.pos += len;
    return s;
  }
}

interface Multiname { kind: number; ns?: number; name?: number; nsSet?: number; qname?: number; params?: number[]; }

function parseAbc(buf: Buffer, db: ApiDb): void {
  const r = new Reader(buf);
  r.u16(); r.u16();
  const s32 = (v: number) => v | 0;
  const nints = r.u30(); const ints: number[] = [0]; for (let i = 1; i < nints; i++) ints.push(s32(r.u30()));
  const nuints = r.u30(); const uints: number[] = [0]; for (let i = 1; i < nuints; i++) uints.push(r.u30() >>> 0);
  const ndbls = r.u30(); const dbls: number[] = [NaN]; for (let i = 1; i < ndbls; i++) dbls.push(r.d64());
  const nstr = r.u30();
  const strings: string[] = [""];
  for (let i = 1; i < nstr; i++) strings.push(r.str());
  const nns = r.u30();
  const nss: { kind: number; name: string }[] = [{ kind: 0, name: "*" }];
  for (let i = 1; i < nns; i++) { const kind = r.u8(); nss.push({ kind, name: strings[r.u30()] }); }
  const nnsset = r.u30();
  const nsSets: number[][] = [[]];
  for (let i = 1; i < nnsset; i++) { const c = r.u30(); const s: number[] = []; for (let j = 0; j < c; j++) s.push(r.u30()); nsSets.push(s); }
  const nmn = r.u30();
  const mns: Multiname[] = [{ kind: 0 }];
  for (let i = 1; i < nmn; i++) {
    const kind = r.u8();
    switch (kind) {
      case 0x07: case 0x0d: mns.push({ kind, ns: r.u30(), name: r.u30() }); break;
      case 0x0f: case 0x10: mns.push({ kind, name: r.u30() }); break;
      case 0x11: case 0x12: mns.push({ kind }); break;
      case 0x09: case 0x0e: mns.push({ kind, name: r.u30(), nsSet: r.u30() }); break;
      case 0x1b: case 0x1c: mns.push({ kind, nsSet: r.u30() }); break;
      case 0x1d: { const qname = r.u30(); const c = r.u30(); const params: number[] = []; for (let j = 0; j < c; j++) params.push(r.u30()); mns.push({ kind, qname, params }); break; }
      default: throw new Error("bad multiname kind " + kind);
    }
  }
  const mnName = (i: number): string => {
    if (!i) return "*";
    const m = mns[i];
    if (m.kind === 0x1d) {
      const base = mnName(m.qname!);
      return `${base}.<${m.params!.map(mnName).join(",")}>`;
    }
    const local = m.name !== undefined ? strings[m.name] : "*";
    if (m.kind === 0x07 || m.kind === 0x0d) {
      const ns = nss[m.ns!];
      if ((ns.kind === 0x16 || ns.kind === 0x17) && ns.name) return `${ns.name}.${local}`;
    }
    return local;
  };
  const mnLocal = (i: number): string => {
    const m = mns[i];
    return m.name !== undefined ? strings[m.name] : "*";
  };
  const mnIsPublicish = (i: number): boolean => {
    const m = mns[i];
    if (m.kind !== 0x07 && m.kind !== 0x0d) return true;
    const ns = nss[m.ns!];
    return ns.kind === 0x16 || ns.kind === 0x08 || ns.kind === 0x18 || ns.kind === 0x1a;
  };

  const nmethods = r.u30();
  const methods: { params: string[]; ret: string; required: number; rest: boolean }[] = [];
  for (let i = 0; i < nmethods; i++) {
    const pc = r.u30();
    const ret = mnName(r.u30());
    const params: string[] = [];
    for (let j = 0; j < pc; j++) params.push(mnName(r.u30()));
    r.u30(); // name
    const flags = r.u8();
    let optional = 0;
    if (flags & 0x08) {
      optional = r.u30();
      for (let j = 0; j < optional; j++) { r.u30(); r.u8(); }
    }
    if (flags & 0x80) for (let j = 0; j < pc; j++) r.u30();
    methods.push({ params, ret, required: pc - optional, rest: !!(flags & 0x04) });
  }
  const nmeta = r.u30();
  for (let i = 0; i < nmeta; i++) { r.u30(); const c = r.u30(); for (let j = 0; j < c; j++) { r.u30(); r.u30(); } }

  const readTraits = (into: Record<string, ApiMember> | null, globalPrefix?: string) => {
    const n = r.u30();
    for (let i = 0; i < n; i++) {
      const nameIdx = r.u30();
      const kindByte = r.u8();
      const kind = kindByte & 0x0f;
      const attr = kindByte >> 4;
      let member: ApiMember | null = null;
      if (kind === 0 || kind === 6) {
        r.u30();
        const type = mnName(r.u30());
        const vindex = r.u30();
        let value: ApiMember["value"];
        if (vindex) {
          const vk = r.u8();
          value = vk === 0x01 ? strings[vindex] : vk === 0x03 ? ints[vindex] : vk === 0x04 ? uints[vindex] : vk === 0x06 ? dbls[vindex]
            : vk === 0x0b ? true : vk === 0x0a ? false : vk === 0x0c ? null : undefined;
        }
        member = { kind: kind === 6 ? "const" : "var", type };
        if (value !== undefined) member.value = value;
      } else if (kind === 4) { r.u30(); r.u30(); }
      else if (kind === 5) { r.u30(); const mi = methods[r.u30()]; member = { kind: "method", type: mi.ret, params: mi.params, required: mi.required, rest: mi.rest }; }
      else {
        r.u30();
        const mi = methods[r.u30()];
        if (kind === 1) member = { kind: "method", type: mi.ret, params: mi.params, required: mi.required, rest: mi.rest };
        else if (kind === 2) member = { kind: "get", type: mi.ret };
        else if (kind === 3) member = { kind: "set", type: mi.params[0] };
      }
      if (attr & 0x4) { const c = r.u30(); for (let j = 0; j < c; j++) r.u30(); }
      if (!member || !mnIsPublicish(nameIdx)) continue;
      const local = mnLocal(nameIdx);
      if (into) {
        const prev = into[local];
        // merge get/set pairs into one entry
        if (prev && ((prev.kind === "get" && member.kind === "set") || (prev.kind === "set" && member.kind === "get"))) {
          into[local] = { kind: "get", type: prev.kind === "get" ? prev.type : member.type };
          (into[local] as any).writable = true;
        } else if (!prev) {
          into[local] = member;
          if (member.kind === "set") (member as any).writeOnly = true;
        }
      } else if (globalPrefix !== undefined) {
        db.globals[mnName(nameIdx)] = member;
      }
    }
  };

  const nclasses = r.u30();
  const classes: ApiClass[] = [];
  for (let i = 0; i < nclasses; i++) {
    const name = mnName(r.u30());
    const superIdx = r.u30();
    const flags = r.u8();
    if (flags & 0x08) r.u30();
    const ni = r.u30();
    const interfaces: string[] = [];
    for (let j = 0; j < ni; j++) interfaces.push(mnName(r.u30()));
    const iinit = methods[r.u30()];
    const cls: ApiClass = {
      name, super: superIdx ? mnName(superIdx) : undefined, interfaces,
      isInterface: !!(flags & 0x04), dynamic: !(flags & 0x01), final: !!(flags & 0x02), inst: {}, stat: {},
      ctor: iinit ? { params: iinit.params, required: iinit.required, rest: iinit.rest } : undefined,
    };
    readTraits(cls.inst);
    classes.push(cls);
  }
  for (let i = 0; i < nclasses; i++) { r.u30(); readTraits(classes[i].stat); }
  const nscripts = r.u30();
  for (let i = 0; i < nscripts; i++) { r.u30(); readTraits(null, ""); }
  for (const c of classes) db.classes[c.name] = c;
}

/** Reads every DoABC tag from a SWF buffer. */
export function readSwfAbc(swf: Buffer, db: ApiDb): void {
  let body: Buffer;
  const sig = swf.toString("ascii", 0, 3);
  if (sig === "CWS") body = inflateSync(swf.subarray(8));
  else if (sig === "FWS") body = swf.subarray(8);
  else throw new Error("unsupported SWF signature " + sig);
  const nbits = body[0] >> 3;
  let pos = Math.ceil((5 + 4 * nbits) / 8) + 4;
  while (pos < body.length) {
    const hdr = body.readUInt16LE(pos); pos += 2;
    const code = hdr >> 6;
    let len = hdr & 0x3f;
    if (len === 0x3f) { len = body.readUInt32LE(pos); pos += 4; }
    if (code === 82) {
      // DoABC2: flags u32, name string, abc
      let p = pos + 4;
      while (body[p] !== 0) p++;
      parseAbc(body.subarray(p + 1, pos + len), db);
    } else if (code === 72) parseAbc(body.subarray(pos, pos + len), db);
    pos += len;
    if (code === 0) break;
  }
}
