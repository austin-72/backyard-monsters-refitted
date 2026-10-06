package {
    import com.monsters.chat.Chat;
    import flash.display.DisplayObject;
    import flash.display.MovieClip;
    import flash.events.MouseEvent;
    import flash.geom.Point;
    import flash.geom.Rectangle;

    public class UI_WORKERS {

        private static var _do:DisplayObject;

        private static var _mc:MovieClip;

        private static var _workers:Array;

        private static var _popupdo:DisplayObject;

        private static var _popupID:int;

        private static var _popupmc:bubblepopupRight;

        private static var _popupmc2:bubblepopup;

        private static var _maxWorkers:int;

        private static var _workerMCOffset:int = 45;

        private static var _canUseHorizontal:Boolean = false;

        /** Inferno-only: a button kept in the workers' column, under the fifth worker (Moloch's Gauntlet). */
        private static var _ioExtra:DisplayObject;

        /** The gap between the fifth worker and that button. */
        private static const IO_EXTRA_GAP:int = 14;

        /** The Gauntlet button is drawn round this point of its own, its gold ring 25 across the middle. */
        private static const IO_EXTRA_MIDDLE:Number = 20.75;

        public static function ioAddUnderWorkers(param1:DisplayObject):void {
            if (_ioExtra && _ioExtra != param1 && _ioExtra.parent) {
                _ioExtra.parent.removeChild(_ioExtra);
            }
            _ioExtra = param1;
            ioPlaceExtra();
        }

        /** Hell Freezes Over's button: under the Gauntlet's (in its place while that one is hidden). */
        private static var _ioExtra2:DisplayObject;

        public static function ioAddUnderGauntlet(param1:DisplayObject):void {
            if (_ioExtra2 && _ioExtra2 != param1 && _ioExtra2.parent) {
                _ioExtra2.parent.removeChild(_ioExtra2);
            }
            _ioExtra2 = param1;
            ioPlaceExtra();
        }

        /** Centred under the fifth worker's button, the gap below it (it moves and hides with the column). */
        public static function ioPlaceExtra():void {
            if (!_mc) {
                return;
            }
            var r:Rectangle = _workers && _workers.length >= 5 ? DisplayObject(_workers[4].mc).getBounds(_mc) : new Rectangle(0, 20 + 4 * _workerMCOffset, 40, 40);
            if (_ioExtra2) {
                if (_ioExtra2.parent != _mc) {
                    _mc.addChild(_ioExtra2);
                }
                var below:Boolean = Boolean(_ioExtra) && _ioExtra.visible;
                _ioExtra2.x = r.x + r.width / 2 - IO_EXTRA_MIDDLE;
                _ioExtra2.y = r.y + r.height + IO_EXTRA_GAP + 25 - IO_EXTRA_MIDDLE + (below ? 66 : 0);
            }
            if (!_ioExtra) {
                return;
            }
            if (_ioExtra.parent != _mc) {
                _mc.addChild(_ioExtra);
            }
            _ioExtra.x = r.x + r.width / 2 - IO_EXTRA_MIDDLE;
            _ioExtra.y = r.y + r.height + IO_EXTRA_GAP + 25 - IO_EXTRA_MIDDLE;
        }

        /** A tip for the button, pointing at it from the left like the workers' own. */
        public static function ioShowTip(param1:DisplayObject, param2:String):void {
            if (!param1 || !param1.stage) {
                return;
            }
            var p:Point = GLOBAL._layerUI.globalToLocal(param1.localToGlobal(new Point(IO_EXTRA_MIDDLE, IO_EXTRA_MIDDLE)));
            // as PopupShow, but the tip may have several lines (<br>): the bubble is sized for them
            PopupHide();
            _popupID = -1;
            _popupmc = new bubblepopupRight();
            _popupmc.Setup(_mc ? int(_mc.x - 5) : int(p.x - 30), int(p.y), "");
            _popupmc.Update(param2, param2.split("<br>").length);
            _popupmc.Nudge("left");
            _popupdo = GLOBAL._layerUI.addChild(_popupmc);
        }

        public function UI_WORKERS() {
            super();
        }

        public static function Setup():void {
            var _loc1_:int = 0;
            var _loc2_:MovieClip = null;
            if (Boolean(_do) && Boolean(_do.parent)) {
                _do.parent.removeChild(_do);
                _do = null;
            }
            _mc = new MovieClip();
            _workers = [];
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                _maxWorkers = 5;
                if (!BASE.isMainYard) {
                    _maxWorkers = GLOBAL.ioOutpostWorkers();
                }
                _loc1_ = 0;
                while (_loc1_ < _maxWorkers) {
                    if (GLOBAL.InfernoMode()) {
                        _loc2_ = new icon_worker_inferno();
                    }
                    else {
                        _loc2_ = new icon_worker();
                    }
                    _loc2_.y = 20 + _loc1_ * _workerMCOffset;
                    _loc2_.mouseChildren = false;
                    _loc2_.addEventListener(MouseEvent.CLICK, MouseClicked(_loc1_));
                    _loc2_.addEventListener(MouseEvent.MOUSE_OVER, MouseOver(_loc1_));
                    _loc2_.addEventListener(MouseEvent.MOUSE_OUT, MouseOut);
                    _loc2_.buttonMode = true;
                    _mc.addChild(_loc2_);
                    _workers.push({
                                "purchased": false,
                                "active": false,
                                "id": 0,
                                "message": "",
                                "mc": _loc2_
                            });
                    _loc1_++;
                }
                _do = GLOBAL._layerUI.addChild(_mc);
            }
            ioPlaceExtra();
            Update();
            if (!UI2._showBottom) {
                Hide();
            }
        }

        private static function MouseOver(param1:int):Function {
            var i:int = param1;
            return function(param1:MouseEvent = null):void {
                var _loc3_:* = undefined;
                var _loc2_:* = _workers[i];
                if (_loc2_.purchased) {
                    if (_loc2_.active) {
                        _loc3_ = _loc2_.message;
                    }
                    else {
                        _loc3_ = KEYS.Get("ui_worker_idle");
                    }
                }
                else {
                    _loc3_ = KEYS.Get("ui_worker_hire");
                }
                PopupShow(_mc.x - 5, _mc.y + _workerMCOffset / 2 + i * _workerMCOffset + _workerMCOffset * 0.5, _loc3_, i);
            };
        }

        private static function MouseOut(param1:MouseEvent):void {
            PopupHide();
        }

        private static function MouseClicked(param1:int):Function {
            var i:int = param1;
            return function(param1:MouseEvent = null):void {
                if (_workers[i]) {
                    if (_workers[i].purchased) {
                        QUEUE.JumpToWorker(i);
                    }
                    else {
                        STORE.ShowB(1, 0, ["BEW"]);
                    }
                }
            };
        }

        public static function Update():void {
            var _loc3_:Object = null;
            var _loc4_:Object = null;
            var _loc1_:Boolean = false;
            var _loc2_:int = 0;
            while (_loc2_ < _workers.length) {
                _loc3_ = _workers[_loc2_];
                if (Boolean(QUEUE._stack) && Boolean(QUEUE._stack[_loc2_])) {
                    _loc4_ = QUEUE._stack[_loc2_];
                    if (_loc3_.id != _loc4_.id) {
                        _loc3_.id = _loc4_.id;
                    }
                    _loc3_.message = "<b>" + _loc4_.title + "</b> " + _loc4_.message;
                    if (!_loc3_.purchased) {
                        _loc3_.purchased = true;
                        _loc1_ = true;
                    }
                    if (_loc3_.active != _loc4_.active) {
                        _loc3_.active = _loc4_.active;
                        _loc1_ = true;
                    }
                    if (Boolean(_loc3_.active) && _popupID == _loc2_) {
                        PopupUpdate(_loc3_.message);
                    }
                }
                _loc2_++;
            }
            if (_loc1_) {
                Render();
            }
            Resize();
        }

        public static function Resize():void {
            var _loc1_:int = 0;
            if (!Chat.flagsShouldChatDisplay() && _canUseHorizontal) {
                if (_mc) {
                    _mc.x = GLOBAL._SCREEN.x;
                    _mc.y = GLOBAL._SCREEN.bottom - 52;
                }
            }
            else if (_mc) {
                _mc.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - _workerMCOffset;
                _loc1_ = !!UI2._wildMonsterBar ? 20 : 0;
                _mc.y = GLOBAL._SCREEN.top + 50 + _loc1_ + 30 * UI2.TimersVisible();
            }
            ioPlaceExtra();
        }

        private static function Render():void {
            var _loc2_:Object = null;
            var _loc1_:int = 0;
            while (_loc1_ < _maxWorkers) {
                _loc2_ = _workers[_loc1_];
                if (_loc2_.purchased) {
                    if (_loc2_.active) {
                        _loc2_.mc.gotoAndStop(2);
                    }
                    else {
                        _loc2_.mc.gotoAndStop(1);
                    }
                    if (STORE._storeData.BST) {
                        _loc2_.mc.mcIcon.gotoAndStop(2);
                    }
                    else {
                        _loc2_.mc.mcIcon.gotoAndStop(1);
                    }
                }
                else {
                    _loc2_.mc.gotoAndStop(3);
                    _loc2_.mc.label_txt.htmlText = "<b>" + KEYS.Get("ui_worker_hireicon") + "</b>";
                }
                _loc1_++;
            }
        }

        public static function PopupShow(param1:int, param2:int, param3:String, param4:int):void {
            PopupHide();
            _popupID = param4;
            _popupmc = new bubblepopupRight();
            _popupmc.Setup(param1, param2, param3);
            _popupmc.Nudge("left");
            _popupdo = GLOBAL._layerUI.addChild(_popupmc);
        }

        public static function PopupUpdate(param1:String):void {
            if (_popupmc) {
                _popupmc.Update(param1);
            }
            else if (_popupmc2) {
                _popupmc2.Update(param1);
            }
        }

        public static function PopupHide():void {
            if (_popupdo) {
                if (_popupdo.parent == GLOBAL._layerUI) {
                    GLOBAL._layerUI.removeChild(_popupdo);
                }
                _popupdo = null;
            }
        }

        public static function Show():void {
            if (TUTORIAL._stage < 192) {
                _mc.visible = false;
            }
            else {
                _mc.visible = true;
            }
        }

        public static function Hide():void {
            _mc.visible = false;
        }
    }
}
