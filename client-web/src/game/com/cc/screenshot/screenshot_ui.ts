import * as as3 from "as3";
import { int } from "as3";
import { Bitmap } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { FileReference } from "flash/net";
import { ByteArray } from "flash/utils";
import { JPGEncoder, screenshot, screenshot_ui_CLIP } from "@game";

export class screenshot_ui extends screenshot_ui_CLIP {
    static {
        as3.fields(this, { brightness: 0, contrast: 0, saturation: 0, tilt: 0, grain: 0, border: 0, dragPoint: null, offsetPoint: null, presets: null });
    }

    private brightness: int;
    private contrast: int;
    private saturation: int;
    private tilt: int;
    private grain: int;
    private border: int;
    private dragPoint: Point;
    private offsetPoint: Point;
    private presets: any[];

    public $ctor(): void {
        this.offsetPoint = new Point(-20, -20);
        this.presets = [["Normal", 0, 0, 0, 0, 0, 0], ["B&W", 10, 10, -100, 0, 0, 1], ["B&W 2", 0, 40, -100, 0, 0, 1], ["Toy", 0, 0, 10, 60, 0, 2], ["Toy 2", 10, 30, 20, 60, 0, 2], ["Old", 10, 40, -30, 10, 1, 3]];
        super.$ctor();
        this.mcImage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.DragStart));
        this.mcImage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.DragStop));
        this.bBrightnessDown.Setup("-");
        this.bBrightnessDown.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BrightnessDown));
        this.bBrightnessUp.Setup("+");
        this.bBrightnessUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BrightnessUp));
        this.bContrastDown.Setup("-");
        this.bContrastDown.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ContrastDown));
        this.bContrastUp.Setup("+");
        this.bContrastUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ContrastUp));
        this.bSaturationDown.Setup("-");
        this.bSaturationDown.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SaturationDown));
        this.bSaturationUp.Setup("+");
        this.bSaturationUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SaturationUp));
        this.bTiltDown.Setup("-");
        this.bTiltDown.addEventListener(MouseEvent.CLICK, as3.bind(this, this.TiltDown));
        this.bTiltUp.Setup("+");
        this.bTiltUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.TiltUp));
        this.bGrainDown.Setup("-");
        this.bGrainDown.addEventListener(MouseEvent.CLICK, as3.bind(this, this.GrainDown));
        this.bGrainUp.Setup("+");
        this.bGrainUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.GrainUp));
        this.bSave1.SetupKey("btn_savetoalbum");
        this.bSave1.Enabled = false;
        this.bSave2.SetupKey("btn_posttowall");
        this.bSave2.Enabled = false;
        this.bSave3.SetupKey("btn_downloadimage");
        this.bSave3.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Save));
        let _loc1_: int = 0;
        while (_loc1_ < this.presets.length) {
            this["bPreset" + (_loc1_ + 1)].Setup(this.presets[_loc1_][0]);
            this["bPreset" + (_loc1_ + 1)].addEventListener(MouseEvent.CLICK, this.LoadPreset(_loc1_));
            _loc1_++;
        }
        this.Update();
    }

    private LoadPreset(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            this.brightness = this.presets[n][1] | 0;
            this.contrast = this.presets[n][2] | 0;
            this.saturation = this.presets[n][3] | 0;
            this.tilt = this.presets[n][4] | 0;
            this.grain = this.presets[n][5] | 0;
            this.border = this.presets[n][6] | 0;
            this.Update();
        };
    }

    private DragStart(param1: MouseEvent = null): void {
        this.dragPoint = new Point(this.mouseX, this.mouseY);
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.Dragging));
    }

    private DragStop(param1: MouseEvent = null): void {
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.Dragging));
        this.offsetPoint.x += this.mouseX - this.dragPoint.x;
        this.offsetPoint.y += this.mouseY - this.dragPoint.y;
        this.Update();
    }

    private Dragging(param1: MouseEvent = null): void {
        screenshot.Take(this.mouseX - this.dragPoint.x + this.offsetPoint.x, this.mouseY - this.dragPoint.y + this.offsetPoint.y);
        this.Update();
        this.mcImage.removeChildAt(0);
        this.mcImage.addChild(new Bitmap(screenshot._processedImage));
    }

    private Update(): void {
        this.tBrightness.htmlText = "<b>" + (100 + this.brightness) + "%";
        this.tContrast.htmlText = "<b>" + (100 + this.contrast) + "%";
        this.tSaturation.htmlText = "<b>" + (100 + this.saturation) + "%";
        this.tTilt.htmlText = this.tilt == 0 ? "<b>OFF" : "<b>ON " + this.tilt + "%";
        this.tGrain.htmlText = this.grain == 0 ? "<b>OFF" : (this.grain == 1 ? "<b>LOW" : "<b>HIGH");
        screenshot.Process(this.brightness, this.contrast, this.saturation, this.tilt, this.grain, this.border);
        this.mcImage.removeChildAt(0);
        this.mcImage.addChild(new Bitmap(screenshot._processedImage));
        this.mcImage.width = 550;
        this.mcImage.height = 360;
    }

    private Save(param1: MouseEvent = null): void {
        let _loc2_: JPGEncoder = new JPGEncoder(80);
        let _loc3_: ByteArray = _loc2_.encode(screenshot._processedImage);
        let _loc4_: FileReference = null;
        (_loc4_ = new FileReference()).save(_loc3_, "BackyardMonsters.jpg");
    }

    private BrightnessDown(param1: MouseEvent): void {
        if (this.brightness > -100) {
            this.brightness -= 10;
        }
        this.Update();
    }

    private BrightnessUp(param1: MouseEvent): void {
        if (this.brightness < 100) {
            this.brightness += 10;
        }
        this.Update();
    }

    private ContrastDown(param1: MouseEvent): void {
        if (this.contrast > -100) {
            this.contrast -= 10;
        }
        this.Update();
    }

    private ContrastUp(param1: MouseEvent): void {
        if (this.contrast < 100) {
            this.contrast += 10;
        }
        this.Update();
    }

    private SaturationDown(param1: MouseEvent): void {
        if (this.saturation > -100) {
            this.saturation -= 10;
        }
        this.Update();
    }

    private SaturationUp(param1: MouseEvent): void {
        if (this.saturation < 100) {
            this.saturation += 10;
        }
        this.Update();
    }

    private TiltUp(param1: MouseEvent): void {
        if (this.tilt < 100) {
            this.tilt += 10;
        }
        this.Update();
    }

    private TiltDown(param1: MouseEvent): void {
        if (this.tilt > 0) {
            this.tilt -= 10;
        }
        this.Update();
    }

    private GrainDown(param1: MouseEvent): void {
        if (this.grain > 0) {
            --this.grain;
        }
        this.Update();
    }

    private GrainUp(param1: MouseEvent): void {
        if (this.grain < 2) {
            this.grain += 1;
        }
        this.Update();
    }
}
