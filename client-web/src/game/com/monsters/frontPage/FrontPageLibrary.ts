import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BuildTree_01_SniperCannonTowers, BuildTree_02_RadioTower, BuildTree_03_MonsterLocker, BuildTree_04_BoobyTraps, BuildTree_05_Blocks, BuildTree_06_Catapult, BuildTree_07_StoneBlocks, BuildTree_08_MonsterAcademy, BuildTree_09_HCC, BuildTree_10_YardPlanner, BuildTree_11_MonsterJuicer, BuildTree_12_MonsterBunker, BuildTree_13_MonsterBaiter, BuildTree_14_TeslaTower, BuildTree_15_LaserTower, BuildTree_16_AerialTower, BuildTree_18_MetalBlocks, BuildTree_19_ChampionChamber, Category, LongTerm, News, News01MagmaTower, News02InfernoYardExpansion, News03Vorg, News04Slimeattikus, News05YardPlanner2, News06TownHallLevel10, ProTips, Promo01DaveClub, Promo02DaveClub, Promo03RecapturedGorgo, Promo04RecapturedDrull, Promo05RecapturedFomor, Promo06RecapturedKorath, Promotions, ReplayableEventsCategory, Underused01MonsterLocker, Underused02Academy, UnderusedFeatures, WhatsAvailable, com_monsters_frontPage_messages_Message as Message } from "@game";

export class FrontPageLibrary extends ASObject {
    public static NEWS: Category = null;

    public static PROMOTIONS: Category = null;

    public static WHATS_AVAILABLE: Category = null;

    public static UNDERUSED_FEATURES: Category = null;

    public static LONG_TERM: Category = null;

    public static PRO_TIPS: Category = null;

    public static EVENTS: Category = null;

    public static CATEGORIES: Vector<Category> = new Vector<Category>(0, false, Category);

    public $ctor(): void {
        super.$ctor();
    }

    public static initialize(): void {
        FrontPageLibrary.addCategories();
        FrontPageLibrary.addMessages();
    }

    public static addMessages(): void {
        FrontPageLibrary.NEWS.addMessage(new News01MagmaTower());
        FrontPageLibrary.NEWS.addMessage(new News02InfernoYardExpansion());
        FrontPageLibrary.NEWS.addMessage(new News03Vorg());
        FrontPageLibrary.NEWS.addMessage(new News04Slimeattikus());
        FrontPageLibrary.NEWS.addMessage(new News05YardPlanner2());
        FrontPageLibrary.NEWS.addMessage(new News06TownHallLevel10());
        // PROMOTIONS.addMessage(new Maproom3OptInPopup()); Disable Map Room 3 popups
        FrontPageLibrary.PROMOTIONS.addMessage(new Promo01DaveClub());
        FrontPageLibrary.PROMOTIONS.addMessage(new Promo02DaveClub());
        FrontPageLibrary.PROMOTIONS.addMessage(new Promo03RecapturedGorgo());
        FrontPageLibrary.PROMOTIONS.addMessage(new Promo04RecapturedDrull());
        FrontPageLibrary.PROMOTIONS.addMessage(new Promo05RecapturedFomor());
        FrontPageLibrary.PROMOTIONS.addMessage(new Promo06RecapturedKorath());
        FrontPageLibrary.UNDERUSED_FEATURES.addMessage(new Underused01MonsterLocker());
        FrontPageLibrary.UNDERUSED_FEATURES.addMessage(new Underused02Academy());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_01_SniperCannonTowers());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_02_RadioTower());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_03_MonsterLocker());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_04_BoobyTraps());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_05_Blocks());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_06_Catapult());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_07_StoneBlocks());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_08_MonsterAcademy());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_09_HCC());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_10_YardPlanner());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_11_MonsterJuicer());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_12_MonsterBunker());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_13_MonsterBaiter());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_14_TeslaTower());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_15_LaserTower());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_16_AerialTower());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_18_MetalBlocks());
        FrontPageLibrary.WHATS_AVAILABLE.addMessage(new BuildTree_19_ChampionChamber());
    }

    public static addCategories(): void {
        FrontPageLibrary.NEWS = new News();
        FrontPageLibrary.PROMOTIONS = new Promotions();
        FrontPageLibrary.WHATS_AVAILABLE = new WhatsAvailable();
        FrontPageLibrary.UNDERUSED_FEATURES = new UnderusedFeatures();
        FrontPageLibrary.LONG_TERM = new LongTerm();
        FrontPageLibrary.PRO_TIPS = new ProTips();
        FrontPageLibrary.EVENTS = new ReplayableEventsCategory();
        FrontPageLibrary.CATEGORIES = Vector.from([FrontPageLibrary.EVENTS, FrontPageLibrary.PROMOTIONS, FrontPageLibrary.NEWS, FrontPageLibrary.WHATS_AVAILABLE, FrontPageLibrary.UNDERUSED_FEATURES, FrontPageLibrary.LONG_TERM, FrontPageLibrary.PRO_TIPS], Category);
    }

    public static getCategoryByName(param1: string): Category {
        let _loc3_: Category = null;
        let _loc2_: int = 0;
        while (_loc2_ < FrontPageLibrary.CATEGORIES.length) {
            _loc3_ = as3.vget(FrontPageLibrary.CATEGORIES, _loc2_);
            if (_loc3_.name == param1) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }

    public static getMessageByName(param1: string): Message {
        let _loc3_: Category = null;
        let _loc4_: Message = null;
        let _loc2_: int = 0;
        while (_loc2_ < FrontPageLibrary.CATEGORIES.length) {
            _loc3_ = as3.vget(FrontPageLibrary.CATEGORIES, _loc2_);
            _loc4_ = _loc3_.getMessageByName(param1);
            if (_loc4_) {
                return _loc4_;
            }
            _loc2_++;
        }
        return null;
    }
}
