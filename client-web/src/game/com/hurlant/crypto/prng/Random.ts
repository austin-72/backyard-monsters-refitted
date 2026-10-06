import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Capabilities, System } from "flash/system";
import { Font } from "flash/text";
import { ByteArray, getTimer } from "flash/utils";
import { ARC4, IPRNG, Memory } from "@game";

export class Random extends ASObject {
    static {
        as3.fields(this, { state: null, ready: false, pool: null, psize: 0, pptr: 0, seeded: false });
    }

    private state: IPRNG;
    private ready: boolean;
    private pool: ByteArray;
    private psize: int;
    private pptr: int;
    private seeded: boolean;

    public $ctor(prng: any = null): void {
        super.$ctor();
        if (prng == null) {
            prng = ARC4;
        }
        this.state = as3.as(new prng(), IPRNG);
        this.psize = this.state.getPoolSize();
        this.pool = new ByteArray();
        this.pptr = 0;
        while (this.pptr < this.psize) {
            let t: uint = (65536 * Math.random()) >>> 0;
            this.pool[this.pptr++] = t >>> 8;
            this.pool[this.pptr++] = t & 255;
        }
        this.pptr = 0;
        this.seed();
    }

    public seed(x: int = 0): void {
        if (x == 0) {
            x = new Date().getTime() | 0;
        }
        this.pool[this.pptr++] ^= x & 255;
        this.pool[this.pptr++] ^= (x >> 8) & 255;
        this.pool[this.pptr++] ^= (x >> 16) & 255;
        this.pool[this.pptr++] ^= (x >> 24) & 255;
        this.pptr = (this.pptr % this.psize) | 0;
        this.seeded = true;
    }

    /**
     * Gather anything we have that isn't entirely predictable:
     *  - memory used
     *  - system capabilities
     *  - timing stuff
     *  - installed fonts
     */
    public autoSeed(): void {
        let b: ByteArray = new ByteArray();
        b.writeUnsignedInt(System.totalMemory);
        b.writeUTF(Capabilities.serverString);
        b.writeUnsignedInt(getTimer() >>> 0);
        b.writeUnsignedInt((new Date()).getTime() >>> 0);
        let a: any[] = Font.enumerateFonts(true);
        for (let f of as3.values(a)) {
            b.writeUTF(f.fontName);
            b.writeUTF(f.fontStyle);
            b.writeUTF(f.fontType);
        }
        b.position = 0;
        while (b.bytesAvailable >= 4) {
            this.seed(b.readUnsignedInt());
        }
    }

    public nextBytes(buffer: ByteArray, length: int): void {
        while (length--) {
            buffer.writeByte(this.nextByte());
        }
    }

    public nextByte(): int {
        if (!this.ready) {
            if (!this.seeded) {
                this.autoSeed();
            }
            this.state.init(this.pool);
            this.pool.length = 0;
            this.pptr = 0;
            this.ready = true;
        }
        return this.state.next();
    }

    public dispose(): void {
        for (let i: uint = 0; i < this.pool.length; i++) {
            this.pool[i] = Math.random() * 256;
        }
        this.pool.length = 0;
        this.pool = null;
        this.state.dispose();
        this.state = null;
        this.psize = 0;
        this.pptr = 0;
        Memory.gc();
    }

    public toString(): string {
        return "random-" + this.state.toString();
    }
}
