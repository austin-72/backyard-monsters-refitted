import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, Graphics, Shape, Sprite } from "flash/display";
import { BitmapFilterQuality, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { EnumBaseRelationship, EnumYardType, MapRoom3, MapRoom3AssetCache, MapRoom3Cell, MapRoom3TileSetManager, MapRoomManager, SpriteData, SpriteSheetAnimation } from "@game";

export class MapRoom3CellGraphic extends Sprite {
    static {
        as3.fields(this, { m_Cell: null, m_TileBitmap: null, m_BackgroundLayer: null, m_CellOverlayLayer: null, m_RangeLayer: null, m_RangeGlowLayer: null, m_HighlightLayer: null, m_IconLayer: null, m_LineLayer: null, m_InfoLayer: null, m_Hitbox: null, m_BuffEffect: null, m_CellIndex: 0, m_Selected: false, m_Mousedover: false });
    }

    public static readonly HEX_WIDTH: number = 104;

    public static readonly HEX_HEIGHT: number = 68;

    public static readonly HEX_HEIGHT_OVERLAP: number = 50;

    public static readonly HEX_EDGE_LENGTH: number = 36;

    private static readonly CONNECTING_LINE_THICKNESS: number = 2.5;

    private static readonly CONNECTING_LINE_ALPHA: number = 0.5;

    private static readonly CONNECTING_LINE_BLUE: uint = 42495;

    private static readonly CONNECTING_LINE_RED: uint = 16711680;

    private static readonly CONNECTING_LINE_NEUTRAL: uint = 16777215;

    public static DEBUG_DISPLAY: boolean = false;

    public static DRAW_CONNECTING_LINES_ON_MOUSEOVER: boolean = false;
    private m_Cell: MapRoom3Cell;
    private m_TileBitmap: Bitmap;
    private m_BackgroundLayer: Sprite;
    private m_CellOverlayLayer: Sprite;
    private m_RangeLayer: Sprite;
    private m_RangeGlowLayer: Sprite;
    private m_HighlightLayer: Sprite;
    private m_IconLayer: Sprite;
    private m_LineLayer: Sprite;
    private m_InfoLayer: Sprite;
    private m_Hitbox: Sprite;
    private m_BuffEffect: SpriteSheetAnimation;
    private m_CellIndex: int;
    private m_Selected: boolean;
    private m_Mousedover: boolean;

    public $ctor(): void {
        super.$ctor();
        this.m_BackgroundLayer = new Sprite();
        this.m_BackgroundLayer.mouseEnabled = false;
        this.m_BackgroundLayer.mouseChildren = false;
        this.addChild(this.m_BackgroundLayer);
        this.m_CellOverlayLayer = new Sprite();
        this.m_RangeLayer = new Sprite();
        this.m_RangeLayer.mouseEnabled = false;
        this.m_RangeLayer.mouseChildren = false;
        this.m_RangeGlowLayer = new Sprite();
        this.m_RangeGlowLayer.mouseEnabled = false;
        this.m_RangeGlowLayer.mouseChildren = false;
        this.m_HighlightLayer = new Sprite();
        this.m_HighlightLayer.mouseEnabled = false;
        this.m_HighlightLayer.mouseChildren = false;
        this.addChild(this.m_HighlightLayer);
        this.m_IconLayer = new Sprite();
        this.m_IconLayer.mouseEnabled = false;
        this.m_IconLayer.mouseChildren = false;
        this.addChild(this.m_IconLayer);
        this.m_LineLayer = new Sprite();
        this.m_LineLayer.mouseEnabled = false;
        this.m_LineLayer.mouseChildren = false;
        this.m_Hitbox = new Sprite();
        MapRoom3CellGraphic.DrawProceduralHexagon(this.m_Hitbox.graphics, 16711680, 0);
        this.hitArea = this.m_Hitbox;
        this.m_Hitbox.mouseEnabled = false;
        this.addChild(this.m_Hitbox);
        this.m_InfoLayer = new Sprite();
        this.m_InfoLayer.mouseEnabled = false;
        this.m_InfoLayer.mouseChildren = false;
    }

    private static DrawProceduralRangeHexagon(param1: Graphics, param2: uint, param3: number, param4: number, param5: number, param6: number): void {
        param1.lineStyle(0, 0, 0);
        param1.beginFill(param2, param3);
        param1.moveTo(-(param4 * 2) + param6, -param6);
        param1.lineTo(-param4 - param6, -param5 + param6);
        param1.curveTo(-param4, -param5, -param4 + 2 * param6, -param5);
        param1.lineTo(param4 - 2 * param6, -param5);
        param1.curveTo(param4, -param5, param4 + param6, -param5 + param6);
        param1.lineTo(param4 * 2 - param6, -param6);
        param1.curveTo(param4 * 2, 0, param4 * 2 - param6, param6);
        param1.lineTo(param4 + param6, param5 - param6);
        param1.curveTo(param4, param5, param4 - 2 * param6, param5);
        param1.lineTo(-param4 + 2 * param6, param5);
        param1.curveTo(-param4, param5, -param4 - param6, param5 - param6);
        param1.lineTo(-(param4 * 2) + param6, param6);
        param1.curveTo(-(param4 * 2), 0, -(param4 * 2) + param6, -param6);
        param1.endFill();
    }

    private static DrawProceduralHexagon(param1: Graphics, param2: uint, param3: number = 0.5, param4: Point = null): void {
        let _loc5_: int = !(!param4) ? param4.x | 0 : 0;
        let _loc6_: int = !(!param4) ? param4.y | 0 : 0;
        param1.lineStyle(0, 0, 0);
        param1.beginFill(param2, param3);
        param1.moveTo(_loc5_ + 52, _loc6_ + 0);
        param1.lineTo(_loc5_ + 104, _loc6_ + 17);
        param1.lineTo(_loc5_ + 104, _loc6_ + 50);
        param1.lineTo(_loc5_ + 52, _loc6_ + 68);
        param1.lineTo(_loc5_ + 0, _loc6_ + 50);
        param1.lineTo(_loc5_ + 0, _loc6_ + 17);
        param1.lineTo(_loc5_ + 52, _loc6_ + 0);
        param1.endFill();
    }

    private static DrawProceduralEllipse(param1: Graphics, param2: uint, param3: number = 0.5, param4: Point = null): void {
        let _loc5_: int = !(!param4) ? param4.x | 0 : MapRoom3CellGraphic.HEX_WIDTH | 0;
        let _loc6_: int = !(!param4) ? param4.y | 0 : MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP | 0;
        param1.lineStyle(0, 0, 0);
        param1.beginFill(param2, param3);
        param1.drawEllipse(0, 0, _loc5_, _loc6_);
        param1.endFill();
    }

    public get cell(): MapRoom3Cell {
        return this.m_Cell;
    }

    public get cellIndex(): int {
        return this.m_CellIndex;
    }

    public set cellIndex(param1: int) {
        this.m_CellIndex = param1;
    }

    public Clear(): void {
        this.setMapCell(null);
        this.ResetChildren();
        if (this.m_BackgroundLayer) {
            this.removeChild(this.m_BackgroundLayer);
            this.m_BackgroundLayer = null;
        }
        if (this.m_HighlightLayer) {
            this.removeChild(this.m_HighlightLayer);
            this.m_HighlightLayer = null;
        }
        if (this.m_IconLayer) {
            this.removeChild(this.m_IconLayer);
            this.m_IconLayer = null;
        }
        if (this.m_Hitbox) {
            this.removeChild(this.m_Hitbox);
            this.m_Hitbox = null;
        }
    }

    public redrawTile(): void {
        this.DrawTile();
    }

    private ResetChildren(): void {
        let _loc1_: Bitmap = null;
        if (this.m_TileBitmap) {
            this.m_TileBitmap.parent.removeChild(this.m_TileBitmap);
            this.m_TileBitmap = null;
        }
        if (this.m_BackgroundLayer) {
            while (this.m_BackgroundLayer.numChildren > 0) {
                this.m_BackgroundLayer.removeChildAt(0);
            }
        }
        if (this.m_CellOverlayLayer) {
            while (this.m_CellOverlayLayer.numChildren > 0) {
                _loc1_ = as3.as(this.m_CellOverlayLayer.removeChildAt(0), Bitmap);
                if (_loc1_ != null) {
                    _loc1_.bitmapData = null;
                }
            }
            if (this.m_CellOverlayLayer.parent) {
                this.m_CellOverlayLayer.parent.removeChild(this.m_CellOverlayLayer);
            }
        }
        this.ClearRangeLayer();
        this.ClearLineLayer();
        if (this.m_IconLayer) {
            while (this.m_IconLayer.numChildren > 0) {
                _loc1_ = as3.as(this.m_IconLayer.removeChildAt(0), Bitmap);
                if (_loc1_ != null) {
                    _loc1_.bitmapData = null;
                }
            }
        }
        if (this.m_InfoLayer) {
            while (this.m_InfoLayer.numChildren > 0) {
                this.m_InfoLayer.removeChildAt(0);
            }
            if (this.m_InfoLayer.parent) {
                this.m_InfoLayer.parent.removeChild(this.m_InfoLayer);
            }
        }
        if (this.m_BuffEffect) {
            this.m_BuffEffect.spriteData = null;
            this.m_BuffEffect = null;
        }
    }

    private ClearRangeLayer(): void {
        if (this.m_RangeLayer) {
            this.m_RangeLayer.graphics.clear();
            if (this.m_RangeLayer.parent) {
                this.m_RangeLayer.parent.removeChild(this.m_RangeLayer);
            }
        }
        if (this.m_RangeGlowLayer) {
            this.m_RangeGlowLayer.graphics.clear();
            if (this.m_RangeGlowLayer.parent) {
                this.m_RangeGlowLayer.parent.removeChild(this.m_RangeGlowLayer);
            }
        }
    }

    private ClearLineLayer(): void {
        if (this.m_LineLayer) {
            while (this.m_LineLayer.numChildren > 0) {
                this.m_LineLayer.removeChildAt(0);
            }
            if (this.m_LineLayer.parent) {
                this.m_LineLayer.parent.removeChild(this.m_LineLayer);
            }
        }
    }

    public TickFast(): void {
        if (this.m_BuffEffect != null) {
            this.m_BuffEffect.update();
            if (this.m_Cell != null) {
                this.m_Cell.currentBuffEffectFrame = this.m_BuffEffect.currentFrame;
            }
        }
    }

    private DrawTile(): void {
        this.ResetChildren();
        if (this.m_Cell == null) {
            return;
        }
        this.DrawBackgroundLayer();
        this.DrawHighlightLayer();
        this.DrawRangeLayer();
        this.DrawConnectingLines();
        if (this.m_Cell.DoesContainDisplayableBase() == false) {
            return;
        }
        this.DrawCellOverlayLayer();
        this.DrawIconLayer();
        this.DrawInfoLayer();
        this.DrawDamageBarLayer();
    }

    private DrawBackgroundLayer(): void {
        let _loc1_: any = MapRoom3TileSetManager.instance.GetTileToDrawForCell(this.m_Cell, this.m_CellIndex);
        if (Boolean(_loc1_) && Boolean(_loc1_.bmd)) {
            this.m_TileBitmap = new Bitmap(_loc1_.bmd);
            this.m_TileBitmap.x = (MapRoom3CellGraphic.HEX_WIDTH - this.m_TileBitmap.width) * 0.5;
            this.m_TileBitmap.y = this.m_TileBitmap.height > MapRoom3CellGraphic.HEX_HEIGHT ? MapRoom3CellGraphic.HEX_HEIGHT - this.m_TileBitmap.height : (MapRoom3CellGraphic.HEX_HEIGHT - this.m_TileBitmap.height) * 0.5;
            if (this.m_Cell.isBlocked == false) {
                this.m_TileBitmap.x += this.x;
                this.m_TileBitmap.y += this.y;
                MapRoom3.mapRoom3Window.baseLayer.addChild(this.m_TileBitmap);
            } else {
                this.m_BackgroundLayer.addChild(this.m_TileBitmap);
            }
        }
    }

    private DrawCellOverlayLayer(): void {
        if (this.m_Cell.cellType == EnumYardType.FORTIFICATION) {
            return;
        }
        switch (this.m_Cell.relationship) {
            case EnumBaseRelationship.k_RELATIONSHIP_SELF:
                this.m_CellOverlayLayer.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_OVERLAY_GLOW_BLUE)));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_ALLY:
                this.m_CellOverlayLayer.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_OVERLAY_GLOW_GREEN)));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_NEUTRAL:
                this.m_CellOverlayLayer.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_OVERLAY_GLOW_YELLOW)));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_ENEMY:
                this.m_CellOverlayLayer.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_OVERLAY_GLOW_RED)));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_NONE:
            default:
                return;
        }
        MapRoom3.mapRoom3Window.cellOverlayLayer.addChild(this.m_CellOverlayLayer);
        this.m_CellOverlayLayer.x = this.x;
        this.m_CellOverlayLayer.y = this.y;
    }

    private DrawRangeLayer(): void {
        this.DrawRoundedHexagonalRange();
    }

    private DrawTiledOvalsRange(): void {
        let _loc1_: Point = null;
        if (this.m_Cell.isInAttackRange == false) {
            return;
        }
        _loc1_ = new Point(MapRoom3CellGraphic.HEX_WIDTH * 1.25, MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * 1.25);
        let _loc2_: number = this.x + MapRoom3CellGraphic.HEX_WIDTH * 0.5 - _loc1_.x * 0.5;
        let _loc3_: number = this.y + MapRoom3CellGraphic.HEX_HEIGHT * 0.5 - _loc1_.y * 0.5;
        this.m_RangeLayer.x = _loc2_;
        this.m_RangeLayer.y = _loc3_;
        this.m_RangeGlowLayer.x = _loc2_;
        this.m_RangeGlowLayer.y = _loc3_;
        MapRoom3CellGraphic.DrawProceduralEllipse(this.m_RangeLayer.graphics, 16777215, 1, _loc1_);
        MapRoom3CellGraphic.DrawProceduralEllipse(this.m_RangeGlowLayer.graphics, 16777215, 1, _loc1_);
        MapRoom3.mapRoom3Window.rangeLayer.addChild(this.m_RangeLayer);
        MapRoom3.mapRoom3Window.rangeGlowLayer.addChild(this.m_RangeGlowLayer);
    }

    private DrawTiledHexagonsRange(): void {
        if (this.m_Cell.isInAttackRange == false) {
            return;
        }
        this.m_RangeLayer.x = this.x;
        this.m_RangeLayer.y = this.y;
        this.m_RangeGlowLayer.x = this.x;
        this.m_RangeGlowLayer.y = this.y;
        MapRoom3CellGraphic.DrawProceduralHexagon(this.m_RangeLayer.graphics, 16777215, 1);
        MapRoom3CellGraphic.DrawProceduralHexagon(this.m_RangeGlowLayer.graphics, 16777215, 1);
        MapRoom3.mapRoom3Window.rangeLayer.addChild(this.m_RangeLayer);
        MapRoom3.mapRoom3Window.rangeGlowLayer.addChild(this.m_RangeGlowLayer);
    }

    private DrawCircularRange(): void {
        let _loc1_: int = 0;
        let _loc2_: Point = null;
        if (this.m_Cell.hasCellsInAttackRange == false && (this.m_Mousedover == false || this.m_Cell.attackRange < 2)) {
            return;
        }
        _loc1_ = this.m_Cell.attackRange;
        _loc2_ = new Point(MapRoom3CellGraphic.HEX_WIDTH + _loc1_ * MapRoom3CellGraphic.HEX_WIDTH * 2, MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP + _loc1_ * MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * 2);
        let _loc3_: number = this.x + MapRoom3CellGraphic.HEX_WIDTH * 0.5 - _loc2_.x * 0.5;
        let _loc4_: number = this.y + MapRoom3CellGraphic.HEX_HEIGHT * 0.5 - _loc2_.y * 0.5;
        this.m_RangeLayer.x = _loc3_;
        this.m_RangeLayer.y = _loc4_;
        this.m_RangeGlowLayer.x = _loc3_;
        this.m_RangeGlowLayer.y = _loc4_;
        MapRoom3CellGraphic.DrawProceduralEllipse(this.m_RangeLayer.graphics, 16777215, 1, _loc2_);
        MapRoom3CellGraphic.DrawProceduralEllipse(this.m_RangeGlowLayer.graphics, 16777215, 1, _loc2_);
        if (this.m_Cell.hasCellsInAttackRange == true) {
            MapRoom3.mapRoom3Window.rangeLayer.addChild(this.m_RangeLayer);
            MapRoom3.mapRoom3Window.rangeGlowLayer.addChild(this.m_RangeGlowLayer);
        } else {
            MapRoom3.mapRoom3Window.mouseoverRangeLayer.addChild(this.m_RangeLayer);
            MapRoom3.mapRoom3Window.mouseoverRangeGlowLayer.addChild(this.m_RangeGlowLayer);
        }
    }

    private DrawRoundedHexagonalRange(): void {
        if (this.m_Cell.hasCellsInAttackRange == false && (this.m_Mousedover == false || this.m_Cell.attackRange < 2)) {
            return;
        }
        let _loc1_: int = this.m_Cell.attackRange;
        if (_loc1_ < 2) {
            this.DrawCircularRange();
            return;
        }
        let _loc2_: number = _loc1_ == 2 ? MapRoom3CellGraphic.HEX_WIDTH * 0.25 : MapRoom3CellGraphic.HEX_WIDTH * 0.5;
        let _loc3_: number = _loc1_ * MapRoom3CellGraphic.HEX_WIDTH * 0.5 + MapRoom3CellGraphic.HEX_WIDTH * 0.25;
        let _loc4_: number = _loc1_ * MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP + MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * 0.5;
        let _loc5_: number = this.x + MapRoom3CellGraphic.HEX_WIDTH * 0.5;
        let _loc6_: number = this.y + MapRoom3CellGraphic.HEX_HEIGHT * 0.5;
        this.m_RangeLayer.x = _loc5_;
        this.m_RangeLayer.y = _loc6_;
        this.m_RangeGlowLayer.x = _loc5_;
        this.m_RangeGlowLayer.y = _loc6_;
        MapRoom3CellGraphic.DrawProceduralRangeHexagon(this.m_RangeLayer.graphics, 16777215, 1, _loc3_, _loc4_, _loc2_);
        MapRoom3CellGraphic.DrawProceduralRangeHexagon(this.m_RangeGlowLayer.graphics, 16777215, 1, _loc3_, _loc4_, _loc2_);
        if (this.m_Cell.hasCellsInAttackRange == true) {
            MapRoom3.mapRoom3Window.rangeLayer.addChild(this.m_RangeLayer);
            MapRoom3.mapRoom3Window.rangeGlowLayer.addChild(this.m_RangeGlowLayer);
        } else {
            MapRoom3.mapRoom3Window.mouseoverRangeLayer.addChild(this.m_RangeLayer);
            MapRoom3.mapRoom3Window.mouseoverRangeGlowLayer.addChild(this.m_RangeGlowLayer);
        }
    }

    private DrawIconLayer(): void {
        let _loc3_: Bitmap = null;
        let _loc4_: Bitmap = null;
        let _loc1_: Bitmap = null;
        let _loc2_: boolean = false;
        switch (this.m_Cell.cellType) {
            case EnumYardType.PLAYER:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(this.m_Cell.isDestroyed ? MapRoom3AssetCache.CELL_ICON_PLAYER_BASE : MapRoom3AssetCache.CELL_ICON_PLAYER_BASE));
                _loc2_ = this.IsFullyFortified();
                if (this.m_Cell.hasDamageProtection) {
                    this.DrawDamageProtectionIcon();
                }
                break;
            case EnumYardType.RESOURCE:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(this.m_Cell.isDestroyed ? MapRoom3AssetCache.CELL_ICON_RESOURCE_CELL : MapRoom3AssetCache.CELL_ICON_RESOURCE_CELL));
                _loc2_ = this.IsFullyFortified();
                break;
            case EnumYardType.STRONGHOLD:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(this.m_Cell.isDestroyed ? MapRoom3AssetCache.CELL_ICON_STRONGHOLD : MapRoom3AssetCache.CELL_ICON_STRONGHOLD));
                _loc2_ = this.IsFullyFortified();
                break;
            case EnumYardType.FORTIFICATION:
                if (this.m_Cell.isDestroyed) {
                    _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION));
                } else {
                    _loc1_ = this.GetFortificationIconToDisplay();
                    this.DrawFortificationLightIcon();
                }
                break;
            case EnumYardType.EMPTY:
                if (this.m_Cell.isOwnedByWildMonster) {
                    _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(this.m_Cell.isDestroyed ? MapRoom3AssetCache.CELL_ICON_WILD_MONSTER_BASE : MapRoom3AssetCache.CELL_ICON_WILD_MONSTER_BASE));
                }
        }
        if (_loc2_) {
            _loc3_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FULLY_FORTIFIED_FRONT));
            _loc3_.x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc3_.width) * 0.5);
            _loc3_.y = Math.round((MapRoom3CellGraphic.HEX_HEIGHT - _loc3_.height) * 0.5);
            this.m_IconLayer.addChildAt(_loc3_, 0);
        }
        if (_loc1_ != null) {
            _loc1_.x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc1_.width) * 0.5);
            _loc1_.y = Math.round((MapRoom3CellGraphic.HEX_HEIGHT - _loc1_.height) * 0.5);
            this.m_IconLayer.addChildAt(_loc1_, 0);
        }
        if (_loc2_) {
            (_loc4_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FULLY_FORTIFIED_BACK))).x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc4_.width) * 0.5);
            _loc4_.y = Math.round((MapRoom3CellGraphic.HEX_HEIGHT - _loc4_.height) * 0.5);
            this.m_IconLayer.addChildAt(_loc4_, 0);
        }
        if (this.m_Cell.isInRangeOfStronghold && !MapRoom3.mapRoom3Window.IsZoomedOut()) {
            this.DrawBuffedEffect();
        }
    }

    private GetFortificationIconToDisplay(): Bitmap {
        let _loc3_: MapRoom3Cell = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc1_: int = this.m_Cell.cellX;
        let _loc2_: int = this.m_Cell.cellY;
        _loc4_ = (_loc1_ + 1) | 0;
        _loc5_ = _loc2_;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (this.m_Cell.DoesFortify(_loc3_)) {
            return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_EAST));
        }
        _loc4_ = (_loc1_ - 1) | 0;
        _loc5_ = _loc2_;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (this.m_Cell.DoesFortify(_loc3_)) {
            return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_WEST));
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ + 1 : _loc1_) | 0;
        _loc5_ = (_loc2_ - 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (this.m_Cell.DoesFortify(_loc3_)) {
            return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_NORTH_EAST));
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ : _loc1_ - 1) | 0;
        _loc5_ = (_loc2_ - 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (this.m_Cell.DoesFortify(_loc3_)) {
            return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_NORTH_WEST));
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ + 1 : _loc1_) | 0;
        _loc5_ = (_loc2_ + 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (this.m_Cell.DoesFortify(_loc3_)) {
            return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_SOUTH_EAST));
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ : _loc1_ - 1) | 0;
        _loc5_ = (_loc2_ + 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (this.m_Cell.DoesFortify(_loc3_)) {
            return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_SOUTH_WEST));
        }
        return new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION));
    }

    private IsFullyFortified(): boolean {
        let _loc3_: MapRoom3Cell = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc1_: int = this.m_Cell.cellX;
        let _loc2_: int = this.m_Cell.cellY;
        _loc4_ = (_loc1_ + 1) | 0;
        _loc5_ = _loc2_;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (_loc3_ != null && _loc3_.DoesFortify(this.m_Cell) == false) {
            return false;
        }
        _loc4_ = (_loc1_ - 1) | 0;
        _loc5_ = _loc2_;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (_loc3_ != null && _loc3_.DoesFortify(this.m_Cell) == false) {
            return false;
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ + 1 : _loc1_) | 0;
        _loc5_ = (_loc2_ - 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (_loc3_ != null && _loc3_.DoesFortify(this.m_Cell) == false) {
            return false;
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ : _loc1_ - 1) | 0;
        _loc5_ = (_loc2_ - 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (_loc3_ != null && _loc3_.DoesFortify(this.m_Cell) == false) {
            return false;
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ + 1 : _loc1_) | 0;
        _loc5_ = (_loc2_ + 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (_loc3_ != null && _loc3_.DoesFortify(this.m_Cell) == false) {
            return false;
        }
        _loc4_ = (!(!(_loc2_ % 2)) ? _loc1_ : _loc1_ - 1) | 0;
        _loc5_ = (_loc2_ + 1) | 0;
        _loc3_ = as3.as(MapRoomManager.instance.FindCell(_loc4_, _loc5_), MapRoom3Cell);
        if (_loc3_ != null && _loc3_.DoesFortify(this.m_Cell) == false) {
            return false;
        }
        return true;
    }

    private DrawFortificationLightIcon(): void {
        let _loc1_: Bitmap = null;
        switch (this.m_Cell.relationship) {
            case EnumBaseRelationship.k_RELATIONSHIP_SELF:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_BLUE));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_ALLY:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_GREEN));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_NEUTRAL:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_YELLOW));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_ENEMY:
                _loc1_ = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_FORTIFICATION_LIGHT_RED));
                break;
            case EnumBaseRelationship.k_RELATIONSHIP_NONE:
            default:
                return;
        }
        if (_loc1_ != null) {
            _loc1_.x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc1_.width) * 0.5);
            _loc1_.y = Math.round((MapRoom3CellGraphic.HEX_HEIGHT - _loc1_.height) * 0.5);
            this.m_IconLayer.addChild(_loc1_);
        }
    }

    private DrawDamageProtectionIcon(): void {
        let _loc1_: Bitmap = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.CELL_ICON_DAMAGE_PROTECTION));
        _loc1_.x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc1_.width) * 0.5);
        _loc1_.y = Math.round((MapRoom3CellGraphic.HEX_HEIGHT - _loc1_.height) * 0.5);
        this.m_IconLayer.addChild(_loc1_);
    }

    private DrawBuffedEffect(): void {
        let _loc6_: MapRoom3Cell = null;
        let _loc1_: boolean = false;
        let _loc2_: boolean = false;
        let _loc3_: uint = this.m_Cell.inRangeOfStrongholds.length >>> 0;
        let _loc4_: uint = 0;
        while (_loc4_ < _loc3_) {
            if ((_loc6_ = as3.vget(this.m_Cell.inRangeOfStrongholds, _loc4_)).isOwnedByPlayer) {
                _loc2_ = true;
            } else if (_loc6_.userID == this.m_Cell.userID && _loc6_.wildMonsterTribeId == this.m_Cell.wildMonsterTribeId) {
                _loc1_ = true;
            }
            _loc4_++;
        }
        let _loc5_: SpriteData = null;
        if (_loc2_ && _loc1_) {
            _loc5_ = MapRoom3AssetCache.instance.GetStrongholdBuffEffectMixed();
        } else if (_loc2_) {
            _loc5_ = MapRoom3AssetCache.instance.GetStrongholdBuffEffectPlayer();
        } else if (_loc1_) {
            _loc5_ = MapRoom3AssetCache.instance.GetStrongholdBuffEffectEnemy();
        }
        if (_loc5_ == null) {
            return;
        }
        this.m_BuffEffect = new SpriteSheetAnimation(_loc5_, MapRoom3AssetCache.STRONGHOLD_BUFF_EFFECT_TOTAL_FRAMES);
        this.m_BuffEffect.x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc5_.width) * 0.5);
        this.m_BuffEffect.y = Math.round((MapRoom3CellGraphic.HEX_HEIGHT - _loc5_.height) * 0.5) + MapRoom3AssetCache.STRONGHOLD_BUFF_EFFECT_OFFSET_Y;
        this.m_BuffEffect.gotoAndPlay(this.m_Cell.currentBuffEffectFrame);
        this.m_IconLayer.addChildAt(this.m_BuffEffect, 0);
    }

    private DrawConnectingLines(): void {
        let _loc3_: MapRoom3Cell = null;
        if (MapRoom3CellGraphic.DRAW_CONNECTING_LINES_ON_MOUSEOVER == false) {
            return;
        }
        if (this.m_Mousedover == false) {
            return;
        }
        if (this.m_Cell.isInRangeOfStronghold == false) {
            return;
        }
        let _loc1_: uint = this.m_Cell.inRangeOfStrongholds.length >>> 0;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            _loc3_ = as3.vget(this.m_Cell.inRangeOfStrongholds, _loc2_);
            if (_loc3_.isOwnedByPlayer) {
                this.DrawConnectingLineTo(_loc3_, MapRoom3CellGraphic.CONNECTING_LINE_BLUE);
            } else if (_loc3_.userID == this.m_Cell.userID && _loc3_.wildMonsterTribeId == this.m_Cell.wildMonsterTribeId) {
                this.DrawConnectingLineTo(_loc3_, MapRoom3CellGraphic.CONNECTING_LINE_RED);
            } else {
                this.DrawConnectingLineTo(_loc3_, MapRoom3CellGraphic.CONNECTING_LINE_NEUTRAL);
            }
            _loc2_++;
        }
        MapRoom3.mapRoom3Window.cellOverlayLayer.addChild(this.m_LineLayer);
        this.m_LineLayer.x = this.x;
        this.m_LineLayer.y = this.y;
    }

    private DrawConnectingLineTo(param1: MapRoom3Cell, param2: uint): void {
        let _loc3_: number = Number(param1.cellX * MapRoom3CellGraphic.HEX_WIDTH + (!(!(param1.cellY % 2)) ? MapRoom3CellGraphic.HEX_WIDTH * 0.5 : 0));
        let _loc4_: number = param1.cellY * MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP;
        let _loc5_: Shape = null;
        (_loc5_ = new Shape()).graphics.lineStyle(MapRoom3CellGraphic.CONNECTING_LINE_THICKNESS, param2, MapRoom3CellGraphic.CONNECTING_LINE_ALPHA);
        _loc5_.graphics.lineTo(_loc3_ - this.x, _loc4_ - this.y);
        _loc5_.x = _loc5_.x + MapRoom3CellGraphic.HEX_WIDTH * 0.5;
        _loc5_.y = _loc5_.y + MapRoom3CellGraphic.HEX_HEIGHT * 0.5;
        this.m_LineLayer.addChild(_loc5_);
    }

    private DrawInfoLayer(): void {
        if (MapRoom3.mapRoom3Window.IsZoomedOut()) {
            return;
        }
        if (this.m_Cell.cellType == EnumYardType.FORTIFICATION && MapRoom3CellGraphic.DEBUG_DISPLAY == false) {
            return;
        }
        let _loc1_: TextField = new TextField();
        _loc1_.defaultTextFormat = new TextFormat("Verdana", 10, 16777215, true, null, null, null, null, TextFormatAlign.CENTER);
        _loc1_.width = (MapRoom3CellGraphic.HEX_WIDTH * 1.5) | 0;
        _loc1_.height = 20;
        _loc1_.x = (-MapRoom3CellGraphic.HEX_WIDTH * 0.25) | 0;
        _loc1_.y = MapRoom3CellGraphic.HEX_HEIGHT - _loc1_.height;
        if (MapRoom3CellGraphic.DEBUG_DISPLAY) {
            _loc1_.x = 0;
            _loc1_.y = 0;
            _loc1_.width = MapRoom3CellGraphic.HEX_WIDTH;
            _loc1_.height = MapRoom3CellGraphic.HEX_HEIGHT;
            _loc1_.multiline = true;
            _loc1_.wordWrap = true;
            _loc1_.htmlText = "x: " + this.m_Cell.cellX.toString() + " y: " + this.m_Cell.cellY.toString() + " h: " + this.m_Cell.cellHeight.toString() + " t: " + this.m_Cell.cellType.toString() + " rel: " + this.m_Cell.relationship.toString() + " r: " + this.m_Cell.attackRange.toString() + " in_r: " + this.m_Cell.isInAttackRange.toString();
        } else {
            _loc1_.htmlText = this.m_Cell.name + " (" + this.m_Cell.baseLevel.toString() + ")";
        }
        _loc1_.filters = [new GlowFilter(0, 1, 2, 2, 4, BitmapFilterQuality.HIGH)];
        _loc1_.x = _loc1_.x + this.x;
        _loc1_.y = _loc1_.y + this.y;
        this.m_InfoLayer.addChild(_loc1_);
        MapRoom3.mapRoom3Window.infoLayer.addChild(this.m_InfoLayer);
    }

    private DrawDamageBarLayer(): void {
        if (this.m_Cell.damage <= 0) {
            return;
        }
        let _loc1_: BitmapData = MapRoom3AssetCache.instance.GetDamageBarSegmentAsset(this.m_Cell.damagePercentage);
        if (_loc1_ == null) {
            return;
        }
        let _loc2_: Bitmap = new Bitmap(_loc1_);
        _loc2_.x = Math.round((MapRoom3CellGraphic.HEX_WIDTH - _loc2_.width) * 0.5);
        this.m_IconLayer.addChild(_loc2_);
    }

    private DrawHighlightLayer(): void {
        if (this.m_HighlightLayer == null) {
            return;
        }
        this.m_HighlightLayer.graphics.clear();
        this.m_HighlightLayer.x = 0;
        this.m_HighlightLayer.y = MapRoom3CellGraphic.HEX_HEIGHT * 0.5 - MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * 0.5;
        if (this.m_Selected) {
            MapRoom3CellGraphic.DrawProceduralEllipse(this.m_HighlightLayer.graphics, 16777215, 0.5);
        } else if (this.m_Mousedover) {
            MapRoom3CellGraphic.DrawProceduralEllipse(this.m_HighlightLayer.graphics, 16777215, 0.3);
        }
    }

    public setMapCell(param1: MapRoom3Cell): void {
        if (this.m_Cell != null && this.m_Cell.cellGraphic == this) {
            this.m_Cell.cellGraphic = null;
        }
        this.m_Cell = param1;
        if (this.m_Cell != null) {
            this.m_Cell.cellGraphic = this;
        }
        this.DrawTile();
    }

    public set mousedover(param1: boolean) {
        if (this.m_Mousedover != param1) {
            this.m_Mousedover = param1;
            this.DrawHighlightLayer();
            this.ClearRangeLayer();
            this.DrawRangeLayer();
            this.ClearLineLayer();
            this.DrawConnectingLines();
            this.m_InfoLayer.visible = !this.m_Mousedover;
        }
    }

    public set selected(param1: boolean) {
        if (this.m_Selected != param1) {
            this.m_Selected = param1;
            this.DrawHighlightLayer();
        }
    }
}
