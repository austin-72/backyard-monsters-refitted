import * as as3 from "as3";
import { CREATURELOCKER, GLOBAL, KEYS, KeywordMessage, POPUPS, com_monsters_frontPage_messages_Message as Message } from "@game";

export class Underused01MonsterLocker extends KeywordMessage {
    static {
        as3.fields(this, { _creatureID: null });
    }

    private _creatureID: string;

    public $ctor(): void {
        super.$ctor("idlelocker", "btn_open");
        this.body = KEYS.Get(KeywordMessage.PREFIX + "idlelocker", { "v1": this.getNextUnlockableCreatureName() });
        this.imageURL = Message._IMAGE_DIRECTORY + KeywordMessage.PREFIX + "locker.jpg";
    }

    public override get areRequirementsMet(): boolean {
        this.body = KEYS.Get(KeywordMessage.PREFIX + "idlelocker", { "v1": this.getNextUnlockableCreatureName() });
        return Boolean(GLOBAL._bLocker && !CREATURELOCKER._unlocking && GLOBAL.Timestamp() - GLOBAL.StatGet("CM3") > 60 * 60 * 24 * 5 && Boolean(this.getNextUnlockableCreatureName()));
    }

    protected override onView(): void {
        GLOBAL.StatSet("CM3", GLOBAL.Timestamp());
    }

    protected override onButtonClick(): void {
        let _loc1_: string = this.getNextUnlockableCreatureName();
        CREATURELOCKER._popupCreatureID = this._creatureID;
        CREATURELOCKER.Show();
        CREATURELOCKER._mc.ShowB(this._creatureID);
        POPUPS.Next();
    }

    private getNextUnlockableCreatureName(): string {
        let _loc3_: string = null;
        if (!GLOBAL._bLocker) {
            return null;
        }
        let _loc1_: any = CREATURELOCKER.GetAppropriateCreatures();
        let _loc2_: number = GLOBAL._bLocker._lvl.Get();
        for (_loc3_ in _loc1_) {
            if (!CREATURELOCKER._lockerData[_loc3_] && !CREATURELOCKER._creatures[_loc3_].blocked && _loc2_ >= _loc1_[_loc3_].page) {
                this._creatureID = _loc3_;
                return KEYS.Get(as3.str(_loc1_[_loc3_].name));
            }
        }
        return null;
    }
}
