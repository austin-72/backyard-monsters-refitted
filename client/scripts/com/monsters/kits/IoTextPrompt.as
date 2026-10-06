package com.monsters.kits {
    import flash.display.Sprite;
    import flash.events.KeyboardEvent;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFieldType;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;
    import flash.text.AntiAliasType;
    import flash.filters.GlowFilter;
    import flash.filters.DropShadowFilter;
    import flash.ui.Keyboard;

    /**
     * Inferno-only: a small popup asking for one line of text (used to name a player kit).
     * OK calls back with what was typed; Cancel, or Escape, closes it without calling back.
     */
    public class IoTextPrompt extends Sprite {

        private static const W:int = 420;

        private static const H:int = 230;

        private var m_field:TextField;

        private var m_onOK:Function;

        public static function Show(title:String, text:String, initial:String, maxChars:int, okLabel:String, onOK:Function):IoTextPrompt {
            var prompt:IoTextPrompt = new IoTextPrompt(title, text, initial, maxChars, okLabel, onOK);
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(prompt);
            POPUPSETTINGS.AlignToCenter(prompt);
            POPUPSETTINGS.ScaleUp(prompt);
            if (prompt.stage) {
                prompt.stage.focus = prompt.m_field;
                prompt.m_field.setSelection(0, prompt.m_field.length);
            }
            return prompt;
        }

        /** Drawn like the game's other popups: the stock frame, the game's title font, a gold button. */
        public function IoTextPrompt(title:String, text:String, initial:String, maxChars:int, okLabel:String, onOK:Function) {
            super();
            this.m_onOK = onOK;
            var left:int = -int(W / 2);
            var top:int = -int(H / 2);

            var frame:frame_CLIP = addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = W;
            frame.height = H;
            frame.x = left;
            frame.y = top;
            frame.Setup(true, this.onCancel);

            var heading:TextField = addChild(new TextField()) as TextField;
            heading.selectable = false;
            heading.mouseEnabled = false;
            heading.embedFonts = true;
            heading.antiAliasType = AntiAliasType.NORMAL;
            var headingFormat:TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
            headingFormat.align = TextFormatAlign.CENTER;
            heading.defaultTextFormat = headingFormat;
            heading.width = W - 40;
            heading.height = 32;
            heading.x = left + 20;
            heading.y = top + 20;
            heading.text = title.toUpperCase();
            heading.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];

            var body:TextField = addChild(new TextField()) as TextField;
            body.selectable = false;
            body.mouseEnabled = false;
            body.wordWrap = true;
            body.multiline = true;
            var bodyFormat:TextFormat = new TextFormat("Verdana", 12, 0x46321E);
            bodyFormat.align = TextFormatAlign.CENTER;
            body.defaultTextFormat = bodyFormat;
            body.width = W - 60;
            body.height = 36;
            body.x = left + 30;
            body.y = top + 58;
            body.text = text;

            // input: a sunken parchment box
            graphics.lineStyle(2, 0x805C38);
            graphics.beginFill(0xFFFBEA);
            graphics.drawRoundRect(left + 40, top + 100, W - 80, 34, 10, 10);
            graphics.endFill();

            this.m_field = new TextField();
            this.m_field.type = TextFieldType.INPUT;
            var inputFormat:TextFormat = new TextFormat("Verdana", 15, 0x3A1A08, true);
            inputFormat.align = TextFormatAlign.CENTER;
            this.m_field.defaultTextFormat = inputFormat;
            this.m_field.selectable = true;
            this.m_field.multiline = false;
            this.m_field.maxChars = maxChars;
            this.m_field.restrict = "^<>&\"";
            this.m_field.x = left + 48;
            this.m_field.y = top + 106;
            this.m_field.width = W - 96;
            this.m_field.height = 24;
            this.m_field.text = initial;
            this.m_field.addEventListener(KeyboardEvent.KEY_DOWN, this.onKey);
            addChild(this.m_field);

            var ok:Button_CLIP = new Button_CLIP();
            ok.Setup(okLabel, false, 140, 34);
            ok.Highlight = true;
            ok.x = -70;
            ok.y = top + H - 34 - 28;
            ok.addEventListener(MouseEvent.CLICK, this.onOK);
            addChild(ok);
        }

        private function onKey(e:KeyboardEvent):void {
            e.stopPropagation();
            if (e.keyCode == Keyboard.ENTER) {
                this.onOK(null);
            }
            else if (e.keyCode == Keyboard.ESCAPE) {
                this.onCancel(null);
            }
        }

        private function onOK(e:MouseEvent = null):void {
            var callback:Function = this.m_onOK;
            var typed:String = this.m_field.text;
            this.close();
            if (callback != null) {
                callback(typed);
            }
        }

        private function onCancel(e:MouseEvent = null):void {
            this.close();
        }

        private function close():void {
            this.m_onOK = null;
            if (parent) {
                parent.removeChild(this);
                GLOBAL.BlockerRemove();
            }
        }
    }
}
