import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip, Shape } from "flash/display";
import { ALLIANCES, ImageCache } from "@game";

export class AllyInfo extends ASObject {
    static {
        as3.fields(this, { alliance_id: 0, name: null, image: 0, relationship: 0, relationships: null, _relCheckSelf: true, _relCheckThem: false });
    }

    private static _forceRelations: boolean = true;

    private static _useIconRelations: boolean = false;

    private static _relationProps: any = { "hostile": -1, "hostileleader": -2, "neutral": 0, "friendly": 1, "friendlyleader": 2, "member": 4, "leader": 5 };

    private static _picPropsL: any = { "picX": 0, "picY": 0, "picW": 75, "picH": 75, "relW": 75, "relH": 75, "relX": 0, "relY": 0 };

    private static _picPropsM: any = { "picX": 2, "picY": 2, "picW": 46, "picH": 46, "relW": 50, "relH": 50, "relX": 0, "relY": 0 };

    private static _picPropsS: any = { "picX": 0, "picY": 0, "picW": 25, "picH": 25, "relW": 25, "relH": 25, "relX": 0, "relY": 0 };

    private static _picPropsXS: any = { "picX": 0, "picY": 0, "picW": 12, "picH": 12, "relW": 12, "relH": 12, "relX": 0, "relY": 0 };

    public static _picURLs: any = { "baseURL": "alliances/", "sizeL": "_large", "sizeM": "_medium", "sizeS": "_small", "sizeXS": "_xsmall", "ally": "A", "friendly": "F", "hostile": "H", "neutral": "N", "playerHex": 3704807, "allyHex": 11327481, "friendlyHex": 1301765, "hostileHex": 16729640, "neutralHex": 16776960, "noneHex": 16777215, "ext": ".png" };
    private alliance_id: int;
    public name: string;
    public image: int;
    public relationship: int;
    private relationships: any;
    private _relCheckSelf: boolean;
    private _relCheckThem: boolean;

    public $ctor(param1?: any): void {
        super.$ctor();
        this.alliance_id = param1.alliance_id | 0;
        this.name = as3.str(param1.name);
        this.image = param1.image | 0;
        this.relationships = param1.relationships;
        if (AllyInfo._forceRelations) {
            if (ALLIANCES._allianceID && ALLIANCES._allianceID != 0 && this.alliance_id && !this.relationship) {
                this.Relations(ALLIANCES._allianceID);
            }
        }
    }

    public Relations(param1: int): int {
        if (this.alliance_id) {
            this.relationship = AllyInfo._relationProps.neutral | 0;
        }
        if (!this.relationships || !ALLIANCES._myAlliance) {
            return 0;
        }
        let _loc2_: int = 0;
        if (param1 == this.alliance_id) {
            _loc2_ = AllyInfo._relationProps.member | 0;
            this.relationship = _loc2_;
            return 0;
        }
        if (this._relCheckThem) {
            if (Boolean(this.relationships) && Boolean(this.relationships[param1])) {
                _loc2_ = this.relationships[param1] | 0;
            }
        }
        if (this._relCheckSelf) {
            if (ALLIANCES._myAlliance && ALLIANCES._myAlliance.relationships && Boolean(ALLIANCES._myAlliance.relationships[this.alliance_id])) {
                _loc2_ = ALLIANCES._myAlliance.relationships[this.alliance_id] | 0;
            }
        }
        this.relationship = _loc2_;
        return _loc2_;
    }

    /**
     * Records this alliance's stance towards another, so the map room recolours
     * without waiting for the next base load to resend the map.
     *
     * @param {int} param1 - The alliance being flagged.
     * @param {int} param2 - -1 Foe, 0 Neutral, 1 Ally.
     */
    public SetRelation(param1: int, param2: int): void {
        if (this.relationships) {
            this.relationships[param1] = param2;
        }
    }

    public AlliancePic(param1: string, param2: MovieClip, param3: MovieClip = null, param4: boolean = false): void {
        let _loc5_: int = 0;
        let _loc6_: string = null;
        let _loc7_: any = null;
        let _loc8_: string = null;
        let _loc9_: any = null;
        let _loc10_: int = 0;
        let _loc11_: Shape = null;
        let _loc12_: uint = 0;
        if (this.alliance_id && this.alliance_id > 0 && Boolean(this.image)) {
            _loc5_ = this.image;
            _loc6_ = "" + AllyInfo._picURLs.baseURL + _loc5_;
            _loc7_ = new Object();
            if (param1 == AllyInfo._picURLs.sizeL || param1 == "large") {
                _loc6_ += AllyInfo._picURLs.sizeL;
                _loc7_ = AllyInfo._picPropsL;
            } else if (param1 == AllyInfo._picURLs.sizeM || param1 == "medium") {
                _loc6_ += AllyInfo._picURLs.sizeM;
                _loc7_ = AllyInfo._picPropsM;
            } else {
                if (!(param1 == AllyInfo._picURLs.sizeS || param1 == "small")) {
                    return;
                }
                _loc6_ += AllyInfo._picURLs.sizeS;
                _loc7_ = AllyInfo._picPropsS;
            }
            _loc6_ += AllyInfo._picURLs.ext;
            ImageCache.GetImageWithCallBack(_loc6_, as3.bind(this, this.IconLoaded), true, 1, "", [param2, _loc7_]);
            if (param4) {
                if (AllyInfo._useIconRelations) {
                    _loc8_ = "" + AllyInfo._picURLs.baseURL;
                    _loc9_ = new Object();
                    if (this.relationship == AllyInfo._relationProps.neutral) {
                        _loc8_ += AllyInfo._picURLs.neutral;
                    } else if (this.relationship >= AllyInfo._relationProps.member) {
                        _loc8_ += AllyInfo._picURLs.ally;
                    } else if (this.relationship > AllyInfo._relationProps.neutral && this.relationship < AllyInfo._relationProps.member) {
                        _loc8_ += AllyInfo._picURLs.friendly;
                    } else {
                        if (this.relationship > AllyInfo._relationProps.hostile) {
                            return;
                        }
                        _loc8_ += AllyInfo._picURLs.hostile;
                    }
                    if (param1 == AllyInfo._picURLs.sizeL || param1 == "large") {
                        _loc8_ += AllyInfo._picURLs.sizeS;
                        _loc9_ = AllyInfo._picPropsL;
                    } else if (param1 == AllyInfo._picURLs.sizeM || param1 == "medium") {
                        _loc8_ += AllyInfo._picURLs.sizeS;
                        _loc9_ = AllyInfo._picPropsM;
                    } else {
                        if (!(param1 == AllyInfo._picURLs.sizeS || param1 == "small")) {
                            return;
                        }
                        _loc8_ += AllyInfo._picURLs.sizeXS;
                        _loc9_ = AllyInfo._picPropsS;
                    }
                    _loc8_ += AllyInfo._picURLs.ext;
                    ImageCache.GetImageWithCallBack(_loc8_, as3.bind(this, this.IconRelationLoaded), true, 1, "", [param2, _loc9_]);
                } else if (param3) {
                    _loc10_ = param3.numChildren;
                    while (_loc10_--) {
                        param3.removeChildAt(_loc10_);
                    }
                    _loc11_ = new Shape();
                    _loc12_ = 16777215;
                    if (this.relationship == AllyInfo._relationProps.neutral) {
                        _loc12_ = AllyInfo._picURLs.neutralHex >>> 0;
                    } else if (this.relationship >= AllyInfo._relationProps.member) {
                        _loc12_ = AllyInfo._picURLs.allyHex >>> 0;
                    } else if (this.relationship > AllyInfo._relationProps.neutral && this.relationship < AllyInfo._relationProps.member) {
                        _loc12_ = AllyInfo._picURLs.friendlyHex >>> 0;
                    } else if (this.relationship <= AllyInfo._relationProps.hostile) {
                        _loc12_ = AllyInfo._picURLs.hostileHex >>> 0;
                    } else {
                        _loc12_ = AllyInfo._picURLs.noneHex >>> 0;
                    }
                    _loc11_.graphics.beginFill(_loc12_);
                    _loc11_.graphics.drawRect(Number(_loc7_.relX), Number(_loc7_.relY), Number(_loc7_.relW), Number(_loc7_.relH));
                    _loc11_.graphics.endFill();
                    param3.addChild(_loc11_);
                }
            }
        }
    }

    private IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = new Bitmap(param2);
        if (param3[0]) {
            param3[0].addChild(_loc4_);
            param3[0].setChildIndex(_loc4_, 0);
            _loc4_.x = Number(param3[1].picX);
            _loc4_.y = Number(param3[1].picY);
        }
    }

    private IconRelationLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        _loc4_ = new Bitmap(param2);
        if (param3[0]) {
            param3[0].addChild(_loc4_);
            _loc4_.x = Number(param3[1].relX);
            _loc4_.y = Number(param3[1].relY);
        }
    }
}
