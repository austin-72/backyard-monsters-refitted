package com.monsters.maproom_advanced {

    /**
     * Inferno-only: what the world map shows (the Filters button over the map, IoMapFiltersPopup). Kept for
     * the whole session, so the map opens the way it was left.
     */
    public class IoMapFilters {

        /** Which owners' yards show, by IoMapUi relation (YOU ... NONE). */
        public static var relations:Array = [true, true, true, true, true, true];

        public static var mains:Boolean = true;

        public static var outposts:Boolean = true;

        public static var range:Boolean = true;

        public static var bookmarks:Boolean = true;

        /** Goes up with every change, so the world map knows to redraw. */
        public static var version:int = 0;

        public function IoMapFilters() {
            super();
        }

        public static function changed():void {
            ++version;
        }

        /** Whether a yard (a snapshot cell) passes the filters. */
        public static function shows(relation:int, main:Boolean):Boolean {
            if (!relations[relation]) {
                return false;
            }
            return main ? mains : outposts;
        }

        /** Whether any yards are filtered out (the Filters button says so). */
        public static function get active():Boolean {
            for each (var on:Boolean in relations) {
                if (!on) {
                    return true;
                }
            }
            return !mains || !outposts;
        }

        public static function reset():void {
            relations = [true, true, true, true, true, true];
            mains = outposts = true;
            changed();
        }
    }
}
