import { ASObject, int } from "as3";

export class EnumBaseRelationship extends ASObject {
    public static readonly k_RELATIONSHIP_SELF: int = 0;

    public static readonly k_RELATIONSHIP_ENEMY: int = 1;

    public static readonly k_RELATIONSHIP_ALLY: int = 2;

    public static readonly k_RELATIONSHIP_NEUTRAL: int = 3;

    public static readonly k_RELATIONSHIP_NONE: int = 7;

    public $ctor(): void {
        super.$ctor();
    }
}
