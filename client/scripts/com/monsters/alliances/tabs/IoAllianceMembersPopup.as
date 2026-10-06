package com.monsters.alliances.tabs {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.display.ScrollSetV;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the members of an alliance (Browse -> Actions -> Members). Same frame and title as
     * AllianceMessagePopup, with a scrolling list: name, level, and whether they lead it or are online.
     * Data: ALLIANCES.LoadAllianceMembers (server: /alliance/alliancemembers).
     */
    public class IoAllianceMembersPopup {
        private static const BG_W:int = 460;
        private static const PAD_H:int = 28;
        private static const PAD_TOP:int = 29;
        private static const TITLE_SIZE:int = 22;
        private static const LIST_H:int = 300;
        private static const ROW_H:int = 26;
        private static const CONTENT_W:int = BG_W - PAD_H * 2;

        private var _mc:MovieClip;

        public function Show(allianceName:String, members:Array):void {
            _mc = new MovieClip();
            const titleH:int = TITLE_SIZE + 8;
            const listH:int = Math.min(LIST_H, Math.max(1, members.length) * ROW_H + 4);
            const totalH:int = PAD_TOP + titleH + 10 + 20 + listH + 76;
            const frameX:int = -int(BG_W * 0.5);
            const frameY:int = -int(totalH * 0.5);
            const contentX:int = frameX + PAD_H;

            var frame:frame_CLIP = _mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = BG_W;
            frame.height = totalH;
            frame.x = frameX;
            frame.y = frameY;
            frame.Setup(true, _onClose);

            var tTitle:TextField = _mc.addChild(new TextField()) as TextField;
            tTitle.selectable = false;
            tTitle.mouseEnabled = false;
            tTitle.embedFonts = true;
            tTitle.antiAliasType = AntiAliasType.NORMAL;
            tTitle.width = CONTENT_W;
            tTitle.height = titleH;
            var titleFmt:TextFormat = new TextFormat("Groboldov", TITLE_SIZE, 0xFFFFFF);
            titleFmt.align = TextFormatAlign.CENTER;
            tTitle.defaultTextFormat = titleFmt;
            tTitle.text = allianceName;
            tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            tTitle.x = contentX;
            tTitle.y = frameY + PAD_TOP;

            var header:TextField = _mc.addChild(_label(members.length + (members.length == 1 ? " member" : " members"), 12, 0x333333, true, CONTENT_W, TextFormatAlign.CENTER)) as TextField;
            header.x = contentX;
            header.y = tTitle.y + titleH + 4;

            var listTop:int = int(header.y + 24);
            var box:Sprite = _mc.addChild(new Sprite()) as Sprite;
            box.graphics.lineStyle(1, 0x8A6A45, 1);
            box.graphics.beginFill(0xFFFFFF, 0.85);
            box.graphics.drawRect(0, 0, CONTENT_W, listH);
            box.graphics.endFill();
            box.x = contentX;
            box.y = listTop;

            var holder:MovieClip = _mc.addChild(new MovieClip()) as MovieClip;
            holder.x = contentX + 1;
            holder.y = listTop + 1;
            var rows:MovieClip = holder.addChild(new MovieClip()) as MovieClip;
            var i:int = 0;
            for each (var member:Object in members) {
                var row:Sprite = rows.addChild(new Sprite()) as Sprite;
                row.y = i * ROW_H;
                row.graphics.beginFill(i % 2 == 0 ? 0xF4EDE0 : 0xFFFFFF, 1);
                row.graphics.drawRect(0, 0, CONTENT_W - 18, ROW_H);
                row.graphics.endFill();
                var name:TextField = row.addChild(_label(String(member.display_name), 12, 0x000000, true, 220, TextFormatAlign.LEFT)) as TextField;
                name.x = 8;
                name.y = 4;
                var level:TextField = row.addChild(_label("Level " + int(member.level), 12, 0x333333, false, 70, TextFormatAlign.LEFT)) as TextField;
                level.x = 232;
                level.y = 4;
                var note:String = member.is_leader ? "Leader" : (member.online ? "Online" : "");
                var noteField:TextField = row.addChild(_label(note, 11, member.is_leader ? 0x8A4B00 : 0x2E7D32, true, 80, TextFormatAlign.RIGHT)) as TextField;
                noteField.x = CONTENT_W - 18 - 88;
                noteField.y = 5;
                i++;
            }
            if (members.length == 0) {
                var none:TextField = rows.addChild(_label("No members.", 12, 0x555555, false, CONTENT_W - 18, TextFormatAlign.CENTER)) as TextField;
                none.y = 4;
            }
            var maskMC:MovieClip = holder.addChild(new MovieClip()) as MovieClip;
            maskMC.graphics.beginFill(0xFF0000, 1);
            maskMC.graphics.drawRect(0, 0, CONTENT_W - 2, listH - 2);
            maskMC.graphics.endFill();
            rows.mask = maskMC;
            if (members.length * ROW_H > listH) {
                var scroll:ScrollSetV = holder.addChild(new ScrollSetV(rows, maskMC, true)) as ScrollSetV;
                scroll.x = CONTENT_W - 18;
            }

            var btn:Button_CLIP = _mc.addChild(new Button_CLIP()) as Button_CLIP;
            btn.Setup(KEYS.Get("alliance_btn_ok"), false, 140, 36);
            btn.x = -int(btn.width * 0.5);
            btn.y = frameY + totalH - 62;
            btn.addEventListener(MouseEvent.CLICK, _onClose);

            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(_mc);
            POPUPSETTINGS.AlignToCenter(_mc);
            POPUPSETTINGS.ScaleUp(_mc);
        }

        private static function _label(text:String, size:int, color:uint, bold:Boolean, width:int, align:String):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = width;
            field.height = size + 8;
            var fmt:TextFormat = new TextFormat("Verdana", size, color, bold);
            fmt.align = align;
            field.defaultTextFormat = fmt;
            field.text = text;
            return field;
        }

        private function _onClose(e:MouseEvent = null):void {
            SOUNDS.Play("close");
            GLOBAL.BlockerRemove();
            if (_mc && _mc.parent) {
                _mc.parent.removeChild(_mc);
            }
            _mc = null;
        }
    }
}
