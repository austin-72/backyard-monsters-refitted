import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { AESKey, CBCMode, Hex, ITestHarness, NullPad, TestCase, XTeaKey } from "@game";

export class CBCModeTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "CBCMode Test");
        this.runTest(as3.bind(this, this.testAES), "CBC AES Test Vectors");
        this.runTest(as3.bind(this, this.testXTea), "CBC XTea Test Vectors");
        //
        this.runTest(as3.bind(this, this.testCBC_AES128), "CBC AES-128 Test Vectors");
        this.runTest(as3.bind(this, this.testCBC_AES192), "CBC AES-192 Test Vectors");
        this.runTest(as3.bind(this, this.testCBC_AES256), "CBC AES-256 Test Vectors");
        h.endTestCase();
    }

    /**
     * Hawt NIST Vectors: http://csrc.nist.gov/publications/nistpubs/800-38a/sp800-38a.pdf
     * Section F.2.1 and below.
     */
    public testCBC_AES128(): void {
        let key: ByteArray = Hex.toArray("2b7e151628aed2a6abf7158809cf4f3c");
        let pt: ByteArray = Hex.toArray("6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411e5fbc1191a0a52ef" + "f69f2445df4f9b17ad2b417be66c3710");
        let ct: ByteArray = Hex.toArray("7649abac8119b246cee98e9b12e9197d" + "5086cb9b507219ee95db113a917678b2" + "73bed6b8e3c1743b7116e69e22229516" + "3ff1caa1681fac09120eca307586e1a7");
        let cbc: CBCMode = new CBCMode(new AESKey(key), new NullPad());
        cbc.IV = Hex.toArray("000102030405060708090a0b0c0d0e0f");
        let src: ByteArray = new ByteArray();
        src.writeBytes(pt);
        cbc.encrypt(src);
        this.assert("CBC_AES128 test 1", Hex.fromArray(src) == Hex.fromArray(ct));
        cbc.decrypt(src);
        this.assert("CBC_AES128 test 2", Hex.fromArray(src) == Hex.fromArray(pt));
    }

    public testCBC_AES192(): void {
        let key: ByteArray = Hex.toArray("8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b");
        let pt: ByteArray = Hex.toArray("6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411e5fbc1191a0a52ef" + "f69f2445df4f9b17ad2b417be66c3710");
        let ct: ByteArray = Hex.toArray("4f021db243bc633d7178183a9fa071e8" + "b4d9ada9ad7dedf4e5e738763f69145a" + "571b242012fb7ae07fa9baac3df102e0" + "08b0e27988598881d920a9e64f5615cd");
        let cbc: CBCMode = new CBCMode(new AESKey(key), new NullPad());
        cbc.IV = Hex.toArray("000102030405060708090a0b0c0d0e0f");
        let src: ByteArray = new ByteArray();
        src.writeBytes(pt);
        cbc.encrypt(src);
        this.assert("CBC_AES192 test 1", Hex.fromArray(src) == Hex.fromArray(ct));
        cbc.decrypt(src);
        this.assert("CBC_AES192 test 2", Hex.fromArray(src) == Hex.fromArray(pt));
    }

    public testCBC_AES256(): void {
        let key: ByteArray = Hex.toArray("603deb1015ca71be2b73aef0857d7781" + "1f352c073b6108d72d9810a30914dff4");
        let pt: ByteArray = Hex.toArray("6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411e5fbc1191a0a52ef" + "f69f2445df4f9b17ad2b417be66c3710");
        let ct: ByteArray = Hex.toArray("f58c4c04d6e5f1ba779eabfb5f7bfbd6" + "9cfc4e967edb808d679f777bc6702c7d" + "39f23369a9d9bacfa530e26304231461" + "b2eb05e2c39be9fcda6c19078c6a9d1b");
        let cbc: CBCMode = new CBCMode(new AESKey(key), new NullPad());
        cbc.IV = Hex.toArray("000102030405060708090a0b0c0d0e0f");
        let src: ByteArray = new ByteArray();
        src.writeBytes(pt);
        cbc.encrypt(src);
        this.assert("CBC_AES256 test 1", Hex.fromArray(src) == Hex.fromArray(ct));
        cbc.decrypt(src);
        this.assert("CBC_AES256 test 2", Hex.fromArray(src) == Hex.fromArray(pt));
    }

    /**
     * For now the main goal is to show we can decrypt what we encrypt in this mode.
     * Eventually, this should get correlated with some well known vectors.
     */
    public testAES(): void {
        let keys: any[] = ["00010203050607080A0B0C0D0F101112", "14151617191A1B1C1E1F202123242526"];
        let cts: any[] = ["D8F532538289EF7D06B506A4FD5BE9C94894C5508A8D8E29AB600DB0261F0555A8FA287B89E65C0973F1F8283E70C72863FE1C8F1F782084CE05626E961A67B3", "59AB30F4D4EE6E4FF9907EF65B1FB68C96890CE217689B1BE0C93ED51CF21BB5A0101A8C30714EC4F52DBC9C6F4126067D363F67ABE58463005E679B68F0B496"];
        let pts: any[] = ["506812A45F08C889B97F5980038B8359506812A45F08C889B97F5980038B8359506812A45F08C889B97F5980038B8359", "5C6D71CA30DE8B8B00549984D2EC7D4B5C6D71CA30DE8B8B00549984D2EC7D4B5C6D71CA30DE8B8B00549984D2EC7D4B"];

        for (let i: uint = 0; i < keys.length; i++) {
            let key: ByteArray = Hex.toArray(as3.str(keys[i]));
            let pt: ByteArray = Hex.toArray(as3.str(pts[i]));
            let aes: AESKey = new AESKey(key);
            let cbc: CBCMode = new CBCMode(aes);
            cbc.IV = Hex.toArray("00000000000000000000000000000000");
            cbc.encrypt(pt);
            let str: string = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + cts[i] + " to " + str, cts[i] == str);
            // back to pt
            cbc.decrypt(pt);
            str = Hex.fromArray(pt).toUpperCase();
            this.assert("comparing " + pts[i] + " to " + str, pts[i] == str);
        }
    }

    public testXTea(): void {
        let keys: any[] = ["00000000000000000000000000000000", "2b02056806144976775d0e266c287843"];
        let cts: any[] = ["2dc7e8d3695b0538d8f1640d46dca717790af2ab545e11f3b08e798eb3f17b1744299d4d20b534aa", "790958213819878370eb8251ffdac371081c5a457fc42502c63910306fea150be8674c3b8e675516"];
        let pts: any[] = ["0000000000000000000000000000000000000000000000000000000000000000", "74657374206d652e74657374206d652e74657374206d652e74657374206d652e"];

        for (let i: uint = 0; i < keys.length; i++) {
            let key: ByteArray = Hex.toArray(as3.str(keys[i]));
            let pt: ByteArray = Hex.toArray(as3.str(pts[i]));
            let tea: XTeaKey = new XTeaKey(key);
            let cbc: CBCMode = new CBCMode(tea);
            cbc.IV = Hex.toArray("0000000000000000");
            cbc.encrypt(pt);
            let str: string = Hex.fromArray(pt);
            this.assert("comparing " + cts[i] + " to " + str, cts[i] == str);
            // now go back to plaintext.
            cbc.decrypt(pt);
            str = Hex.fromArray(pt);
            this.assert("comparing " + pts[i] + " to " + str, pts[i] == str);
        }
    }
}
