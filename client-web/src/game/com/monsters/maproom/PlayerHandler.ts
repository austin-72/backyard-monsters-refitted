import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Contact, EnumYardType, GLOBAL, KEYS, MAPROOM, TRIBES, TUTORIAL, com_monsters_maproom_MapRoom as MapRoom, com_monsters_maproom_model_BaseObject as BaseObject } from "@game";

export class PlayerHandler extends Sprite {
    static {
        as3.fields(this, { player: undefined, data: null });
    }

    public static currentBase: BaseObject = null;
    private player: any;
    private data: BaseObject;

    public $ctor(): void {
        super.$ctor();
    }

    public configure(param1: any): any {
        this.player = param1;
        this.data = as3.cast(this.player.data, BaseObject);
        let _loc2_: boolean = true;
        let _loc3_: boolean = true;
        let _loc4_: string = "";
        let _loc5_: string = "";
        let _loc6_: string = "#000000";
        let _loc7_: string = "Unknown";
        let _loc8_: string = "#000000";
        if (this.data.wm.Get() == 0) {
            if (this.data.saved.Get() >= MapRoom.BRIDGE.GLOBAL.Timestamp() - 62) {
                _loc2_ = false;
                _loc4_ = "<font color = \'#01BA01\'>" + KEYS.Get("player_online");
            } else {
                _loc4_ = "<font color = \'#666666\'>" + KEYS.Get("player_offline");
            }
            if (this.data.friend.Get() == 1) {
                _loc7_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_friends"));
                _loc8_ = "#0000FF";
            }
            if (this.data.attacksfrom.Get() > 1) {
                _loc7_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_hostile"));
                _loc8_ = "#990000";
            }
            if (Boolean(this.data.trucestate) && this.data.trucestate != "") {
                this.player.truceBtn.Enabled = false;
                this.player.truceBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onTruce));
                if (this.data.trucestate == "accepted") {
                    _loc2_ = false;
                    _loc7_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_tactive"));
                    _loc8_ = "#00FF00";
                } else if (this.data.trucestate == "requested") {
                    _loc7_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_trequested"));
                    _loc8_ = "#0000FF";
                } else if (this.data.trucestate == "rejected") {
                    _loc7_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_trejected"));
                    _loc8_ = "#CC0000";
                }
                switch (this.data.attackpermitted.Get()) {
                    case 5:
                        _loc2_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_dp"));
                        break;
                    case 6:
                        _loc2_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_sp"));
                        break;
                    case 7:
                        _loc2_ = false;
                        _loc3_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_underattack"));
                        _loc6_ = "#FF0000";
                }
            } else {
                this.player.truceBtn.Enabled = true;
                this.player.truceBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onTruce));
                switch (this.data.attackpermitted.Get()) {
                    case 3:
                        _loc2_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_level"));
                        break;
                    case 4:
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_vengeance", { "v1": this.data.retaliatecount }));
                        _loc6_ = "#FF0000";
                        break;
                    case 5:
                        _loc2_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_dp"));
                        break;
                    case 6:
                        _loc2_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_sp"));
                        break;
                    case 7:
                        _loc2_ = false;
                        _loc3_ = false;
                        _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_underattack"));
                        _loc6_ = "#FF0000";
                }
            }
            if (this.data.truceexpire > 0) {
                _loc5_ = String(MapRoom.BRIDGE.KEYS.Get("map_status_timeremain", { "v1": MapRoom.BRIDGE.GLOBAL.ToTime(this.data.truceexpire, true, false) }));
                _loc6_ = "#000000";
            }
            this.player.helpBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onHelp));
            this.player.helpBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onView));
            this.player.attackBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onAttack));
            this.player.msgBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onMessage));
            if ((this.data.friend.Get() | 0) == 1) {
                this.player.helpBtn.SetupKey("map_help_btn");
                this.player.helpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onHelp));
            } else {
                this.player.helpBtn.SetupKey("map_view_btn");
                this.player.helpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onView));
            }
            if (!_loc3_) {
                this.player.helpBtn.Enabled = false;
            }
            this.player.attackBtn.SetupKey("map_attack_btn");
            this.player.attackBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onAttack));
            if (!_loc3_ || !_loc2_) {
                this.player.attackBtn.Enabled = false;
            } else {
                this.player.attackBtn.Enabled = true;
            }
        } else {
            this.player.helpBtn.SetupKey("map_view_btn");
            if (TUTORIAL._stage < 110) {
                this.player.helpBtn.Enabled = false;
            } else {
                this.player.helpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onView));
            }
            this.player.attackBtn.SetupKey("map_attack_btn");
            this.player.attackBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onAttack));
            this.player.attackBtn.Enabled = true;
            if (TUTORIAL._stage > 110) {
                this.player.helpBtn.Enabled = true;
            }
        }
        return { "OKattack": _loc2_, "OKview": _loc3_, "status": _loc4_, "extraStatus": _loc5_, "relation": _loc7_, "relationColor": _loc8_, "extraStatusColor": _loc6_ };
    }

    private onMessage(param1: MouseEvent): void {
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        let _loc2_: any = new MapRoom.BRIDGE["MessageUI"]();
        let _loc3_: Contact = new Contact(String(this.player.data.userid.Get()), { "first_name": this.player.data.ownerName, "last_name": "", "pic_square": this.player.data.pic });
        _loc2_.picker.preloadSelection(_loc3_);
        _loc2_.requestType = "message";
        _loc2_.body_txt.text = "";
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(as3.cast(_loc2_, DisplayObject));
    }

    private onHelp(param1: MouseEvent): void {
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        let _loc2_: BaseObject = as3.cast(this.player.data, BaseObject);
        if (_loc2_.friend.Get()) {
            MapRoom.BRIDGE.setVisitingFriend(true);
        } else {
            MapRoom.BRIDGE.setVisitingFriend(false);
        }
        MapRoom.BRIDGE.LoadBase(null, null, this.player.data.baseid.Get(), "help");
        if (MAPROOM._mc) {
            MAPROOM._mc.Hide();
        }
    }

    private onView(param1: MouseEvent): void {
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        let _loc2_: BaseObject = as3.cast(this.player.data, BaseObject);
        if (_loc2_.friend.Get()) {
            MapRoom.BRIDGE.setVisitingFriend(true);
        } else {
            MapRoom.BRIDGE.setVisitingFriend(false);
        }
        let _loc3_: string = _loc2_.wm.Get() == 1 ? "wmview" : "view";
        MapRoom.BRIDGE.LoadBase(null, null, this.player.data.baseid.Get(), _loc3_, false, EnumYardType.MAIN_YARD);
        if (Boolean(MAPROOM) && Boolean(MAPROOM._mc)) {
            MAPROOM._mc.Hide();
        }
    }

    private onTruce(param1: MouseEvent): void {
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        if (!this.data.trucestate || this.data.trucestate == "") {
            // Two different UI paths here, one for the mailbox and one for the old truce system.
            // Seems they switched to using the mailbox for truces, but kept the old system in the codebase.
            if (MapRoom._useMailBoxForTruces) {
                let _loc2_: any = new MapRoom.BRIDGE["MessageUI"]();
                let _loc3_: Contact = new Contact(String(this.player.data.userid.Get()), { "first_name": this.player.data.ownerName, "last_name": "", "pic_square": this.player.data.pic });
                _loc2_.picker.preloadSelection(_loc3_);
                _loc2_.subject_txt.htmlText = "<b>" + MapRoom.BRIDGE.KEYS.Get("map_trucesubject");
                _loc2_.body_txt.htmlText = MapRoom.BRIDGE.KEYS.Get("map_trucemessage");
                _loc2_.requestType = "trucerequest";
                _loc2_.truceShareHandler = MapRoom.BRIDGE.truceShareHandler;
                GLOBAL.BlockerAdd();
                GLOBAL._layerWindows.addChild(as3.cast(_loc2_, DisplayObject));
            } else {
                MapRoom.BRIDGE.RequestTruce(this.data.ownerName, this.data.baseid.Get());
            }
        } else {
            MapRoom.BRIDGE.GLOBAL.Message(MapRoom.BRIDGE.KEYS.Get("msg_trucealreadyrequested"));
        }
    }

    private onAttack(param1: MouseEvent): void {
        let _loc6_: string = null;
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        let discordOldEnough: boolean = Boolean(MapRoom.BRIDGE.GLOBAL._flags.discordOldEnough);
        let discordAgeMessage: string = String(MapRoom.BRIDGE.KEYS.Get("newmap_discord_age"));

        let _loc2_: BaseObject = as3.cast(this.player.data, BaseObject);
        let mr1TribeIds: any[] = TRIBES.L_IDS.concat(TRIBES.K_IDS, TRIBES.A_IDS, TRIBES.D_IDS);

        if (!discordOldEnough && mr1TribeIds.indexOf(_loc2_.baseid.Get()) == -1) {
            MapRoom.BRIDGE.GLOBAL.Message(discordAgeMessage);
            return;
        }
        let _loc3_: boolean = false;
        let _loc4_: string = "";
        let _loc5_: string = String(MapRoom.BRIDGE.KEYS.Get("map_attack_btn2"));
        let _loc7_: boolean = MapRoom.BRIDGE.HOUSING._housingUsed.Get() > 0 || MapRoom.BRIDGE.GLOBAL._playerGuardianData != null;
        if (MapRoom.BRIDGE.GLOBAL._bFlinger != null && MapRoom.BRIDGE.GLOBAL._bFlinger._canFunction && MapRoom.BRIDGE.GLOBAL._bFlinger._countdownUpgrade.Get() == 0) {
            if (_loc2_.wm.Get() == 0) {
                if (_loc2_.saved.Get() >= MapRoom.BRIDGE.GLOBAL.Timestamp() - 62) {
                    _loc3_ = false;
                    _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_ownerinyard", { "v1": _loc2_.ownerName }));
                } else if (MapRoom.BRIDGE.GLOBAL._flags.attacking == 0) {
                    _loc3_ = false;
                    _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_attackingdisabled"));
                } else {
                    switch (_loc2_.attackpermitted.Get()) {
                        case 1:
                            _loc3_ = true;
                            if (MapRoom.BRIDGE.BASE._isProtected > GLOBAL.Timestamp()) {
                                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_protection", { "v1": MapRoom.BRIDGE.GLOBAL.ToTime(MapRoom.BRIDGE.BASE._isProtected - MapRoom.BRIDGE.GLOBAL.Timestamp(), false, false) }));
                            } else if (_loc2_.friend.Get()) {
                                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_attackfriend", { "v1": _loc2_.ownerName }));
                            } else {
                                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_attackconfirm", { "v1": _loc2_.ownerName }));
                            }
                            break;
                        case 2:
                            _loc3_ = true;
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_higherlevelconfirm", { "v1": _loc2_.ownerName }));
                            break;
                        case 3:
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_leveltoolow"));
                            break;
                        case 4:
                            _loc3_ = true;
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_vengeance"));
                            break;
                        case 5:
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_dp", { "v1": _loc2_.ownerName }));
                            break;
                        case 6:
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_sp", { "v1": _loc2_.ownerName }));
                            break;
                        case 7:
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_inprogress", { "v1": _loc2_.ownerName, "v2": _loc2_.attacker }));
                            break;
                        case 9:
                            _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_truceactive", { "v1": _loc2_.ownerName }));
                    }
                }
            } else {
                _loc3_ = true;
                if (_loc2_.wm.Get() == 0) {
                    _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_atatckconfirm", { "v1": _loc2_.ownerName }));
                    if (_loc2_.level.Get() > MapRoom.BRIDGE.BASE.BaseLevel().level) {
                        _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_higherlevelconfirm", { "v1": _loc2_.ownerName }));
                    }
                } else {
                    _loc6_ = _loc2_.wm.Get() == 1 ? "wmattack" : GLOBAL.e_BASE_MODE.ATTACK;
                    if (_loc7_) {
                        this.onAttackB(_loc2_.baseid.Get(), _loc6_);
                        return;
                    }
                }
            }
        } else {
            _loc3_ = false;
            if (MapRoom.BRIDGE.GLOBAL._bFlinger == null) {
                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_needflinger"));
            } else if (MapRoom.BRIDGE.GLOBAL._bFlinger._countdownUpgrade.Get() > 0) {
                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_flingerupgrading"));
            } else {
                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_flingerdamaged"));
            }
        }
        if (_loc3_) {
            MapRoom.BRIDGE.HOUSING.HousingSpace();
            _loc6_ = _loc2_.wm.Get() == 1 ? "wmattack" : GLOBAL.e_BASE_MODE.ATTACK;
            if (_loc7_) {
                MapRoom.BRIDGE.GLOBAL.Message(_loc4_, _loc5_, as3.bind(this, this.onAttackB), [_loc2_.baseid.Get(), _loc6_]);
            } else {
                _loc4_ = String(MapRoom.BRIDGE.KEYS.Get("map_msg_nomonsters"));
                MapRoom.BRIDGE.GLOBAL.Message(_loc4_);
            }
        } else {
            MapRoom.BRIDGE.GLOBAL.Message(_loc4_);
        }
    }

    public onAttackB(param1: number, param2: string): void {
        let _loc3_: BaseObject = as3.cast(this.player.data, BaseObject);
        if (_loc3_.wm.Get() == 1) {
            MapRoom.BRIDGE.WMBASE._type = _loc3_.type;
        }
        if (_loc3_.friend.Get()) {
            MapRoom.BRIDGE.setVisitingFriend(true);
        } else {
            MapRoom.BRIDGE.setVisitingFriend(false);
        }
        MapRoom.BRIDGE.BASE.LoadBase(null, null, param1, param2, false, EnumYardType.MAIN_YARD);
        if (MapRoom.BRIDGE && MapRoom.BRIDGE.MAPROOM && Boolean(MapRoom.BRIDGE.MAPROOM._mc)) {
            MapRoom.BRIDGE.MAPROOM._mc.Hide();
        }
    }
}
