import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, CREATURELOCKER, GLOBAL, ImageCache, IoPets, KEYS, POPUPS, POPUPSETTINGS, SOUNDS } from "@game";

/**
 * Inferno-only: the Pets tab of the Buildings menu's Decorations (BUILDINGSPOPUP.SwitchB): a card for each
 * monster that can be a pet, ten to a page like the decorations: its picture, how many of it you have out in
 * the yard and in storage, Buy (for Shiny, after a yes; at most IoPets.perKind of one monster), Out / Store (bring
 * one out into the yard, at most IoPets.maxOut out at once, or put one away; one put away isn't refunded) and
 * Name (each of them can have a name, shown over it in the yard). Only in your own main yard.
 */
export class IoPetsPanel extends ASObject {
    public static readonly PER_PAGE: int = 10;

    private static readonly CARD_W: int = 120;

    private static readonly CARD_H: int = 160;

    /** The open names window (one at a time). */
    private static _names: Sprite = null;

    /** Fills the menu's thumbnail area with a page of pet cards; returns how many pages there are. */
    public static fill(holder: MovieClip, page: int, refresh: Function): int {
        if (!IoPets.ownYard()) {
            let away: TextField = as3.as(holder.addChild(IoPetsPanel.label("Pets live in your main yard: buy them and bring them out there.", 13, 3355443, true, 640, TextFormatAlign.CENTER)), TextField);
            away.y = 140;
            return 1;
        }
        let list: any[] = IoPets.monsters;
        let pages: int = Math.max(1, Math.ceil(list.length / IoPetsPanel.PER_PAGE)) | 0;
        page = Math.max(0, Math.min(pages - 1, page)) | 0;
        let col: int = 0;
        let row: int = 0;
        for (let i: int = (page * IoPetsPanel.PER_PAGE) | 0; i < list.length && i < (page + 1) * IoPetsPanel.PER_PAGE; i++) {
            let made: Sprite = as3.as(holder.addChild(IoPetsPanel.card(String(list[i]), refresh)), Sprite);
            made.x = col * 130;
            made.y = row * 170;
            if (++col == 5) {
                col = 0;
                row++;
            }
        }
        return pages;
    }

    /** The player's pets of one monster: [ids out], [ids in storage]. */
    private static mine(monster: string): any[] {
        let out: any[] = [];
        let stored: any[] = [];
        for (let p of as3.values(IoPets.pets)) {
            if (String(p[1]) == monster) {
                (p[2] | 0 ? out : stored).push(p[0] | 0);
            }
        }
        return [out, stored];
    }

    public static monsterName(monster: string): string {
        let c: any = CREATURELOCKER._creatures[monster];
        return c ? KEYS.Get(as3.str(c.name)) : monster;
    }

    private static card(monster: string, refresh: Function): Sprite {
        let picture: Sprite = null;
        let out: any[] = null;
        let stored: any[] = null;
        let owned: boolean = false;
        let full: boolean = false;
        let c: Sprite = new Sprite();
        c.name = "ioPetCard_" + monster;
        c.graphics.lineStyle(1, 0, 1);
        c.graphics.beginFill(16777215, 1);
        c.graphics.drawRect(0, 0, IoPetsPanel.CARD_W, IoPetsPanel.CARD_H);
        c.graphics.endFill();
        c.graphics.moveTo(0, 22);
        c.graphics.lineTo(IoPetsPanel.CARD_W, 22);
        let title: TextField = as3.as(c.addChild(IoPetsPanel.label(IoPetsPanel.monsterName(monster), 11, 0, true, IoPetsPanel.CARD_W, TextFormatAlign.CENTER)), TextField);
        title.y = 3;
        GLOBAL.ioFitText(title, 8);

        picture = as3.as(c.addChild(new Sprite()), Sprite);
        picture.x = ((IoPetsPanel.CARD_W - 86) / 2) | 0;
        picture.y = 26;
        ImageCache.GetImageWithCallBack("monsters/" + monster + "-medium.jpg", (key: string, bmd: BitmapData): void => {
            if (bmd) {
                picture.addChild(new Bitmap(bmd));
            }
        });

        let have: any[] = IoPetsPanel.mine(monster);
        out = as3.cast(have[0], Array);
        stored = as3.cast(have[1], Array);
        owned = out.length + stored.length > 0;
        let status: TextField = as3.as(c.addChild(IoPetsPanel.label(owned ? "Out " + out.length + " · Stored " + stored.length : "A pet for your yard", 10, (owned ? 0x2C4A0C : 0x666666) >>> 0, owned, IoPetsPanel.CARD_W, TextFormatAlign.CENTER)), TextField);
        status.y = 92;
        full = out.length + stored.length >= IoPets.perKind;

        let buy: Sprite = as3.as(c.addChild(IoPetsPanel.button(full ? "You have " + IoPets.perKind : "Buy · " + IoPets.price + " Shiny", (IoPetsPanel.CARD_W - 8) | 0, 20, (e: MouseEvent): void => {
            if (full) {
                return;
            }
            if (BASE._credits.Get() < IoPets.price) {
                POPUPS.DisplayGetShiny();
                return;
            }
            GLOBAL.Message("<b>Buy a " + IoPetsPanel.monsterName(monster) + " pet</b> for " + IoPets.price + " Shiny?<br><br>It wanders your main yard, just for looks. " + IoPets.maxOut + " pets can be out at once; the others wait in storage. You can give it a name (Name).", "Buy", (): void => {
                IoPets.buy(monster, (error: string): void => {
                    if (error) {
                        GLOBAL.Message(error);
                        return;
                    }
                    SOUNDS.Play("purchasepopup");
                    let nowHave: any[] = IoPetsPanel.mine(monster);
                    if (IoPets.outCount() >= IoPets.maxOut && nowHave[1].length > stored.length) {
                        GLOBAL.Message("Your new " + IoPetsPanel.monsterName(monster) + " is in storage: " + IoPets.maxOut + " pets are out in your yard already. Store one of them to bring it out.");
                    }
                    refresh();
                });
            }, null, "No", (): void => {
            });
        })), Sprite);
        buy.x = 4;
        buy.y = 110;
        buy.name = "ioPetBuy";
        IoPetsPanel.enable(buy, !full);

        let bringOut: Sprite = as3.as(c.addChild(IoPetsPanel.button("Out", 36, 20, (e: MouseEvent): void => {
            if (!stored.length) {
                return;
            }
            if (IoPets.outCount() >= IoPets.maxOut) {
                GLOBAL.Message("Only " + IoPets.maxOut + " pets can be out in your yard at once: store one of them first.");
                return;
            }
            IoPets.place(stored[0] | 0, true, IoPetsPanel.done(refresh));
        })), Sprite);
        bringOut.x = 4;
        bringOut.y = 134;
        bringOut.name = "ioPetOut";
        IoPetsPanel.enable(bringOut, stored.length > 0);

        let putAway: Sprite = as3.as(c.addChild(IoPetsPanel.button("Store", 36, 20, (e: MouseEvent): void => {
            if (!out.length) {
                return;
            }
            GLOBAL.Message("Put your " + IoPetsPanel.monsterName(monster) + " in storage?<br><br>It leaves the yard; bring it out again whenever you like. (No Shiny back.)", "Store", (): void => {
                IoPets.place(out[out.length - 1] | 0, false, IoPetsPanel.done(refresh));
            }, null, "No", (): void => {
            });
        })), Sprite);
        putAway.x = 42;
        putAway.y = 134;
        putAway.name = "ioPetStore";
        IoPetsPanel.enable(putAway, out.length > 0);

        let naming: Sprite = as3.as(c.addChild(IoPetsPanel.button("Name", 36, 20, (e: MouseEvent): void => {
            if (owned) {
                IoPetsPanel.names(monster, refresh);
            }
        })), Sprite);
        naming.x = 80;
        naming.y = 134;
        naming.name = "ioPetName";
        IoPetsPanel.enable(naming, owned);
        return c;
    }

    /**
     * The names of the player's pets of one monster: a box for each (empty: no name), Save (only the names that
     * changed go to the server, one after the other) and Close.
     */
    public static names(monster: string, refresh: Function): void {
        let list: any[] = null;
        let fields: any[] = null;
        IoPetsPanel.closeNames();
        list = [];
        for (let p of as3.values(IoPets.pets)) {
            if (String(p[1]) == monster) {
                list.push(p);
            }
        }
        if (!list.length) {
            return;
        }
        let W: int = 300;
        let rowH: int = 30;
        let Hh: int = (86 + list.length * rowH) | 0;
        let box: Sprite = new Sprite();
        box.name = "ioPetNames";
        box.graphics.lineStyle(2, 8017200, 1);
        box.graphics.beginFill(16181706, 1);
        box.graphics.drawRoundRect(-W / 2, -Hh / 2, W, Hh, 14, 14);
        box.graphics.endFill();
        let title: TextField = as3.as(box.addChild(IoPetsPanel.label("Name your " + IoPetsPanel.monsterName(monster) + (list.length > 1 ? " pets" : " pet"), 13, 2824716, true, (W - 20) | 0, TextFormatAlign.CENTER)), TextField);
        title.x = -W / 2 + 10;
        title.y = -Hh / 2 + 10;
        fields = [];
        for (let i: int = 0; i < list.length; i++) {
            let tag: TextField = as3.as(box.addChild(IoPetsPanel.label((i + 1) + (list[i][2] | 0 ? " (out)" : " (stored)"), 11, 7031334, true, 80, TextFormatAlign.LEFT)), TextField);
            tag.x = -W / 2 + 16;
            tag.y = -Hh / 2 + 44 + i * rowH;
            let f: TextField = new TextField();
            f.name = "ioPetNameField" + i;
            f.type = TextFieldType.INPUT;
            f.border = true;
            f.borderColor = 9071173;
            f.background = true;
            f.backgroundColor = 16777215;
            f.width = 180;
            f.height = 22;
            f.maxChars = IoPets.nameLength;
            let format: TextFormat = new TextFormat("Verdana", 12, 0x000000, true);
            f.defaultTextFormat = format;
            f.text = list[i].length > 3 && list[i][3] ? String(list[i][3]) : "";
            f.x = -W / 2 + 100;
            f.y = -Hh / 2 + 40 + i * rowH;
            box.addChild(f);
            fields.push(f);
        }
        let save: Sprite = as3.as(box.addChild(IoPetsPanel.button("Save", 90, 24, (e: MouseEvent): void => {
            let todo: any[] = null;
            let next: Function = null;
            todo = [];
            for (let j: int = 0; j < list.length; j++) {
                let wanted: string = as3.cast(fields[j], TextField).text.replace(/^\s+|\s+$/g, "");
                let had: string = list[j].length > 3 && list[j][3] ? String(list[j][3]) : "";
                if (wanted != had) {
                    todo.push([list[j][0] | 0, wanted]);
                }
            }
            next = (): void => {
                if (!todo.length) {
                    IoPetsPanel.closeNames();
                    refresh();
                    return;
                }
                let one: any[] = as3.cast(todo.shift(), Array);
                IoPets.name(one[0] | 0, String(one[1]), (error: string): void => {
                    if (error) {
                        GLOBAL.Message(error);
                        refresh();
                        return;
                    }
                    next();
                });
            };
            next();
        })), Sprite);
        save.name = "ioPetNamesSave";
        save.x = -100;
        save.y = Hh / 2 - 36;
        let close: Sprite = as3.as(box.addChild(IoPetsPanel.button("Close", 90, 24, (e: MouseEvent): void => {
            IoPetsPanel.closeNames();
        })), Sprite);
        close.x = 10;
        close.y = Hh / 2 - 36;
        IoPetsPanel._names = box;
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(box);
        POPUPSETTINGS.AlignToCenter(box);
    }

    public static closeNames(): void {
        if (IoPetsPanel._names) {
            if (IoPetsPanel._names.parent) {
                IoPetsPanel._names.parent.removeChild(IoPetsPanel._names);
            }
            GLOBAL.BlockerRemove();
            IoPetsPanel._names = null;
        }
    }

    private static done(refresh: Function): Function {
        return (error: string): void => {
            if (error) {
                GLOBAL.Message(error);
                return;
            }
            SOUNDS.Play("click1");
            refresh();
        };
    }

    private static enable(b: Sprite, on: boolean): void {
        b.alpha = Number(on ? 1 : 0.4);
        b.mouseEnabled = on;
        b.buttonMode = on;
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat("Verdana", size, color, bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    /** A small button in the menu's colours (yellow, as its tabs). */
    private static button(text: string, width: int, height: int, onClick: Function): Sprite {
        let b: Sprite = null;
        let draw: Function = null;
        b = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        draw = (fill: uint): void => {
            b.graphics.clear();
            b.graphics.lineStyle(1, 8022570, 1);
            b.graphics.beginFill(fill, 1);
            b.graphics.drawRoundRect(0, 0, width, height, 6, 6);
            b.graphics.endFill();
        };
        draw(0xFFE94D);
        let t: TextField = as3.as(b.addChild(IoPetsPanel.label(text, 10, 2236962, true, width, TextFormatAlign.CENTER)), TextField);
        t.y = ((height - 17) / 2) | 0;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(0xFFF59A);
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(0xFFE94D);
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick(e);
        });
        return b;
    }
}
