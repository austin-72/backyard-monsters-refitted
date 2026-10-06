import { ASObject } from "as3";

export class OID extends ASObject {
    public static readonly RSA_ENCRYPTION: string = "1.2.840.113549.1.1.1";
    public static readonly MD2_WITH_RSA_ENCRYPTION: string = "1.2.840.113549.1.1.2";
    public static readonly MD5_WITH_RSA_ENCRYPTION: string = "1.2.840.113549.1.1.4";
    public static readonly SHA1_WITH_RSA_ENCRYPTION: string = "1.2.840.113549.1.1.5";
    public static readonly MD2_ALGORITHM: string = "1.2.840.113549.2.2";
    public static readonly MD5_ALGORITHM: string = "1.2.840.113549.2.5";
    public static readonly DSA: string = "1.2.840.10040.4.1";
    public static readonly DSA_WITH_SHA1: string = "1.2.840.10040.4.3";
    public static readonly DH_PUBLIC_NUMBER: string = "1.2.840.10046.2.1";
    public static readonly SHA1_ALGORITHM: string = "1.3.14.3.2.26";

    public static readonly COMMON_NAME: string = "2.5.4.3";
    public static readonly SURNAME: string = "2.5.4.4";
    public static readonly COUNTRY_NAME: string = "2.5.4.6";
    public static readonly LOCALITY_NAME: string = "2.5.4.7";
    public static readonly STATE_NAME: string = "2.5.4.8";
    public static readonly ORGANIZATION_NAME: string = "2.5.4.10";
    public static readonly ORG_UNIT_NAME: string = "2.5.4.11";
    public static readonly TITLE: string = "2.5.4.12";
}
