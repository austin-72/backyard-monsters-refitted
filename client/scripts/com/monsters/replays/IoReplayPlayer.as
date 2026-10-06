package com.monsters.replays {
    import com.monsters.chat.BYMChat;
    import com.monsters.configs.BYMConfig;
    import com.monsters.display.SpriteData;
    import com.monsters.display.SpriteSheetAnimation;
    import com.monsters.effects.ResourceBomb;
    import com.monsters.effects.ResourceBombs;
    import com.monsters.siege.weapons.Decoy;
    import com.monsters.siege.weapons.Jars;
    import gs.TweenLite;
    import gs.easing.Expo;
    import com.monsters.enums.EnumYardType;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.creeps.CreepBase;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Point;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: plays an attack replay (IoReplayRecorder's recording) over the yard as it was when the attack
     * began (loaded in view mode with the replay's key: IoReplays.Watch).
     *
     * The monsters are made again as puppets of their own classes (MonsterBase.ioPuppet: their own art, facing,
     * walk and health bar), never ticked: each frame they are put where the recording says, between its samples
     * (four a second). A champion of the cage is drawn from its sprite (IoReplaySprite). The buildings take the
     * health the recording gives them, wrecked at 0. Nothing is fought or saved: it is a picture of what happened.
     *
     * A bar at the top: who attacked whom and when, the time and the damage so far, Pause / Play, the speed (1/4x to
     * 4x), Restart, Share (Global or Alliance chat), Download, and Close (home).
     */
    public class IoReplayPlayer {

        public static const SPEEDS:Array = [0.25, 0.5, 1, 2, 4];

        private static const SPEED_LABELS:Array = ["¼x", "½x", "1x", "2x", "4x"];

        /** The replay waiting for its yard to load (IoReplays.Watch). */
        private static var _pending:Object = null;

        private static var _on:Boolean = false;

        private static var _replay:Object = null;

        private static var _rate:Number = 4;

        private static var _total:int = 0;

        private static var _t:Number = 0;

        private static var _speed:Number = 1;

        private static var _paused:Boolean = false;

        /** uid -> { def, keys: [[t, x, y, hp, alt, hold]], end, cur, actor, x, y } */
        private static var _tracks:Object = {};

        private static var _buildingEvents:Array = [];

        private static var _buildingCursor:int = 0;

        private static var _damageEvents:Array = [];

        private static var _damage:int = 0;

        /** The catapult's shots: [t, shot] (IoReplayRecorder.shot), and the next to throw. */
        private static var _shots:Array = [];

        private static var _shotCursor:int = 0;

        /** The shots' pictures on the field now: {kind, ...}. */
        private static var _effects:Array = [];

        private static var _effectTicks:int = 0;

        /** building id -> [health, destroyed] when the replay began (for Restart). */
        private static var _initial:Object = {};

        private static var _hud:Sprite = null;

        private static var _title:TextField;

        private static var _clock:TextField;

        private static var _playButton:Sprite;

        private static var _speedButtons:Array = [];

        private static var _shareMenu:Sprite = null;

        private static var _hudTicks:int = 0;

        public function IoReplayPlayer() {
            super();
        }

        public static function get playing():Boolean {
            return _on;
        }

        public static function get time():Number {
            return _t;
        }

        public static function get total():int {
            return _total;
        }

        public static function get speed():Number {
            return _speed;
        }

        public static function get paused():Boolean {
            return _paused;
        }

        /** The puppets on the field now (tests). */
        public static function get actors():Array {
            var out:Array = [];
            for each (var track:Object in _tracks) {
                if (track.actor) {
                    out.push(track);
                }
            }
            return out;
        }

        /** A replay to play once its yard has loaded. */
        public static function prepare(replay:Object):void {
            _pending = replay;
        }

        /** The yard has loaded (BASE): its replay plays, if it is the one waiting. */
        public static function Setup(view:Object):void {
            Clear();
            if (!GLOBAL.INFERNO_ONLY || !view || !_pending) {
                return;
            }
            var replay:Object = _pending;
            _pending = null;
            if (replay.meta && String(replay.meta.key) != String(view.key)) {
                return;
            }
            start(replay);
        }

        private static function start(replay:Object):void {
            _replay = replay;
            _rate = Number(replay.rate) || 4;
            _tracks = {};
            _buildingEvents = [];
            _damageEvents = [];
            _shots = [];
            _shotCursor = 0;
            clearEffects();
            ResourceBombs.ioLoadArt();
            SPRITES.SetupSprite(Decoy.DECOY_WAVE);
            SPRITES.SetupSprite(Decoy.DECOY_EXPLOSION);
            SPRITES.SetupSprite(Jars.JAR_GRAPHIC);
            var def:Array = null;
            for each (def in replay.defs as Array || []) {
                if (def && def.length >= 4) {
                    _tracks[int(def[0])] = {"def": def, "keys": [], "end": int.MAX_VALUE, "cur": 0, "actor": null, "glows": [], "glowKey": ""};
                }
            }
            var samples:Array = replay.samples as Array || [];
            for each (var sample:Array in samples) {
                var t:int = int(sample[0]);
                for each (var m:Array in sample[1] as Array || []) {
                    var track:Object = _tracks[int(m[0])];
                    if (!track) {
                        continue;
                    }
                    if (m.length == 1) {
                        track.end = t;
                    }
                    else {
                        track.keys.push([t, Number(m[1]), Number(m[2]), Number(m[3]), m.length > 4 ? Number(m[4]) : 0, m.length > 5 ? int(m[5]) : 0]);
                    }
                }
                for each (var b:Array in sample[2] as Array || []) {
                    _buildingEvents.push([t, int(b[0]), int(b[1])]);
                }
                if (sample.length > 3 && sample[3] != null) {
                    _damageEvents.push([t, int(sample[3])]);
                }
                var extras:Object = sample.length > 4 ? sample[4] : null;
                if (extras) {
                    for each (var shot:Array in extras.e as Array || []) {
                        _shots.push([t, shot]);
                    }
                    for each (var g:Array in extras.g as Array || []) {
                        var glowing:Object = _tracks[int(g[0])];
                        if (glowing) {
                            glowing.glows.push([t, g[1] is Array ? g[1] : null]);
                        }
                    }
                }
                _total = Math.max(_total, t + 1);
            }
            _initial = {};
            for each (var building:BFOUNDATION in BASE._buildingsAll) {
                if (building) {
                    _initial[building._id] = [building.health, building._destroyed];
                }
            }
            _t = 0;
            _speed = 1;
            _paused = false;
            _buildingCursor = 0;
            _damage = 0;
            _on = true;
            // (the visitor's panel, Open Map / Attack, goes: the bar's Close goes home; an attack from a replay
            // would be an attack on the yard as it is now)
            if (UI2._visitor) {
                UI2._visitor.visible = false;
            }
            buildHud();
        }

        /** Back to the start: the buildings as they were, the monsters gone. */
        public static function restart():void {
            if (!_replay) {
                return;
            }
            for (var id:String in _initial) {
                var b:BFOUNDATION = BASE._buildingsAll["b" + id] as BFOUNDATION;
                if (b) {
                    b.setHealth(_initial[id][0]);
                    b._destroyed = Boolean(_initial[id][1]);
                    b.Update(true);
                }
            }
            for each (var track:Object in _tracks) {
                dropActor(track);
                track.cur = 0;
            }
            clearEffects();
            _shotCursor = 0;
            _t = 0;
            _buildingCursor = 0;
            _damage = 0;
            _paused = false;
            updateHud();
        }

        public static function setSpeed(speed:Number):void {
            _speed = speed;
            updateHud();
        }

        public static function togglePause():void {
            if (_paused && _t >= _total) {
                restart();
                return;
            }
            _paused = !_paused;
            updateHud();
        }

        /** Every game step (GLOBAL, 80 a second). */
        public static function step():void {
            if (!_on) {
                return;
            }
            if (UI2._visitor && UI2._visitor.visible) {
                UI2._visitor.visible = false; // (made after the replay began)
            }
            if (!_paused) {
                _t += _speed * _rate / 80;
                if (_t >= _total) {
                    _t = _total;
                    _paused = true;
                    updateHud();
                }
            }
            while (_buildingCursor < _buildingEvents.length && _buildingEvents[_buildingCursor][0] <= _t) {
                var e:Array = _buildingEvents[_buildingCursor++];
                setBuilding(e[1], e[2]);
            }
            for each (var d:Array in _damageEvents) {
                if (d[0] <= _t) {
                    _damage = d[1];
                }
            }
            while (_shotCursor < _shots.length && _shots[_shotCursor][0] <= _t) {
                throwShot(_shots[_shotCursor++][1] as Array);
            }
            tickEffects();
            if (GLOBAL._render) {
                drawActors();
                if (++_hudTicks >= 10) {
                    _hudTicks = 0;
                    updateHud();
                }
            }
        }

        private static function setBuilding(id:int, hp:int):void {
            var b:BFOUNDATION = BASE._buildingsAll["b" + id] as BFOUNDATION;
            if (!b) {
                return;
            }
            if (hp <= 0) {
                b.setHealth(0);
                b._destroyed = true;
            }
            else {
                b.setHealth(Math.max(1, b.maxHealth * hp / 100));
                b._destroyed = false;
            }
            b.Update(true);
        }

        private static function drawActors():void {
            for each (var track:Object in _tracks) {
                var keys:Array = track.keys;
                if (!keys.length || _t < keys[0][0] || _t >= track.end) {
                    dropActor(track);
                    continue;
                }
                while (track.cur + 1 < keys.length && keys[track.cur + 1][0] <= _t) {
                    track.cur++;
                }
                var a:Array = keys[track.cur];
                var x:Number = a[1];
                var y:Number = a[2];
                var hp:Number = a[3];
                var alt:Number = a[4];
                if (track.cur + 1 < keys.length) {
                    var b:Array = keys[track.cur + 1];
                    var from:Number = b[5] ? Math.max(a[0], b[0] - 1) : a[0];
                    if (_t > from) {
                        var f:Number = Math.min(1, (_t - from) / Math.max(0.001, b[0] - from));
                        x = a[1] + (b[1] - a[1]) * f;
                        y = a[2] + (b[2] - a[2]) * f;
                        alt = a[4] + (b[4] - a[4]) * f;
                    }
                }
                if (!track.actor) {
                    track.actor = makeActor(track.def, x, y);
                    if (!track.actor) {
                        continue;
                    }
                    track.x = x;
                    track.y = y;
                }
                applyGlow(track);
                var walking:Boolean = !_paused && (Math.abs(x - track.x) > 0.02 || Math.abs(y - track.y) > 0.02);
                track.x = x;
                track.y = y;
                if (track.actor is MonsterBase) {
                    MonsterBase(track.actor).ioPuppet(x, y, hp / 100, alt, walking);
                }
                else {
                    IoReplaySprite(track.actor).show(x, y, alt, walking);
                }
            }
        }

        /** The glows a monster had at this time of the replay (its recorded GlowFilters), put on its puppet. */
        private static function applyGlow(track:Object):void {
            var list:Array = null;
            for each (var g:Array in track.glows as Array) {
                if (g[0] > _t) {
                    break;
                }
                list = g[1] as Array;
            }
            var key:String = list ? JSON.stringify(list) : "";
            if (key == track.glowKey && track.glowActor == track.actor) {
                return;
            }
            track.glowKey = key;
            track.glowActor = track.actor;
            var filters:Array = [];
            for each (var f:Array in list || []) {
                filters.push(new GlowFilter(uint(f[0]), Number(f[1]) / 100, Number(f[2]), Number(f[2]), Number(f[3]), 1));
            }
            if (track.actor is MonsterBase) {
                MonsterBase(track.actor).ioPuppetGlow(filters);
            }
            else if (track.actor is IoReplaySprite) {
                IoReplaySprite(track.actor).glow(filters);
            }
        }

        // ---- the catapult's shots: their pictures only (the yard's and the monsters' health are recorded)

        private static function throwShot(shot:Array):void {
            if (!shot || !GLOBAL._render || !MAP._BUILDINGTOPS) {
                return;
            }
            try {
                var x:Number = Number(shot[1]);
                var y:Number = Number(shot[2]);
                var radius:int = int(shot[3]);
                if (shot[0] == "b") {
                    var group:int = int(shot[6]);
                    var bomb:ResourceBomb = new ResourceBomb(MAP._BUILDINGBASES, new Point(x, y), {"radius": radius, "particles": Math.max(1, int(shot[4])), "resource": int(shot[5]), "group": group, "damage": 0, "kind": group == 2 ? "sulfur" : null}, 2);
                    bomb.ioPicture = true;
                    SOUNDS.Play(group == 0 ? "twigbomb" : (group == 1 ? "pebblebomb" : "puttybomb"));
                    _effects.push({"kind": "b", "bomb": bomb});
                }
                else if (shot[0] == "j") {
                    var towers:Vector.<BFOUNDATION> = new Vector.<BFOUNDATION>();
                    BASE.GetBuildingOverlap(x, y, radius, towers);
                    var jarred:Array = [];
                    for each (var b:BFOUNDATION in towers) {
                        if (b is BTOWER && b.health > 0) {
                            BTOWER(b).ApplyJar(0);
                            jarred.push(b);
                        }
                    }
                    _effects.push({"kind": "j", "towers": jarred, "end": _t + Math.max(1, Number(shot[4]) || 10) * _rate});
                }
                else if (shot[0] == "d") {
                    var box:Sprite = new Sprite();
                    box.x = x;
                    box.y = y;
                    var wave:SpriteSheetAnimation = new SpriteSheetAnimation(SPRITES.GetSpriteDescriptor(Decoy.DECOY_WAVE) as SpriteData, 45);
                    wave.render();
                    wave.x = -wave.width * 0.5;
                    wave.y = -wave.height * 0.5;
                    wave.doesRepeat = true;
                    wave.play();
                    box.addChild(wave);
                    MAP._BUILDINGTOPS.addChild(box);
                    TweenLite.from(box, 0.6, {"y": y - 300, "ease": Expo.easeIn});
                    SOUNDS.Play(Decoy.LAND_SOUND);
                    _effects.push({"kind": "d", "box": box, "anim": wave, "end": _t + Math.max(1, Number(shot[4]) || 10) * _rate, "boom": false});
                }
            }
            catch (e:Error) {
                LOGGER.Log("log", "Replay: a catapult shot not shown: " + e.message);
            }
        }

        private static function tickEffects():void {
            if (!_effects.length) {
                return;
            }
            var animate:Boolean = ++_effectTicks % 2 == 0;
            for (var i:int = _effects.length - 1; i >= 0; i--) {
                var fx:Object = _effects[i];
                if (fx.kind == "b") {
                    if (!fx.done && ResourceBomb(fx.bomb).Tick()) {
                        ResourceBomb(fx.bomb).Freeze(); // (what it left on the ground stays, as in the attack)
                        fx.done = true;
                    }
                }
                else if (fx.kind == "j") {
                    if (_t >= fx.end && !fx.done) {
                        for each (var t:BTOWER in fx.towers) {
                            t.KillJar();
                        }
                        fx.done = true;
                        _effects.splice(i, 1);
                    }
                }
                else if (fx.kind == "d") {
                    if (animate) {
                        SpriteSheetAnimation(fx.anim).update();
                    }
                    if (!fx.boom && _t >= fx.end) {
                        // the explosion, then gone
                        fx.boom = true;
                        var box:Sprite = fx.box as Sprite;
                        if (fx.anim.parent) {
                            fx.anim.parent.removeChild(fx.anim);
                        }
                        var boom:SpriteSheetAnimation = new SpriteSheetAnimation(SPRITES.GetSpriteDescriptor(Decoy.DECOY_EXPLOSION) as SpriteData, 33);
                        boom.render();
                        boom.x = -boom.width * 0.5;
                        boom.y = -boom.height * 0.5;
                        boom.play();
                        box.addChild(boom);
                        fx.anim = boom;
                        SOUNDS.Play(Decoy.EXPLOSION_SOUND);
                    }
                    else if (fx.boom && fx.anim.currentFrame >= fx.anim.totalFrames) {
                        if (fx.box.parent) {
                            fx.box.parent.removeChild(fx.box);
                        }
                        _effects.splice(i, 1);
                    }
                }
            }
        }

        /** Every shot's picture gone (the start again, or the yard left). */
        private static function clearEffects():void {
            for each (var fx:Object in _effects) {
                try {
                    if (fx.kind == "b") {
                        ResourceBomb(fx.bomb).ioRemove();
                    }
                    else if (fx.kind == "j" && !fx.done) {
                        for each (var t:BTOWER in fx.towers) {
                            t.KillJar();
                        }
                    }
                    else if (fx.kind == "d" && fx.box.parent) {
                        fx.box.parent.removeChild(fx.box);
                    }
                }
                catch (e:Error) {
                }
            }
            _effects = [];
        }

        private static function makeActor(def:Array, x:Number, y:Number):Object {
            try {
                if (int(def[3]) == 1) {
                    var sprite:IoReplaySprite = new IoReplaySprite(String(def[4]), int(def[5]), int(def[6]));
                    MAP._BUILDINGTOPS.addChild(sprite);
                    return sprite;
                }
                var c:Object = CREATURELOCKER._creatures[String(def[1])];
                if (!c) {
                    return null;
                }
                var cls:Class = c.classType ? c.classType as Class : CreepBase;
                var m:MonsterBase = new cls(String(def[1]), MonsterBase.k_sBHVR_PEN, new Point(x, y), 0, Math.max(1, int(def[4])), int.MAX_VALUE, null, false, null, 1, false, null) as MonsterBase;
                if (!BYMConfig.instance.RENDERER_ON) {
                    MAP._BUILDINGTOPS.addChild(m.graphic);
                }
                return m;
            }
            catch (e:Error) {
                LOGGER.Log("log", "Replay: " + def[1] + " not shown: " + e.message);
            }
            return null;
        }

        private static function dropActor(track:Object):void {
            if (!track.actor) {
                return;
            }
            if (track.actor is MonsterBase) {
                var m:MonsterBase = MonsterBase(track.actor);
                if (!BYMConfig.instance.RENDERER_ON && m.graphic && m.graphic.parent) {
                    m.graphic.parent.removeChild(m.graphic);
                }
                m.clear();
            }
            else {
                IoReplaySprite(track.actor).clear();
            }
            track.actor = null;
        }

        /** The yard is going (BASE.Cleanup). */
        public static function Clear():void {
            for each (var track:Object in _tracks) {
                dropActor(track);
            }
            clearEffects();
            _shots = [];
            _tracks = {};
            _on = false;
            _replay = null;
            if (_hud && _hud.parent) {
                _hud.parent.removeChild(_hud);
            }
            _hud = null;
            _shareMenu = null;
        }

        // ---- the bar

        private static function clock(t:Number):String {
            var s:int = int(t / _rate);
            return int(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
        }

        private static function buildHud():void {
            var meta:Object = _replay.meta || {};
            _hud = new Sprite();
            _hud.name = "ioReplayHud";
            var w:int = 660;
            _hud.graphics.lineStyle(1, 0xB8860B, 1);
            _hud.graphics.beginFill(0x1E140C, 0.9);
            _hud.graphics.drawRoundRect(0, 0, w, 66, 12, 12);
            _hud.graphics.endFill();
            var when:Date = new Date(Number(meta.time) * 1000);
            var where:String = String(meta.yard_type) == "outpost" ? "outpost" : "yard";
            _title = label("<b>Replay:</b> " + esc(meta.attacker) + " attacked " + esc(meta.defender) + "'s " + where + " · " + when.toLocaleDateString() + " " + (when.getHours() < 10 ? "0" : "") + when.getHours() + ":" + (when.getMinutes() < 10 ? "0" : "") + when.getMinutes(), 12, w - 20);
            _title.x = 10;
            _title.y = 5;
            _hud.addChild(_title);
            var x:int = 10;
            _playButton = button("Pause", 62, function(e:MouseEvent):void {
                    togglePause();
                });
            _playButton.x = x;
            _playButton.y = 32;
            _playButton.name = "ioReplayPlay";
            _hud.addChild(_playButton);
            x += 68;
            _speedButtons = [];
            for (var i:int = 0; i < SPEEDS.length; i++) {
                var sb:Sprite = button(SPEED_LABELS[i], 36, speedClick(SPEEDS[i]));
                sb.x = x;
                sb.y = 32;
                sb.name = "ioReplaySpeed" + i;
                _hud.addChild(sb);
                _speedButtons.push(sb);
                x += 40;
            }
            x += 4;
            _clock = label("", 11, 160);
            _clock.x = x;
            _clock.y = 36;
            _hud.addChild(_clock);
            x += 160;
            var restartB:Sprite = button("Restart", 58, function(e:MouseEvent):void {
                    restart();
                });
            restartB.x = x;
            restartB.y = 32;
            restartB.name = "ioReplayRestart";
            _hud.addChild(restartB);
            x += 62;
            var share:Sprite = button("Share", 50, function(e:MouseEvent):void {
                    toggleShare();
                });
            share.x = x;
            share.y = 32;
            share.name = "ioReplayShare";
            _hud.addChild(share);
            x += 54;
            if (!meta.imported) {
                var download:Sprite = button("Save", 44, function(e:MouseEvent):void {
                        IoReplays.Download(String(meta.key));
                    });
                download.x = x;
                download.y = 32;
                download.name = "ioReplayDownload";
                _hud.addChild(download);
            }
            x += 48;
            var close:Sprite = button("Close", 50, function(e:MouseEvent):void {
                    goHome();
                });
            close.x = w - 56;
            close.y = 32;
            close.name = "ioReplayClose";
            _hud.addChild(close);
            GLOBAL._layerUI.addChild(_hud);
            updateHud();
        }

        private static function speedClick(speed:Number):Function {
            return function(e:MouseEvent):void {
                setSpeed(speed);
            };
        }

        private static function toggleShare():void {
            if (_shareMenu) {
                if (_shareMenu.parent) {
                    _shareMenu.parent.removeChild(_shareMenu);
                }
                _shareMenu = null;
                return;
            }
            var key:String = String(_replay.meta.key);
            _shareMenu = new Sprite();
            _shareMenu.graphics.beginFill(0x1E140C, 0.95);
            _shareMenu.graphics.drawRoundRect(0, 0, 150, 62, 8, 8);
            _shareMenu.graphics.endFill();
            var g:Sprite = button("Global chat", 134, function(e:MouseEvent):void {
                    toggleShare();
                    IoReplays.Share(key, BYMChat.IO_GLOBAL);
                });
            g.x = 8;
            g.y = 6;
            _shareMenu.addChild(g);
            var a:Sprite = button("Alliance chat", 134, function(e:MouseEvent):void {
                    toggleShare();
                    IoReplays.Share(key, BYMChat.IO_ALLIANCE);
                });
            a.x = 8;
            a.y = 34;
            _shareMenu.addChild(a);
            var shareButton:Sprite = _hud.getChildByName("ioReplayShare") as Sprite;
            _shareMenu.x = shareButton.x;
            _shareMenu.y = 70;
            _hud.addChild(_shareMenu);
        }

        private static function goHome():void {
            Clear();
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }

        private static function updateHud():void {
            if (!_hud) {
                return;
            }
            _hud.x = int(GLOBAL._SCREENCENTER.x - _hud.width * 0.5);
            _hud.y = 6;
            if (_shareMenu) {
                _hud.x = int(GLOBAL._SCREENCENTER.x - 330);
            }
            _clock.htmlText = "<b>" + clock(_t) + "</b> / " + clock(_total) + "  ·  Damage <b>" + _damage + "%</b>";
            setLabel(_playButton, _t >= _total && _paused ? "Again" : (_paused ? "Play" : "Pause"));
            for (var i:int = 0; i < _speedButtons.length; i++) {
                highlight(_speedButtons[i], SPEEDS[i] == _speed);
            }
        }

        // ---- small things

        private static function esc(text:*):String {
            return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        private static function label(html:String, size:int, width:int):TextField {
            var t:TextField = new TextField();
            t.selectable = false;
            t.mouseEnabled = false;
            t.width = width;
            t.height = size + 10;
            t.defaultTextFormat = new TextFormat("Verdana", size, 0xFFF2CC);
            t.htmlText = html;
            t.filters = [new GlowFilter(0, 0.8, 2, 2, 4, 1)];
            return t;
        }

        private static function button(text:String, width:int, onClick:Function):Sprite {
            var b:Sprite = new Sprite();
            b.buttonMode = true;
            b.mouseChildren = false;
            var t:TextField = new TextField();
            t.selectable = false;
            t.mouseEnabled = false;
            t.width = width;
            t.height = 20;
            var f:TextFormat = new TextFormat("Verdana", 11, 0x2A1A0A, true);
            f.align = TextFormatAlign.CENTER;
            t.defaultTextFormat = f;
            t.text = text;
            t.y = 3;
            t.name = "label";
            b.addChild(t);
            b.graphics.lineStyle(1, 0x7A5A1A, 1);
            b.graphics.beginFill(0xF2D98C, 1);
            b.graphics.drawRoundRect(0, 0, width, 24, 7, 7);
            b.graphics.endFill();
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    SOUNDS.Play("click1");
                    onClick(e);
                });
            return b;
        }

        private static function setLabel(b:Sprite, text:String):void {
            var t:TextField = b ? b.getChildByName("label") as TextField : null;
            if (t && t.text != text) {
                t.text = text;
            }
        }

        private static function highlight(b:Sprite, on:Boolean):void {
            var t:TextField = b.getChildByName("label") as TextField;
            b.graphics.clear();
            b.graphics.lineStyle(1, 0x7A5A1A, 1);
            b.graphics.beginFill(on ? 0xFFE94D : 0xF2D98C, 1);
            b.graphics.drawRoundRect(0, 0, t.width, 24, 7, 7);
            b.graphics.endFill();
        }
    }
}
