import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { Hex, ITestHarness, TestCase, XTeaKey } from "@game";

export class XTeaKeyTest extends TestCase {
    public $ctor(h?: ITestHarness): void {
        super.$ctor(h, "XTeaKey Test");
        this.runTest(as3.bind(this, this.testGetBlockSize), "XTea Block Size");
        this.runTest(as3.bind(this, this.testVectors), "XTea Test Vectors");

        h.endTestCase();
    }

    public testGetBlockSize(): void {
        let tea: XTeaKey = new XTeaKey(Hex.toArray("deadbabecafebeefdeadbabecafebeef"));
        this.assert("tea blocksize", tea.getBlockSize() == 8);
    }

    public testVectors(): void {
        // blah.
        // can't find working test vectors.
        // algorithms should not get published without vectors :(
        let keys: any[] = ["00000000000000000000000000000000", "2b02056806144976775d0e266c287843"];
        let pts: any[] = ["0000000000000000", "74657374206d652e"];
        let cts: any[] = ["2dc7e8d3695b0538", "7909582138198783"];

        // self-fullfilling vectors.
        // oh well, at least I can decrypt what I produce. :(
        for (let i: uint = 0; i < keys.length; i++) {
            let key: ByteArray = Hex.toArray(as3.str(keys[i]));
            let pt: ByteArray = Hex.toArray(as3.str(pts[i]));
            let tea: XTeaKey = new XTeaKey(key);
            tea.encrypt(pt);
            let out: string = Hex.fromArray(pt);
            this.assert("comparing " + cts[i] + " to " + out, cts[i] == out);
            // now go back to plaintext.
            pt.position = 0;
            tea.decrypt(pt);
            out = Hex.fromArray(pt);
            this.assert("comparing " + pts[i] + " to " + out, pts[i] == out);
        }
    }
}
