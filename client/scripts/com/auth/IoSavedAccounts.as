package com.auth {
    import flash.net.SharedObject;

    /**
     * Inferno-only: the accounts that have logged in on this computer, for the login page's account list.
     * Only the email and the player name are kept (in the game's local data, "bymr_data"), never a
     * password: picking an account fills in the email and the player types the password.
     */
    public class IoSavedAccounts {

        public static const MAX:int = 5;

        private static function store():SharedObject {
            try {
                return SharedObject.getLocal("bymr_data", "/");
            }
            catch (e:Error) {
            }
            return null;
        }

        /** Most recently used first: [{email, name}]. */
        public static function list():Array {
            var so:SharedObject = store();
            var saved:Array = so && so.data.ioAccounts is Array ? so.data.ioAccounts as Array : [];
            var clean:Array = [];
            for each (var entry:Object in saved) {
                if (entry && entry.email) {
                    clean.push({"email": String(entry.email), "name": entry.name ? String(entry.name) : ""});
                }
            }
            return clean;
        }

        public static function remember(email:String, name:String):void {
            var so:SharedObject = store();
            if (!so || !email) {
                return;
            }
            var key:String = email.toLowerCase();
            var next:Array = [{"email": email, "name": name || ""}];
            for each (var entry:Object in list()) {
                if (String(entry.email).toLowerCase() != key && next.length < MAX) {
                    next.push(entry);
                }
            }
            try {
                so.data.ioAccounts = next;
                so.flush();
            }
            catch (e:Error) {
            }
        }

        public static function forget(email:String):void {
            var so:SharedObject = store();
            if (!so) {
                return;
            }
            var key:String = email.toLowerCase();
            var next:Array = [];
            for each (var entry:Object in list()) {
                if (String(entry.email).toLowerCase() != key) {
                    next.push(entry);
                }
            }
            try {
                so.data.ioAccounts = next;
                so.flush();
            }
            catch (e:Error) {
            }
        }
    }
}
