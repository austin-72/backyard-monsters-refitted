import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface ISecurityParameters {
    readonly version: uint;
    reset(): void;
    getBulkCipher(): uint;
    getCipherType(): uint;
    getMacAlgorithm(): uint;
    setCipher(cipher: uint): void;
    setCompression(algo: uint): void;
    setPreMasterSecret(secret: ByteArray): void;
    setClientRandom(secret: ByteArray): void;
    setServerRandom(secret: ByteArray): void;
    readonly useRSA: boolean;
    computeVerifyData(side: uint, handshakeMessages: ByteArray): ByteArray;
    computeCertificateVerify(side: uint, handshakeRecords: ByteArray): ByteArray;
    getConnectionStates(): any;
}
export const ISecurityParameters = as3.iface("com.hurlant.crypto.tls::ISecurityParameters", []);
