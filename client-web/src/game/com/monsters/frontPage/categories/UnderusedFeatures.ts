import { Category } from "@game";

export class UnderusedFeatures extends Category {
    public $ctor(): void {
        super.$ctor();
        this.priority = 4;
        this.name = "Underused Feature Reminders";
    }
}
