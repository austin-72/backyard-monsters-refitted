import * as as3 from "as3";
import { ByteArray } from "flash/utils";
import { Hex, ITestHarness, PEM, RSAKey, TestCase } from "@game";

export class RSAKeyTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "RSA Testing");

        this.runTest(as3.bind(this, this.testSmoke), "RSA smoke test");
        this.runTest(as3.bind(this, this.testGenerate), "RSA Key Generation test");
        this.runTest(as3.bind(this, this.testPEM), "RSA Private Key PEM parsing");
        this.runTest(as3.bind(this, this.testPEM2), "RSA Public Key PEM parsing");
        h.endTestCase();
    }

    public testSmoke(): void {
        let N: string = "C4E3F7212602E1E396C0B6623CF11D26204ACE3E7D26685E037AD2507DCE82FC" + "28F2D5F8A67FC3AFAB89A6D818D1F4C28CFA548418BD9F8E7426789A67E73E41";
        let E: string = "10001";
        let D: string = "7cd1745aec69096129b1f42da52ac9eae0afebbe0bc2ec89253598dcf454960e" + "3e5e4ec9f8c87202b986601dd167253ee3fb3fa047e14f1dfd5ccd37e931b29d";
        let P: string = "f0e4dd1eac5622bd3932860fc749bbc48662edabdf3d2826059acc0251ac0d3b";
        let Q: string = "d13cb38fbcd06ee9bca330b4000b3dae5dae12b27e5173e4d888c325cda61ab3";
        let DMP1: string = "b3d5571197fc31b0eb6b4153b425e24c033b054d22b9c8282254fe69d8c8c593";
        let DMQ1: string = "968ffe89e50d7b72585a79b65cfdb9c1da0963cceb56c3759e57334de5a0ac3f";
        let IQMP: string = "d9bc4f420e93adad9f007d0e5744c2fe051c9ed9d3c9b65f439a18e13d6e3908";
        // create a key.
        let rsa: RSAKey = RSAKey.parsePrivateKey(N, E, D, P, Q, DMP1, DMQ1, IQMP);
        let txt: string = "hello";
        let src: ByteArray = Hex.toArray(Hex.fromString(txt));
        let dst: ByteArray = new ByteArray();
        let dst2: ByteArray = new ByteArray();
        rsa.encrypt(src, dst, src.length);
        rsa.decrypt(dst, dst2, dst.length);
        let txt2: string = Hex.toString(Hex.fromArray(dst2));
        this.assert("rsa encrypt+decrypt", txt == txt2);
    }

    public testGenerate(): void {
        let rsa: RSAKey = RSAKey.generate(256, "10001");
        // same lame smoke test here.
        let txt: string = "hello";
        let src: ByteArray = Hex.toArray(Hex.fromString(txt));
        let dst: ByteArray = new ByteArray();
        let dst2: ByteArray = new ByteArray();
        rsa.encrypt(src, dst, src.length);
        rsa.decrypt(dst, dst2, dst.length);
        let txt2: string = Hex.toString(Hex.fromArray(dst2));
        this.assert("rsa encrypt+decrypt", txt == txt2);
    }

    public testPEM(): void {
        let pem: string = "-----BEGIN RSA PRIVATE KEY-----\n" + "MGQCAQACEQDJG3bkuB9Ie7jOldQTVdzPAgMBAAECEQCOGqcPhP8t8mX8cb4cQEaR\n" + "AgkA5WTYuAGmH0cCCQDgbrto0i7qOQIINYr5btGrtccCCQCYy4qX4JDEMQIJAJll\n" + "OnLVtCWk\n" + "-----END RSA PRIVATE KEY-----";
        let rsa: RSAKey = PEM.readRSAPrivateKey(pem);

        // trace(rsa.dump());
        // obligatory use
        let txt: string = "hello";
        let src: ByteArray = Hex.toArray(Hex.fromString(txt));
        let dst: ByteArray = new ByteArray();
        let dst2: ByteArray = new ByteArray();
        rsa.encrypt(src, dst, src.length);
        rsa.decrypt(dst, dst2, dst.length);
        let txt2: string = Hex.toString(Hex.fromArray(dst2));
        this.assert("rsa encrypt+decrypt", txt == txt2);
    }

    public testPEM2(): void {
        let pem: string = "-----BEGIN PUBLIC KEY-----\n" + "MCwwDQYJKoZIhvcNAQEBBQADGwAwGAIRAMkbduS4H0h7uM6V1BNV3M8CAwEAAQ==\n" + "-----END PUBLIC KEY-----";
        let rsa: RSAKey = PEM.readRSAPublicKey(pem);
    }
}
