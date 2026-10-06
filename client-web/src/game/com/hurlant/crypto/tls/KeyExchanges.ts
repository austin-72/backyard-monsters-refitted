import { ASObject, uint } from "as3";

export class KeyExchanges extends ASObject {
    public static readonly NULL: uint = 0;
    public static readonly RSA: uint = 1;
    public static readonly DH_DSS: uint = 2;
    public static readonly DH_RSA: uint = 3;
    public static readonly DHE_DSS: uint = 4;
    public static readonly DHE_RSA: uint = 5;
    public static readonly DH_anon: uint = 6;

    public static useRSA(p: uint): boolean {
        return (p == KeyExchanges.RSA);
    }
}
