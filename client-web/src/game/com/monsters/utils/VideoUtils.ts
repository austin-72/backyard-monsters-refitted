import * as as3 from "as3";
import { ASObject } from "as3";
import { AsyncErrorEvent, NetStatusEvent, SecurityErrorEvent } from "flash/events";
import { Video } from "flash/media";
import { NetConnection, NetStream } from "flash/net";

export class VideoUtils extends ASObject {
    private static stream: NetStream = null;

    private static _videoURL: string = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static getVideoStream(param1: Video, param2: string = null): NetStream {
        let _loc3_: NetConnection = new NetConnection();
        _loc3_.addEventListener(NetStatusEvent.NET_STATUS, VideoUtils.netStatusHandler);
        _loc3_.addEventListener(SecurityErrorEvent.SECURITY_ERROR, VideoUtils.securityErrorHandler);
        _loc3_.connect(null);
        VideoUtils.stream = new NetStream(_loc3_);
        VideoUtils.stream.addEventListener(NetStatusEvent.NET_STATUS, VideoUtils.netStatusHandler);
        VideoUtils.stream.addEventListener(AsyncErrorEvent.ASYNC_ERROR, VideoUtils.asyncErrorHandler);
        VideoUtils.stream.client = { "onMetaData": VideoUtils.onMetaData };
        VideoUtils.stream.bufferTime = 0;
        if (param2) {
            VideoUtils.stream.play(param2);
            VideoUtils._videoURL = param2;
        }
        param1.attachNetStream(VideoUtils.stream);
        return VideoUtils.stream;
    }

    private static onMetaData(param1: any): void {
    }

    public static loopStream(param1: NetStream): void {
        param1.addEventListener(NetStatusEvent.NET_STATUS, VideoUtils.loopNetStream);
    }

    private static netStatusHandler(param1: NetStatusEvent): void {
        switch (param1.info.code) {
            case "NetStream.Play.StreamNotFound":
        }
    }

    private static securityErrorHandler(param1: SecurityErrorEvent): void {
    }

    private static asyncErrorHandler(param1: AsyncErrorEvent): void {
    }

    private static loopNetStream(param1: NetStatusEvent): void {
        if (param1.info.code == "NetStream.Play.Stop") {
            as3.cast(param1.target, NetStream).pause();
            as3.cast(param1.target, NetStream).seek(0);
            as3.cast(param1.target, NetStream).resume();
        }
        if (param1.info.code == "NetStream.Buffer.Empty") {
            VideoUtils.stream.play(VideoUtils._videoURL);
        }
    }
}
