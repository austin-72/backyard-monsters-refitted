import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, Button, GLOBAL, ImageCache, KEYS, MISSIONS_INFO_CLIP, PopupInfoMonster, QUESTS, SiegeWeapon, SiegeWeapons, SpecialRewardInfo } from "@game";

export class MISSIONS_INFO extends MISSIONS_INFO_CLIP {
    static {
        as3.fields(this, { _text: null, _textCur: 0, _monsterRewardMC: null, _specialReward: null, _missionID: null, _missionObject: null, _missionKey: null, _mcImage: null });
    }

    private _text: string;
    private _textCur: int;
    private _monsterRewardMC: PopupInfoMonster;
    private _specialReward: SpecialRewardInfo;
    private _missionID: string;
    private _missionObject: any;
    private _missionKey: string;
    private _mcImage: MovieClip;

    public $ctor(param1?: string): void {
        let description: string = null;
        let ImageLoaded: Function = null;
        let hintStr: string = null;
        let qq: int = 0;
        let n: int = 0;
        let weapon: SiegeWeapon = null;
        let c: int = 0;
        let missionID: string = param1;
        super.$ctor();
        this.tReward.htmlText = "<b>" + KEYS.Get("popup_label_reward") + "</b>";
        this._missionObject = QUESTS._quests[missionID];
        this._missionID = missionID;
        this._missionKey = as3.str(QUESTS._quests[missionID].id);
        this._mcImage = this.mcImage;
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y;
        description = "<b>" + KEYS.Get(as3.str(this._missionObject.description), this._missionObject.keyvars) + "</b><br>";
        description = description.replace("#installsgenerated#", BASE._installsGenerated);
        description = description.replace("#mushroomspicked#", QUESTS._global.mushroomspicked);
        description = description.replace("#goldmushroomspicked#", QUESTS._global.goldmushroomspicked);
        description = description.replace("#monstersblended#", QUESTS._global.monstersblended);
        description = description.replace("#giftssent#", QUESTS._global.bonus_gifts);
        description = description.replace("#sentgiftsaccepted#", QUESTS._global.gift_accept);
        if (Boolean(QUESTS._completed) && QUESTS._completed[this._missionKey] == 1) {
            this.tDescription.htmlText = "<b>" + KEYS.Get("q_ui_completed") + "</b><br>" + description;
        } else {
            this.tDescription.htmlText = description;
        }
        if (QUESTS._completed && QUESTS._completed[this._missionObject.id] == 1 || this._missionObject.hint == "") {
            this.tHint.htmlText = "";
        } else {
            hintStr = KEYS.Get(as3.str(this._missionObject.hint), this._missionObject.keyvars);
            this.tHint.htmlText = "<b>" + KEYS.Get("q_ui_hint") + "</b> <i>" + hintStr + "</i>";
        }
        if (this._missionObject.questimage) {
            ImageLoaded = (param1: string, param2: BitmapData): void => {
                let k: int = 0;
                let bmp: Bitmap = null;
                let key: string = param1;
                let bmd: BitmapData = param2;
                try {
                    k = this._mcImage.numChildren;
                    while (k--) {
                        this._mcImage.removeChildAt(k);
                    }
                    bmp = new Bitmap(bmd);
                    this._mcImage.addChild(bmp);
                } catch (e) {
                }
            };
            ImageCache.GetImageWithCallBack("popups/" + this._missionObject.questimage, ImageLoaded);
        }
        if (this._missionObject.monster_reward != undefined) {
            qq = 0;
            while (qq < 5) {
                if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                    this["R" + (qq + 1)].gotoAndStop(c + 1);
                } else {
                    this["R" + (qq + 1)].gotoAndStop(c + 7);
                }
                this["R" + (qq + 1)].tTitle.htmlText = KEYS.Get(as3.str(GLOBAL._resourceNames[c]));
                this["R" + (qq + 1)].tValue.htmlText = "<b>" + GLOBAL.FormatNumber(Number(this._missionObject.reward[c])) + "</b>";
                this["R" + (qq + 1)].visible = false;
                qq++;
            }
            this._monsterRewardMC = new PopupInfoMonster();
            this._monsterRewardMC.Setup(this.R1.x | 0, this.R1.y | 0, as3.str(this._missionObject.reward_creatureid), this._missionObject.monster_reward | 0);
            this.addChild(this._monsterRewardMC);
        } else if (this._missionObject.siegeweapon_reward) {
            n = 1;
            while (n <= 5) {
                this["R" + n].visible = false;
                n++;
            }
            weapon = SiegeWeapons.getWeapon(as3.str(this._missionObject.siegeweapon_reward));
            this._specialReward = new SpecialRewardInfo();
            this._specialReward.x = this.R1.x;
            this._specialReward.y = this.R1.y;
            this._specialReward.Setup(weapon.name, this._missionObject.siegeweapon_rewardcount | 0, weapon.rewardImage);
            this.addChild(this._specialReward);
        } else {
            c = 0;
            while (c < 5) {
                if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                    this["R" + (c + 1)].gotoAndStop(c + 1);
                } else {
                    this["R" + (c + 1)].gotoAndStop(c + 7);
                }
                this["R" + (c + 1)].tTitle.htmlText = KEYS.Get(as3.str(GLOBAL._resourceNames[c]));
                this["R" + (c + 1)].tValue.htmlText = "<b>" + GLOBAL.FormatNumber(Number(this._missionObject.reward[c])) + "</b>";
                this["R" + (c + 1)].visible = true;
                c++;
            }
        }
        this.bCollect.SetupKey("btn_collect");
        if (BASE._pendingPurchase.length == 0) {
            this.bCollect.addEventListener(MouseEvent.CLICK, this.Collect(this._missionKey));
            if (!QUESTS._completed || QUESTS._completed[this._missionKey] != 1) {
                (as3.as(this.bCollect, Button)).Enabled = false;
                this.mcArrow.visible = false;
            } else {
                (as3.as(this.bCollect, Button)).Highlight = true;
                this.mcArrow.visible = true;
            }
        } else {
            (as3.as(this.bCollect, Button)).Enabled = false;
        }
        if (Boolean(QUESTS._completed) && QUESTS._completed[this._missionObject.id] == 1) {
            this.gotoAndStop(2);
        } else {
            this.gotoAndStop(1);
        }
    }

    public Collect(param1: string): Function {
        let questID: string = null;
        questID = param1;
        return (param1: MouseEvent = null): void => {
            this.bCollect.enabled = false;
            let _loc2_: any = QUESTS.CollectB(questID);
            if (_loc2_) {
                QUESTS.Hide();
                return;
            }
        };
    }

    public Hide(): void {
        QUESTS.Hide();
    }

    public Resize(): void {
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y;
    }
}
