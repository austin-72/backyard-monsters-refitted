/** flash.display */
import { flashClass } from "../_internal";

export {
  DisplayObject, InteractiveObject, DisplayObjectContainer, Sprite, MovieClip, Shape, Bitmap, SimpleButton, Stage,
  Loader, LoaderInfo, FrameLabel, Scene, Transform, IBitmapDrawable,
} from "./core";
export { Graphics } from "./Graphics";
export { BitmapData } from "./BitmapData";

function constantsClass(qname: string): any {
  const C = class {};
  Object.defineProperty(C, "name", { value: qname.slice(qname.lastIndexOf(".") + 1) });
  flashClass(C, qname);
  return C;
}
export const BlendMode: any = constantsClass("flash.display.BlendMode");
export const BitmapDataChannel: any = constantsClass("flash.display.BitmapDataChannel");
export const CapsStyle: any = constantsClass("flash.display.CapsStyle");
export const JointStyle: any = constantsClass("flash.display.JointStyle");
export const GradientType: any = constantsClass("flash.display.GradientType");
export const SpreadMethod: any = constantsClass("flash.display.SpreadMethod");
export const InterpolationMethod: any = constantsClass("flash.display.InterpolationMethod");
export const LineScaleMode: any = constantsClass("flash.display.LineScaleMode");
export const PixelSnapping: any = constantsClass("flash.display.PixelSnapping");
export const StageAlign: any = constantsClass("flash.display.StageAlign");
export const StageScaleMode: any = constantsClass("flash.display.StageScaleMode");
export const StageDisplayState: any = constantsClass("flash.display.StageDisplayState");
export const StageQuality: any = constantsClass("flash.display.StageQuality");
