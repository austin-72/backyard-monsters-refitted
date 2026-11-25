import * as as3 from "as3";
import { ASObject, int } from "as3";
import { TextField, TextFormat } from "flash/text";
import { GLOBAL } from "@game";

/**
 * Inferno-only (QoL #564): the smallest text on a phone (GLOBAL.ioOnPhone). A landscape phone shows the game at
 * about 0.58 of its size, so a label the game shrank to 7 or 8 to fit read like 4 px. On a phone no text is drawn
 * under MIN (9), and the labels that carry information (countdowns, counts, "built / allowed", a quest's name,
 * coordinates) under MIN_INFO (11). Sizes are the game's own font sizes (stage pixels). Elsewhere nothing changes.
 *
 *  - smallest(n, info): the floor for GLOBAL.ioFitText / ioFitHeight: n, or at least MIN / MIN_INFO on a phone.
 *  - fit(field, n, info, scale): GLOBAL.ioFitText with that floor.
 *  - floor(field, info): every part of the field's text under the floor drawn at it (call after setting the text).
 *
 * A label raised so may no longer fit its box: on a phone, being readable comes first (its box may be widened
 * where there is room).
 */
export class IoPhoneText extends ASObject {
    /** The smallest text on a phone. */
    public static readonly MIN: int = 9;

    /** The smallest text on a phone for a label that carries information. */
    public static readonly MIN_INFO: int = 11;

    /** A test can set it: 1 on (as on a phone), 0 off, -1 (the default) as GLOBAL.ioOnPhone says. */
    public static force: int = -1;

    public $ctor(): void {
        super.$ctor();
    }

    /** Is the floor on (a phone, Inferno)? */
    public static get on(): boolean {
        if (!GLOBAL.INFERNO_ONLY) {
            return false;
        }
        if (IoPhoneText.force >= 0) {
            return IoPhoneText.force == 1;
        }
        return GLOBAL.ioOnPhone;
    }

    /** The smallest a fitted label may become: `n`, and on a phone at least MIN (`info`: MIN_INFO). */
    public static smallest(n: int, info: boolean = false): int {
        if (!IoPhoneText.on) {
            return n;
        }
        return Math.max(n, info ? IoPhoneText.MIN_INFO : IoPhoneText.MIN) | 0;
    }

    /** GLOBAL.ioFitText, never under the phone's floor. */
    public static fit(field: TextField, n: int = 8, info: boolean = false, scale: number = 1): void {
        GLOBAL.ioFitText(field, IoPhoneText.smallest(n, info), scale);
        IoPhoneText.floor(field, info);
    }

    /** On a phone: the parts of `field`'s text smaller than the floor drawn at the floor. */
    public static floor(field: TextField, info: boolean = false): void {
        if (!field || !IoPhoneText.on) {
            return;
        }
        let min: int = info ? IoPhoneText.MIN_INFO : IoPhoneText.MIN;
        let text: string = field.text;
        let n: int = text ? text.length | 0 : 0;
        if (n == 0) {
            let d: TextFormat = field.defaultTextFormat;
            if (d.size != null && Number(d.size) < min) {
                d.size = min;
                field.defaultTextFormat = d;
            }
            return;
        }
        let whole: TextFormat = field.getTextFormat();
        if (whole.size != null) {
            // (one size throughout)
            if (Number(whole.size) < min) {
                let f: TextFormat = new TextFormat();
                f.size = min;
                field.setTextFormat(f);
            }
            return;
        }
        // (several sizes: each smaller part raised; a long text is left as it is)
        if (n > 400) {
            return;
        }
        let up: TextFormat = new TextFormat();
        up.size = min;
        let start: int = -1;
        for (let i: int = 0; i <= n; i++) {
            let small: boolean = false;
            if (i < n) {
                let s: any = field.getTextFormat(i, i + 1).size;
                small = s != null && Number(s) < min;
            }
            if (small && start < 0) {
                start = i;
            } else if (!small && start >= 0) {
                field.setTextFormat(up, start, i);
                start = -1;
            }
        }
    }
}
