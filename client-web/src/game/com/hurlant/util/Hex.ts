import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";

export class Hex extends ASObject {

    /**
     * Support straight hex, or colon-laced hex.
     * (that means 23:03:0e:f0, but *NOT* 23:3:e:f0)
     * Whitespace characters are ignored.
     */
    public static toArray(hex: string): ByteArray {
        hex = hex.replace(/\s|:/gm, '');
        let a: ByteArray = new ByteArray();
        if ((hex.length & 1) == 1) {
            hex = "0" + hex;
        }
        for (let i: uint = 0; i < hex.length; i = (i + 2) >>> 0) {
            a[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return a;
    }

    public static fromArray(array: ByteArray, colons: boolean = false): string {
        let s: string = "";
        for (let i: uint = 0; i < array.length; i++) {
            s += ("0" + array[i].toString(16)).substr(-2, 2);
            if (colons) {
                if (i < array.length - 1) {
                    s += ":";
                }
            }
        }
        return s;
    }

    /**
     *
     * @param hex
     * @return a UTF-8 string decoded from hex
     *
     */
    public static toString(hex: string): string {
        let a: ByteArray = Hex.toArray(hex);
        return a.readUTFBytes(a.length);
    }

    /**
     *
     * @param str
     * @return a hex string encoded from the UTF-8 string str
     *
     */
    public static fromString(str: string, colons: boolean = false): string {
        let a: ByteArray = new ByteArray();
        a.writeUTFBytes(str);
        return Hex.fromArray(a, colons);
    }
}
