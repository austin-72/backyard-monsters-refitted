import * as as3 from "as3";
import { int } from "as3";
import { MouseEvent } from "flash/events";
import { CREATURES, GLOBAL, KEYS, POPUPS, popup_juice_all } from "@game";

export class PersistantJuiceAllPopup extends popup_juice_all {
    static {
        as3.fields(this, { m_fpAcceptCallback: null, m_fpCloseCallback: null, m_strCreepId: null, m_nTotalCreeps: 0 });
    }

    protected m_fpAcceptCallback: Function;
    protected m_fpCloseCallback: Function;
    protected m_strCreepId: string;
    protected m_nTotalCreeps: int;

    public $ctor(): void {
        super.$ctor();
    }

    public setup(param1: string, param2: Function, param3: Function): void {
        this.m_fpAcceptCallback = param2;
        this.m_fpCloseCallback = param3;
        this.m_strCreepId = param1;
        this.m_nTotalCreeps = GLOBAL.player.monsterListByID(this.m_strCreepId).numHousedCreeps;
        let _loc4_: number = 0.6;
        let _loc5_: int = 0;
        if (GLOBAL._bJuicer._lvl.Get() == 2) {
            _loc4_ = 0.8;
        } else if (GLOBAL._bJuicer._lvl.Get() == 3) {
            _loc4_ = 1;
        }
        _loc5_ = (_loc5_ + Math.ceil(CREATURES.GetProperty(this.m_strCreepId, "cResource") * _loc4_) * this.m_nTotalCreeps) | 0;
        this.mcFrame.Setup(true, as3.bind(this, this.cancelCallback));
        this.btnCancel.Setup(KEYS.Get("mh_cancel_btn"));
        this.btnCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.cancelCallback), false, 0, true);
        this.btnJuice.Setup(KEYS.Get("mh_juicemonstersX_btn", { "v1": this.m_nTotalCreeps, "v2": GLOBAL.FormatNumber(_loc5_) }));
        this.btnJuice.addEventListener(MouseEvent.CLICK, as3.bind(this, this.acceptCallback), false, 0, true);
        this.btnJuice.Highlight = true;
        this.tfTitle.htmlText = KEYS.Get("pm_juiceall_popup_title");
        this.tfBody.htmlText = KEYS.Get("pm_juiceall_popup_body");
    }

    protected acceptCallback(param1: MouseEvent = null): void {
        if (this.m_fpAcceptCallback != null) {
            this.m_fpAcceptCallback(this.m_strCreepId);
        }
        POPUPS.Remove(this);
        this.clear();
    }

    protected cancelCallback(param1: MouseEvent = null): void {
        if (this.m_fpCloseCallback != null) {
            this.m_fpCloseCallback(param1);
        }
        POPUPS.Remove(this);
        this.clear();
    }

    protected clear(): void {
        if (this.btnCancel.hasEventListener(MouseEvent.CLICK)) {
            this.btnCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.cancelCallback));
        }
        if (this.btnJuice.hasEventListener(MouseEvent.CLICK)) {
            this.btnJuice.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.acceptCallback));
        }
        this.m_fpAcceptCallback = null;
        this.m_fpCloseCallback = null;
        this.mcFrame.Clear();
    }
}
