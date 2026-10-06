package com.monsters.maproom_advanced {
    import flash.display.DisplayObject;
    import flash.display.Graphics;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import com.monsters.quests.IoQuests;

    /**
     * Inferno-only: the world map's filters (IoMapFilters), behind a button on the map window's top edge, left
     * of the zoom buttons. The button opens a panel under it: whose yards show (you, your alliance, friendly,
     * hostile, other alliances, no alliance), main yards and / or outposts, and what else the world map draws
     * (your flinger range, your bookmarks). A dot on the button says when yards are filtered out.
     */
    public class IoMapFiltersPopup extends Sprite {

        private static const SIZE:int = 26;

        private static const PANEL_W:int = 176;

        private var _button:Sprite;

        private var _mark:Shape;

        private var _panel:Sprite;

        private var _onChange:Function;

        private var _isWorld:Function;

        /** onChange(): a filter changed. isWorld(): whether the world map is showing (else a note says where they apply). */
        public function IoMapFiltersPopup(onChange:Function, isWorld:Function) {
            super();
            this._onChange = onChange;
            this._isWorld = isWorld;
            this._button = new Sprite();
            this.drawButton(this._button.graphics);
            this._button.buttonMode = true;
            this._button.mouseChildren = false;
            this._button.addEventListener(MouseEvent.CLICK, this.onButton);
            this._button.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    _button.alpha = 0.8;
                });
            this._button.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    _button.alpha = 1;
                });
            addChild(this._button);
            this._mark = new Shape();
            this._mark.graphics.lineStyle(1, 0x3B2410, 1);
            this._mark.graphics.beginFill(0xFF4628, 1);
            this._mark.graphics.drawCircle(SIZE - 3, 3, 4);
            this._mark.graphics.endFill();
            this._button.addChild(this._mark);
            addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation(); // not a drag of the map, nor a click on the frame below
                });
            addEventListener(MouseEvent.MOUSE_WHEEL, function(e:MouseEvent):void {
                    e.stopPropagation();
                });
            this.update();
        }

        /** A round gold button like the yard's zoom buttons, with a funnel on it. */
        private function drawButton(g:Graphics):void {
            var r:Number = SIZE * 0.5;
            g.lineStyle(2, 0x6B4A12, 1, true);
            g.beginFill(0xE2B227, 1);
            g.drawCircle(r, r, r - 1);
            g.endFill();
            g.lineStyle();
            g.beginFill(0x3B2410, 1);
            g.moveTo(r - 7, r - 6);
            g.lineTo(r + 7, r - 6);
            g.lineTo(r + 1.8, r);
            g.lineTo(r + 1.8, r + 6);
            g.lineTo(r - 1.8, r + 8);
            g.lineTo(r - 1.8, r);
            g.lineTo(r - 7, r - 6);
            g.endFill();
        }

        public function get isOpen():Boolean {
            return this._panel != null;
        }

        /** The dot on the button: some yards are filtered out. */
        private function update():void {
            this._mark.visible = IoMapFilters.active;
        }

        private function onButton(e:MouseEvent):void {
            e.stopPropagation();
            SOUNDS.Play("click1");
            if (this._panel) {
                this.Close();
            }
            else {
                this.open();
            }
        }

        private function open():void {
            var y:int = 8;
            var w:int = PANEL_W - 20;
            var i:int = 0;
            var box:MovieClip = null;
            var title:TextField = null;
            var close:Sprite = null;
            var note:TextField = null;
            var reset:MovieClip = null;
            this.Close();
            this._panel = new Sprite();
            title = IoMapUi.label("FILTERS", 10, IoMapUi.MUTED, true, 100);
            title.x = 10;
            title.y = y;
            this._panel.addChild(title);
            close = new Sprite();
            IoMapUi.hitArea(close.graphics, 18, 18);
            IoMapUi.cross(close.graphics, 5, 5, 8, IoMapUi.MUTED);
            close.x = PANEL_W - 24;
            close.y = y - 1;
            close.buttonMode = true;
            close.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    Close();
                });
            this._panel.addChild(close);
            y += 20;
            if (this._isWorld != null && !this._isWorld()) {
                note = IoMapUi.label("They change the world map (zoom out to see it).", 10, IoMapUi.MUTED, false, w);
                note.multiline = true;
                note.wordWrap = true;
                note.height = 30;
                note.x = 10;
                note.y = y;
                this._panel.addChild(note);
                y += 30;
            }
            y += this.heading("SHOW PLAYERS", y);
            while (i < IoMapUi.RELATION_NAMES.length) {
                box = this.relationBox(i, w);
                box.x = 10;
                box.y = y;
                this._panel.addChild(box);
                y += 20;
                i++;
            }
            y += 4;
            y += this.heading("YARDS", y);
            box = IoMapUi.checkbox("Main yards", IoMapFilters.mains, function(on:Boolean):void {
                    IoMapFilters.mains = on;
                    changed();
                }, w);
            box.x = 10;
            box.y = y;
            this._panel.addChild(box);
            y += 20;
            box = IoMapUi.checkbox("Outposts", IoMapFilters.outposts, function(on:Boolean):void {
                    IoMapFilters.outposts = on;
                    changed();
                }, w);
            box.x = 10;
            box.y = y;
            this._panel.addChild(box);
            y += 24;
            y += this.heading("ON THE MAP", y);
            box = IoMapUi.checkbox("My flinger range", IoMapFilters.range, function(on:Boolean):void {
                    IoMapFilters.range = on;
                    changed();
                }, w);
            box.x = 10;
            box.y = y;
            this._panel.addChild(box);
            y += 20;
            box = IoMapUi.checkbox("Bookmarks", IoMapFilters.bookmarks, function(on:Boolean):void {
                    IoMapFilters.bookmarks = on;
                    changed();
                }, w);
            box.x = 10;
            box.y = y;
            this._panel.addChild(box);
            y += 26;
            if (IoMapFilters.active) {
                reset = IoMapUi.button("Show everyone", w, 22, function(e:MouseEvent):void {
                        IoMapFilters.reset();
                        changed();
                    }, "grey", 10);
                reset.x = 10;
                reset.y = y;
                this._panel.addChild(reset);
                y += 30;
            }
            y += 4;
            this._panel.graphics.clear();
            IoMapUi.roundBox(this._panel.graphics, 0, 0, PANEL_W, y, IoMapUi.PAPER, 1, IoMapUi.EDGE, 8, 2);
            // under the button, its right edge on the button's
            this._panel.x = SIZE - PANEL_W;
            this._panel.y = SIZE + 6;
            addChild(this._panel);
        }

        private function heading(text:String, y:int):int {
            var t:TextField = IoMapUi.label(text, 9, IoMapUi.MUTED, true, PANEL_W - 20);
            t.x = 10;
            t.y = y + 2;
            this._panel.addChild(t);
            return 18;
        }

        private function relationBox(relation:int, w:int):MovieClip {
            return IoMapUi.checkbox(IoMapUi.RELATION_NAMES[relation], IoMapFilters.relations[relation], function(on:Boolean):void {
                    IoMapFilters.relations[relation] = on;
                    changed();
                }, w, int(IoMapUi.relationColour(relation)));
        }

        private function changed():void {
            IoMapFilters.changed();
            IoQuests.once("map_filters"); // (the quest book)
            this.update();
            if (this._onChange != null) {
                this._onChange();
            }
            // "Show everyone" comes and goes: the panel again, as it is now.
            if (this._panel) {
                this.open();
            }
        }

        /** A mouse press anywhere else closes the panel (the map room calls this). */
        public function ioStageDown(target:DisplayObject):void {
            if (this._panel && target && !this.contains(target)) {
                this.Close();
            }
        }

        public function Close():void {
            if (this._panel) {
                if (this._panel.parent) {
                    this._panel.parent.removeChild(this._panel);
                }
                this._panel = null;
            }
        }

        public function Cleanup():void {
            this.Close();
            this._onChange = null;
            this._isWorld = null;
            if (parent) {
                parent.removeChild(this);
            }
        }
    }
}
