import * as as3 from "as3";
import { ICipher } from "@game";

/**
 * A marker to indicate how this cipher works.
 * A stream cipher:
 * - does not use initialization vector
 * - keeps some internal state between calls to encrypt() and decrypt()
 *
 */
export interface IStreamCipher extends ICipher {
}
export const IStreamCipher = as3.iface("com.hurlant.crypto.symmetric::IStreamCipher", [ICipher]);
