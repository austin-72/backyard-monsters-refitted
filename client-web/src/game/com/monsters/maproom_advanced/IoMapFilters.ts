import * as as3 from "as3";
import { ASObject, int } from "as3";

/**
 * Inferno-only: what the world map shows (the Filters button over the map, IoMapFiltersPopup). Kept for
 * the whole session, so the map opens the way it was left.
 */
export class IoMapFilters extends ASObject {
    /** Which owners' yards show, by IoMapUi relation (YOU ... NONE). */
    public static relations: any[] = [true, true, true, true, true, true];

    public static mains: boolean = true;

    public static outposts: boolean = true;

    public static range: boolean = true;

    public static bookmarks: boolean = true;

    /** Goes up with every change, so the world map knows to redraw. */
    public static version: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static changed(): void {
        ++IoMapFilters.version;
    }

    /** Whether a yard (a snapshot cell) passes the filters. */
    public static shows(relation: int, main: boolean): boolean {
        if (!IoMapFilters.relations[relation]) {
            return false;
        }
        return main ? IoMapFilters.mains : IoMapFilters.outposts;
    }

    /** Whether any yards are filtered out (the Filters button says so). */
    public static get active(): boolean {
        for (const $value of as3.values(IoMapFilters.relations)) {
            let on: boolean = Boolean($value);
            if (!on) {
                return true;
            }
        }
        return !IoMapFilters.mains || !IoMapFilters.outposts;
    }

    public static reset(): void {
        IoMapFilters.relations = [true, true, true, true, true, true];
        IoMapFilters.mains = IoMapFilters.outposts = true;
        IoMapFilters.changed();
    }
}
