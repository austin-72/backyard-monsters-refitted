import * as as3 from "as3";
import { ASObject, int } from "as3";
import { SharedObject } from "flash/net";

/**
 * Inferno-only: the accounts that have logged in on this computer, for the login page's account list.
 * Only the email and the player name are kept (in the game's local data, "bymr_data"), never a
 * password: picking an account fills in the email and the player types the password.
 */
export class IoSavedAccounts extends ASObject {
    public static readonly MAX: int = 5;

    private static store(): SharedObject {
        try {
            return SharedObject.getLocal("bymr_data", "/");
        } catch (e) {
        }
        return null;
    }

    /** Most recently used first: [{email, name}]. */
    public static list(): any[] {
        let so: SharedObject = IoSavedAccounts.store();
        let saved: any[] = so && as3.is(so.data.ioAccounts, Array) ? as3.as(so.data.ioAccounts, Array) : [];
        let clean: any[] = [];
        for (let entry of as3.values(saved)) {
            if (entry && entry.email) {
                clean.push({ "email": String(entry.email), "name": entry.name ? String(entry.name) : "" });
            }
        }
        return clean;
    }

    public static remember(email: string, name: string): void {
        let so: SharedObject = IoSavedAccounts.store();
        if (!so || !email) {
            return;
        }
        let key: string = email.toLowerCase();
        let next: any[] = [{ "email": email, "name": name || "" }];
        for (let entry of as3.values(IoSavedAccounts.list())) {
            if (String(entry.email).toLowerCase() != key && next.length < IoSavedAccounts.MAX) {
                next.push(entry);
            }
        }
        try {
            so.data.ioAccounts = next;
            so.flush();
        } catch (e) {
        }
    }

    public static forget(email: string): void {
        let so: SharedObject = IoSavedAccounts.store();
        if (!so) {
            return;
        }
        let key: string = email.toLowerCase();
        let next: any[] = [];
        for (let entry of as3.values(IoSavedAccounts.list())) {
            if (String(entry.email).toLowerCase() != key) {
                next.push(entry);
            }
        }
        try {
            so.data.ioAccounts = next;
            so.flush();
        } catch (e) {
        }
    }
}
