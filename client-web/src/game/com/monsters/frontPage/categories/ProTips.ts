import { Category } from "@game";

export class ProTips extends Category {
    public $ctor(): void {
        super.$ctor();
        this.priority = 6;
        this.name = "Pro-Tips";
    }
}
