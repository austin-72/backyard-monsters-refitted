import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BTOTEM, GLOBAL, ImageCache, KEYS, POPUPS, ROUNDCOMPLETEPOPUP_CLIP, SOUNDS, SPECIALEVENT_WM1, STORE } from "@game";

/*
 * This is the original WMIROUNDCOMPLETE.as class for Wild Monster Invasion 1.
 * The original developers rewrote this class when Wild Monster Invasion 2 was released
 * instead of creating a new class.
 *
 * This file archives the original implementation for reference and renamed to WMIROUNDCOMPLETE_WM1.
 */
export class WMIROUNDCOMPLETE_WM1 extends ROUNDCOMPLETEPOPUP_CLIP {
    static {
        as3.fields(this, { bm: null });
    }

    private static _wave: number = NaN;

    private static _open: boolean = false;
    private bm: Bitmap;

    public $ctor(param1: int = -1, param2: boolean = false): void {
        let bannerComplete: Function = null;
        let imageComplete: Function = null;
        let numDamagedBuildings: int = 0;
        let b: any = undefined;
        let wave: int = param1;
        let surrendered: boolean = param2;
        bannerComplete = (param1: string, param2: BitmapData): any => {
            this.bm = new Bitmap(param2);
            this.mcBanner.addChild(this.bm);
            this.mcBanner.width = 672;
            this.mcBanner.height = 82;
        };
        imageComplete = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.smoothing = true;
            this.mcImage.addChild(_loc3_);
            this.mcImage.width = 200;
            this.mcImage.height = 200;
        };
        super.$ctor();
        WMIROUNDCOMPLETE_WM1._wave = wave;
        ImageCache.GetImageWithCallBack("specialevent/monsterinvasionbannerred.jpg", bannerComplete);
        if (wave == -1) {
            ImageCache.GetImageWithCallBack(WMIROUNDCOMPLETE_WM1.GetImageName(SPECIALEVENT_WM1.wave, false), imageComplete);
        } else {
            ImageCache.GetImageWithCallBack(WMIROUNDCOMPLETE_WM1.GetImageName(wave, true), imageComplete);
        }
        this.mcFrame.Setup(wave != 1);
        if (WMIROUNDCOMPLETE_WM1.isMajorWave(wave)) {
            this.mcTitle.htmlText = KEYS.Get("wmi_winwavetitle");
            this.mcText.htmlText = KEYS.Get("wmi_winwave" + wave);
            if (wave == SPECIALEVENT_WM1.BONUSWAVE) {
                this.mcStats.htmlText = KEYS.Get("wmi_completedwave31");
            } else if (wave == SPECIALEVENT_WM1.BONUSWAVE2) {
                this.mcStats.htmlText = KEYS.Get("wmi_completedwave32");
            } else {
                this.mcStats.htmlText = KEYS.Get("wmi_completedwaves", { "v1": wave });
            }
            this.rBtn.Highlight = true;
            if (wave == 1) {
                BTOTEM.TotemReward();
                this.ButtonsVisible(false, false, true, false);
                this.rBtn.SetupKey("wmi_placetotembtn");
                this.rBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.PlaceTotem));
            } else {
                this.ButtonsVisible(false, false, false, true);
                this.bragBtn.SetupKey("btn_brag");
                this.bragBtn.Highlight = true;
                this.bragBtn.addEventListener(MouseEvent.CLICK, WMIROUNDCOMPLETE_WM1.Brag);
            }
            this.lBtn.visible = false;
        } else if (wave == -1) {
            if (surrendered) {
                this.mcTitle.htmlText = KEYS.Get("wmi_surrendertitle");
                this.mcText.htmlText = KEYS.Get("wmi_surrender");
            } else {
                this.mcTitle.htmlText = KEYS.Get("wmi_losewavetitle");
                this.mcText.htmlText = KEYS.Get("wmi_losewave");
            }
            this.mcStats.htmlText = "";
            numDamagedBuildings = 0;
            for (b of as3.values(BASE._buildingsAll)) {
                if (b.health < b.maxHealth) {
                    numDamagedBuildings++;
                }
            }
            if (numDamagedBuildings > 0) {
                this.ButtonsVisible(false, true, true, false);
                this.mBtn.SetupKey("btn_startrepairs");
                this.mBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartRepairsClicked));
                this.rBtn.SetupKey("btn_repairall");
                this.rBtn.Highlight = true;
                this.rBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.RepairAllClicked));
            } else {
                this.ButtonsVisible(false, false, false, false);
            }
        } else if (wave == SPECIALEVENT_WM1.EVENTEND) {
            this.mcTitle.htmlText = "";
            this.mcText.htmlText = KEYS.Get("wmi_eventover");
            this.mcStats.htmlText = "";
            this.ButtonsVisible(false, false, false, true);
            this.bragBtn.SetupKey("btn_brag");
            this.bragBtn.Highlight = true;
            this.bragBtn.addEventListener(MouseEvent.CLICK, WMIROUNDCOMPLETE_WM1.Brag);
        } else {
            this.mcTitle.htmlText = KEYS.Get("wmi_winwavetitle");
            this.mcText.htmlText = KEYS.Get("wmi_winwave");
            this.mcStats.htmlText = KEYS.Get("wmi_completedwaves", { "v1": wave });
            numDamagedBuildings = 0;
            for (b of as3.values(BASE._buildingsAll)) {
                if (b.health < b.maxHealth) {
                    numDamagedBuildings++;
                }
            }
            if (numDamagedBuildings == 0) {
                if (SPECIALEVENT_WM1.GetTimeUntilEnd() < 0) {
                    this.ButtonsVisible(false, false, false, false);
                } else {
                    this.ButtonsVisible(false, false, true, false);
                    this.rBtn.SetupKey("wmi_nextwavebtn");
                    this.rBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.NextWaveClicked));
                }
            } else {
                if (SPECIALEVENT_WM1.GetTimeUntilEnd() < 0) {
                    this.ButtonsVisible(false, true, true, false);
                } else {
                    this.ButtonsVisible(true, true, true, false);
                    this.lBtn.SetupKey("wmi_nextwavebtn");
                    this.lBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.NextWaveClicked));
                }
                this.mBtn.SetupKey("btn_startrepairs");
                this.mBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartRepairsClicked));
                this.rBtn.SetupKey("btn_repairall");
                this.rBtn.Highlight = true;
                this.rBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.RepairAllClicked));
            }
        }
        WMIROUNDCOMPLETE_WM1._open = true;
    }

    public static get open(): boolean {
        return WMIROUNDCOMPLETE_WM1._open;
    }

    private static isMajorWave(param1: int): boolean {
        switch (param1) {
            case 1:
            case 10:
            case 20:
            case 30:
            case 31:
            case 32:
                return true;
            default:
                return false;
        }
    }

    private static Brag(param1: MouseEvent): void {
        switch (WMIROUNDCOMPLETE_WM1._wave) {
            case 1:
                GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave1streamtitle"), KEYS.Get("wmi_wave1streamdesc"), "wmitotemfeed1.png"]);
                break;
            case 10:
                GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave10streamtitle"), KEYS.Get("wmi_wave10streamdesc"), "wmitotemfeed2.png"]);
                break;
            case 20:
                GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave20streamtitle"), KEYS.Get("wmi_wave20streamdesc"), "wmitotemfeed3.png"]);
                break;
            case 30:
                GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave30streamtitle"), KEYS.Get("wmi_wave30streamdesc"), "wmitotemfeed4.png"]);
                break;
            case 31:
                GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave31streamtitle"), KEYS.Get("wmi_wave31streamdesc"), "wmitotemfeed5.png"]);
                break;
            case 32:
                GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave32streamtitle"), KEYS.Get("wmi_wave32streamdesc"), "wmitotemfeed6.png"]);
                break;
            case 33:
                GLOBAL.CallJS("sendFeed", ["wmi-eventover", KEYS.Get("wmi_eventoverstreamtitle"), KEYS.Get("wmi_eventoverstreamdesc", { "v1": GLOBAL.StatGet("wmi_wave") }), "wmi_aftermath.png"]);
        }
        POPUPS.Next();
    }

    private static GetImageName(param1: int, param2: boolean): string {
        if (param2) {
            switch (param1) {
                case 1:
                    return "popups/building-wmitotem1.png";
                case 10:
                    return "popups/building-wmitotem2.png";
                case 20:
                    return "popups/building-wmitotem3.png";
                case 30:
                    return "popups/building-wmitotem4.png";
                case 31:
                    return "popups/building-wmitotem5.png";
                case 32:
                    return "popups/building-wmitotem6.png";
                case 33:
                    return "popups/wmieventend.png";
                default:
                    if (param1 < 10) {
                        return "specialevent/200x200_1.jpg";
                    }
                    if (param1 < 20) {
                        return "specialevent/200x200_2.jpg";
                    }
                    return "specialevent/200x200_3.jpg";
            }
        } else {
            if (param1 < 10) {
                return "specialevent/200x200_1.jpg";
            }
            if (param1 < 20) {
                return "specialevent/200x200_2.jpg";
            }
            return "specialevent/200x200_3.jpg";
        }
    }

    public Hide(): void {
        WMIROUNDCOMPLETE_WM1._open = false;
        POPUPS.Next();
    }

    private ButtonsVisible(param1: boolean, param2: boolean, param3: boolean, param4: boolean): void {
        this.lBtn.visible = param1;
        this.mBtn.visible = param2;
        this.rBtn.visible = param3;
        this.bragBtn.visible = param4;
    }

    private PlaceholderButtonClicked(param1: MouseEvent): void {
        this.Hide();
    }

    private NextWaveClicked(param1: MouseEvent): void {
        SPECIALEVENT_WM1.StartRound();
        this.Hide();
    }

    private StartRepairsClicked(param1: MouseEvent): void {
        let _loc2_: any = undefined;
        for (_loc2_ of as3.values(BASE._buildingsAll)) {
            if (_loc2_.health < _loc2_.maxHealth && _loc2_._repairing == 0) {
                _loc2_.Repair();
            }
        }
        SOUNDS.Play("repair1", 0.25);
        this.Hide();
    }

    private RepairAllClicked(param1: MouseEvent): void {
        STORE.ShowB(3, 1, ["FIX"], true);
        this.Hide();
    }

    private PlaceTotem(param1: MouseEvent): void {
        BTOTEM.TotemPlace();
        this.Hide();
    }
}
