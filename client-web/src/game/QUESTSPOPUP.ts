import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { BASE, Button, GLOBAL, ImageCache, KEYS, POPUPSETTINGS, PopupInfoMonster, QUESTGROUP, QUESTINFO, QUESTITEM, QUESTS, QUESTSPOPUP_CLIP, SOUNDS, SiegeWeapon, SiegeWeapons, SpecialRewardInfo } from "@game";

export class QUESTSPOPUP extends QUESTSPOPUP_CLIP {
    static {
        as3.fields(this, { _groupsMC: null, _questsMC: null, _infoMC: null, _monsterRewardMC: null, _specialReward: null, _groupID: 0, _questID: null });
    }

    public _groupsMC: MovieClip;
    public _questsMC: MovieClip;
    public _infoMC: QUESTINFO;
    public _monsterRewardMC: PopupInfoMonster;
    public _specialReward: SpecialRewardInfo;
    public _groupID: int;
    public _questID: string;

    public $ctor(): void {
        let _loc2_: any = null;
        super.$ctor();
        this._groupID = -1;
        this._questID = "";
        this.ListGroups();
        this.title_txt.htmlText = KEYS.Get("quests_title");
        let _loc1_: int = 0;
        while (_loc1_ < QUESTS._quests.length) {
            _loc2_ = QUESTS._quests[_loc1_];
            if (Boolean(QUESTS._completed) && QUESTS._completed[_loc2_.id] == 1) {
                this.ListQuestsB(_loc2_.group | 0);
                this.ShowQuestB(as3.str(_loc2_.id));
                break;
            }
            _loc1_++;
        }
    }

    public ListGroups(): void {
        let _loc2_: any = null;
        let _loc3_: QUESTGROUP = null;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        if (this._groupsMC) {
            this.removeChild(this._groupsMC);
            this._groupsMC = null;
        }
        this._groupsMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._groupsMC.x = -337;
        this._groupsMC.y = -195;
        let _loc1_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: boolean = false;
        while (_loc1_ < QUESTS._questGroups.length) {
            _loc2_ = QUESTS._questGroups[_loc1_];
            if (GLOBAL.INFERNO_ONLY) {
                // The Inferno has no Attacking or Evil quests; a tab with nothing in it is left out.
                _loc7_ = false;
                for (_loc5_ of as3.values(QUESTS._quests)) {
                    if (_loc5_.group == _loc1_) {
                        _loc7_ = true;
                        break;
                    }
                }
                if (!_loc7_) {
                    _loc1_++;
                    continue;
                }
            }
            _loc3_ = as3.as(this._groupsMC.addChild(new QUESTGROUP()), QUESTGROUP);
            _loc3_.tLabel.htmlText = KEYS.Get(as3.str(_loc2_.name));
            _loc3_.name = as3.str(_loc1_.toString());
            _loc3_.x = 10;
            _loc3_.y = 10 + 30 * _loc6_;
            _loc6_++;
            _loc3_.mouseChildren = false;
            _loc3_.buttonMode = true;
            _loc3_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ListQuests));
            _loc3_.gotoAndStop(1);
            _loc4_ = 0;
            while (_loc4_ < QUESTS._quests.length) {
                _loc5_ = QUESTS._quests[_loc4_];
                if (QUESTS._completed && _loc5_.group == _loc1_ && QUESTS._completed[_loc5_.id] == 1) {
                    _loc3_.gotoAndStop(3);
                }
                if (this._groupID == _loc1_) {
                    _loc3_.gotoAndStop(2);
                }
                _loc4_++;
            }
            _loc1_++;
        }
    }

    public ListQuests(param1: MouseEvent = null): void {
        let _loc2_: int = 0;
        let _loc3_: any = null;
        let _loc4_: boolean = false;
        SOUNDS.Play("click1");
        if (param1) {
            this._groupID = param1.target.name | 0;
            _loc2_ = 0;
            while (_loc2_ < QUESTS._quests.length) {
                _loc3_ = QUESTS._quests[_loc2_];
                _loc4_ = true;
                if (_loc4_ && _loc3_.group == this._groupID && QUESTS._completed && QUESTS._completed[_loc3_.id] == 1) {
                    this.ShowQuestB(as3.str(_loc3_.id));
                    break;
                }
                _loc2_++;
            }
            this.ListQuestsB(this._groupID);
        } else {
            this.ListQuestsB(this._groupID);
        }
    }

    public ListQuestsB(param1: int): void {
        let c: int = 0;
        let i: int = 0;
        let q: any = null;
        let show: boolean = false;
        let groupID: int = param1;
        let AddItem: Function = (param1: any, param2: int): int => {
            let _loc3_: QUESTITEM = null;
            if (!param1.block) {
                if (param1.id == "BOOKMARK" && !GLOBAL._flags.fanfriendbookmarkquests) {
                    return 0;
                }
                if (param1.id.substr(0, 6) == "INVITE" && !GLOBAL._flags.fanfriendbookmarkquests) {
                    return 0;
                }
                if (param1.id == "FAN" && !GLOBAL._flags.fanfriendbookmarkquests) {
                    return 0;
                }
                _loc3_ = as3.as(this._questsMC.addChild(new QUESTITEM()), QUESTITEM);
                _loc3_.tLabel.htmlText = KEYS.Get(as3.str(param1.name), param1.keyvars);
                _loc3_.y = 10 + 30 * param2;
                _loc3_.x = 10;
                _loc3_.mouseChildren = false;
                _loc3_.buttonMode = true;
                _loc3_.addEventListener(MouseEvent.CLICK, this.ShowQuest(as3.str(param1.id)));
                _loc3_.gotoAndStop(1);
                if (Boolean(QUESTS._completed) && QUESTS._completed[param1.id] == 1) {
                    _loc3_.gotoAndStop(3);
                } else {
                    _loc3_.mcTick.visible = false;
                }
                if (this._questID == param1.id) {
                    _loc3_.gotoAndStop(2);
                }
                return 1;
            }
            return 0;
        };
        this._groupID = groupID;
        this.ListGroups();
        if (this._questsMC) {
            this.removeChild(this._questsMC);
            this._questsMC = null;
        }
        if (this._infoMC) {
            this.removeChild(this._infoMC);
            this._infoMC = null;
        }
        this._questsMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._questsMC.x = -188;
        this._questsMC.y = -195;
        c = 0;
        if (QUESTS._completed) {
            i = 0;
            while (i < QUESTS._quests.length) {
                q = QUESTS._quests[i];
                if (q.group == this._groupID && c < 13) {
                    if (Boolean(QUESTS._completed[q.id]) && QUESTS._completed[q.id] == 1) {
                        c = (c + AddItem(q, c)) | 0;
                    }
                }
                i++;
            }
        }
        i = 0;
        while (i < QUESTS._quests.length) {
            q = QUESTS._quests[i];
            if (q.group == this._groupID && c < 13) {
                show = true;
                if (show && !QUESTS._completed[q.id]) {
                    c = (c + AddItem(q, c)) | 0;
                }
            }
            i++;
        }
    }

    public ShowQuest(param1: string): Function {
        let questID: string = null;
        questID = param1;
        return (param1: MouseEvent): void => {
            this.ShowQuestB(questID);
        };
    }

    public ShowQuestB(param1: string): void {
        let i: int = 0;
        let ImageLoaded: Function = null;
        let q: any = null;
        let description: string = null;
        let hintStr: string = null;
        let qq: int = 0;
        let n: int = 0;
        let weapon: SiegeWeapon = null;
        let c: int = 0;
        let questID: string = param1;
        this._questID = questID;
        if (this._infoMC) {
            this.removeChild(this._infoMC);
            this._infoMC = null;
        }
        this.ListQuestsB(this._groupID);
        this._infoMC = as3.as(this.addChild(new QUESTINFO()), QUESTINFO);
        this._infoMC.x = 8;
        this._infoMC.y = -195;
        this._infoMC.tReward.htmlText = "<b>" + KEYS.Get("popup_label_reward") + "</b>";
        QUESTS._displayedInstructions = true;
        i = 0;
        while (i < QUESTS._quests.length) {
            q = QUESTS._quests[i];
            if (q.id == questID) {
                description = KEYS.Get(as3.str(q.description), q.keyvars);
                description = description.replace("#installsgenerated#", BASE._installsGenerated);
                description = description.replace("#mushroomspicked#", QUESTS._global.mushroomspicked);
                description = description.replace("#goldmushroomspicked#", QUESTS._global.goldmushroomspicked);
                description = description.replace("#monstersblended#", QUESTS._global.monstersblended);
                description = description.replace("#giftssent#", QUESTS._global.bonus_gifts);
                description = description.replace("#sentgiftsaccepted#", QUESTS._global.gift_accept);
                if (Boolean(QUESTS._completed) && QUESTS._completed[questID] == 1) {
                    this._infoMC.tDescription.htmlText = "<b>" + KEYS.Get("q_ui_completed") + "</b><br>" + description;
                } else {
                    this._infoMC.tDescription.htmlText = description;
                }
                if (QUESTS._completed && QUESTS._completed[q.id] == 1 || q.hint == "") {
                    this._infoMC.tHint.htmlText = "";
                } else {
                    hintStr = KEYS.Get(as3.str(q.hint), q.keyvars);
                    this._infoMC.tHint.htmlText = "<b>" + KEYS.Get("q_ui_hint") + "</b> <i>" + hintStr + "</i>";
                }
                if (q.questimage) {
                    ImageLoaded = (param1: string, param2: BitmapData): void => {
                        try {
                            this._infoMC.mcImage.addChild(new Bitmap(param2));
                        } catch (e) {
                        }
                    };
                    ImageCache.GetImageWithCallBack("popups/" + q.questimage, ImageLoaded);
                }
                if (q.monster_reward != undefined) {
                    qq = 0;
                    while (qq < 5) {
                        if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                            this._infoMC["R" + (qq + 1)].gotoAndStop(qq + 1);
                        } else {
                            this._infoMC["R" + (qq + 1)].gotoAndStop(qq + 7);
                        }
                        this._infoMC["R" + (qq + 1)].visible = false;
                        qq++;
                    }
                    this._monsterRewardMC = new PopupInfoMonster();
                    this._monsterRewardMC.Setup(this._infoMC.R1.x | 0, this._infoMC.R1.y | 0, as3.str(q.reward_creatureid), q.monster_reward | 0);
                    this._infoMC.addChild(this._monsterRewardMC);
                } else if (q.siegeweapon_reward) {
                    n = 1;
                    while (n <= 5) {
                        this._infoMC["R" + n].visible = false;
                        n++;
                    }
                    weapon = SiegeWeapons.getWeapon(as3.str(q.siegeweapon_reward));
                    this._specialReward = new SpecialRewardInfo();
                    this._specialReward.x = this._infoMC.R1.x;
                    this._specialReward.y = this._infoMC.R1.y;
                    this._specialReward.Setup(weapon.name, q.siegeweapon_rewardcount | 0, weapon.rewardImage);
                    this._infoMC.addChild(this._specialReward);
                } else {
                    c = 0;
                    while (c < 5) {
                        if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                            this._infoMC["R" + (c + 1)].gotoAndStop(c + 1);
                        } else {
                            this._infoMC["R" + (c + 1)].gotoAndStop(c + 7);
                        }
                        this._infoMC["R" + (c + 1)].tTitle.htmlText = KEYS.Get(as3.str(GLOBAL._resourceNames[c]));
                        GLOBAL.ioFitText(as3.cast(this._infoMC["R" + (c + 1)].tTitle, TextField), 7);
                        // (Inferno-only: "Charbo")
                        this._infoMC["R" + (c + 1)].tValue.htmlText = "<b>" + GLOBAL.FormatNumber(Number(q.reward[c])) + "</b>";
                        this._infoMC["R" + (c + 1)].visible = true;
                        c++;
                    }
                }
                this._infoMC.bCollect.SetupKey("btn_collect");
                if (BASE._pendingPurchase.length == 0) {
                    this._infoMC.bCollect.addEventListener(MouseEvent.CLICK, this.Collect(questID));
                    if (!QUESTS._completed || QUESTS._completed[questID] != 1) {
                        (as3.as(this._infoMC.bCollect, Button)).Enabled = false;
                        this._infoMC.mcArrow.visible = false;
                    } else {
                        (as3.as(this._infoMC.bCollect, Button)).Highlight = true;
                        this._infoMC.mcArrow.visible = true;
                    }
                } else {
                    (as3.as(this._infoMC.bCollect, Button)).Enabled = false;
                }
                break;
            }
            i++;
        }
    }

    public Collect(param1: string): Function {
        let questID: string = null;
        questID = param1;
        return (param1: MouseEvent = null): void => {
            let _loc3_: any = undefined;
            this._infoMC.bCollect.enabled = false;
            QUESTS.CollectB(questID);
            let _loc2_: any = 0;
            while (_loc2_ < QUESTS._quests.length) {
                _loc3_ = QUESTS._quests[_loc2_];
                if (Boolean(QUESTS._completed) && QUESTS._completed[_loc3_.id] == 1) {
                    this.ListQuestsB(_loc3_.group | 0);
                    this.ShowQuestB(as3.str(_loc3_.id));
                    return;
                }
                _loc2_++;
            }
            if (QUESTS._mc) {
                QUESTS.Hide();
            }
        };
    }

    public Hide(): void {
        QUESTS.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
