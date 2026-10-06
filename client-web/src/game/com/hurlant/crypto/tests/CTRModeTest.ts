import * as as3 from "as3";
import { ByteArray } from "flash/utils";
import { AESKey, CTRMode, Hex, ITestHarness, NullPad, TestCase } from "@game";

export class CTRModeTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "CTRMode Test");
        this.runTest(as3.bind(this, this.testCTR_AES128), "CTR AES-128 Test Vectors");
        this.runTest(as3.bind(this, this.testCTR_AES192), "CTR AES-192 Test Vectors");
        this.runTest(as3.bind(this, this.testCTR_AES256), "CTR AES-256 Test Vectors");
        h.endTestCase();
    }

    /**
     * Vectors from http://csrc.nist.gov/CryptoToolkit/modes/800-38_Series_Publications/SP800-38A.pdf
     * Section F.5.1 and below.
     */
    public testCTR_AES128(): void {
        let key: ByteArray = Hex.toArray("2b7e151628aed2a6abf7158809cf4f3c");
        let pt: ByteArray = Hex.toArray("6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411e5fbc1191a0a52ef" + "f69f2445df4f9b17ad2b417be66c3710");
        let ct: ByteArray = Hex.toArray("874d6191b620e3261bef6864990db6ce" + "9806f66b7970fdff8617187bb9fffdff" + "5ae4df3edbd5d35e5b4f09020db03eab" + "1e031dda2fbe03d1792170a0f3009cee");
        let ctr: CTRMode = new CTRMode(new AESKey(key), new NullPad());
        ctr.IV = Hex.toArray("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
        let src: ByteArray = new ByteArray();
        src.writeBytes(pt);
        ctr.encrypt(src);
        let hsrc: string = Hex.fromArray(src);
        let hct: string = Hex.fromArray(ct);
        this.assert("CTR_AES128 test 1: " + hsrc + " != " + hct, hsrc == hct);
        ctr.decrypt(src);
        hsrc = Hex.fromArray(src);
        let hpt: string = Hex.fromArray(pt);
        this.assert("CTR_AES128 test 2: " + hsrc + " != " + hpt, hsrc == hpt);
    }

    public testCTR_AES192(): void {
        let key: ByteArray = Hex.toArray("8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b");
        let pt: ByteArray = Hex.toArray("6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411e5fbc1191a0a52ef" + "f69f2445df4f9b17ad2b417be66c3710");
        let ct: ByteArray = Hex.toArray("1abc932417521ca24f2b0459fe7e6e0b" + "090339ec0aa6faefd5ccc2c6f4ce8e94" + "1e36b26bd1ebc670d1bd1d665620abf7" + "4f78a7f6d29809585a97daec58c6b050");
        let ctr: CTRMode = new CTRMode(new AESKey(key), new NullPad());
        ctr.IV = Hex.toArray("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
        let src: ByteArray = new ByteArray();
        src.writeBytes(pt);
        ctr.encrypt(src);
        let hsrc: string = Hex.fromArray(src);
        let hct: string = Hex.fromArray(ct);
        this.assert("CTR_AES192 test 1: " + hsrc + " != " + hct, hsrc == hct);
        ctr.decrypt(src);
        hsrc = Hex.fromArray(src);
        let hpt: string = Hex.fromArray(pt);
        this.assert("CTR_AES192 test 2: " + hsrc + " != " + hpt, hsrc == hpt);
    }

    public testCTR_AES256(): void {
        let key: ByteArray = Hex.toArray("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4");
        let pt: ByteArray = Hex.toArray("6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411e5fbc1191a0a52ef" + "f69f2445df4f9b17ad2b417be66c3710");
        let ct: ByteArray = Hex.toArray("601ec313775789a5b7a7f504bbf3d228" + "f443e3ca4d62b59aca84e990cacaf5c5" + "2b0930daa23de94ce87017ba2d84988d" + "dfc9c58db67aada613c2dd08457941a6");
        let ctr: CTRMode = new CTRMode(new AESKey(key), new NullPad());
        ctr.IV = Hex.toArray("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
        let src: ByteArray = new ByteArray();
        src.writeBytes(pt);
        ctr.encrypt(src);
        let hsrc: string = Hex.fromArray(src);
        let hct: string = Hex.fromArray(ct);
        this.assert("CTR_AES256 test 1: " + hsrc + " != " + hct, hsrc == hct);
        ctr.decrypt(src);
        hsrc = Hex.fromArray(src);
        let hpt: string = Hex.fromArray(pt);
        this.assert("CTR_AES256 test 2: " + hsrc + " != " + hpt, hsrc == hpt);
    }
}
