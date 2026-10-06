import { TintPlugin } from "@game";

export class RemoveTintPlugin extends TintPlugin {
    public static readonly VERSION: number = 1.01;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "removeTint";
    }
}
