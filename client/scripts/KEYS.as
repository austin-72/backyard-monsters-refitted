package {
    import flash.events.Event;
    import flash.events.EventDispatcher;
    import flash.events.IOErrorEvent;
    import flash.events.SecurityErrorEvent;
    import flash.net.URLLoader;
    import flash.net.URLRequest;

    public class KEYS {

        public static var _setup:Boolean = false;

        public static var _storageURL:String = "";

        public static var languageFileJson:Object;

        public static var supportedLanguagesJson:Array;

        private static var dispatcher:EventDispatcher = new EventDispatcher();

        public static var LANGUAGE_FILE_LOADED:String = "languageFileLoaded";

        public function KEYS() {
            super();
        }

        public static function Setup(language:String = "english"):void {
            _setup = true;
            var languageFile:URLLoader = new URLLoader();
            // (Inferno-only: a fresh copy each session. The file had no version in its name, so a browser or
            // proxy could keep an old copy for hours after new strings were deployed.)
            languageFile.load(new URLRequest(_storageURL + language + ".json?t=" + int(new Date().time / 60000)));
            languageFile.addEventListener(Event.COMPLETE, handleLangFileSucc);
            languageFile.addEventListener(IOErrorEvent.IO_ERROR, function(event:IOErrorEvent):void {
                });
        }

        public static function GetSupportedLanguages():void {
            var languages:URLLoader = new URLLoader();
            languages.load(new URLRequest(GLOBAL._apiURL + "supportedLangs"));
            languages.addEventListener(Event.COMPLETE, handleSupportedLangsSucc);
            languages.addEventListener(IOErrorEvent.IO_ERROR, function(event:IOErrorEvent):void {
                });
            languages.addEventListener(SecurityErrorEvent.SECURITY_ERROR, function(event:SecurityErrorEvent):void {
                });
        }

        private static function handleLangFileSucc(data:Event):void {
            var rawData:String = String(data.target.data);
            languageFileJson = JSON.parse(rawData);
            GLOBAL.textContentLoaded = true;
            GLOBAL.eventDispatcher.dispatchEvent(new Event(LANGUAGE_FILE_LOADED));
        }

        private static function handleSupportedLangsSucc(data:Event):void {
            var rawData:String = String(data.target.data);
            supportedLanguagesJson = JSON.parse(rawData) as Array;
            GLOBAL.supportedLangsLoaded = true;
        }

        // Processes the JSON language file from the server
        // Replaces #placeholders# within JSON with dynamic values
        /**
         * Inferno-only: the English words for the monsters added to the Inferno, used when the language file
         * doesn't have them (an old copy of it, or a language that lacks them), so they are never shown as
         * their keys. The files in server/public/gamestage/assets/ stay the ones to edit.
         */
        public static const IO_FALLBACK:Object = {
                "io_whats_different": "What's different?",
                "#m_clinkerjaw#": "Clinkerjaw",
                "#mi_Clinkerjaw#": "Clinkerjaw",
                "mi_Clinkerjaw_desc": "Furnace slag that got hungry. Its crust is packed with dormant Spurtz: crack Clinkerjaw open and two or three small ones hatch out and carry on the attack, and the magma it spills heals the monsters around it.",
                "mi_Clinkerjaw_stream": "#fname# unearthed Clinkerjaw in Backyard Monsters: Inferno.",
                "mi_Clinkerjaw_streambody": "Crack the crust, release the Spurtz.",
                "emerge_mondesc_mi_Clinkerjaw_desc": "A lumpy black rock with teeth. Something inside is glowing. <b>Favorite Target: Anything</b>",
                "#m_flickerfiend#": "Flickerfiend",
                "#mi_Flickerfiend#": "Flickerfiend",
                "mi_Flickerfiend_desc": "An imp made of heat-shimmer, too nimble to set off traps. After every third strike it vanishes for a second and reappears beside another building, and whatever was fired at it misses.",
                "mi_Flickerfiend_stream": "#fname# unearthed Flickerfiend in Backyard Monsters: Inferno.",
                "mi_Flickerfiend_streambody": "Look straight at it and it's already somewhere else.",
                "emerge_mondesc_mi_Flickerfiend_desc": "You can only see it out of the corner of your eye. <b>Favorite Target: Anything</b>",
                "#m_ashkarr#": "Ashkarr",
                "#mi_Ashkarr#": "Ashkarr",
                "mi_Ashkarr_desc": "A demon herald. Every few seconds she roars: her side's monsters nearby move faster, and the enemy's are rooted to the spot (they can still fight). Several Ashkarrs don't stack.",
                "mi_Ashkarr_stream": "#fname# unearthed Ashkarr in Backyard Monsters: Inferno.",
                "mi_Ashkarr_streambody": "Moloch's warlord. One roar, and the battlefield changes hands.",
                "emerge_mondesc_mi_Ashkarr_desc": "A tall ash-skinned herald crowned in burning horns, dragging a molten cleaver. <b>Favorite Target: Anything</b>",
                "#m_fusebug#": "Fusebug",
                "#mi_Fusebug#": "Fusebug",
                "mi_Fusebug_desc": "A beetle with a lit fuse for a tail. It runs at the nearest defense and blows itself up.",
                "mi_Fusebug_stream": "#fname# unearthed Fusebug in Backyard Monsters: Inferno.",
                "mi_Fusebug_streambody": "It only has to work once.",
                "emerge_mondesc_mi_Fusebug_desc": "A shiny black beetle with a sparking fuse on its back. <b>Favorite Target: Defenses</b>",
                "#m_emberghoul#": "Emberghoul",
                "#mi_Emberghoul#": "Emberghoul",
                "mi_Emberghoul_desc": "A gaunt furnace-ghoul that heals itself with every hit it lands.",
                "mi_Emberghoul_stream": "#fname# unearthed Emberghoul in Backyard Monsters: Inferno.",
                "mi_Emberghoul_streambody": "Every wound it gives, it takes for itself.",
                "emerge_mondesc_mi_Emberghoul_desc": "A skeletal ghoul with a grate in its chest and coals for a heart. <b>Favorite Target: Anything</b>",
                "attack_log_fusebug": "A Fusebug <b>blew up!</b>",
                "#b_wart#": "Wart",
                "pop_wart_msg2": "Mmmm, wart stew.",
                "pop_wart_msg3": "These things sprout like boils.",
                "pop_wart_msg4": "Just an old wart.",
                "pop_goldenwart_desc": "You've picked a golden wart worth #v1# Shiny. <b>Warts grow back every day.</b>",
                "io_cloc_err_upgrading": "Your #v1# is being upgraded. You can unlock monsters again once the upgrade is done.",
                "io_acad_err_upgrading": "Academy Upgrading",
                "base_builderr_ownyard1": "You can only place this in your own yard.",
                "base_uperr_stillfortifying": "Cannot upgrade yet, still fortifying!",
                "msg_sfactory_cantupgrade1": "You can not upgrade this building as it's currently building a Chaos Weapon.<br><br>First open it and cancel the weapon.",
                "msg_sfactory_cantupgrade2": "You can not upgrade this building as it currently has a Chaos Weapon.<br><br>First deploy the weapon.",
                "io_noshiny_body": "Shiny can't be bought here: collect your Daily Reward, pick golden warts and invite friends to earn more."
            };

        public static function Get(jsonKeyPath:String, placeholders:Object = null):String {
            if (languageFileJson == null || !languageFileJson.hasOwnProperty(jsonKeyPath)) {
                if (IO_FALLBACK.hasOwnProperty(jsonKeyPath)) {
                    return placeholders != null ? replacePlaceholders(IO_FALLBACK[jsonKeyPath], placeholders) : IO_FALLBACK[jsonKeyPath];
                }
            }
            if (languageFileJson == null) {
                return jsonKeyPath;
            }
            var jsonValue:Object = languageFileJson;
            if (jsonValue.hasOwnProperty(jsonKeyPath)) {
                var value:* = jsonValue[jsonKeyPath];
                if (value is String) {
                    var jsonString:String = value as String;
                    if (placeholders != null && jsonString != null) {
                        jsonString = replacePlaceholders(jsonString, placeholders);
                    }
                    if (jsonString != null && jsonString.indexOf("#cm#") >= 0) {
                        // Close Enough's minutes (bug report B4): what the server sets (io_price_closeenough)
                        jsonString = jsonString.split("#cm#").join(String(GLOBAL.INFERNO_ONLY ? Math.max(1, int(GLOBAL.ioCloseEnough / 60)) : 5));
                    }
                    return jsonString;
                }
                return String(value);
            }
            return jsonKeyPath;
        }

        private static function replacePlaceholders(input:String, placeholders:Object):String {
            for (var key:String in placeholders) {
                if (placeholders.hasOwnProperty(key)) {
                    var placeholder:String = "#" + key + "#";
                    input = input.split(placeholder).join(placeholders[key]);
                }
            }
            return input;
        }
    }
}
