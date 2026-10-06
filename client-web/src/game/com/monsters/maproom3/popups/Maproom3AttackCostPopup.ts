import * as as3 from "as3";
import { int, uint } from "as3";
import { Event, EventDispatcher, MouseEvent } from "flash/events";
import { BASE, GLOBAL, KEYS, MapRoom3Cell, POPUPS, STORE, SecNum, attackCostPopup, icon_costs } from "@game";

export class Maproom3AttackCostPopup extends EventDispatcher {
    static {
        as3.fields(this, { addtionalLoadParameters: null, m_graphic: null, m_cell: null, m_shinyCost: NaN, m_totalNeededResources: 0 });
    }

    public static readonly k_LOAD_ATTACK: string = "loadAttack";
    public addtionalLoadParameters: any;
    private m_graphic: attackCostPopup;
    private m_cell: MapRoom3Cell;
    private m_shinyCost: number;
    private m_totalNeededResources: uint;

    public $ctor(param1?: any /* MapRoom3Cell */): void {
        super.$ctor();
        this.m_graphic = new attackCostPopup();
        this.m_cell = param1;
        this.setup();
    }

    private setup(): void {
        let _loc2_: uint = 0;
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: icon_costs = null;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc1_: any[] = this.m_cell.attackCost;
        let _loc3_: int = 1;
        while (_loc3_ < 5) {
            _loc4_ = Number(_loc1_[_loc3_ - 1]);
            _loc5_ = Number(GLOBAL._attackersResources["r" + _loc3_].Get());
            if ((_loc6_ = _loc4_ - _loc5_) > 0) {
                this.m_totalNeededResources = (this.m_totalNeededResources + _loc6_) >>> 0;
            }
            _loc2_ = (_loc2_ + _loc4_) >>> 0;
            _loc3_++;
        }
        this.m_shinyCost = STORE.GetShinyCostFromTotalResources(_loc2_);
        this.m_graphic.tBody.htmlText = KEYS.Get("msg_attackcost", { "v1": this.m_cell.name });
        this.m_graphic.mcInstant.tDescription.htmlText = KEYS.Get("msg_attackinstant");
        this.m_graphic.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": this.m_shinyCost }));
        this.m_graphic.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedShinyAttack), false, 0, true);
        this.m_graphic.mcResources.bAction.Setup(KEYS.Get("btn_useresources"));
        _loc3_ = 1;
        while (_loc3_ < 6) {
            _loc7_ = as3.as(this.m_graphic.mcResources.getChildByName("mcR" + _loc3_), icon_costs);
            _loc8_ = _loc1_[_loc3_ - 1] | 0;
            if (_loc7_) {
                _loc9_ = GLOBAL._attackersResources["r" + _loc3_].Get() < _loc8_ ? "FF0000" : "000000";
                if (!_loc8_) {
                    _loc7_.alpha = 0.25;
                }
                _loc7_.gotoAndStop(_loc3_);
                _loc7_.tValue.htmlText = "<b><font color=\"#" + _loc9_ + "\">" + GLOBAL.FormatNumber(_loc8_) + "</font></b>";
                _loc7_.tTitle.htmlText = "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[_loc3_ - 1])) + "</b>";
            }
            _loc3_++;
        }
        this.m_graphic.mcResources.mcTime.visible = false;
        this.m_graphic.mcResources.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedResourceAttack), false, 0, true);
    }

    protected clickedShinyAttack(param1: MouseEvent): void {
        if (BASE._pendingPurchase.length == 0) {
            if (Boolean(this.m_shinyCost) && this.m_shinyCost > BASE._credits.Get()) {
                POPUPS.Next();
                POPUPS.DisplayGetShiny();
            } else {
                this.addtionalLoadParameters = { "shiny": this.m_shinyCost };
                this.dispatchEvent(new Event(Maproom3AttackCostPopup.k_LOAD_ATTACK));
            }
        }
    }

    protected clickedResourceAttack(param1: MouseEvent = null): void {
        let _loc2_: uint = 0;
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        let _loc5_: SecNum = null;
        if (this.m_totalNeededResources) {
            _loc2_ = STORE.GetShinyCostFromTotalResources(this.m_totalNeededResources) >>> 0;
            GLOBAL.Message(KEYS.Get("msg_needresourcesattack", { "v1": GLOBAL.FormatNumber(this.m_totalNeededResources), "v2": GLOBAL.FormatNumber(_loc2_) }), KEYS.Get("btn_getresources"), as3.bind(this, this.clickedResourceTopoff));
        } else {
            _loc3_ = this.m_cell.attackCost;
            _loc4_ = 0;
            while (_loc4_ < _loc3_.length) {
                _loc5_ = as3.cast(GLOBAL._resources["r" + (_loc4_ + 1)], SecNum);
                GLOBAL._resources["r" + (_loc4_ + 1)] = new SecNum(_loc5_.Get() - _loc3_[_loc4_]);
                _loc4_++;
            }
            this.addtionalLoadParameters = { "resources": _loc3_ };
            this.dispatchEvent(new Event(Maproom3AttackCostPopup.k_LOAD_ATTACK));
        }
    }

    private clickedResourceTopoff(): void {
        let _loc1_: uint = STORE.GetShinyCostFromTotalResources(this.m_totalNeededResources) >>> 0;
        if (BASE._pendingPurchase.length == 0) {
            if (Boolean(_loc1_) && _loc1_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else {
                this.addtionalLoadParameters = { "shiny": _loc1_ };
                this.dispatchEvent(new Event(Maproom3AttackCostPopup.k_LOAD_ATTACK));
            }
        }
    }

    public get graphic(): attackCostPopup {
        return this.m_graphic;
    }
}
