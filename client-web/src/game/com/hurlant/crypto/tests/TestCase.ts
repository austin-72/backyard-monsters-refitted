import * as as3 from "as3";
import { ASObject, trace } from "as3";
import { ITestHarness } from "@game";

export class TestCase extends ASObject {
    static {
        as3.fields(this, { harness: null });
    }

    public harness: ITestHarness;

    public $ctor(h?: ITestHarness, title?: string): void {
        super.$ctor();
        this.harness = h;
        this.harness.beginTestCase(title);
    }

    public assert(msg: string, value: boolean): void {
        if (value) {
            // TestHarness.print("+ ",msg);
            return;
        }
        throw new Error("Test Failure:" + msg);
    }

    public runTest(f: Function, title: string): void {
        this.harness.beginTest(title);
        try {
            f();
        } catch (e) {
            trace("EXCEPTION THROWN: " + e);
            trace(e.getStackTrace());
            this.harness.failTest(as3.str(e.toString()));
            return;
        }
        this.harness.passTest();
    }
}
