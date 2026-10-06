package com.monsters.baseplanner.components {
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only Yard Planner toolbar tile, in the style of the original tool icons: a white icon with a
     * black outline that turns yellow on hover and while its tool is active, with a small caption under it.
     */
    public class IoToolTile extends Sprite {

        public static const W:int = 50;

        public var id:String;

        private var _white:Bitmap;

        private var _yellow:Bitmap;

        private var _caption:TextField;

        private var _active:Boolean = false;

        private var _over:Boolean = false;

        public function IoToolTile(id:String, caption:String, white:BitmapData, yellow:BitmapData, withCaption:Boolean = true) {
            super();
            this.id = id;
            buttonMode = true;
            mouseChildren = false;
            var w:int = withCaption ? W : 30;
            // an invisible hit area the size of the tile
            graphics.beginFill(0, 0);
            graphics.drawRect(0, 0, w, withCaption ? 42 : 28);
            graphics.endFill();
            this._white = new Bitmap(white);
            this._yellow = new Bitmap(yellow);
            for each (var icon:Bitmap in [this._white, this._yellow]) {
                icon.smoothing = true;
                icon.x = int((w - icon.width) / 2);
                icon.y = int(1 + (26 - icon.height) / 2);
                addChild(icon);
            }
            if (withCaption) {
                this._caption = new TextField();
                this._caption.selectable = false;
                this._caption.mouseEnabled = false;
                var format:TextFormat = new TextFormat("Verdana", 9, 0xF4E6C8, true);
                format.align = TextFormatAlign.CENTER;
                this._caption.defaultTextFormat = format;
                this._caption.width = w;
                this._caption.height = 14;
                this._caption.y = 27;
                this._caption.text = caption;
                addChild(this._caption);
            }
            addEventListener(MouseEvent.ROLL_OVER, this.onOver);
            addEventListener(MouseEvent.ROLL_OUT, this.onOut);
            this.refresh();
        }

        public function set active(param1:Boolean):void {
            this._active = param1;
            this.refresh();
        }

        private function onOver(e:MouseEvent):void {
            this._over = true;
            this.refresh();
        }

        private function onOut(e:MouseEvent):void {
            this._over = false;
            this.refresh();
        }

        private function refresh():void {
            var lit:Boolean = this._active || this._over;
            this._yellow.visible = lit;
            this._white.visible = !lit;
            if (this._caption) {
                this._caption.textColor = this._active ? 0xFFE400 : 0xF4E6C8;
            }
        }
    }
}
