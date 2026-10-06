import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { DisplayObject } from "flash/display";
import { Event } from "flash/events";
import { BASE, BUILDINGOPTIONS, BUILDINGS, Category, FrontPageEvent, FrontPageGraphic, FrontPageLibrary, GLOBAL, INFERNO_EMERGENCE_EVENT, LOGGER, News, POPUPS, TUTORIAL, com_monsters_frontPage_messages_Message as Message } from "@game";

export class FrontPageHandler extends ASObject {
    private static _graphic: FrontPageGraphic = null;

    private static _activeCategory: Category = null;

    private static _activeMessage: Message = null;

    private static _qualifiedCategories: Vector<Category> = null;

    private static _messagesSeen: Vector<Message> = null;

    private static _timeSpentViewing: number = NaN;

    private static _hasBeenSeenThisSession: boolean = false;

    private static _hasBeenSetupThisSession: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static get isVisible(): boolean {
        return FrontPageHandler._graphic !== null;
    }

    public static get hasBeenSeenThisSession(): boolean {
        return FrontPageHandler._hasBeenSeenThisSession;
    }

    public static get hasBeenSetupThisSession(): boolean {
        return FrontPageHandler._hasBeenSetupThisSession;
    }

    public static set activeCategory(param1: Category) {
        FrontPageHandler._activeCategory = param1;
        if (FrontPageHandler._graphic) {
            FrontPageHandler._graphic.updateCategories(FrontPageHandler._activeCategory, FrontPageHandler._qualifiedCategories);
            FrontPageHandler._graphic.mcNew.alpha = FrontPageHandler._activeCategory instanceof News ? 1 : 0;
            if (FrontPageHandler._qualifiedCategories.length > 1) {
                FrontPageHandler._graphic.bNext.visible = true;
                FrontPageHandler._graphic.bPrev.visible = true;
            }
        }
        FrontPageHandler.activeMessage = FrontPageHandler._activeCategory.getNextQualifiedMessage();
    }

    public static set activeMessage(param1: Message) {
        FrontPageHandler._activeMessage = param1;
        if (Boolean(FrontPageHandler._graphic) && Boolean(FrontPageHandler._activeMessage)) {
            FrontPageHandler._graphic.showMessage(param1);
            FrontPageHandler._messagesSeen.push(FrontPageHandler._activeMessage);
        }
    }

    public static interupt(): void {
        FrontPageHandler.closedPopup();
        POPUPS.Next();
    }

    public static initialize(param1: any = null): void {
        FrontPageLibrary.initialize();
        if (param1) {
            FrontPageHandler.setup(param1);
        }
    }

    public static showPopup(param1: boolean = false): boolean {
        let _loc2_: DisplayObject = null;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE.isOutpost || !TUTORIAL.hasFinished || FrontPageHandler._hasBeenSeenThisSession || !BASE.isMainYard || INFERNO_EMERGENCE_EVENT.isGoingToAttack) {
            return false;
        }
        if (FrontPageHandler._graphic && !param1 || !FrontPageHandler.updateQualifiedCategories()) {
            return false;
        }
        if (FrontPageHandler._graphic) {
            _loc2_ = FrontPageHandler._graphic;
            FrontPageHandler.closedPopup();
            POPUPS.Remove(_loc2_);
        }
        FrontPageHandler._graphic = new FrontPageGraphic();
        FrontPageHandler._graphic.addEventListener(FrontPageEvent.NEXT, FrontPageHandler.nextCategory);
        FrontPageHandler._graphic.addEventListener(FrontPageEvent.PREVIOUS, FrontPageHandler.previousCategory);
        FrontPageHandler._graphic.addEventListener(FrontPageEvent.CHANGE_CATEGORY, FrontPageHandler.changeCategory);
        FrontPageHandler._graphic.addEventListener(Event.REMOVED_FROM_STAGE, FrontPageHandler.closedPopup);
        FrontPageHandler._messagesSeen = new Vector<Message>(0, false, Message);
        FrontPageHandler._timeSpentViewing = GLOBAL.Timestamp();
        FrontPageHandler.activeCategory = as3.vget(FrontPageHandler._qualifiedCategories, 0);
        POPUPS.Push(FrontPageHandler._graphic, null, null, null, null, false, "wait");
        FrontPageHandler._hasBeenSeenThisSession = true;
        return true;
    }

    private static closedPopup(param1: Event = null): void {
        let _loc2_: number = NaN;
        FrontPageHandler._graphic.removeEventListener(FrontPageEvent.NEXT, FrontPageHandler.nextCategory);
        FrontPageHandler._graphic.removeEventListener(FrontPageEvent.PREVIOUS, FrontPageHandler.previousCategory);
        FrontPageHandler._graphic.removeEventListener(FrontPageEvent.CHANGE_CATEGORY, FrontPageHandler.changeCategory);
        FrontPageHandler._graphic.removeEventListener(Event.REMOVED_FROM_STAGE, FrontPageHandler.closedPopup);
        FrontPageHandler._graphic = null;
        if (param1) {
            _loc2_ = GLOBAL.Timestamp() - FrontPageHandler._timeSpentViewing;
            LOGGER.StatB({ "st1": "GTP", "st2": "time", "value": GLOBAL.Timestamp() - FrontPageHandler._timeSpentViewing }, "time_seen");
            FrontPageHandler.save();
        }
    }

    private static save(): void {
        let _loc2_: Message = null;
        let _loc1_: int = 0;
        while (_loc1_ < FrontPageHandler._messagesSeen.length) {
            _loc2_ = as3.vget(FrontPageHandler._messagesSeen, _loc1_);
            _loc2_.viewed();
            _loc2_.category.lastMessageSeen = _loc2_;
            LOGGER.StatB({ "st1": "GTP", "st2": "View" }, _loc2_.name);
            _loc1_++;
        }
        BASE.Save();
    }

    public static refresh(): void {
        if (FrontPageHandler.updateQualifiedCategories()) {
            FrontPageHandler.activeCategory = as3.vget(FrontPageHandler._qualifiedCategories, 0);
        }
    }

    protected static updateQualifiedCategories(): Vector<Category> {
        let _loc2_: Category = null;
        let _loc3_: Message = null;
        FrontPageHandler._qualifiedCategories = new Vector<Category>(0, false, Category);
        let _loc1_: int = 0;
        while (_loc1_ < FrontPageLibrary.CATEGORIES.length) {
            _loc2_ = as3.vget(FrontPageLibrary.CATEGORIES, _loc1_);
            _loc3_ = _loc2_.getNextQualifiedMessage();
            if (_loc3_) {
                FrontPageHandler._qualifiedCategories.push(_loc2_);
            }
            _loc1_++;
        }
        if (FrontPageHandler._qualifiedCategories.length == 0) {
            FrontPageHandler._qualifiedCategories = null;
        }
        return FrontPageHandler._qualifiedCategories;
    }

    protected static changeCategory(param1: FrontPageEvent): void {
        let _loc2_: Category = param1.category;
        if (_loc2_ == FrontPageHandler._activeCategory) {
            return;
        }
        if (!FrontPageHandler.updateQualifiedCategories()) {
            return;
        }
        FrontPageHandler.activeCategory = _loc2_;
    }

    protected static nextCategory(param1: FrontPageEvent): void {
        if (!FrontPageHandler.updateQualifiedCategories()) {
            return;
        }
        FrontPageHandler.activeCategory = as3.vget(FrontPageHandler._qualifiedCategories, FrontPageHandler.verifyIndex((FrontPageHandler._qualifiedCategories.indexOf(FrontPageHandler._activeCategory) + 1) | 0));
    }

    protected static previousCategory(param1: FrontPageEvent): void {
        if (!FrontPageHandler.updateQualifiedCategories()) {
            return;
        }
        FrontPageHandler.activeCategory = as3.vget(FrontPageHandler._qualifiedCategories, FrontPageHandler.verifyIndex((FrontPageHandler._qualifiedCategories.indexOf(FrontPageHandler._activeCategory) - 1) | 0));
    }

    private static verifyIndex(param1: int): int {
        if (param1 > FrontPageHandler._qualifiedCategories.length - 1) {
            param1 = 0;
        } else if (param1 < 0) {
            param1 = (FrontPageHandler._qualifiedCategories.length - 1) | 0;
        }
        return param1;
    }

    public static setup(param1: any): void {
        let _loc2_: string = null;
        let _loc3_: Category = null;
        FrontPageHandler._hasBeenSetupThisSession = true;
        for (_loc2_ in param1) {
            _loc3_ = FrontPageLibrary.getCategoryByName(_loc2_);
            if (_loc3_) {
                _loc3_.setup(param1[_loc2_]);
            }
        }
    }

    public static export(): any {
        let _loc1_: any = null;
        let _loc3_: Category = null;
        let _loc4_: any = null;
        let _loc2_: int = 0;
        while (_loc2_ < FrontPageLibrary.CATEGORIES.length) {
            _loc3_ = as3.vget(FrontPageLibrary.CATEGORIES, _loc2_);
            _loc4_ = _loc3_.export();
            if (_loc4_) {
                if (!_loc1_) {
                    _loc1_ = {};
                }
                _loc1_[_loc3_.name] = _loc4_;
            }
            _loc2_++;
        }
        return _loc1_;
    }

    public static closeAll(): void {
        if (POPUPS._open) {
            POPUPS.Next();
        }
        if (BUILDINGS._open) {
            BUILDINGS.Hide();
        }
        if (BUILDINGOPTIONS._open) {
            BUILDINGOPTIONS.Hide();
        }
    }
}
