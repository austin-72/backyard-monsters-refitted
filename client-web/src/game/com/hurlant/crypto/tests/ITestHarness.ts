import * as as3 from "as3";

export interface ITestHarness {
    beginTestCase(name: string): void;
    endTestCase(): void;

    beginTest(name: string): void;
    passTest(): void;
    failTest(msg: string): void;
}
export const ITestHarness = as3.iface("com.hurlant.crypto.tests::ITestHarness", []);
