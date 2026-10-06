import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ArrayUtil, BulkCiphers, HMAC, ICipher, IConnectionState, IVMode, MACs, TLSError, TLSSecurityParameters } from "@game";

export class TLSConnectionState extends ASObject implements IConnectionState {
    static {
        as3.implement(this, [IConnectionState]);
        as3.fields(this, { bulkCipher: 0, cipherType: 0, CIPHER_key: null, CIPHER_IV: null, cipher: null, ivmode: null, macAlgorithm: 0, MAC_write_secret: null, hmac: null, seq_lo: 0, seq_hi: 0 });
    }

    // compression state
    // cipher state
    private bulkCipher: uint;
    private cipherType: uint;
    private CIPHER_key: ByteArray;
    private CIPHER_IV: ByteArray;
    private cipher: ICipher;
    private ivmode: IVMode;
    // mac secret
    private macAlgorithm: uint;
    private MAC_write_secret: ByteArray;
    private hmac: HMAC;
    // sequence number. uint64
    private seq_lo: uint;
    private seq_hi: uint;

    public $ctor(bulkCipher: uint = 0, cipherType: uint = 0, macAlgorithm: uint = 0, mac: ByteArray = null, key: ByteArray = null, IV: ByteArray = null): void {
        super.$ctor();
        this.bulkCipher = bulkCipher;
        this.cipherType = cipherType;
        this.macAlgorithm = macAlgorithm;
        this.MAC_write_secret = mac;
        this.hmac = MACs.getHMAC(macAlgorithm);
        this.CIPHER_key = key;
        this.CIPHER_IV = IV;
        this.cipher = BulkCiphers.getCipher(bulkCipher, key, 769);
        if (this.cipher instanceof IVMode) {
            this.ivmode = as3.as(this.cipher, IVMode);
            this.ivmode.IV = IV;
        }
    }

    public decrypt(type: uint, length: uint, p: ByteArray): ByteArray {
        // decompression is a nop.
        if (this.cipherType == BulkCiphers.STREAM_CIPHER) {
            if (this.bulkCipher == BulkCiphers.NULL) {
            } else {
                this.cipher.decrypt(p);
            }
        } else {
            // block cipher
            let nextIV: ByteArray = new ByteArray();
            nextIV.writeBytes(p, (p.length - this.CIPHER_IV.length) >>> 0, this.CIPHER_IV.length);

            this.cipher.decrypt(p);

            this.CIPHER_IV = nextIV;
            this.ivmode.IV = nextIV;
        }
        if (this.macAlgorithm != MACs.NULL) {
            let data: ByteArray = new ByteArray();
            let len: uint = (p.length - this.hmac.getHashSize()) >>> 0;
            data.writeUnsignedInt(this.seq_hi);
            data.writeUnsignedInt(this.seq_lo);
            data.writeByte(type);
            data.writeShort(TLSSecurityParameters.PROTOCOL_VERSION);
            data.writeShort(len);
            if (len != 0) {
                data.writeBytes(p, 0, len);
            }
            let mac: ByteArray = this.hmac.compute(this.MAC_write_secret, data);
            // compare "mac" with the last X bytes of p.
            let mac_received: ByteArray = new ByteArray();
            mac_received.writeBytes(p, len, this.hmac.getHashSize());
            if (ArrayUtil.equals(mac, mac_received)) {
            } else {
                throw new TLSError("Bad Mac Data", TLSError.bad_record_mac);
            }
            p.length = len;
            p.position = 0;
        }
        // increment seq
        this.seq_lo++;
        if (this.seq_lo == 0) {
            this.seq_hi++;
        }
        return p;
    }

    public encrypt(type: uint, p: ByteArray): ByteArray {
        let mac: ByteArray = null;
        if (this.macAlgorithm != MACs.NULL) {
            let data: ByteArray = new ByteArray();
            data.writeUnsignedInt(this.seq_hi);
            data.writeUnsignedInt(this.seq_lo);
            data.writeByte(type);
            data.writeShort(TLSSecurityParameters.PROTOCOL_VERSION);
            data.writeShort(p.length);
            if (p.length != 0) {
                data.writeBytes(p, 0, p.length);
            }
            mac = this.hmac.compute(this.MAC_write_secret, data);
            p.position = p.length;
            p.writeBytes(mac);
        }
        p.position = 0;
        if (this.cipherType == BulkCiphers.STREAM_CIPHER) {
            // stream cipher
            if (this.bulkCipher == BulkCiphers.NULL) {
            } else {
                this.cipher.encrypt(p);
            }
        } else {
            // block cipher
            this.cipher.encrypt(p);
            // adjust IV
            let nextIV: ByteArray = new ByteArray();
            nextIV.writeBytes(p, (p.length - this.CIPHER_IV.length) >>> 0, this.CIPHER_IV.length);
            this.CIPHER_IV = nextIV;
            this.ivmode.IV = nextIV;
        }
        // increment seq
        this.seq_lo++;
        if (this.seq_lo == 0) {
            this.seq_hi++;
        }
        // compression is a nop.
        return p;
    }
}
