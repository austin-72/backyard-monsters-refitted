import * as as3 from "as3";
import { ASObject, int, trace, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ByteString, IAsn1Type, Integer, ObjectIdentifier, PrintableString, Sequence, Set, UTCTime } from "@game";

// goal 1: to be able to parse an RSA Private Key PEM file.
// goal 2: to parse an X509v3 cert. kinda.
/**
 * DER for dummies:
 * http://luca.ntop.org/Teaching/Appunti/asn1.html
 *
 * This class does the bare minimum to get by. if that.
 */
export class DER extends ASObject {
    public static indent: string = "";

    public static parse(der: ByteArray, structure: any = null): IAsn1Type {
        let p: int = 0;
        let ps: PrintableString = null;
        /* 			if (der.position==0) {
        trace("DER.parse: "+Hex.fromArray(der));
        }
         */
        // type
        let type: int = der.readUnsignedByte();
        let constructed: boolean = (type & 0x20) != 0;
        type &= 0x1F;
        // length
        let len: int = der.readUnsignedByte();
        if (len >= 0x80) {
            // long form of length
            let count: int = len & 0x7f;
            len = 0;
            while (count > 0) {
                len = (len << 8) | der.readUnsignedByte();
                count--;
            }
        }
        // data
        let b: ByteArray = null;
        switch (type) {
            case 0x00:
            // WHAT IS THIS THINGY? (seen as 0xa0)
            // (note to self: read a spec someday.)
            // for now, treat as a sequence.
            case 0x10:
                // SEQUENCE/SEQUENCE OF. whatever
                // treat as an array
                p = der.position;
                let o: Sequence = new Sequence(type >>> 0, len >>> 0);
                let arrayStruct: any[] = as3.as(structure, Array);
                if (arrayStruct != null) {
                    // copy the array, as we destroy it later.
                    arrayStruct = arrayStruct.concat();
                }
                while (der.position < p + len) {
                    let tmpStruct: any = null;
                    if (arrayStruct != null) {
                        tmpStruct = arrayStruct.shift();
                    }
                    if (tmpStruct != null) {
                        while (tmpStruct && tmpStruct.optional) {
                            // make sure we have something that looks reasonable. XXX I'm winging it here..
                            let wantConstructed: boolean = (as3.is(tmpStruct.value, Array));
                            let isConstructed: boolean = DER.isConstructedType(der);
                            if (wantConstructed != isConstructed) {
                                // not found. put default stuff, or null
                                o.push(tmpStruct.defaultValue);
                                o[tmpStruct.name] = tmpStruct.defaultValue;
                                // try the next thing
                                tmpStruct = arrayStruct.shift();
                            } else {
                                break;
                            }
                        }
                    }
                    if (tmpStruct != null) {
                        let name: string = as3.str(tmpStruct.name);
                        let value: any = tmpStruct.value;
                        if (tmpStruct.extract) {
                            // we need to keep a binary copy of this element
                            let size: int = DER.getLengthOfNextElement(der);
                            let ba: ByteArray = new ByteArray();
                            ba.writeBytes(der, der.position, size >>> 0);
                            o[name + "_bin"] = ba;
                        }
                        let obj: IAsn1Type = DER.parse(der, value);
                        o.push(obj);
                        o[name] = obj;
                    } else {
                        o.push(DER.parse(der));
                    }
                }
                return o;
            case 0x11:
                // SET/SET OF
                p = der.position;
                let s: Set = new Set(type >>> 0, len >>> 0);
                while (der.position < p + len) {
                    s.push(DER.parse(der));
                }
                return s;
            case 0x02:
                // INTEGER
                // put in a BigInteger
                b = new ByteArray();
                der.readBytes(b, 0, len >>> 0);
                b.position = 0;
                return new Integer(type >>> 0, len >>> 0, b);
            case 0x06:
                // OBJECT IDENTIFIER:
                b = new ByteArray();
                der.readBytes(b, 0, len >>> 0);
                b.position = 0;
                return new ObjectIdentifier(type >>> 0, len >>> 0, b);
            default:
                trace("I DONT KNOW HOW TO HANDLE DER stuff of TYPE " + type);
            // fall through
            case 0x03:
                // BIT STRING
                if (der[der.position] == 0) {
                    // trace("Horrible Bit String pre-padding removal hack."); // I wish I had the patience to find a spec for this.
                    der.position++;
                    len--;
                }
            case 0x04:
                // OCTET STRING
                // stuff in a ByteArray for now.
                let bs: ByteString = new ByteString(type >>> 0, len >>> 0);
                der.readBytes(bs, 0, len >>> 0);
                return bs;
            case 0x05:
                // NULL
                // if len!=0, something's horribly wrong.
                // should I check?
                return null;
            case 0x13:
                // PrintableString
                ps = new PrintableString(type >>> 0, len >>> 0);
                ps.setString(der.readMultiByte(len >>> 0, "US-ASCII"));
                return ps;
            case 0x22:
            // XXX look up what this is. openssl uses this to store my email.
            case 0x14:
                // T61String - an horrible format we don't even pretend to support correctly
                ps = new PrintableString(type >>> 0, len >>> 0);
                ps.setString(der.readMultiByte(len >>> 0, "latin1"));
                return ps;
            case 0x17:
                // UTCTime
                let ut: UTCTime = new UTCTime(type >>> 0, len >>> 0);
                ut.setUTCTime(der.readMultiByte(len >>> 0, "US-ASCII"));
                return ut;
        }
    }

    private static getLengthOfNextElement(b: ByteArray): int {
        let p: uint = b.position;
        // length
        b.position++;
        let len: int = b.readUnsignedByte();
        if (len >= 0x80) {
            // long form of length
            let count: int = len & 0x7f;
            len = 0;
            while (count > 0) {
                len = (len << 8) | b.readUnsignedByte();
                count--;
            }
        }
        len = (len + (b.position - p)) | 0;
        // length of length
        b.position = p;
        return len;
    }

    private static isConstructedType(b: ByteArray): boolean {
        let type: int = b[b.position] | 0;
        return (type & 0x20) != 0;
    }

    public static wrapDER(type: int, data: ByteArray): ByteArray {
        let d: ByteArray = new ByteArray();
        d.writeByte(type);
        let len: int = data.length;
        if (len < 128) {
            d.writeByte(len);
        } else if (len < 256) {
            d.writeByte(1 | 0x80);
            d.writeByte(len);
        } else if (len < 65536) {
            d.writeByte(2 | 0x80);
            d.writeByte(len >> 8);
            d.writeByte(len);
        } else if (len < 65536 * 256) {
            d.writeByte(3 | 0x80);
            d.writeByte(len >> 16);
            d.writeByte(len >> 8);
            d.writeByte(len);
        } else {
            d.writeByte(4 | 0x80);
            d.writeByte(len >> 24);
            d.writeByte(len >> 16);
            d.writeByte(len >> 8);
            d.writeByte(len);
        }
        d.writeBytes(data);
        d.position = 0;
        return d;
    }
}
