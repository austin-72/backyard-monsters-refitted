import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { EnumBaseRelationship } from "@game";

export class MapRoom3CellData extends ASObject {
    static {
        as3.fields(this, { m_Name: "", m_FacebookId: "", m_PicSquare: "", m_AllianceId: 0, m_BaseId: 0, m_UserId: 0, m_CellDataBitField1: 0, m_CellDataBitField2: 0 });
    }

    private static MAX_BITS_BASE_LEVEL: uint; // const

    private static MAX_BITS_PLAYER_LEVEL: uint; // const

    private static MAX_BITS_ATTACK_RANGE: uint; // const

    private static MAX_BITS_DAMAGE: uint; // const

    private static MAX_VALUE_BASE_LEVEL: uint; // const

    private static MAX_VALUE_PLAYER_LEVEL: uint; // const

    private static MAX_VALUE_ATTACK_RANGE: uint; // const

    private static MAX_VALUE_DAMAGE: uint; // const

    private static BIT_SHIFT_BASE_LEVEL: uint; // const

    private static BIT_SHIFT_PLAYER_LEVEL: uint; // const

    private static BIT_SHIFT_ATTACK_RANGE: uint; // const

    private static BIT_SHIFT_DAMAGE: uint; // const

    private static MAX_BITS_WILD_MONSTER_TRIBE_ID: uint; // const

    private static MAX_BITS_RELATIONSHIP: uint; // const

    private static MAX_BITS_LOCKED_INVISIBLE: uint; // const

    private static MAX_BITS_FACEBOOK_FRIEND: uint; // const

    private static MAX_BITS_DAMAGE_PROTECTION: uint; // const

    private static MAX_BITS_DESTROYED: uint; // const

    private static MAX_BITS_TRUCE: uint; // const

    private static MAX_VALUE_WILD_MONSTER_TRIBE_ID: uint; // const

    private static MAX_VALUE_RELATIONSHIP: uint; // const

    private static MAX_VALUE_LOCKED_INVISIBLE: uint; // const

    private static MAX_VALUE_FACEBOOK_FRIEND: uint; // const

    private static MAX_VALUE_DAMAGE_PROTECTION: uint; // const

    private static MAX_VALUE_DESTROYED: uint; // const

    private static MAX_VALUE_TRUCE: uint; // const

    private static BIT_SHIFT_WILD_MONSTER_TRIBE_ID: uint; // const

    private static BIT_SHIFT_RELATIONSHIP: uint; // const

    private static BIT_SHIFT_LOCKED_INVISIBLE: uint; // const

    private static BIT_SHIFT_FACEBOOK_FRIEND: uint; // const

    private static BIT_SHIFT_DAMAGE_PROTECTION: uint; // const

    private static BIT_SHIFT_DESTROYED: uint; // const

    private static BIT_SHIFT_TRUCE: uint; // const

    static {
        as3.lazyStatics(this, { MAX_BITS_BASE_LEVEL: 0, MAX_BITS_PLAYER_LEVEL: 0, MAX_BITS_ATTACK_RANGE: 0, MAX_BITS_DAMAGE: 0, MAX_VALUE_BASE_LEVEL: 0, MAX_VALUE_PLAYER_LEVEL: 0, MAX_VALUE_ATTACK_RANGE: 0, MAX_VALUE_DAMAGE: 0, BIT_SHIFT_BASE_LEVEL: 0, BIT_SHIFT_PLAYER_LEVEL: 0, BIT_SHIFT_ATTACK_RANGE: 0, BIT_SHIFT_DAMAGE: 0, MAX_BITS_WILD_MONSTER_TRIBE_ID: 0, MAX_BITS_RELATIONSHIP: 0, MAX_BITS_LOCKED_INVISIBLE: 0, MAX_BITS_FACEBOOK_FRIEND: 0, MAX_BITS_DAMAGE_PROTECTION: 0, MAX_BITS_DESTROYED: 0, MAX_BITS_TRUCE: 0, MAX_VALUE_WILD_MONSTER_TRIBE_ID: 0, MAX_VALUE_RELATIONSHIP: 0, MAX_VALUE_LOCKED_INVISIBLE: 0, MAX_VALUE_FACEBOOK_FRIEND: 0, MAX_VALUE_DAMAGE_PROTECTION: 0, MAX_VALUE_DESTROYED: 0, MAX_VALUE_TRUCE: 0, BIT_SHIFT_WILD_MONSTER_TRIBE_ID: 0, BIT_SHIFT_RELATIONSHIP: 0, BIT_SHIFT_LOCKED_INVISIBLE: 0, BIT_SHIFT_FACEBOOK_FRIEND: 0, BIT_SHIFT_DAMAGE_PROTECTION: 0, BIT_SHIFT_DESTROYED: 0, BIT_SHIFT_TRUCE: 0 }, () => {
            MapRoom3CellData.MAX_BITS_BASE_LEVEL = 8;
            MapRoom3CellData.MAX_BITS_PLAYER_LEVEL = 8;
            MapRoom3CellData.MAX_BITS_ATTACK_RANGE = 8;
            MapRoom3CellData.MAX_BITS_DAMAGE = 8;
            MapRoom3CellData.MAX_VALUE_BASE_LEVEL = (Math.pow(2, MapRoom3CellData.MAX_BITS_BASE_LEVEL) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_PLAYER_LEVEL = (Math.pow(2, MapRoom3CellData.MAX_BITS_PLAYER_LEVEL) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_ATTACK_RANGE = (Math.pow(2, MapRoom3CellData.MAX_BITS_ATTACK_RANGE) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_DAMAGE = (Math.pow(2, MapRoom3CellData.MAX_BITS_DAMAGE) - 1) >>> 0;
            MapRoom3CellData.BIT_SHIFT_BASE_LEVEL = 0;
            MapRoom3CellData.BIT_SHIFT_PLAYER_LEVEL = (MapRoom3CellData.BIT_SHIFT_BASE_LEVEL + MapRoom3CellData.MAX_BITS_BASE_LEVEL) >>> 0;
            MapRoom3CellData.BIT_SHIFT_ATTACK_RANGE = (MapRoom3CellData.BIT_SHIFT_PLAYER_LEVEL + MapRoom3CellData.MAX_BITS_PLAYER_LEVEL) >>> 0;
            MapRoom3CellData.BIT_SHIFT_DAMAGE = (MapRoom3CellData.BIT_SHIFT_ATTACK_RANGE + MapRoom3CellData.MAX_BITS_ATTACK_RANGE) >>> 0;
            MapRoom3CellData.MAX_BITS_WILD_MONSTER_TRIBE_ID = 3;
            MapRoom3CellData.MAX_BITS_RELATIONSHIP = 3;
            MapRoom3CellData.MAX_BITS_LOCKED_INVISIBLE = 2;
            MapRoom3CellData.MAX_BITS_FACEBOOK_FRIEND = 1;
            MapRoom3CellData.MAX_BITS_DAMAGE_PROTECTION = 1;
            MapRoom3CellData.MAX_BITS_DESTROYED = 1;
            MapRoom3CellData.MAX_BITS_TRUCE = 1;
            MapRoom3CellData.MAX_VALUE_WILD_MONSTER_TRIBE_ID = (Math.pow(2, MapRoom3CellData.MAX_BITS_WILD_MONSTER_TRIBE_ID) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_RELATIONSHIP = (Math.pow(2, MapRoom3CellData.MAX_BITS_RELATIONSHIP) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_LOCKED_INVISIBLE = (Math.pow(2, MapRoom3CellData.MAX_BITS_LOCKED_INVISIBLE) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_FACEBOOK_FRIEND = (Math.pow(2, MapRoom3CellData.MAX_BITS_FACEBOOK_FRIEND) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_DAMAGE_PROTECTION = (Math.pow(2, MapRoom3CellData.MAX_BITS_DAMAGE_PROTECTION) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_DESTROYED = (Math.pow(2, MapRoom3CellData.MAX_BITS_DESTROYED) - 1) >>> 0;
            MapRoom3CellData.MAX_VALUE_TRUCE = (Math.pow(2, MapRoom3CellData.MAX_BITS_TRUCE) - 1) >>> 0;
            MapRoom3CellData.BIT_SHIFT_WILD_MONSTER_TRIBE_ID = 0;
            MapRoom3CellData.BIT_SHIFT_RELATIONSHIP = (MapRoom3CellData.BIT_SHIFT_WILD_MONSTER_TRIBE_ID + MapRoom3CellData.MAX_BITS_WILD_MONSTER_TRIBE_ID) >>> 0;
            MapRoom3CellData.BIT_SHIFT_LOCKED_INVISIBLE = (MapRoom3CellData.BIT_SHIFT_RELATIONSHIP + MapRoom3CellData.MAX_BITS_RELATIONSHIP) >>> 0;
            MapRoom3CellData.BIT_SHIFT_FACEBOOK_FRIEND = (MapRoom3CellData.BIT_SHIFT_LOCKED_INVISIBLE + MapRoom3CellData.MAX_BITS_LOCKED_INVISIBLE) >>> 0;
            MapRoom3CellData.BIT_SHIFT_DAMAGE_PROTECTION = (MapRoom3CellData.BIT_SHIFT_FACEBOOK_FRIEND + MapRoom3CellData.MAX_BITS_FACEBOOK_FRIEND) >>> 0;
            MapRoom3CellData.BIT_SHIFT_DESTROYED = (MapRoom3CellData.BIT_SHIFT_DAMAGE_PROTECTION + MapRoom3CellData.MAX_BITS_DAMAGE_PROTECTION) >>> 0;
            MapRoom3CellData.BIT_SHIFT_TRUCE = (MapRoom3CellData.BIT_SHIFT_DESTROYED + MapRoom3CellData.MAX_BITS_DESTROYED) >>> 0;
        });
    }
    private m_Name: string;
    private m_FacebookId: string;
    private m_PicSquare: string;
    private m_AllianceId: int;
    private m_BaseId: number;
    private m_UserId: int;
    private m_CellDataBitField1: uint;
    private m_CellDataBitField2: uint;

    public $ctor(cellData?: any): void {
        super.$ctor();
        this.Map(cellData);
    }

    public get name(): string {
        return this.m_Name;
    }

    public get facebookID(): string {
        return this.m_FacebookId;
    }

    public get pic_square(): string {
        return this.m_PicSquare;
    }

    public get allianceID(): int {
        return this.m_AllianceId;
    }

    public get baseID(): number {
        return this.m_BaseId;
    }

    public get userID(): int {
        return this.m_UserId;
    }

    public get baseLevel(): int {
        return this.m_CellDataBitField1 >> MapRoom3CellData.BIT_SHIFT_BASE_LEVEL & MapRoom3CellData.MAX_VALUE_BASE_LEVEL;
    }

    public get playerLevel(): int {
        return this.m_CellDataBitField1 >> MapRoom3CellData.BIT_SHIFT_PLAYER_LEVEL & MapRoom3CellData.MAX_VALUE_PLAYER_LEVEL;
    }

    public get attackRange(): int {
        return this.m_CellDataBitField1 >> MapRoom3CellData.BIT_SHIFT_ATTACK_RANGE & MapRoom3CellData.MAX_VALUE_ATTACK_RANGE;
    }

    public get damage(): int {
        return this.m_CellDataBitField1 >> MapRoom3CellData.BIT_SHIFT_DAMAGE & MapRoom3CellData.MAX_VALUE_DAMAGE;
    }

    public get wildMonsterTribeId(): int {
        return this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_WILD_MONSTER_TRIBE_ID & MapRoom3CellData.MAX_VALUE_WILD_MONSTER_TRIBE_ID;
    }

    public get relationship(): int {
        return this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_RELATIONSHIP & MapRoom3CellData.MAX_VALUE_RELATIONSHIP;
    }

    public get isLocked(): boolean {
        return (this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_LOCKED_INVISIBLE & MapRoom3CellData.MAX_VALUE_LOCKED_INVISIBLE) == 1;
    }

    public get isInvisible(): boolean {
        return (this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_LOCKED_INVISIBLE & MapRoom3CellData.MAX_VALUE_LOCKED_INVISIBLE) == 2;
    }

    public get isFacebookFriend(): boolean {
        return (this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_FACEBOOK_FRIEND & MapRoom3CellData.MAX_VALUE_FACEBOOK_FRIEND) == 1;
    }

    public get hasDamageProtection(): boolean {
        return (this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_DAMAGE_PROTECTION & MapRoom3CellData.MAX_VALUE_DAMAGE_PROTECTION) == 1;
    }

    public get isDestroyed(): boolean {
        return (this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_DESTROYED & MapRoom3CellData.MAX_VALUE_DESTROYED) == 1;
    }

    public get hasTruce(): boolean {
        return (this.m_CellDataBitField2 >> MapRoom3CellData.BIT_SHIFT_TRUCE & MapRoom3CellData.MAX_VALUE_TRUCE) == 1;
    }

    public Map(cellData: any): void {
        this.m_Name = cellData.hasOwnProperty("n") ? String(cellData["n"]) : "";
        this.m_FacebookId = cellData.hasOwnProperty("fbid") ? String(cellData["fbid"]) : "";
        this.m_PicSquare = cellData.hasOwnProperty("pic_square") ? String(cellData["pic_square"]) : "";
        this.m_AllianceId = cellData.hasOwnProperty("aid") ? cellData["aid"] | 0 : 0;
        this.m_BaseId = Number(cellData.hasOwnProperty("bid") ? Number(cellData["bid"]) : 0);
        this.m_UserId = cellData.hasOwnProperty("uid") ? cellData["uid"] | 0 : 0;
        this.m_CellDataBitField1 = 0;
        let _loc2_: int = cellData.hasOwnProperty("l") ? cellData["l"] | 0 : 0;
        let _loc3_: int = cellData.hasOwnProperty("pl") ? cellData["pl"] | 0 : 0;
        let _loc4_: int = cellData.hasOwnProperty("r") ? cellData["r"] | 0 : 0;
        let _loc5_: int = cellData.hasOwnProperty("dm") ? cellData["dm"] | 0 : 0;
        this.m_CellDataBitField1 = (this.m_CellDataBitField1 | (_loc2_ & MapRoom3CellData.MAX_VALUE_BASE_LEVEL) << MapRoom3CellData.BIT_SHIFT_BASE_LEVEL) >>> 0;
        this.m_CellDataBitField1 = (this.m_CellDataBitField1 | (_loc3_ & MapRoom3CellData.MAX_VALUE_PLAYER_LEVEL) << MapRoom3CellData.BIT_SHIFT_PLAYER_LEVEL) >>> 0;
        this.m_CellDataBitField1 = (this.m_CellDataBitField1 | (_loc4_ & MapRoom3CellData.MAX_VALUE_ATTACK_RANGE) << MapRoom3CellData.BIT_SHIFT_ATTACK_RANGE) >>> 0;
        this.m_CellDataBitField1 = (this.m_CellDataBitField1 | (_loc5_ & MapRoom3CellData.MAX_VALUE_DAMAGE) << MapRoom3CellData.BIT_SHIFT_DAMAGE) >>> 0;
        this.m_CellDataBitField2 = 0;
        let _loc6_: int = cellData.hasOwnProperty("tid") ? cellData["tid"] | 0 : 0;
        let _loc7_: int = cellData.hasOwnProperty("rel") ? cellData["rel"] | 0 : EnumBaseRelationship.k_RELATIONSHIP_NONE;
        let _loc8_: int = cellData.hasOwnProperty("lo") ? cellData["lo"] | 0 : 0;
        let _loc9_: int = cellData.hasOwnProperty("fr") ? cellData["fr"] | 0 : 0;
        let _loc10_: int = cellData.hasOwnProperty("p") ? cellData["p"] | 0 : 0;
        let _loc11_: int = cellData.hasOwnProperty("d") ? cellData["d"] | 0 : 0;
        let _loc12_: int = cellData.hasOwnProperty("t") ? cellData["t"] | 0 : 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc6_ & MapRoom3CellData.MAX_VALUE_WILD_MONSTER_TRIBE_ID) << MapRoom3CellData.BIT_SHIFT_WILD_MONSTER_TRIBE_ID) >>> 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc7_ & MapRoom3CellData.MAX_VALUE_RELATIONSHIP) << MapRoom3CellData.BIT_SHIFT_RELATIONSHIP) >>> 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc8_ & MapRoom3CellData.MAX_VALUE_LOCKED_INVISIBLE) << MapRoom3CellData.BIT_SHIFT_LOCKED_INVISIBLE) >>> 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc9_ & MapRoom3CellData.MAX_VALUE_FACEBOOK_FRIEND) << MapRoom3CellData.BIT_SHIFT_FACEBOOK_FRIEND) >>> 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc10_ & MapRoom3CellData.MAX_VALUE_DAMAGE_PROTECTION) << MapRoom3CellData.BIT_SHIFT_DAMAGE_PROTECTION) >>> 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc11_ & MapRoom3CellData.MAX_VALUE_DESTROYED) << MapRoom3CellData.BIT_SHIFT_DESTROYED) >>> 0;
        this.m_CellDataBitField2 = (this.m_CellDataBitField2 | (_loc12_ & MapRoom3CellData.MAX_VALUE_TRUCE) << MapRoom3CellData.BIT_SHIFT_TRUCE) >>> 0;
    }
}
