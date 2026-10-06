import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Event, EventDispatcher } from "flash/events";
import { BASE, FrontPageGraphic, FrontPageLibrary, GLOBAL, IReplayableEventUI, POPUPS, ReplayableEventHandler, ReplayableEventQuota, ReplayableEventUI, com_monsters_frontPage_messages_Message as Message, print } from "@game";

export class ReplayableEvent extends EventDispatcher {
    static {
        as3.fields(this, { _DEFAULT_EVENT_DURATION: 345600, _PROMO3_DURATION: 259200, _PROMO2_DURATION: 86400, _priority: 0, _name: null, _dates: null, _originalStartDate: NaN, _progress: -1, _imageURL: null, _titleImage: null, _eventStoreTitleImage: null, _messages: null, _rewardMessage: null, _id: 0, _score: -1, _buttonCopy: null, _duration: 345600, _quotas: null, m_mustBeInsideBase: false, _maxScore: 1.7976931348623157e+308 });
    }

    protected _DEFAULT_EVENT_DURATION: uint;
    private _PROMO3_DURATION: number;
    private _PROMO2_DURATION: number;
    protected _priority: int;
    protected _name: string;
    protected _dates: Vector<number>;
    protected _originalStartDate: number;
    protected _progress: number;
    protected _imageURL: string;
    protected _titleImage: string;
    protected _eventStoreTitleImage: string;
    protected _messages: Vector<Message>;
    protected _rewardMessage: Message;
    protected _id: uint;
    protected _score: number;
    protected _buttonCopy: string;
    protected _duration: uint;
    protected _quotas: Vector<ReplayableEventQuota>;
    protected m_mustBeInsideBase: boolean;
    protected _maxScore: number;

    public $ctor(): void {
        this._maxScore = 1.7976931348623157e+308;
        super.$ctor();
        if (this._rewardMessage) {
            if (FrontPageLibrary.EVENTS === null) {
                FrontPageLibrary.addCategories();
            }
            FrontPageLibrary.EVENTS.addMessage(this._rewardMessage);
        }
        this._quotas = new Vector<ReplayableEventQuota>(0, false, ReplayableEventQuota);
    }

    public get preEventHUDImageURL(): string {
        return "";
    }

    public get eventHUDImageURL(): string {
        return "";
    }

    public createNewUI(): IReplayableEventUI {
        return new ReplayableEventUI();
    }

    public doesQualify(): boolean {
        return false;
    }

    protected onEventComplete(): void {
    }

    public pressedActionButton(): void {
    }

    protected onInitialize(): void {
    }

    public initialize(): void {
        let _loc1_: Message = this.getCurrentMessage();
        if (_loc1_) {
            FrontPageLibrary.EVENTS.addMessage(_loc1_);
        }
        this.onInitialize();
    }

    public getCurrentMessage(): Message {
        let _loc1_: number = NaN;
        if (this.hasCompletedEvent && Boolean(this._rewardMessage)) {
            return this._rewardMessage;
        }
        if (this.hasEventEnded) {
            return as3.vget(this._messages, this._messages.length - 1);
        }
        if (this.hasEventStarted) {
            return as3.vget(this._messages, this._messages.length - 2);
        }
        _loc1_ = this.startDate - ReplayableEventHandler.currentTime;
        if (_loc1_ > this._PROMO3_DURATION) {
            return as3.vget(this._messages, 0);
        }
        if (_loc1_ > this._PROMO2_DURATION) {
            return as3.vget(this._messages, 1);
        }
        return as3.vget(this._messages, 2);
    }

    public pressedHelpButton(): Message {
        return this.getCurrentMessage();
    }

    public reset(): void {
        let _loc2_: Message = null;
        this.score = 0;
        this.setStartDate(0);
        let _loc1_: int = 0;
        while (_loc1_ < this._messages.length) {
            _loc2_ = as3.vget(this._messages, _loc1_);
            _loc2_.timeLastSeen = 0;
            FrontPageLibrary.EVENTS.addMessage(_loc2_);
            _loc1_++;
        }
        ReplayableEventHandler.callServerMethod("resetevent", [["eventid", this._id]], as3.bind(this, this.resetCallback));
        BASE.Save();
    }

    protected resetCallback(param1: any): void {
        this.dispatchEvent(new Event("reset"));
    }

    public exportData(): any {
        let _loc3_: int = 0;
        let _loc4_: any = null;
        let _loc1_: any = {};
        _loc1_.startDate = this.startDate;
        if (this._rewardMessage) {
            _loc1_.reward = this._rewardMessage.export();
        }
        let _loc2_: int = !(!this._quotas) ? this._quotas.length | 0 : 0;
        if (_loc2_ != 0) {
            _loc1_.quotas = new Array(_loc2_);
            _loc3_ = 0;
            while (_loc3_ < this._quotas.length) {
                _loc4_ = as3.vget(this._quotas, _loc3_).exportData();
                if (_loc4_) {
                    _loc1_.quotas[_loc3_] = _loc4_;
                }
                _loc3_++;
            }
        }
        return _loc1_;
    }

    public importData(param1: any): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        this.setStartDate(Number(param1.startDate));
        if (Boolean(this._rewardMessage) && Boolean(param1.reward)) {
            this._rewardMessage.setup(param1.reward);
        }
        if (param1.quotas) {
            _loc2_ = this._quotas.length | 0;
            _loc3_ = param1.quotas.length | 0;
            _loc4_ = 0;
            while (_loc4_ < _loc2_ && _loc4_ < _loc3_) {
                as3.vget(this._quotas, _loc4_).importData(param1.quotas[_loc4_]);
                _loc4_++;
            }
        }
        this.onImport();
    }

    protected onImport(): void {
    }

    public get duration(): uint {
        return this._duration;
    }

    public get buttonCopy(): string {
        return this._buttonCopy;
    }

    public get hasCompletedEvent(): boolean {
        return this._progress >= 1;
    }

    public get hasEventStarted(): boolean {
        return ReplayableEventHandler.currentTime >= this.startDate;
    }

    public get hasEventEnded(): boolean {
        return ReplayableEventHandler.currentTime >= this.endDate;
    }

    public get endDate(): number {
        if (!this._dates) {
            return 0;
        }
        return as3.vget(this._dates, this._dates.length - 1);
    }

    public get name(): string {
        return this._name;
    }

    public get originalStartDate(): number {
        return this._originalStartDate;
    }

    public get progress(): number {
        return this._progress;
    }

    public set progress(param1: number) {
        this._progress = param1;
        if (this.hasCompletedEvent) {
            this.completedEvent();
        }
    }

    public set score(param1: number) {
        if (this._score >= 0 && param1 - this._score > 0) {
            ReplayableEventHandler.callServerMethod("updatescore", [["eventid", this._id], ["delta", param1 - this._score], ["saveid", GLOBAL.Timestamp()]], as3.bind(this, this.verifyScoreFromServer));
        }
        this._score = param1;
        this.setMetQuotas();
    }

    protected setMetQuotas(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: ReplayableEventQuota = null;
        if (!this.m_mustBeInsideBase || this.m_mustBeInsideBase && GLOBAL.isAtHome() === true) {
            _loc1_ = this._quotas.length | 0;
            _loc2_ = 0;
            while (_loc2_ < _loc1_) {
                _loc3_ = as3.vget(this._quotas, _loc2_);
                if (this._score >= _loc3_.quota) {
                    _loc3_.metQuota();
                }
                _loc2_++;
            }
        }
    }

    protected getLatestMetQuota(param1: number): ReplayableEventQuota {
        let _loc3_: ReplayableEventQuota = null;
        let _loc2_: int = (this._quotas.length - 1) | 0;
        while (_loc2_ >= 0) {
            _loc3_ = as3.vget(this._quotas, _loc2_);
            if (param1 >= _loc3_.quota) {
                return _loc3_;
            }
            _loc2_--;
        }
        return null;
    }

    protected verifyScoreFromServer(param1: any): void {
        let _loc2_: number = as3.as(param1.score, Number);
        if (this._score != _loc2_) {
            print("WARNING: the server score(" + _loc2_ + ") doesnt match the local score(" + this._score + "), ignoring server score");
        }
    }

    protected getServerScore(): void {
        ReplayableEventHandler.callServerMethod("geteventscore", [["eventid", this._id]], as3.bind(this, this.setScoreFromServer));
    }

    protected setScoreFromServer(param1: any): void {
        let _loc2_: number = as3.as(param1.score, Number);
        if (Boolean(_loc2_) && !isNaN(_loc2_)) {
            this._score = _loc2_;
        }
    }

    private completedEvent(): void {
        if (this.m_mustBeInsideBase && GLOBAL.isAtHome() != true) {
            return;
        }
        if (Boolean(this._rewardMessage) && !this._rewardMessage.hasBeenSeen) {
            POPUPS.Push(new FrontPageGraphic(this._rewardMessage));
            this._rewardMessage.viewed();
        }
        this.onEventComplete();
    }

    public update(): void {
    }

    public get priority(): int {
        return this._priority;
    }

    public get startDate(): number {
        if (!this._dates) {
            return 0;
        }
        return as3.vget(this._dates, 0);
    }

    public setStartDate(param1: number): void {
        this._dates = Vector.from([param1, param1 + this._duration], Number);
    }

    public get timeUntilNextDate(): number {
        let _loc1_: number = NaN;
        if (this.hasEventEnded) {
            _loc1_ = this.endDate + ReplayableEventHandler.k_DURATION_STORE_IS_OPEN_AFTER_EVENT;
        } else if (this.hasEventStarted) {
            _loc1_ = this.endDate;
        } else {
            _loc1_ = this.startDate;
        }
        return _loc1_ - ReplayableEventHandler.currentTime;
    }

    public get titleImage(): string {
        return this._titleImage;
    }

    public get eventStoreTitleImage(): string {
        return this._eventStoreTitleImage;
    }

    public get imageURL(): string {
        return this._imageURL;
    }

    public get id(): uint {
        return this._id;
    }

    public get score(): number {
        return this._score;
    }

    public get rewards(): Vector<ReplayableEventQuota> {
        return this._quotas;
    }

    public get maxScore(): number {
        return this._maxScore;
    }

    public get isLive(): boolean {
        return Boolean(this._originalStartDate) && (ReplayableEventHandler.currentTime >= this._originalStartDate - ReplayableEventHandler.DURATION_UNTIL_EVENT_STARTS && ReplayableEventHandler.currentTime <= this._originalStartDate + this._duration);
    }
}
