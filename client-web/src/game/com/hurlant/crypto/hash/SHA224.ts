import * as as3 from "as3";
import { uint } from "as3";
import { SHA256 } from "@game";

export class SHA224 extends SHA256 {
    public $ctor(): void {
        super.$ctor();
        this.h = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];
    }

    public override getHashSize(): uint {
        return 28;
    }

    public override toString(): string {
        return "sha224";
    }
}
