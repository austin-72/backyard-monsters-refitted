import { Category } from "@game";

export class LongTerm extends Category {
    public $ctor(): void {
        super.$ctor();
        this.priority = 5;
        this.name = "Long-Term Projects";
    }
}
