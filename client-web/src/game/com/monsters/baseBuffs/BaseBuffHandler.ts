import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BaseBuff, BaseBuffLibrary, IPlayerHandler, Player, print } from "@game";

export class BaseBuffHandler extends ASObject implements IPlayerHandler {
    static {
        as3.implement(this, [IPlayerHandler]);
        as3.fields(this, { m_buffs: null, m_player: null, m_isInitialized: false });
    }

    public static instance: BaseBuffHandler;

    static {
        as3.lazyStatics(this, { instance: null }, () => {
            BaseBuffHandler.instance = new BaseBuffHandler();
        });
    }
    private m_buffs: Vector<BaseBuff>;
    private m_player: Player;
    private m_isInitialized: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    public get isInitialized(): boolean {
        return this.m_isInitialized;
    }

    public getBuffByID(param1: uint): BaseBuff {
        let _loc3_: BaseBuff = null;
        if (!this.isInitialized) {
            return null;
        }
        let _loc2_: int = 0;
        while (_loc2_ < this.m_buffs.length) {
            _loc3_ = as3.vget(this.m_buffs, _loc2_);
            if (param1 == _loc3_.id) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }

    public getBuffByName(param1: string): BaseBuff {
        let _loc3_: BaseBuff = null;
        let _loc2_: int = 0;
        while (_loc2_ < this.m_buffs.length) {
            _loc3_ = as3.vget(this.m_buffs, _loc2_);
            if (param1 == _loc3_.name) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }

    public addBuffByID(param1: uint): BaseBuff {
        let _loc2_: BaseBuff = BaseBuffLibrary.getBuffByID(param1);
        if (_loc2_) {
            this.addBuff(_loc2_);
        }
        return _loc2_;
    }

    private addBuff(param1: BaseBuff): void {
        this.m_buffs.push(param1);
        param1.apply();
        print("added base buff " + param1 + "(id:" + param1.id + ") with a value of " + param1.value);
    }

    public clearBuffs(): void {
        this.m_isInitialized = false;
        if (!this.m_buffs) {
            return;
        }
        let _loc1_: int = (this.m_buffs.length - 1) | 0;
        while (_loc1_ >= 0) {
            as3.vget(this.m_buffs, _loc1_).clear();
            this.m_buffs.splice(_loc1_, 1);
            _loc1_--;
        }
    }

    public exportData(): any {
        return null;
    }

    public importData(param1: any): void {
        let _loc2_: any = undefined;
        let _loc3_: BaseBuff = null;
        for (_loc2_ in param1) {
            if (!(!(as3.is(_loc2_, uint)) || param1[_loc2_] == null || param1[_loc2_] == 0)) {
                _loc3_ = BaseBuffLibrary.getBuffByID(_loc2_ >>> 0, this.m_player.isAttacking ? BaseBuffLibrary.k_ATTACKING : BaseBuffLibrary.k_DEFENDING);
                if (_loc3_) {
                    _loc3_.value = Number(param1[_loc2_]);
                    this.addBuff(_loc3_);
                }
            }
        }
    }

    public initialize(param1: any = null): void {
        if (!this.m_buffs) {
            BaseBuffLibrary.initialize();
            this.m_buffs = new Vector<BaseBuff>(0, false, BaseBuff);
        }
        this.m_isInitialized = true;
    }

    public get name(): string {
        return "buffs";
    }

    public set player(param1: Player) {
        this.m_player = param1;
    }
}
