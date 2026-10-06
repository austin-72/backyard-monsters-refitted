import { ASError, int, uint } from "as3";

export class TLSError extends ASError {
    public static readonly close_notify: uint = 0;
    public static readonly unexpected_message: uint = 10;
    public static readonly bad_record_mac: uint = 20;
    public static readonly decryption_failed: uint = 21;
    public static readonly record_overflow: uint = 22;
    public static readonly decompression_failure: uint = 30;
    public static readonly handshake_failure: uint = 40;
    public static readonly bad_certificate: uint = 42;
    public static readonly unsupported_certificate: uint = 43;
    public static readonly certificate_revoked: uint = 44;
    public static readonly certificate_expired: uint = 45;
    public static readonly certificate_unknown: uint = 46;
    public static readonly illegal_parameter: uint = 47;
    public static readonly unknown_ca: uint = 48;
    public static readonly access_denied: uint = 49;
    public static readonly decode_error: uint = 50;
    public static readonly decrypt_error: uint = 51;
    public static readonly protocol_version: uint = 70;
    public static readonly insufficient_security: uint = 71;
    public static readonly internal_error: uint = 80;
    public static readonly user_canceled: uint = 90;
    public static readonly no_renegotiation: uint = 100;

    public $ctor(message?: string, id?: int): void {
        super.$ctor(message, id);
    }
}
