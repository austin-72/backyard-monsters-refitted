import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BTOTEM, GLOBAL, GRID, InventoryManager, IoPlaceMany, IoSign, IoTd2Tower, IoToast, IoTrophies, KEYS, MAP, IoChampionStatue } from "@game";

export class BDECORATION extends BFOUNDATION {
    static {
        as3.fields(this, { _animMC: null, _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null });
    }

    public _animMC: MovieClip;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;

    public $ctor(param1?: any /* int */): void {
        let _loc2_: int = 0;
        _loc2_ = GLOBAL._buildingProps[param1 - 1].size | 0;
        this._type = param1;
        this._footprint = [new Rectangle(0, 0, _loc2_, _loc2_)];
        this._gridCost = [[new Rectangle(0, 0, _loc2_, _loc2_), 2]];
        super.$ctor();
        super.SetProps();
    }

    public override Place(param1: MouseEvent = null): void {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL._newBuilding !== this || !BDECORATION.ioPlain(this._type)) {
            super.Place(param1);
            return;
        }
        // Inferno-only (QoL #48): one put down from storage, with more of the kind still there: the next is in the
        // hand at once (IoPlaceMany's run, as for blocks: Esc or a click off the yard stops it), until none is left.
        let m: any = IoPlaceMany.active;
        let stored: int = InventoryManager.buildingStorageCount(this._type);
        if (m && m.ioStored && (m.type | 0) == this._type && stored <= 0) {
            // (a run from storage with none left after all: never bought instead)
            IoPlaceMany.stop();
            this.Cancel();
            return;
        }
        super.Place(param1);
        let left: int = InventoryManager.buildingStorageCount(this._type);
        if (stored > 0 && left == stored - 1 && GLOBAL._newBuilding !== this && left > 0 && !IoPlaceMany.active && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.ioTdMode()) {
            IoPlaceMany.start(this._type, (left + 1) | 0, false, 0);
            if (IoPlaceMany.active) {
                IoPlaceMany.active.ioStored = true;
                IoPlaceMany.placed(this);
            }
        }
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        // (Inferno-only, 22 October: the Champion Statue turns slowly, a frame of its 48 every 6 ticks, a facing each 0.45
        // seconds: IoChampionStatue.paint)
        if (GLOBAL._render && this._frameNumber % (IoChampionStatue.Is(this._type) ? 6 : 2) == 0) {
            this.AnimFrame();
        }
        ++this._frameNumber;
    }

    /**
     * QoL #48: a plain decoration (not a totem, an event trophy, the Sign or a Hellgate tower: those have levels
     * or a message of their own), which can be put down from storage several at a time.
     */
    public static ioPlain(type: int): boolean {
        let props: any = GLOBAL._buildingProps ? GLOBAL._buildingProps[type - 1] : null;
        return props != null && props.type == "decoration" && !BTOTEM.IsTotem(type) && !BTOTEM.IsTotem2(type) && !IoSign.IsSign(type) && !IoTd2Tower.IsTower(type) && !IoTrophies.IsTrophy(type);
    }

    /** How many of a plain decoration "Place all" would put down (those in storage), or 0. */
    public static ioStored(type: int): int {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioTdMode() || !BDECORATION.ioPlain(type)) {
            return 0;
        }
        return InventoryManager.buildingStorageCount(type);
    }

    /**
     * Inferno-only (QoL #48): "Place all N" from the build menu: every one of a decoration in storage put down at
     * once, in rows next to the Under Hall (below it, then above, further out each time) wherever the ground is
     * free inside the yard. Each is taken from storage as a placed one is (and built: a decoration needs no worker).
     */
    public static ioPlaceAll(type: int): void {
        let n: int = BDECORATION.ioStored(type);
        if (n <= 0) {
            return;
        }
        let props: any = GLOBAL._buildingProps[type - 1];
        let size: int = Math.max(10, props.size | 0) | 0;
        let foot: any[] = [new Rectangle(0, 0, size, size)];
        let hall: BFOUNDATION = GLOBAL.townHall;
        let hx: number = 0;
        let hy: number = 0;
        let hw: number = 0;
        let hh: number = 0;
        if (hall) {
            let at: any = hall.Export();
            let fp: Rectangle = hall._footprint && hall._footprint.length ? as3.as(hall._footprint[0], Rectangle) : new Rectangle(0, 0, 100, 100);
            hx = Number(at.X);
            hy = Number(at.Y);
            hw = fp.width;
            hh = fp.height;
        }
        let halfW: number = GLOBAL._mapWidth * 0.5;
        let halfH: number = GLOBAL._mapHeight * 0.5;
        let gap: int = 10;
        let cx: number = Math.round((hx + hw / 2 - size / 2) / 5) * 5;
        let placed: int = 0;
        let first: Point = null;
        let error: string = null;
        for (let k: int = 0; k < 16 && placed < n && !error; k++) {
            for (let side: int = 0; side < 2 && placed < n && !error; side++) {
                // (row k below the hall, then row k above it)
                let y: number = side == 0 ? hy + hh + gap + k * (size + gap) : hy - gap - size - k * (size + gap);
                if (y < -halfH || y + size > halfH) {
                    continue;
                }
                for (let j: int = 0; j < 31 && placed < n; j++) {
                    // (from the middle outwards: 0, 1, -1, 2, -2 ...)
                    let step: int = (j + 1) >> 1;
                    let x: number = cx + (j % 2 == 1 ? step : -step) * size;
                    if (x < -halfW || x + size > halfW) {
                        continue;
                    }
                    if (GRID.FootprintBlocked(foot, GRID.ToISO(x, y, 0), true, true)) {
                        continue;
                    }
                    if (InventoryManager.buildingStorageCount(type) <= 0) {
                        break;
                    }
                    let can: any = BASE.CanBuild(type, false);
                    if (can.error) {
                        error = String(can.errorMessage);
                        break;
                    }
                    let b: BFOUNDATION = BASE.addBuildingC(type);
                    if (!b) {
                        error = "";
                        break;
                    }
                    // (as the Yard Planner puts one down from storage: InventoryManager.getBuildingFromNode)
                    b.Setup({ "X": x, "Y": y, "t": type, "id": (BASE._buildingCount + 1) | 0 });
                    InventoryManager.buildingStorageRemove(type);
                    placed++;
                    if (!first) {
                        first = GRID.ToISO(x + size / 2, y + size / 2, 0);
                    }
                }
            }
        }
        if (!placed) {
            GLOBAL.Message(error ? error : KEYS.Get("io_yard2_deco_noroom"));
            return;
        }
        BFOUNDATION.redrawAllShadowData();
        BASE.Save();
        if (first) {
            MAP.FocusTo(first.x | 0, first.y | 0, 0.6);
        }
        let name: string = KEYS.Get(String(props.name));
        let left: int = InventoryManager.buildingStorageCount(type);
        IoToast.Show(KEYS.Get(left > 0 ? "io_yard2_deco_placed_some" : "io_yard2_deco_placed", { "v1": placed, "v2": name, "v3": left }), 5000);
    }
}
