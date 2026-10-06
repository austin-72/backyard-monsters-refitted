import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BitmapData } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { Dictionary } from "flash/utils";
import { ImageCache, SingletonLock, SpriteData } from "@game";

export class MapRoom3AssetCache extends ASObject {
    static {
        as3.fields(this, { m_LoadedAssets: null, m_DamageBarSegments: null, m_StrongholdBuffEffectNeutralSpriteData: null, m_StrongholdBuffEffectEnemySpriteData: null, m_StrongholdBuffEffectPlayerSpriteData: null, m_StrongholdBuffEffectMixedSpriteData: null, m_AreAssetsLoaded: false });
    }

    private static s_Instance: MapRoom3AssetCache = null;

    public static readonly CELL_ICON_DAMAGE_PROTECTION: string = "worldmap/icons/damage_protection.png";

    public static readonly CELL_ICON_PLAYER_BASE: string = "worldmap/icons/player_base.png";

    public static readonly CELL_ICON_RESOURCE_CELL: string = "worldmap/icons/resource_cell.png";

    public static readonly CELL_ICON_STRONGHOLD: string = "worldmap/icons/guard_tower.png";

    public static readonly CELL_ICON_STRONGHOLD_BUFF_EFFECT_NEUTRAL: string = "worldmap/icons/guard_tower_buff_effect.v2.png";

    public static readonly CELL_ICON_STRONGHOLD_BUFF_EFFECT_ENEMY: string = "worldmap/icons/guard_tower_buff_effect_enemy.v3.png";

    public static readonly CELL_ICON_STRONGHOLD_BUFF_EFFECT_PLAYER: string = "worldmap/icons/guard_tower_buff_effect_player.v3.png";

    public static readonly CELL_ICON_STRONGHOLD_BUFF_EFFECT_MIXED: string = "worldmap/icons/guard_tower_buff_effect_mixed.v3.png";

    public static readonly CELL_ICON_WILD_MONSTER_BASE: string = "worldmap/icons/wild_monster_base_v2.png";

    public static readonly CELL_ICON_HELLRAISER_EVENT_BASE: string = "worldmap/icons/hellraiser_event_base.png";

    public static readonly CELL_ICON_HELLRAISER_EVENT_BASE_TILE: string = "worldmap/icons/hellraiser_event_base_tile.png";

    public static readonly CELL_ICON_FORTIFICATION: string = "worldmap/icons/fortification_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_EAST: string = "worldmap/icons/fortification_east_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_WEST: string = "worldmap/icons/fortification_west_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_NORTH_EAST: string = "worldmap/icons/fortification_north_east_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_NORTH_WEST: string = "worldmap/icons/fortification_north_west_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_SOUTH_EAST: string = "worldmap/icons/fortification_south_east_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_SOUTH_WEST: string = "worldmap/icons/fortification_south_west_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_LIGHT_BLUE: string = "worldmap/icons/fortification_light_blue_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_LIGHT_GREEN: string = "worldmap/icons/fortification_light_green_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_LIGHT_RED: string = "worldmap/icons/fortification_light_red_v2.png";

    public static readonly CELL_ICON_FORTIFICATION_LIGHT_YELLOW: string = "worldmap/icons/fortification_light_yellow_v2.png";

    public static readonly CELL_ICON_FULLY_FORTIFIED_BACK: string = "worldmap/icons/fully_fortified_back.png";

    public static readonly CELL_ICON_FULLY_FORTIFIED_FRONT: string = "worldmap/icons/fully_fortified_front.png";

    public static readonly CELL_OVERLAY_GLOW_RED: string = "worldmap/overlays/glow_red.png";

    public static readonly CELL_OVERLAY_GLOW_BLUE: string = "worldmap/overlays/glow_blue.png";

    public static readonly CELL_OVERLAY_GLOW_GREEN: string = "worldmap/overlays/glow_green.png";

    public static readonly CELL_OVERLAY_GLOW_YELLOW: string = "worldmap/overlays/glow_yellow.png";

    public static readonly HUD_BOOKMARK_THUMBNAIL_RESOURCE: string = "worldmap/hud/bookmark_thumbnail_resource.png";

    public static readonly HUD_BOOKMARK_THUMBNAIL_STRONGHOLD: string = "worldmap/hud/bookmark_thumbnail_stronghold.png";

    public static readonly HUD_BUTTON_FULL_SCREEN: string = "worldmap/hud/options/button_full_screen.png";

    public static readonly HUD_BUTTON_ZOOM_IN: string = "worldmap/hud/options/button_zoom_in.png";

    public static readonly HUD_BUTTON_ZOOM_OUT: string = "worldmap/hud/options/button_zoom_out.png";

    public static readonly HUD_BUTTONS_BAR_BACKGROUND: string = "worldmap/hud/buttons_background.png";

    public static readonly HUD_COORDINATES_BACKGROUND: string = "worldmap/hud/coordinates_background.png";

    public static readonly MOUSEOVER_BACKGROUND: string = "worldmap/rollover/background.png";

    public static readonly MOUSEOVER_BUTTON_BACKGROUND: string = "worldmap/rollover/button_background.png";

    public static readonly MOUSEOVER_BUTTON_ENTER: string = "worldmap/rollover/button_enter.png";

    public static readonly MOUSEOVER_BUTTON_ENTER_ROLLOVER: string = "worldmap/rollover/button_enter_rollover.png";

    public static readonly MOUSEOVER_BUTTON_SCOUT_ATTACK: string = "worldmap/rollover/button_scout_attack.png";

    public static readonly MOUSEOVER_BUTTON_SCOUT_ATTACK_ROLLOVER: string = "worldmap/rollover/button_scout_attack_rollover.png";

    public static readonly MOUSEOVER_BUTTON_BOOKMARK_ADD: string = "worldmap/rollover/button_bookmark_add.png";

    public static readonly MOUSEOVER_BUTTON_BOOKMARK_ADD_ROLLOVER: string = "worldmap/rollover/button_bookmark_add_rollover.png";

    public static readonly MOUSEOVER_BUTTON_BOOKMARK_REMOVE: string = "worldmap/rollover/button_bookmark_remove.png";

    public static readonly MOUSEOVER_BUTTON_BOOKMARK_REMOVE_ROLLOVER: string = "worldmap/rollover/button_bookmark_remove_rollover.png";

    public static readonly MOUSEOVER_BUTTON_SEND_MESSAGE: string = "worldmap/rollover/button_message.png";

    public static readonly MOUSEOVER_BUTTON_SEND_MESSAGE_ROLLOVER: string = "worldmap/rollover/button_message_rollover.png";

    public static readonly MOUSEOVER_BUTTON_INVITE_TO_ALLIANCE: string = "worldmap/rollover/button_alliance.png";

    public static readonly MOUSEOVER_BUTTON_INVITE_TO_ALLIANCE_ROLLOVER: string = "worldmap/rollover/button_alliance_rollover.png";

    public static readonly MOUSEOVER_BUTTON_REQUEST_TRUCE: string = "worldmap/rollover/button_truce.png";

    public static readonly MOUSEOVER_BUTTON_REQUEST_TRUCE_ROLLOVER: string = "worldmap/rollover/button_truce_rollover.png";

    public static readonly MOUSEOVER_ICON_TRUCE: string = "worldmap/rollover/icon_truce.png";

    private static readonly DAMAGE_BAR: string = "worldmap/cell_health_bar.png";

    private static readonly DAMAGE_BAR_WIDTH: uint = 41;

    private static readonly DAMAGE_BAR_TOTAL_HEIGHT: uint = 68;

    private static readonly DAMAGE_BAR_SEGMENT_HEIGHT: uint = 4;

    private static readonly DAMAGE_BAR_NUM_SEGMENTS: uint = (MapRoom3AssetCache.DAMAGE_BAR_TOTAL_HEIGHT / MapRoom3AssetCache.DAMAGE_BAR_SEGMENT_HEIGHT) >>> 0;

    public static readonly STRONGHOLD_BUFF_EFFECT_TOTAL_FRAMES: int = 40;

    public static readonly STRONGHOLD_BUFF_EFFECT_OFFSET_Y: int = -20;

    private static readonly IMAGES_TO_LOAD: any[] = [MapRoom3AssetCache.CELL_ICON_DAMAGE_PROTECTION, MapRoom3AssetCache.CELL_ICON_PLAYER_BASE, MapRoom3AssetCache.CELL_ICON_RESOURCE_CELL, MapRoom3AssetCache.CELL_ICON_STRONGHOLD, MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_NEUTRAL, MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_ENEMY, MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_PLAYER, MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_MIXED, MapRoom3AssetCache.CELL_ICON_WILD_MONSTER_BASE, MapRoom3AssetCache.CELL_ICON_HELLRAISER_EVENT_BASE, MapRoom3AssetCache.CELL_ICON_HELLRAISER_EVENT_BASE_TILE, MapRoom3AssetCache.CELL_ICON_FORTIFICATION, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_EAST, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_WEST, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_NORTH_EAST, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_NORTH_WEST, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_SOUTH_EAST, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_SOUTH_WEST, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_BLUE, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_GREEN, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_RED, MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_YELLOW, MapRoom3AssetCache.CELL_ICON_FULLY_FORTIFIED_BACK, MapRoom3AssetCache.CELL_ICON_FULLY_FORTIFIED_FRONT, MapRoom3AssetCache.CELL_OVERLAY_GLOW_RED, MapRoom3AssetCache.CELL_OVERLAY_GLOW_BLUE, MapRoom3AssetCache.CELL_OVERLAY_GLOW_GREEN, MapRoom3AssetCache.CELL_OVERLAY_GLOW_YELLOW, MapRoom3AssetCache.HUD_BOOKMARK_THUMBNAIL_RESOURCE, MapRoom3AssetCache.HUD_BOOKMARK_THUMBNAIL_STRONGHOLD, MapRoom3AssetCache.HUD_BUTTON_FULL_SCREEN, MapRoom3AssetCache.HUD_BUTTON_ZOOM_IN, MapRoom3AssetCache.HUD_BUTTON_ZOOM_OUT, MapRoom3AssetCache.HUD_BUTTONS_BAR_BACKGROUND, MapRoom3AssetCache.HUD_COORDINATES_BACKGROUND, MapRoom3AssetCache.MOUSEOVER_BACKGROUND, MapRoom3AssetCache.MOUSEOVER_BUTTON_BACKGROUND, MapRoom3AssetCache.MOUSEOVER_BUTTON_ENTER, MapRoom3AssetCache.MOUSEOVER_BUTTON_ENTER_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_BUTTON_SCOUT_ATTACK, MapRoom3AssetCache.MOUSEOVER_BUTTON_SCOUT_ATTACK_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_ADD, MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_ADD_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_REMOVE, MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_REMOVE_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_BUTTON_SEND_MESSAGE, MapRoom3AssetCache.MOUSEOVER_BUTTON_SEND_MESSAGE_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_BUTTON_INVITE_TO_ALLIANCE, MapRoom3AssetCache.MOUSEOVER_BUTTON_INVITE_TO_ALLIANCE_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_BUTTON_REQUEST_TRUCE, MapRoom3AssetCache.MOUSEOVER_BUTTON_REQUEST_TRUCE_ROLLOVER, MapRoom3AssetCache.MOUSEOVER_ICON_TRUCE, MapRoom3AssetCache.DAMAGE_BAR];
    private m_LoadedAssets: Dictionary;
    private m_DamageBarSegments: Vector<BitmapData>;
    private m_StrongholdBuffEffectNeutralSpriteData: SpriteData;
    private m_StrongholdBuffEffectEnemySpriteData: SpriteData;
    private m_StrongholdBuffEffectPlayerSpriteData: SpriteData;
    private m_StrongholdBuffEffectMixedSpriteData: SpriteData;
    private m_AreAssetsLoaded: boolean;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
    }

    public static get instance(): MapRoom3AssetCache {
        return MapRoom3AssetCache.s_Instance = MapRoom3AssetCache.s_Instance || new MapRoom3AssetCache(new SingletonLock());
    }

    public get areAssetsLoaded(): boolean {
        return this.m_AreAssetsLoaded;
    }

    public Load(): void {
        if (this.m_LoadedAssets != null) {
            return;
        }
        this.m_LoadedAssets = new Dictionary();
        ImageCache.GetImageGroupWithCallBack("map_room_3_assets", MapRoom3AssetCache.IMAGES_TO_LOAD, as3.bind(this, this.OnAssetsLoaded));
    }

    private OnAssetsLoaded(param1: any[], param2: string): void {
        let _loc3_: string = null;
        let _loc4_: BitmapData = null;
        let _loc5_: uint = param1.length;
        let _loc6_: uint = 0;
        while (_loc6_ < _loc5_) {
            _loc3_ = String(param1[_loc6_][0]);
            _loc4_ = as3.cast(param1[_loc6_][1], BitmapData);
            this.m_LoadedAssets.set(_loc3_, _loc4_);
            _loc6_++;
        }
        this.CacheDamageBarSegments();
        this.m_AreAssetsLoaded = true;
    }

    private CacheDamageBarSegments(): void {
        let _loc2_: BitmapData = null;
        let _loc1_: BitmapData = this.GetAsset(MapRoom3AssetCache.DAMAGE_BAR);
        if (_loc1_ == null) {
            return;
        }
        this.m_DamageBarSegments = new Vector<BitmapData>(MapRoom3AssetCache.DAMAGE_BAR_NUM_SEGMENTS, false, BitmapData);
        let _loc3_: Rectangle = new Rectangle(0, 0, MapRoom3AssetCache.DAMAGE_BAR_WIDTH, MapRoom3AssetCache.DAMAGE_BAR_SEGMENT_HEIGHT);
        let _loc4_: Point = new Point();
        let _loc5_: uint = 0;
        while (_loc5_ < MapRoom3AssetCache.DAMAGE_BAR_NUM_SEGMENTS) {
            _loc2_ = new BitmapData(MapRoom3AssetCache.DAMAGE_BAR_WIDTH, MapRoom3AssetCache.DAMAGE_BAR_SEGMENT_HEIGHT, false);
            _loc2_.copyPixels(_loc1_, _loc3_, _loc4_);
            _loc3_.y += MapRoom3AssetCache.DAMAGE_BAR_SEGMENT_HEIGHT;
            as3.vset(this.m_DamageBarSegments, _loc5_, _loc2_);
            _loc5_++;
        }
    }

    public GetAsset(param1: string): BitmapData {
        return as3.as(this.m_LoadedAssets.get(param1), BitmapData);
    }

    public GetStrongholdBuffEffectNeutral(): SpriteData {
        if (this.m_StrongholdBuffEffectNeutralSpriteData == null) {
            this.m_StrongholdBuffEffectNeutralSpriteData = this.CreateStrongholdBuffEffect(MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_NEUTRAL);
        }
        return this.m_StrongholdBuffEffectNeutralSpriteData;
    }

    public GetStrongholdBuffEffectEnemy(): SpriteData {
        if (this.m_StrongholdBuffEffectEnemySpriteData == null) {
            this.m_StrongholdBuffEffectEnemySpriteData = this.CreateStrongholdBuffEffect(MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_ENEMY);
        }
        return this.m_StrongholdBuffEffectEnemySpriteData;
    }

    public GetStrongholdBuffEffectPlayer(): SpriteData {
        if (this.m_StrongholdBuffEffectPlayerSpriteData == null) {
            this.m_StrongholdBuffEffectPlayerSpriteData = this.CreateStrongholdBuffEffect(MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_PLAYER);
        }
        return this.m_StrongholdBuffEffectPlayerSpriteData;
    }

    public GetStrongholdBuffEffectMixed(): SpriteData {
        if (this.m_StrongholdBuffEffectMixedSpriteData == null) {
            this.m_StrongholdBuffEffectMixedSpriteData = this.CreateStrongholdBuffEffect(MapRoom3AssetCache.CELL_ICON_STRONGHOLD_BUFF_EFFECT_MIXED);
        }
        return this.m_StrongholdBuffEffectMixedSpriteData;
    }

    public CreateStrongholdBuffEffect(param1: string): SpriteData {
        let _loc2_: BitmapData = null;
        _loc2_ = this.GetAsset(param1);
        let _loc3_: int = (_loc2_.width / MapRoom3AssetCache.STRONGHOLD_BUFF_EFFECT_TOTAL_FRAMES) | 0;
        let _loc4_: int = _loc2_.height;
        let _loc5_: int = SpriteData.FUBAR_X;
        let _loc6_: int = SpriteData.FUBAR_Y;
        let _loc7_: SpriteData = null;
        (_loc7_ = new SpriteData(param1, _loc3_, _loc4_, _loc5_, _loc6_)).image = _loc2_;
        return _loc7_;
    }

    public GetDamageBarSegmentAsset(param1: number): BitmapData {
        if (this.m_DamageBarSegments == null || this.m_DamageBarSegments.length == 0) {
            return null;
        }
        param1 = Math.min(Math.max(0, param1), 0.99);
        let _loc2_: int = Math.min(Math.floor(MapRoom3AssetCache.DAMAGE_BAR_NUM_SEGMENTS * param1), this.m_DamageBarSegments.length - 1) | 0;
        return as3.vget(this.m_DamageBarSegments, _loc2_);
    }
}
