import { Category } from "@game";

export class News extends Category {
    public $ctor(): void {
        super.$ctor();
        this.priority = 2;
        this.name = "News";
        this._doesViewRepeatedly = false;
    }
}
