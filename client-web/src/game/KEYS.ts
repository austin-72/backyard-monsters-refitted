import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, EventDispatcher, IOErrorEvent, SecurityErrorEvent } from "flash/events";
import { URLLoader, URLRequest } from "flash/net";
import { GLOBAL } from "@game";

export class KEYS extends ASObject {
    public static _setup: boolean = false;

    public static _storageURL: string = "";

    public static languageFileJson: any = null;

    public static supportedLanguagesJson: any[] = null;

    private static dispatcher: EventDispatcher = new EventDispatcher();

    public static LANGUAGE_FILE_LOADED: string = "languageFileLoaded";

    // Processes the JSON language file from the server
    // Replaces #placeholders# within JSON with dynamic values
    /**
     * Inferno-only: the English words for the monsters added to the Inferno, used when the language file
     * doesn't have them (an old copy of it, or a language that lacks them), so they are never shown as
     * their keys. The files in server/public/gamestage/assets/ stay the ones to edit.
     */
    public static readonly IO_FALLBACK: any = { "io_whats_different": "What's different?", "#m_clinkerjaw#": "Clinkerjaw", "#mi_Clinkerjaw#": "Clinkerjaw", "mi_Clinkerjaw_desc": "Furnace slag that got hungry. Its crust is packed with dormant Spurtz: crack Clinkerjaw open and two or three small ones hatch out and carry on the attack, and the magma it spills heals the monsters around it.", "mi_Clinkerjaw_stream": "#fname# unearthed Clinkerjaw in Backyard Monsters: Inferno.", "mi_Clinkerjaw_streambody": "Crack the crust, release the Spurtz.", "emerge_mondesc_mi_Clinkerjaw_desc": "A lumpy black rock with teeth. Something inside is glowing. <b>Favorite Target: Anything</b>", "#m_flickerfiend#": "Flickerfiend", "#mi_Flickerfiend#": "Flickerfiend", "mi_Flickerfiend_desc": "An imp made of heat-shimmer, too nimble to set off traps. After every third strike it vanishes for a second and reappears beside another building, and whatever was fired at it misses.", "mi_Flickerfiend_stream": "#fname# unearthed Flickerfiend in Backyard Monsters: Inferno.", "mi_Flickerfiend_streambody": "Look straight at it and it's already somewhere else.", "emerge_mondesc_mi_Flickerfiend_desc": "You can only see it out of the corner of your eye. <b>Favorite Target: Anything</b>", "#m_ashkarr#": "Ashkarr", "#mi_Ashkarr#": "Ashkarr", "mi_Ashkarr_desc": "A demon herald. Every few seconds she roars: her side's monsters nearby move faster, and the enemy's are rooted to the spot (they can still fight). Several Ashkarrs don't stack.", "mi_Ashkarr_stream": "#fname# unearthed Ashkarr in Backyard Monsters: Inferno.", "mi_Ashkarr_streambody": "Moloch's warlord. One roar, and the battlefield changes hands.", "emerge_mondesc_mi_Ashkarr_desc": "A tall ash-skinned herald crowned in burning horns, dragging a molten cleaver. <b>Favorite Target: Anything</b>", "#m_fusebug#": "Fusebug", "#mi_Fusebug#": "Fusebug", "mi_Fusebug_desc": "A beetle with a lit fuse for a tail. It runs at the nearest defense and blows itself up.", "mi_Fusebug_stream": "#fname# unearthed Fusebug in Backyard Monsters: Inferno.", "mi_Fusebug_streambody": "It only has to work once.", "emerge_mondesc_mi_Fusebug_desc": "A shiny black beetle with a sparking fuse on its back. <b>Favorite Target: Defenses</b>", "#m_emberghoul#": "Emberghoul", "#mi_Emberghoul#": "Emberghoul", "mi_Emberghoul_desc": "A gaunt furnace-ghoul that heals itself with every hit it lands.", "mi_Emberghoul_stream": "#fname# unearthed Emberghoul in Backyard Monsters: Inferno.", "mi_Emberghoul_streambody": "Every wound it gives, it takes for itself.", "emerge_mondesc_mi_Emberghoul_desc": "A skeletal ghoul with a grate in its chest and coals for a heart. <b>Favorite Target: Anything</b>", "attack_log_fusebug": "A Fusebug <b>blew up!</b>", "#b_wart#": "Wart", "pop_wart_msg2": "Mmmm, wart stew.", "pop_wart_msg3": "These things sprout like boils.", "pop_wart_msg4": "Just an old wart.", "pop_goldenwart_desc": "You've picked a golden wart worth #v1# Shiny. <b>Warts grow back every day.</b>", "io_cloc_err_upgrading": "Your #v1# is being upgraded. You can unlock monsters again once the upgrade is done.", "io_acad_err_upgrading": "Academy Upgrading", "base_builderr_ownyard1": "You can only place this in your own yard.", "base_uperr_stillfortifying": "Cannot upgrade yet, still fortifying!", "msg_sfactory_cantupgrade1": "You can not upgrade this building as it's currently building a Chaos Weapon.<br><br>First open it and cancel the weapon.", "msg_sfactory_cantupgrade2": "You can not upgrade this building as it currently has a Chaos Weapon.<br><br>First deploy the weapon.", "io_noshiny_body": "Shiny can't be bought here: collect your Daily Reward, pick golden warts and invite friends to earn more." };

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(language: string = "english"): void {
        KEYS._setup = true;
        let languageFile: URLLoader = new URLLoader();
        // (Inferno-only: a fresh copy each session. The file had no version in its name, so a browser or
        // proxy could keep an old copy for hours after new strings were deployed.)
        languageFile.load(new URLRequest(KEYS._storageURL + language + ".json?t=" + ((new Date().getTime() / 60000) | 0)));
        languageFile.addEventListener(Event.COMPLETE, KEYS.handleLangFileSucc);
        languageFile.addEventListener(IOErrorEvent.IO_ERROR, (event: IOErrorEvent): void => {
        });
    }

    public static GetSupportedLanguages(): void {
        let languages: URLLoader = new URLLoader();
        languages.load(new URLRequest(GLOBAL._apiURL + "supportedLangs"));
        languages.addEventListener(Event.COMPLETE, KEYS.handleSupportedLangsSucc);
        languages.addEventListener(IOErrorEvent.IO_ERROR, (event: IOErrorEvent): void => {
        });
        languages.addEventListener(SecurityErrorEvent.SECURITY_ERROR, (event: SecurityErrorEvent): void => {
        });
    }

    private static handleLangFileSucc(data: Event): void {
        let rawData: string = String(data.target.data);
        KEYS.languageFileJson = JSON.parse(rawData);
        GLOBAL.textContentLoaded = true;
        GLOBAL.eventDispatcher.dispatchEvent(new Event(KEYS.LANGUAGE_FILE_LOADED));
    }

    private static handleSupportedLangsSucc(data: Event): void {
        let rawData: string = String(data.target.data);
        KEYS.supportedLanguagesJson = as3.as(JSON.parse(rawData), Array);
        GLOBAL.supportedLangsLoaded = true;
    }

    public static Get(jsonKeyPath: string, placeholders: any = null): string {
        if (KEYS.languageFileJson == null || !KEYS.languageFileJson.hasOwnProperty(jsonKeyPath)) {
            if (KEYS.IO_FALLBACK.hasOwnProperty(jsonKeyPath)) {
                return as3.str(placeholders != null ? KEYS.replacePlaceholders(as3.str(KEYS.IO_FALLBACK[jsonKeyPath]), placeholders) : KEYS.IO_FALLBACK[jsonKeyPath]);
            }
        }
        if (KEYS.languageFileJson == null) {
            return jsonKeyPath;
        }
        let jsonValue: any = KEYS.languageFileJson;
        if (jsonValue.hasOwnProperty(jsonKeyPath)) {
            let value: any = jsonValue[jsonKeyPath];
            if (as3.is(value, String)) {
                let jsonString: string = as3.as(value, String);
                if (placeholders != null && jsonString != null) {
                    jsonString = KEYS.replacePlaceholders(jsonString, placeholders);
                }
                if (jsonString != null && jsonString.indexOf("#cm#") >= 0) {
                    // Close Enough's minutes (bug report B4): what the server sets (io_price_closeenough)
                    jsonString = jsonString.split("#cm#").join(String(GLOBAL.INFERNO_ONLY ? Math.max(1, (GLOBAL.ioCloseEnough / 60) | 0) : 5));
                }
                return jsonString;
            }
            return String(value);
        }
        return jsonKeyPath;
    }

    private static replacePlaceholders(input: string, placeholders: any): string {
        for (let key in placeholders) {
            if (placeholders.hasOwnProperty(key)) {
                let placeholder: string = "#" + key + "#";
                input = input.split(placeholder).join(placeholders[key]);
            }
        }
        return input;
    }
}
