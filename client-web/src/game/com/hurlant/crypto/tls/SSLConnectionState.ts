import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ArrayUtil, BulkCiphers, ICipher, IConnectionState, IVMode, MAC, MACs, TLSError } from "@game";

export class SSLConnectionState extends ASObject implements IConnectionState {
    static {
        as3.implement(this, [IConnectionState]);
        as3.fields(this, { bulkCipher: 0, cipherType: 0, CIPHER_key: null, CIPHER_IV: null, cipher: null, ivmode: null, macAlgorithm: 0, MAC_write_secret: null, mac: null, seq_lo: 0, seq_hi: 0 });
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
    private mac: MAC;
    // sequence number. uint64
    private seq_lo: uint;
    private seq_hi: uint;

    public $ctor(bulkCipher: uint = 0, cipherType: uint = 0, macAlgorithm: uint = 0, mac_enc: ByteArray = null, key: ByteArray = null, IV: ByteArray = null): void {
        super.$ctor();
        this.bulkCipher = bulkCipher;
        this.cipherType = cipherType;
        this.macAlgorithm = macAlgorithm;
        this.MAC_write_secret = mac_enc;
        this.mac = MACs.getMAC(macAlgorithm);

        this.CIPHER_key = key;
        this.CIPHER_IV = IV;
        this.cipher = BulkCiphers.getCipher(bulkCipher, key, 768);
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
            p.position = 0;
            // block cipher
            if (this.bulkCipher == BulkCiphers.NULL) {
            } else {
                let nextIV: ByteArray = new ByteArray();
                nextIV.writeBytes(p, (p.length - this.CIPHER_IV.length) >>> 0, this.CIPHER_IV.length);
                p.position = 0;
                this.cipher.decrypt(p);

                this.CIPHER_IV = nextIV;
                this.ivmode.IV = nextIV;
            }
        }

        if (this.macAlgorithm != MACs.NULL) {
            // there will be CTX delay here as well,
            // I should probably optmize the hell out of it
            let data: ByteArray = new ByteArray();
            let len: uint = (p.length - this.mac.getHashSize()) >>> 0;
            data.writeUnsignedInt(this.seq_hi);
            data.writeUnsignedInt(this.seq_lo);

            data.writeByte(type);
            data.writeShort(len);
            if (len != 0) {
                data.writeBytes(p, 0, len);
            }
            let mac_enc: ByteArray = this.mac.compute(this.MAC_write_secret, data);
            // compare "mac" with the last X bytes of p.
            let mac_received: ByteArray = new ByteArray();
            mac_received.writeBytes(p, len, this.mac.getHashSize());
            if (ArrayUtil.equals(mac_enc, mac_received)) {
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
        let mac_enc: ByteArray = null;
        if (this.macAlgorithm != MACs.NULL) {
            let data: ByteArray = new ByteArray();

            // data.writeUnsignedInt(seq);
            // Sequence
            data.writeUnsignedInt(this.seq_hi);
            data.writeUnsignedInt(this.seq_lo);

            // Type
            data.writeByte(type);

            // Length
            data.writeShort(p.length);

            // The data
            if (p.length != 0) {
                data.writeBytes(p);
            }

            // trace("data for the MAC: " + Hex.fromArray(data));
            mac_enc = this.mac.compute(this.MAC_write_secret, data);
            // trace("MAC: " + Hex.fromArray( mac_enc ));
            p.position = p.length;
            p.writeBytes(mac_enc);
        }

        // trace("Record to encrypt: " + Hex.fromArray(p));
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
        return p;
    }
}
