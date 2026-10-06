import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { EventRewardRibbon } from "@game";

export class MultiRewardEventsBar extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MultiRewardEventsBar" });
        as3.fields(this, { mcBackground: null, progressBarOverlay: null, buttonAction: null, reward0: null, reward1: null, reward2: null, buttonActionLabel: null, timeLabel: null, buttonHelp: null, eventImage: null, progressBarFill: null, logoImage: null, tScore: null, progressBarFillMask: null });
    }

    public mcBackground: MovieClip;
    public progressBarOverlay: MovieClip;
    public buttonAction: MovieClip;
    public reward0: EventRewardRibbon;
    public reward1: EventRewardRibbon;
    public reward2: EventRewardRibbon;
    public buttonActionLabel: TextField;
    public timeLabel: TextField;
    public buttonHelp: MovieClip;
    public eventImage: MovieClip;
    public progressBarFill: MovieClip;
    public logoImage: MovieClip;
    public tScore: TextField;
    public progressBarFillMask: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
