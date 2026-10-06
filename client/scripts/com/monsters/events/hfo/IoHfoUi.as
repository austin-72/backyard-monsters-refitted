package com.monsters.events.hfo {
    import com.monsters.monsters.creeps.inferno.hfo.IoRimegrave;
    import com.monsters.configs.BYMConfig;
    import com.monsters.display.ImageCache;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Hell Freezes Over: what the player sees of the event besides the yard (IoHfo): the line under the top bar
     * (towers freed on Day 3; "the ice is weakening" once every wave is through with some skipped), the popups
     * (Hell has frozen over!, a wave won or lost, the last wave, the champion), the event's window (its button
     * sits under Moloch's Gauntlet's from Day 3: UI_TOP) and Rimegrave standing where the ice was.
     * Every text is a language key (hfo_*: server/public/gamestage/assets/*.json).
     */
    public class IoHfoUi {

        // ---- the line under the top bar

        private static var _hud:Sprite = null;

        public static function Hud():void {
            HudOff();
            var f:Object = IoHfo.flag();
            if (!f || !IoHfo.inYard() || WMATTACK._inProgress) {
                return;
            }
            var text:String = null;
            var click:Boolean = false;
            if (int(f.day) == 3 && f.towers.iced) {
                text = KEYS.Get("hfo_hud_towers", {"v1": (f.towers.thawed as Array).length, "v2": (f.towers.iced as Array).length});
            }
            else if (int(f.day) >= 4 && !(Number(f.done) > 0) && int(f.current) > 13) {
                text = KEYS.Get("hfo_banner_weakening");
                click = true;
            }
            if (!text) {
                return;
            }
            _hud = new Sprite();
            _hud.name = "ioHfoHud";
            var t:TextField = label(text, 14, 0xE8F6FF, true, 520, TextFormatAlign.CENTER);
            t.filters = [new GlowFilter(0x0A2A4A, 1, 4, 4, 6, 1)];
            var w:Number = Math.max(240, t.textWidth + 40);
            _hud.graphics.lineStyle(2, 0x9ADCFF, 1);
            _hud.graphics.beginFill(0x0E2A44, 0.88);
            _hud.graphics.drawRoundRect(-w / 2, 0, w, 30, 14, 14);
            _hud.graphics.endFill();
            // (centred in the bar by its own width: an auto-sized field kept its left edge, so the text ran out of
            // the bar: the user's report, 4 October)
            t.width = w - 16;
            t.height = 22;
            t.x = -t.width / 2;
            t.y = 4;
            _hud.addChild(t);
            if (click) {
                _hud.buttonMode = true;
                _hud.mouseChildren = false;
                _hud.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                        ShowWindow();
                    });
            }
            else {
                _hud.mouseEnabled = false;
                _hud.mouseChildren = false;
            }
            GLOBAL.RefreshScreen();
            _hud.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width / 2;
            _hud.y = GLOBAL._SCREEN.y + 84;
            GLOBAL._layerUI.addChild(_hud);
        }

        public static function HudOff():void {
            if (_hud && _hud.parent) {
                _hud.parent.removeChild(_hud);
            }
            _hud = null;
        }

        // ---- popups (POPUPS): the pack's header art with the title over it, the text, buttons

        private static const POP_W:int = 480;

        /** buttons: [[text, onClick], ...]; the first is the main one. */
        private static function popup(header:String, title:String, body:String, buttons:Array):MovieClip {
            var mc:MovieClip = new MovieClip();
            mc.name = "ioHfoPopup";
            var bodyField:TextField = label("", 13, 0xEAF4FF, false, POP_W - 60, TextFormatAlign.CENTER);
            bodyField.multiline = true;
            bodyField.wordWrap = true;
            bodyField.htmlText = body;
            bodyField.autoSize = TextFieldAutoSize.CENTER;
            var h:int = 20 + 150 + 14 + int(bodyField.textHeight) + 16 + 40 + 22;
            var left:int = -POP_W / 2;
            var top:int = -int(h / 2);
            var m:Matrix = new Matrix();
            m.createGradientBox(POP_W, h, Math.PI / 2, left, top);
            var bg:Shape = new Shape();
            bg.graphics.lineStyle(4, 0x061424, 1);
            bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E4466, 0x0E2238, 0x081626], [1, 1, 1], [0, 120, 255], m);
            bg.graphics.drawRoundRect(left, top, POP_W, h, 24, 24);
            bg.graphics.endFill();
            bg.graphics.lineStyle(2, 0x9ADCFF, 0.9);
            bg.graphics.drawRoundRect(left + 5, top + 5, POP_W - 10, h - 10, 20, 20);
            bg.filters = [new GlowFilter(0x6AC8FF, 0.6, 18, 18, 2, 2)];
            mc.addChild(bg);
            var art:Sprite = new Sprite();
            art.x = -220;
            art.y = top + 20;
            mc.addChild(art);
            ImageCache.GetImageWithCallBack("hfo/ui/" + header, function(key:String, bmd:BitmapData, args:Array = null):void {
                    var b:Bitmap = new Bitmap(bmd);
                    b.smoothing = true;
                    art.addChildAt(b, 0);
                });
            var titleField:TextField = label(title, 26, 0xFFFFFF, false, 440, TextFormatAlign.CENTER, "Groboldov");
            titleField.embedFonts = true;
            titleField.height = 40;
            titleField.y = 150 - 46;
            titleField.filters = [new GlowFilter(0x1A5AA0, 1, 6, 6, 6, 2), new DropShadowFilter(2, 45, 0, 0.9, 3, 3, 1, 2)];
            art.addChild(titleField);
            bodyField.x = left + 30;
            bodyField.y = top + 20 + 150 + 14;
            mc.addChild(bodyField);
            var bw:int = buttons.length > 1 ? 180 : 220;
            var gap:int = 16;
            var total:int = buttons.length * bw + (buttons.length - 1) * gap;
            for (var i:int = 0; i < buttons.length; i++) {
                var b:Sprite = iceButton(String(buttons[i][0]), bw, 36, buttons[i][1] as Function, true, i == 0);
                b.x = -total / 2 + i * (bw + gap);
                b.y = top + h - 22 - 36;
                mc.addChild(b);
            }
            return mc;
        }

        private static function show(mc:MovieClip):void {
            POPUPS.Push(mc, null, null, "", "", false, "now");
        }

        /** "Hell has frozen over!": the last tower is free and the waves begin. */
        public static function FrozenPopup():void {
            show(popup("popup_frozen.png", KEYS.Get("hfo_pop_frozen_title"), KEYS.Get("hfo_pop_frozen_body"), [[KEYS.Get("hfo_pop_frozen_btn"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                IoHfo.call("seen", [["what", "frozen"]], function(r:Object):void {
                                        Hud();
                                        IoHfoWaves.Start(int(IoHfo.flag().current));
                                    });
                            }]]));
            SOUNDS.Play("quake", 0.3);
        }

        /** After a wave (the server's `last`): won, lost, skipped; and what to do next. */
        public static function WaveResult(r:Object):void {
            var f:Object = IoHfo.flag();
            var last:Object = f ? f.last : null;
            if (!f || !last) {
                return;
            }
            var current:int = int(f.current);
            var done:Boolean = Number(f.done) > 0;
            var close:Array = [KEYS.Get("btn_close"), function(e:MouseEvent):void {
                    POPUPS.Next();
                }];
            var buttons:Array = [];
            var title:String;
            var body:String;
            var header:String;
            if (last.result == "won") {
                header = "popup_wave_won.png";
                if (int(last.wave) == 13 && int(last.paid) > 0) {
                    title = KEYS.Get("hfo_pop_final_title");
                    body = KEYS.Get("hfo_pop_final_body", {"v1": int(last.paid)});
                }
                else {
                    title = KEYS.Get("hfo_pop_wave_won_title");
                    body = int(last.paid) > 0 ? KEYS.Get("hfo_pop_wave_won_body", {"v1": int(last.paid)}) : KEYS.Get("hfo_pop_wave_won_replay_body");
                }
                if (done) {
                    buttons.push([KEYS.Get("btn_ok"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                IoHfo.Reveal();
                            }]);
                }
                else if (current <= 13) {
                    buttons.push([KEYS.Get("hfo_pop_wave_won_btn"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                IoHfoWaves.Start(current);
                            }], close);
                }
                else {
                    buttons.push([KEYS.Get("btn_ok"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                ShowWindow();
                            }]);
                }
                SOUNDS.Play("chaching");
            }
            else {
                header = "popup_wave_failed.png";
                title = KEYS.Get("hfo_pop_wave_failed_title");
                if (last.replay) {
                    body = KEYS.Get("hfo_pop_wave_replay_failed_body");
                    buttons.push([KEYS.Get("hfo_pop_wave_retry_btn"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                IoHfoWaves.Start(int(last.wave));
                            }], close);
                }
                else if (!last.skipped) {
                    body = KEYS.Get("hfo_pop_wave_failed_body", {"v1": int(last.triesLeft)});
                    buttons.push([KEYS.Get("hfo_pop_wave_retry_btn"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                IoHfoWaves.Start(current);
                            }], close);
                }
                else {
                    body = KEYS.Get("hfo_pop_wave_skipped_body");
                    if (current <= 13) {
                        buttons.push([KEYS.Get("hfo_pop_wave_won_btn"), function(e:MouseEvent):void {
                                    POPUPS.Next();
                                    IoHfoWaves.Start(current);
                                }], close);
                    }
                    else {
                        buttons.push([KEYS.Get("btn_ok"), function(e:MouseEvent):void {
                                    POPUPS.Next();
                                    ShowWindow();
                                }]);
                    }
                }
            }
            show(popup(header, title, body, buttons));
        }

        /** The curse is broken: Rimegrave can be unlocked. Opens the Strongbox on him. */
        public static function ChampionPopup():void {
            show(popup("popup_champion.png", KEYS.Get("hfo_pop_champion_title"), KEYS.Get("hfo_pop_champion_body"), [[KEYS.Get("hfo_pop_champion_btn"), function(e:MouseEvent):void {
                                POPUPS.Next();
                                CREATURELOCKER._popupCreatureID = CREATURELOCKER.RIMEGRAVE_ID;
                                CREATURELOCKER._page = 5;
                                CREATURELOCKER.Show();
                            }], [KEYS.Get("btn_close"), function(e:MouseEvent):void {
                                POPUPS.Next();
                            }]]));
        }

        // ---- Rimegrave, standing where the ice was (a few seconds, then he fades)

        public static function ShowRimegrave(at:Point):void {
            if (!BYMConfig.instance.RENDERER_ON || !MAP.instance) {
                return;
            }
            SPRITES.SetupSprite("IC25_1");
            var size:Array = IoRimegrave.SHEETS[0];
            var frame:BitmapData = new BitmapData(int(size[0]), int(size[1]), true, 0);
            var off:Point = MAP.instance.offset;
            var pt:Point = new Point(at.x - int(size[2]) - off.x, at.y + 20 - int(size[3]) - off.y);
            var raster:RasterData = new RasterData(frame, pt, IoHfoArt.mapDepth(at.x, at.y + 40));
            var ticks:int = 0;
            var holder:Sprite = new Sprite();
            var step:Function = function(e:Event):void {
                ticks++;
                // facing the camera (90 degrees: column 4), standing; the walk rows breathe a little
                var sheet:Object = SPRITES.GetSpriteDescriptor("IC25_1");
                if (sheet && sheet.image) {
                    SPRITES.GetFrameById(frame, "IC25_1", 4, ticks < 60 ? 0 : 9 + int(ticks / 6) % 6);
                }
                if (ticks > 200) {
                    raster.alpha = Math.max(0, 1 - (ticks - 200) / 40);
                }
                if (ticks > 240) {
                    holder.removeEventListener(Event.ENTER_FRAME, step);
                    raster.clear();
                }
            };
            holder.addEventListener(Event.ENTER_FRAME, step);
        }

        // ---- the event's window

        private static const W:int = 740;

        private static const H:int = 520;

        private static var _window:MovieClip = null;

        public static function CloseWindow(e:MouseEvent = null):void {
            if (!_window) {
                return;
            }
            if (e) {
                SOUNDS.Play("close");
            }
            GLOBAL.BlockerRemove();
            if (_window.parent) {
                _window.parent.removeChild(_window);
            }
            _window = null;
        }

        public static function ShowWindow(e:MouseEvent = null):void {
            if (_window || !IoHfo.inYard()) {
                return;
            }
            if (WMATTACK._inProgress) {
                GLOBAL.Message(KEYS.Get("hfo_err_attack"));
                return;
            }
            if (e) {
                SOUNDS.Play("click1");
            }
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            IoHfo.call("status", [["v", "1"]], function(r:Object):void {
                    PLEASEWAIT.Hide();
                    if (!_window && IoHfo.inYard() && !WMATTACK._inProgress) {
                        build();
                    }
                }, function():void {
                    PLEASEWAIT.Hide();
                });
        }

        private static function build():void {
            var f:Object = IoHfo.flag();
            if (!f) {
                return;
            }
            var left:int = -W / 2;
            var top:int = -H / 2;
            var mc:MovieClip = new MovieClip();
            mc.name = "ioHfoWindow";
            var m:Matrix = new Matrix();
            m.createGradientBox(W, H, Math.PI / 2, left, top);
            var bg:Shape = new Shape();
            bg.graphics.lineStyle(4, 0x061424, 1);
            bg.graphics.beginGradientFill(GradientType.LINEAR, [0x24507A, 0x10263E, 0x08121F], [1, 1, 1], [0, 110, 255], m);
            bg.graphics.drawRoundRect(left, top, W, H, 26, 26);
            bg.graphics.endFill();
            bg.graphics.lineStyle(2, 0x9ADCFF, 0.9);
            bg.graphics.drawRoundRect(left + 6, top + 6, W - 12, H - 12, 22, 22);
            // icicles along the top
            bg.graphics.lineStyle(0, 0, 0);
            for (var ix:int = left + 18; ix < -left - 18; ix += 22) {
                bg.graphics.beginFill(0xCFEFFF, 0.55);
                bg.graphics.moveTo(ix, top + 7);
                bg.graphics.lineTo(ix + 10, top + 7);
                bg.graphics.lineTo(ix + 5, top + 14 + (ix * 7 % 11 + 11) % 11);
                bg.graphics.endFill();
            }
            bg.filters = [new GlowFilter(0x6AC8FF, 0.6, 22, 22, 2, 2)];
            mc.addChild(bg);

            // the banner
            var banner:Sprite = new Sprite();
            banner.x = -357;
            banner.y = top + 22;
            mc.addChild(banner);
            ImageCache.GetImageWithCallBack("hfo/promo/hellfreezesoverbanner.jpg", function(key:String, bmd:BitmapData, args:Array = null):void {
                    banner.addChild(new Bitmap(bmd));
                });

            // the thermometer: heat restored
            var won:int = 0;
            var waves:Array = f.waves as Array;
            for each (var w:Array in waves) {
                if (w[1]) {
                    won++;
                }
            }
            var thermo:Sprite = new Sprite();
            thermo.x = left + 40;
            thermo.y = top + 132;
            mc.addChild(thermo);
            ImageCache.GetImageWithCallBack("hfo/ui/thermo_" + (won < 10 ? "0" : "") + won + ".png", function(key:String, bmd:BitmapData, args:Array = null):void {
                    var b:Bitmap = new Bitmap(bmd);
                    b.smoothing = true;
                    b.scaleX = b.scaleY = 1.5;
                    thermo.addChild(b);
                });
            // (two lines under the thermometer: on one, "Heat restored: 13 / 13" was cut off)
            var heat:TextField = label("", 12, 0xFFD9A0, true, 130, TextFormatAlign.CENTER);
            heat.multiline = true;
            heat.wordWrap = true;
            heat.height = 40;
            // the count on its own line ("Heat restored:" / "13 / 13", in every language: after the first colon)
            heat.text = KEYS.Get("hfo_hud_heat", {"v1": won}).replace(/:\s*/, ":\n");
            heat.x = left + 8;
            heat.y = top + 132 + 226;
            mc.addChild(heat);

            // the story so far
            var desc:TextField = label("", 12, 0xDCEBFA, false, 250, TextFormatAlign.LEFT, "Georgia", true);
            desc.multiline = true;
            desc.wordWrap = true;
            desc.htmlText = KEYS.Get("hfo_event_desc");
            desc.autoSize = TextFieldAutoSize.LEFT;
            desc.x = left + 120;
            desc.y = top + 128;
            mc.addChild(desc);
            var y:int = desc.y + desc.textHeight + 14;
            var note:String = null;
            if (int(f.day) < 4) {
                note = f.towers.iced ? KEYS.Get("hfo_hud_towers", {"v1": (f.towers.thawed as Array).length, "v2": (f.towers.iced as Array).length}) + "<br>" + KEYS.Get("hfo_tower_frozen_desc") : KEYS.Get("hfo_tower_frozen_desc");
            }
            else if (Number(f.done) > 0) {
                note = KEYS.Get("hfo_pop_champion_body");
            }
            else if (int(f.current) > 13) {
                note = KEYS.Get("hfo_banner_weakening");
            }
            if (note) {
                var noteField:TextField = label("", 12, 0x9ADCFF, true, 250, TextFormatAlign.LEFT);
                noteField.multiline = true;
                noteField.wordWrap = true;
                noteField.htmlText = note;
                noteField.autoSize = TextFieldAutoSize.LEFT;
                noteField.x = left + 120;
                noteField.y = y;
                mc.addChild(noteField);
            }

            // the waves: two columns
            var listX:int = left + 390;
            var listY:int = top + 128;
            for (var i:int = 0; i < 13; i++) {
                var row:Sprite = waveRow(i + 1, waves[i] as Array, f);
                row.x = listX + (i < 7 ? 0 : 172);
                row.y = listY + (i < 7 ? i : i - 7) * 52;
                mc.addChild(row);
            }

            // close
            var x:Sprite = new Sprite();
            x.name = "ioHfoClose";
            x.buttonMode = true;
            x.mouseChildren = false;
            x.graphics.lineStyle(2, 0x9ADCFF, 1);
            x.graphics.beginFill(0x0E2238, 1);
            x.graphics.drawCircle(0, 0, 14);
            x.graphics.endFill();
            x.graphics.lineStyle(3, 0xFFFFFF, 1);
            x.graphics.moveTo(-5, -5);
            x.graphics.lineTo(5, 5);
            x.graphics.moveTo(5, -5);
            x.graphics.lineTo(-5, 5);
            x.x = -left - 22;
            x.y = top + 22;
            x.addEventListener(MouseEvent.CLICK, CloseWindow);
            mc.addChild(x);

            _window = mc;
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(mc);
            POPUPSETTINGS.AlignToCenter(mc);
            POPUPSETTINGS.ScaleUp(mc);
        }

        /** One wave in the list: its mark, its number and state, the tries left (the one to fight), a button. */
        private static function waveRow(wave:int, w:Array, f:Object):Sprite {
            var row:Sprite = new Sprite();
            row.name = "ioHfoWave" + wave;
            var tries:int = w ? int(w[0]) : 0;
            var won:Boolean = w && w[1];
            var skipped:Boolean = w && w[2] && !won;
            var current:Boolean = int(f.current) == wave && int(f.day) >= 4;
            row.graphics.lineStyle(1, current ? 0xFFD9A0 : 0x3A6A94, 1);
            row.graphics.beginFill(current ? 0x2A3A50 : 0x0E2238, 0.85);
            row.graphics.drawRoundRect(0, 0, 162, 46, 10, 10);
            row.graphics.endFill();
            var mark:Sprite = new Sprite();
            mark.x = 6;
            mark.y = 10;
            row.addChild(mark);
            ImageCache.GetImageWithCallBack("hfo/ui/" + (won ? "wave_won.png" : (skipped ? "wave_skipped.png" : "wave_pending.png")), function(key:String, bmd:BitmapData, args:Array = null):void {
                    mark.addChild(new Bitmap(bmd));
                });
            var name:TextField = label(KEYS.Get("hfo_wave_n", {"v1": wave}), 12, 0xFFFFFF, true, 120, TextFormatAlign.LEFT);
            name.x = 36;
            name.y = 2;
            row.addChild(name);
            var state:TextField = label(KEYS.Get(won ? "hfo_wave_won" : (skipped ? "hfo_wave_skipped" : "hfo_wave_pending")), 9, won ? 0xFFD27A : (skipped ? 0xFF9A8A : 0xA8C8E8), false, 124, TextFormatAlign.LEFT);
            state.multiline = true;
            state.wordWrap = true;
            state.height = 26;
            state.x = 36;
            state.y = 18;
            row.addChild(state);
            if (current) {
                // the tries left, then Start
                for (var t:int = 0; t < int(f.tries); t++) {
                    var tryMark:Sprite = new Sprite();
                    tryMark.x = 92 + t * 14;
                    tryMark.y = 3;
                    tryMark.scaleX = tryMark.scaleY = 0.7;
                    row.addChild(tryMark);
                    loadInto(tryMark, "hfo/ui/" + (t < int(f.tries) - tries ? "try.png" : "try_used.png"));
                }
                state.visible = false;
                var start:Sprite = iceButton(KEYS.Get("hfo_wave_start_btn"), 100, 22, function(e:MouseEvent):void {
                        IoHfoWaves.Start(wave);
                    }, true, true);
                start.x = 36;
                start.y = 20;
                row.addChild(start);
            }
            else if (skipped && int(f.day) >= 4) {
                state.visible = false;
                var replay:Sprite = iceButton(KEYS.Get("hfo_wave_replay_btn"), 100, 22, function(e:MouseEvent):void {
                        IoHfoWaves.Start(wave);
                    }, true, false);
                replay.x = 36;
                replay.y = 20;
                row.addChild(replay);
            }
            return row;
        }

        private static function loadInto(holder:Sprite, path:String):void {
            ImageCache.GetImageWithCallBack(path, function(key:String, bmd:BitmapData, args:Array = null):void {
                    holder.addChild(new Bitmap(bmd));
                });
        }

        // ---- helpers

        public static function iceButton(text:String, width:int, height:int, onClick:Function, enabled:Boolean, main:Boolean):Sprite {
            var b:Sprite = new Sprite();
            var m:Matrix = new Matrix();
            b.buttonMode = enabled;
            b.mouseChildren = false;
            m.createGradientBox(width, height, Math.PI / 2, 0, 0);
            var draw:Function = function(hot:Boolean):void {
                b.graphics.clear();
                b.graphics.lineStyle(2, enabled ? 0xE8F8FF : 0x5A6A7A, 1);
                b.graphics.beginGradientFill(GradientType.LINEAR, !enabled ? [0x4A5A6A, 0x2A3644, 0x1A2430] : (main ? (hot ? [0xB8F0FF, 0x3AA8F0, 0x1050A8] : [0x9ADCFF, 0x2A88D8, 0x0C3C88]) : (hot ? [0x7A9AB8, 0x3A5A7A, 0x20384E] : [0x6A88A6, 0x2E4A66, 0x182C40])), [1, 1, 1], [0, 140, 255], m);
                b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
                b.graphics.endFill();
            };
            draw(false);
            var t:TextField = label(text, height >= 30 ? 16 : 11, 0xFFFFFF, height < 30, width, TextFormatAlign.CENTER, height >= 30 ? "Groboldov" : "Verdana");
            t.embedFonts = height >= 30;
            t.height = height;
            t.y = height >= 30 ? int((height - 24) / 2) : 3;
            t.filters = [new GlowFilter(0x061A36, 1, 3, 3, 5, 1)];
            b.addChild(t);
            if (enabled) {
                if (main) {
                    b.filters = [new GlowFilter(0x6AC8FF, 0.7, 10, 10, 2, 2)];
                }
                b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                        draw(true);
                    });
                b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                        draw(false);
                    });
                b.addEventListener(MouseEvent.CLICK, onClick);
            }
            return b;
        }

        private static function label(text:String, size:int, color:uint, bold:Boolean, width:int, align:String, font:String = "Verdana", italic:Boolean = false):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = width;
            field.height = size + 8;
            var format:TextFormat = new TextFormat(font, size, color, bold, italic);
            format.align = align;
            field.defaultTextFormat = format;
            field.text = text;
            return field;
        }
    }
}
