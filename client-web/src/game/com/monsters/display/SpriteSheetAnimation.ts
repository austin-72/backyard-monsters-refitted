import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { SPRITES, SpriteData } from "@game";

export class SpriteSheetAnimation extends Bitmap {
    static {
        as3.fields(this, { totalFrames: 0, currentFrame: 0, currentRow: 0, isPlaying: false, doesRepeat: false, spriteData: null });
    }

    public totalFrames: int;
    public currentFrame: int;
    public currentRow: int;
    public isPlaying: boolean;
    public doesRepeat: boolean;
    public spriteData: SpriteData;

    public $ctor(param1?: any /* SpriteData */, param2?: any /* int */): void {
        this.spriteData = param1;
        this.totalFrames = param2;
        super.$ctor(new BitmapData(param1.width, param1.height, true, 0));
    }

    public play(): void {
        this.isPlaying = true;
    }

    public stop(): void {
        this.isPlaying = false;
    }

    public gotoAndPlay(param1: int): void {
        this.currentFrame = param1;
        this.isPlaying = true;
    }

    public gotoAndStop(param1: int): void {
        this.currentFrame = param1;
        this.isPlaying = false;
    }

    public update(): void {
        if (this.isPlaying) {
            ++this.currentFrame;
            if (this.currentFrame > this.totalFrames) {
                this.animationComplete();
            }
        }
        this.render();
    }

    public render(): void {
        SPRITES.GetFrame(this.bitmapData, this.spriteData, (this.currentFrame % this.totalFrames) | 0, this.currentRow);
    }

    private animationComplete(): void {
        if (this.doesRepeat) {
            this.currentFrame = 0;
        }
    }
}
