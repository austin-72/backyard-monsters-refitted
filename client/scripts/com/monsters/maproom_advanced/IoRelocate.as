package com.monsters.maproom_advanced {
    import flash.events.IOErrorEvent;

    /**
     * Inferno-only: Relocate, from the map room's sidebar (MapRoomPopup). Warns first: the main yard is
     * placed somewhere new the way a new player is, bone, coal, sulfur and magma go to 0, and every outpost
     * goes back to the wild tribes. The server does it (POST base/relocate, relocateAnywhere.ts); the game
     * then starts again from the new place (reloaded), so the map, outposts and resources are all fresh.
     */
    public class IoRelocate {
        private static var _busy:Boolean = false;

        public static function Ask():void {
            if (_busy) {
                return;
            }
            var outposts:int = GLOBAL._mapOutpost ? int(GLOBAL._mapOutpost.length) : 0;
            var lost:String = outposts == 0 ? "" : (outposts == 1 ? "your outpost returns" : "all " + outposts + " of your outposts return") + " to the wild tribes";
            GLOBAL.Message("<b>Relocate your yard?</b><br><br>"
                + "Your main yard will be moved to a new place on the map, the way a new player is placed.<br><br>"
                + "<b>Everything you have out there is lost:</b> your Bone, Coal, Sulfur and Magma go to 0"
                + (lost ? ", and " + lost : "") + ".<br><br>This can't be undone.",
                "Relocate", Go);
        }

        private static function Go():void {
            if (_busy) {
                return;
            }
            _busy = true;
            PLEASEWAIT.Show(KEYS.Get("wait_relocating"));
            new URLLoaderApi().load(GLOBAL._baseURL + "relocate", [["confirm", "1"]], Done, Failed);
        }

        private static function Done(data:Object):void {
            PLEASEWAIT.Hide();
            if (data.error != 0) {
                _busy = false;
                GLOBAL.Message(String(data.error));
                return;
            }
            var where:String = data.coords && data.coords.length == 2 ? " to " + int(data.coords[0]) + ", " + int(data.coords[1]) : "";
            // Stopped until it starts again from the new place: nothing more is saved from the old one.
            GLOBAL.Halt();
            GLOBAL.Message("<b>Your yard has been relocated" + where + ".</b><br><br>The game starts again from there now.", "OK", Reload);
        }

        private static function Reload():void {
            GAME.ioReload(true);
        }

        private static function Failed(e:IOErrorEvent):void {
            _busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message("The relocation could not be sent. Please try again.");
        }
    }
}
