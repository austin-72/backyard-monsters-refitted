import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { Checkbox, GLOBAL, KEYS, LOGIN, POPUPSETTINGS, RADIO, RADIOSETTINGSPOPUP_CLIP } from "@game";

export class RADIOSETTINGSPOPUP extends RADIOSETTINGSPOPUP_CLIP {
    static {
        as3.fields(this, { _changed: false, _notifyNews: false, _notifyAttack: false, _emailAddress: null, _emailSettings: null, _isSaving: false });
    }

    public _changed: boolean;
    private _notifyNews: boolean;
    private _notifyAttack: boolean;
    private _emailAddress: string;
    private _emailSettings: any;
    private _isSaving: boolean;

    public $ctor(): void {
        this._emailAddress = KEYS.Get("radio_insertemail");
        super.$ctor();
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdded));
        if (RADIO._settings) {
            this._emailSettings = RADIO._settings;
        } else {
            this._emailSettings = {};
        }
    }

    private onAdded(param1: Event): void {
        this.removeEventListener(param1.type, as3.bind(this, this.onAdded));
        this.cbNews = Checkbox.Replace(this.cbNews);
        this.cbAttack = Checkbox.Replace(this.cbAttack);
        this.bSave.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onButtonClick));
        this.bSave.SetupKey("radio_bSave");
        this.tTitle.htmlText = KEYS.Get("radio_tTitle");
        this.tNews.htmlText = KEYS.Get("radio_cbNews");
        this.tAttack.htmlText = KEYS.Get("radio_cbAttack");
        this.tEmail.htmlText = KEYS.Get("radio_tEmail");
        this.tEmailInput.htmlText = "<font color=\"#444444\">" + KEYS.Get("radio_tfEmail") + "</font>";
        this.tDesc.htmlText = KEYS.Get("radio_desc");
        this.tEmailInput.addEventListener(Event.CHANGE, as3.bind(this, this.onEmailChange));
        this.tEmailInput.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onEmailClear));
        this.cbProxy.visible = false;
        this.tProxy.visible = false;
        this.init();
    }

    private init(): void {
        let _loc1_: any = RADIO.getProp("o1");
        if (_loc1_) {
            this.cbNews.fromInt(_loc1_[RADIO.NEWS_KEY]);
            this.cbAttack.fromInt(_loc1_[RADIO.ATTACK_KEY]);
            if (_loc1_[RADIO.ADDRESS_KEY]) {
                this.tEmailInput.htmlText = String(_loc1_[RADIO.ADDRESS_KEY]);
            } else if (Boolean(LOGIN._email) && LOGIN._email != LOGIN._proxymail) {
                this.tEmailInput.htmlText = LOGIN._email;
            } else {
                this.tEmailInput.htmlText = "<font color=\"#444444\">" + KEYS.Get("radio_tfEmail") + "</font>";
            }
        } else {
            as3.cast(this.cbNews, Checkbox).deselect();
            as3.cast(this.cbAttack, Checkbox).deselect();
            if (Boolean(LOGIN._email) && LOGIN._email != LOGIN._proxymail) {
                this.tEmailInput.htmlText = LOGIN._email;
            } else {
                this.tEmailInput.htmlText = "<font color=\"#444444\">" + KEYS.Get("radio_tfEmail") + "</font>";
            }
        }
        as3.cast(this.cbNews, Checkbox).removeEventListener(MouseEvent.MOUSE_UP, as3.bindKey(as3.cast(this.cbNews, Checkbox), "onUp"));
        as3.cast(this.cbNews, Checkbox).addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onCBUp));
        as3.cast(this.cbAttack, Checkbox).removeEventListener(MouseEvent.MOUSE_UP, as3.bindKey(as3.cast(this.cbAttack, Checkbox), "onUp"));
        as3.cast(this.cbAttack, Checkbox).addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onCBUp));
        as3.cast(this.cbNews, Checkbox).Update();
        as3.cast(this.cbAttack, Checkbox).Update();
    }

    private onButtonClick(param1: MouseEvent): void {
        let _loc3_: boolean = false;
        let _loc4_: Checkbox = null;
        let _loc5_: Checkbox = null;
        let _loc6_: any = null;
        let _loc2_: string = String(param1.currentTarget.name);
        switch (_loc2_) {
            case "bSave":
                _loc3_ = true;
                _loc4_ = as3.as(this.cbNews, Checkbox);
                _loc5_ = as3.as(this.cbAttack, Checkbox);
                if (_loc4_.selected || _loc5_.selected) {
                    _loc3_ &&= this.tEmailInput.text.lastIndexOf("@") != -1;
                    _loc3_ &&= this.tEmailInput.text.lastIndexOf(".") != -1;
                }
                if (_loc3_) {
                    (_loc6_ = {})[RADIO.ATTACK_KEY] = as3.cast(this.cbAttack, Checkbox).toInt();
                    if (_loc6_[RADIO.ATTACK_KEY] == 1) {
                    }
                    _loc6_[RADIO.NEWS_KEY] = as3.cast(this.cbNews, Checkbox).toInt();
                    if (_loc6_[RADIO.NEWS_KEY] == 1) {
                    }
                    _loc6_[RADIO.ADDRESS_KEY] = this.tEmailInput.text;
                    if (!_loc4_.selected && !_loc5_.selected) {
                        GLOBAL.Message(KEYS.Get("radio_noSubscribe"), KEYS.Get("radio_noSubscribeY"), as3.bind(this, this.SaveConfirmCB), ["o1", _loc6_], KEYS.Get("radio_noSubscribeN"), null, null);
                    } else if (!RADIO._isSaving) {
                        RADIO.setProp("o1", _loc6_);
                        this._changed = false;
                    }
                } else {
                    GLOBAL.Message(KEYS.Get("radio_enterValidEmail"));
                }
        }
    }

    private SaveConfirmCB(param1: string, param2: any): void {
        if (!RADIO._isSaving) {
            RADIO.setProp(param1, param2);
            this._changed = false;
        }
    }

    public bSaveToggle(param1: boolean = false): void {
        if (param1) {
            RADIO._isSaving = false;
        }
        if (!RADIO._isSaving) {
            this.bSave.SetupKey("radio_bSave");
            this.bSave.enabled = true;
            this.bSave.mouseEnabled = true;
        } else {
            this.bSave.SetupKey("radio_bSaving");
            this.bSave.enabled = false;
            this.bSave.mouseEnabled = false;
        }
    }

    private onCBClick(param1: MouseEvent): void {
        (as3.as(param1.currentTarget, Checkbox)).onClick(param1);
        this.stage.focus = null;
        this._changed = true;
    }

    private onCBUp(param1: MouseEvent): void {
        (as3.as(param1.currentTarget, Checkbox)).onUp(param1);
        this.stage.focus = null;
        this._changed = true;
    }

    private onEmailChange(param1: Event): void {
        this._changed = true;
    }

    private onEmailClear(param1: Event): void {
        this.tEmailInput.htmlText = "";
        this.stage.focus = this.tEmailInput;
        this.tEmailInput.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onEmailClear));
    }

    public Hide(): void {
        let _loc1_: Checkbox = as3.as(this.cbNews, Checkbox);
        let _loc2_: Checkbox = as3.as(this.cbAttack, Checkbox);
        if (this._changed) {
            GLOBAL.Message(KEYS.Get("radio_unsavedChanges"), KEYS.Get("radio_abandonChanges"), RADIO.Hide);
        } else if (!_loc1_.selected && !_loc2_.selected) {
            GLOBAL.Message(KEYS.Get("radio_noSubscribe"), KEYS.Get("radio_noSubscribeY"), RADIO.Hide, null, KEYS.Get("radio_noSubscribeN"), null, null);
        } else {
            RADIO.Hide();
        }
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
