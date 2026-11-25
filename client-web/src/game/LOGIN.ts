import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, IOErrorEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Capabilities } from "flash/system";
import { AuthForm, BASE, BYMDevConfig, EnumYardType, GAME, GLOBAL, IoSavedAccounts, IoShinyLock, KEYS, LOGGER, MapRoomManager, PLEASEWAIT, POPUPS, Player, RADIO, SecNum, URLLoaderApi, md5, MESSAGE } from "@game";

export class LOGIN extends ASObject {
    public static _playerID: int = 0;

    public static _playerName: string = null;

    public static _playerLastName: string = null;

    public static _playerPic: string = null;

    public static _timePlayed: int = 0;

    public static _playerLevel: int = 0;

    public static _email: string = null;

    public static _proxymail: string = null;

    public static _settings: any = null;

    public static _digits: any[] = null;

    public static _sumdigit: int = 0;

    public static _inferno: int = 0;

    public static authForm: AuthForm = null;

    public static token: string = null;

    /**
     * Inferno-only: a login is on its way (or has succeeded and the game is loading). The login button
     * clicked again (or Enter pressed twice) sent a second login: two yards were loaded at once and the first
     * one's bottom bar was taken down under it (bug reports #56, #58).
     */
    private static _ioLoginPending: boolean = false;

    /** (Inferno-only, QoL #511) the address of an account made just now, for the welcome */
    public static ioNewAccountEmail: string = null;

    /** (Inferno-only, QoL #515) a login is waiting for the server's answer */
    public static get ioLoginPending(): boolean {
        return LOGIN._ioLoginPending;
    }

    /** Inferno-only (QoL #203): sign-ins tried again by themselves after no answer (3 at most, then the form). */
    private static _ioRetries: int = 0;

    /**
     * Inferno-only (QoL #516): the sign-in form's "Keep me signed in on this computer (14 days)", for a sign-in with
     * the password (AuthForm sets it before it signs in). Unticked, the login lasts until the browser closes: the
     * server's saved-login cookie is a session cookie, the account isn't added to the login page's names, and the
     * browser keeps only this tab's session (sessionStorage), not "the account signed in last" (localStorage).
     */
    public static ioKeep: boolean = true;

    /**
     * Inferno-only (QoL #516): this tab's login is one not to keep (sessionStorage, so it goes with the browser): a
     * reload, or a sign-in again by itself, keeps it that way. null clears it.
     */
    public static ioTabNoKeep(value: boolean = undefined): boolean {
        try {
            let store: any = (globalThis as any).sessionStorage;
            if (!store) {
                return false;
            }
            if (value === true) {
                store.setItem("bymr_tab_nokeep", "1");
            } else if (value === false || value === null) {
                store.removeItem("bymr_tab_nokeep");
            }
            return store.getItem("bymr_tab_nokeep") == "1";
        } catch (e) {
        }
        return false;
    }

    /** QoL #516: whether the sign-in `authInfo` is kept on this computer (14 days) or only until the browser closes. */
    private static ioKeepFor(authInfo: any[]): boolean {
        if (LOGIN.ioHasPassword(authInfo)) {
            return LOGIN.ioKeep;
        }
        return !LOGIN.ioTabNoKeep();
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Login(): void {
        // Inferno-only (13 October): no login handed over, but the account signed in last in this browser: its
        // saved login (an HttpOnly cookie the server set; LOGIN.ioSignInSaved)
        LOGIN._ioAuto = GLOBAL.INFERNO_ONLY && !GAME.token ? LOGIN.ioAutoEmail() : null;
        if (GAME.token || LOGIN._ioAuto) {
            PLEASEWAIT.Show("Logging in...");
            GLOBAL.eventDispatcher.addEventListener(KEYS.LANGUAGE_FILE_LOADED, LOGIN.onLanguageLoaded);
            GLOBAL.LanguageSetup();
        } else {
            LOGIN.authForm = new AuthForm();
            GLOBAL._layerTop.addChild(LOGIN.authForm);
        }
    }

    private static onLanguageLoaded(event: Event): void {
        GLOBAL.eventDispatcher.removeEventListener(KEYS.LANGUAGE_FILE_LOADED, LOGIN.onLanguageLoaded);

        let authInfo: any[] = GAME.token || !LOGIN._ioAuto ? [["token", GAME.token || GAME.sharedObj.data.token]] : [["email", LOGIN._ioAuto], ["saved", "1"]];
        LOGIN.AuthenticateUser(authInfo);
    }

    private static _ioAuto: string = null;

    private static _ioUnloadOn: boolean = false;

    /**
     * Inferno-only (13 October): the tab closed or left for another page: its play session ended on the way out
     * (a request the browser finishes after the page is gone), so opening the game again a moment later asks
     * nothing about "another device". A page only hidden or kept for coming back (a phone switching apps, the
     * back/forward cache) stays playing.
     */
    private static ioWatchUnload(): void {
        let w: any = globalThis as any;
        if (LOGIN._ioUnloadOn || !w || !w.addEventListener || !w.fetch) {
            return;
        }
        LOGIN._ioUnloadOn = true;
        // (QoL #212: a phone's tab put away may never be closed properly: its waiting save goes when it is hidden)
        try {
            w.document.addEventListener("visibilitychange", (): void => {
                if (w.document.visibilityState == "hidden" && LOGIN.token && !GLOBAL.ioSessionIsOver) {
                    try {
                        BASE.ioSaveOnClose(false);
                    } catch (err) {
                    }
                }
            });
        } catch (err) {
        }
        w.addEventListener("pagehide", (e: any): void => {
            if ((e && e.persisted) || !LOGIN.token || GLOBAL.ioSessionIsOver) {
                return;
            }
            // (QoL #212: a save still waiting goes now, and the server signs this game out after it; the sign-out
            // here could beat it to the server and the save be refused. One already on its way: no sign-out)
            let saving: boolean = false;
            try {
                saving = BASE.ioSaveOnClose();
            } catch (err) {
            }
            if (saving) {
                return;
            }
            try {
                w.fetch(GLOBAL._apiURL + "player/logout", { method: "POST", keepalive: true, credentials: "same-origin", headers: { "Authorization": "Bearer " + LOGIN.token, "Content-Type": "application/x-www-form-urlencoded" }, body: "v=1" });
            } catch (err) {
            }
        });
    }

    /** Inferno-only: the account to sign in by itself at the next visit (the one signed in last), or null. */
    public static ioAutoEmail(): string {
        try {
            let email: any = GAME.sharedObj ? GAME.sharedObj.data.ioAutoEmail : null;
            return email ? String(email) : null;
        } catch (e) {
        }
        return null;
    }

    /**
     * Inferno-only (13 October): this tab's play session, kept in the tab only (sessionStorage), so a reload of
     * the same tab signs in as itself without asking about "another device". A new tab or window has none.
     */
    public static ioTabReloaded(): boolean {
        // (a duplicated or restored tab copies sessionStorage too, but is not a reload: it signs in with the
        // saved login, and is asked about the tab it was copied from)
        try {
            let nav: any = (globalThis as any).performance.getEntriesByType("navigation")[0];
            return !!nav && nav.type == "reload";
        } catch (e) {
        }
        return false;
    }

    public static ioTabSession(value: string = undefined): string {
        try {
            let store: any = (globalThis as any).sessionStorage;
            if (!store) {
                return null;
            }
            if (value === null) {
                store.removeItem("bymr_tab_session");
            } else if (value !== undefined) {
                store.setItem("bymr_tab_session", value);
            }
            return store.getItem("bymr_tab_session");
        } catch (e) {
        }
        return null;
    }

    /**
     * Inferno-only (13 October): the account this tab plays (sessionStorage): a reload whose tab session was ended
     * (its closing page signs it out) signs this tab's account in again, not the browser's last one (another tab
     * may have signed in as someone else meanwhile).
     */
    public static ioTabEmail(value: string = undefined): string {
        try {
            let store: any = (globalThis as any).sessionStorage;
            if (!store) {
                return null;
            }
            if (value === null) {
                store.removeItem("bymr_tab_email");
            } else if (value) {
                store.setItem("bymr_tab_email", value);
            }
            return store.getItem("bymr_tab_email");
        } catch (e) {
        }
        return null;
    }

    /** Inferno-only: signs in with this browser's saved login for `email` (a name picked on the login page). */
    public static ioSignInSaved(email: string): void {
        if (!email || LOGIN._ioLoginPending) {
            return;
        }
        PLEASEWAIT.Show(LOGIN.ioLoggingIn());
        LOGIN.AuthenticateUser([["email", email], ["saved", "1"]]);
    }

    /** Inferno-only: a name forgotten on the login page: its saved login ended on the server, its cookie gone. */
    public static ioForgetSaved(email: string): void {
        IoSavedAccounts.forget(email);
        try {
            if (LOGIN.ioAutoEmail() && LOGIN.ioAutoEmail().toLowerCase() == email.toLowerCase()) {
                delete GAME.sharedObj.data.ioAutoEmail;
                GAME.sharedObj.flush();
            }
        } catch (e) {
        }
        new URLLoaderApi().load(GLOBAL._apiURL + "player/forgetlogin", [["email", email]], (r: any): void => {
        }, (e: any = null): void => {
        });
    }

    /**
     * Inferno-only (QoL #516): "Sign out and forget this computer" (the page's settings, Account): this browser's saved
     * login for the account ended (on the server and its cookie), its name taken off the login page, and then Switch
     * account (the yard saved, signed out, the login page).
     */
    public static ioSignOutAndForget(): void {
        let email: string = LOGIN._email;
        if (!email || !LOGIN.token) {
            return;
        }
        PLEASEWAIT.Show(KEYS.Get("io_acc_signing_out"));
        let done: boolean = false;
        let go: Function = (r: any = null): void => {
            if (done) {
                return;
            }
            done = true;
            LOGIN.ioTabEmail(null);
            LOGIN.ioTabNoKeep(null);
            GAME.ioSwitchAccount();
        };
        IoSavedAccounts.forget(email);
        try {
            if (LOGIN.ioAutoEmail() && LOGIN.ioAutoEmail().toLowerCase() == email.toLowerCase()) {
                delete GAME.sharedObj.data.ioAutoEmail;
                GAME.sharedObj.flush();
            }
        } catch (e) {
        }
        // (the saved login ended first, then the rest: at most 4 s waited for it)
        setTimeout(go, 4000);
        new URLLoaderApi().load(GLOBAL._apiURL + "player/forgetlogin", [["email", email]], go, go);
    }

    /**
     * Inferno-only (QoL #199): the account's email changed (the page's settings, Account): the server's new token for
     * this game, and the email wherever this browser keeps it (the login page's names, the account signing in by itself,
     * this tab's), the saved login having been made again for it by the server.
     */
    public static ioEmailChanged(oldEmail: string, newEmail: string, token: string): void {
        if (!newEmail || !token) {
            return;
        }
        LOGIN.token = token;
        LOGIN._email = newEmail;
        if (GLOBAL.player) {
            GLOBAL.player.email = newEmail;
        }
        let keep: boolean = !LOGIN.ioTabNoKeep();
        let was: boolean = false;
        for (let a of as3.values(IoSavedAccounts.list())) {
            if (oldEmail && String(a.email).toLowerCase() == oldEmail.toLowerCase()) {
                was = true;
            }
        }
        if (oldEmail) {
            IoSavedAccounts.forget(oldEmail);
        }
        if (keep && (was || LOGIN.ioAutoEmail())) {
            IoSavedAccounts.remember(newEmail, LOGIN._playerName || "");
        }
        LOGIN.ioSaveLogin(token, newEmail, keep);
    }

    /** Inferno-only (QoL #197): the account's name changed (the page's settings, Account), where this game keeps it. */
    public static ioNameChanged(name: string): void {
        if (!name) {
            return;
        }
        LOGIN._playerName = name;
        if (GLOBAL.player) {
            GLOBAL.player.name = name;
        }
        if (LOGIN._email) {
            for (let a of as3.values(IoSavedAccounts.list())) {
                if (String(a.email).toLowerCase() == LOGIN._email.toLowerCase()) {
                    IoSavedAccounts.remember(String(a.email), name);
                }
            }
        }
    }

    private static ioHasPassword(authInfo: any[]): boolean {
        for (let pair of as3.values(authInfo)) {
            if (pair && pair[0] == "password" && pair[1]) {
                return true;
            }
        }
        return false;
    }

    private static ioEmailOf(authInfo: any[]): string {
        for (let pair of as3.values(authInfo)) {
            if (pair && pair[0] == "email" && pair[1]) {
                return String(pair[1]);
            }
        }
        return null;
    }

    /** Inferno-only: the login page, left or opened, with `email` in and the password next. */
    private static ioShowForm(email: string): void {
        PLEASEWAIT.Hide();
        if (!LOGIN.authForm || !LOGIN.authForm.parent) {
            LOGIN.authForm = new AuthForm();
            GLOBAL._layerTop.addChild(LOGIN.authForm);
        }
        if (email) {
            LOGIN.authForm.ioUseEmail(email);
        }
    }

    /**
     * Inferno-only (13 October): the account is playing somewhere else right now (another device, or another tab
     * or window). Play here signs that one out (its next request is refused) and this one in; No leaves it
     * playing and this one on the login page. (No close button: the answer is one of the two.)
     */
    private static ioAskKick(serverData: any, authInfo: any[]): void {
        let email: string = LOGIN.ioEmailOf(authInfo) || (serverData.email ? String(serverData.email) : null);
        PLEASEWAIT.Hide();
        let ago: int = serverData.ioago | 0;
        // (QoL #235: in the player's language)
        let when: string = ago < 60 ? KEYS.Get("io_t3k_kick_justnow") : (ago < 120 ? KEYS.Get("io_t3k_kick_minute") : KEYS.Get("io_t3k_kick_minutes", { "v1": (ago / 60) | 0 }));
        let where: string = String(serverData.iowhere || KEYS.Get("io_t3k_kick_otherdevice")).replace(/[<>&"]/g, "");
        // (QoL #523: said when the other one is another tab of this same browser, whose unsaved changes go)
        let sameBrowser: boolean = !!serverData.iosamebrowser;
        let extra: string = sameBrowser ? "<br><br>" + KEYS.Get("io_t3k_kick_sametab") : "";
        let done: boolean = false;
        let m: MESSAGE = GLOBAL.Message(KEYS.Get("io_t3k_kick_ask", { "v1": where, "v2": when, "v3": extra }), KEYS.Get("io_t3k_kick_play"), (): void => {
            done = true;
            PLEASEWAIT.Show(LOGIN.ioLoggingIn());
            LOGIN.AuthenticateUser(authInfo.concat([["kick", "1"]]));
        }, null, KEYS.Get("btn_no"), (): void => {
            done = true;
            LOGIN.ioShowForm(email);
        }, null, 1, false);
        // (QoL #523: the keyboard: Enter plays here, Esc says No)
        let stage: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        if (m && stage) {
            let onKey: Function = null;
            onKey = (e: KeyboardEvent): void => {
                if (done || !m.parent) {
                    stage.removeEventListener(KeyboardEvent.KEY_DOWN, onKey);
                    return;
                }
                if (e.keyCode == 13 || e.keyCode == 27) {
                    stage.removeEventListener(KeyboardEvent.KEY_DOWN, onKey);
                    let b: any = e.keyCode == 13 ? m.bAction : m.bAction2;
                    if (b) {
                        b.dispatchEvent(new MouseEvent(MouseEvent.CLICK, true, false));
                    }
                }
            };
            stage.addEventListener(KeyboardEvent.KEY_DOWN, onKey);
        }
    }

    /** Inferno-only (QoL #235): "Logging in..." in the player's language (English until the language file is in). */
    private static ioLoggingIn(): string {
        return KEYS.languageFileJson != null ? KEYS.Get("io_t3k_logging_in") : "Logging in...";
    }

    /** Inferno-only: a login with the saved token only (no password sent with it). */
    private static ioIsTokenLogin(authInfo: any[]): boolean {
        let token: boolean = false;
        for (let pair of as3.values(authInfo)) {
            if (pair && pair[0] == "password") {
                return false;
            }
            if (pair && pair[0] == "token" && pair[1]) {
                token = true;
            }
        }
        return token;
    }

    /**
     * Inferno-only (12 October): keeps this login in the browser (the game's local data, "bymr_data"), so the
     * next visit logs in by itself (GAME.setLauncherVars), in the language chosen. The server takes the token only
     * from the browser it was made in (its key, an HttpOnly cookie; 13 October, was: the network it was made on).
     * Switching account forgets it (GAME.ioReloadGame).
     */
    public static ioSaveLogin(token: string, email: string = null, keep: boolean = true): void {
        if (!token || !GAME.sharedObj) {
            return;
        }
        // (13 October) the saved login itself is the server's HttpOnly cookie: this browser keeps only which account
        // signs in by itself, and this tab its play session (a reload of the tab is the same session)
        LOGIN.ioTabSession(token);
        LOGIN.ioTabEmail(email);
        LOGIN.ioWatchUnload();
        // (QoL #516: a login not to keep: this tab only, and the account doesn't sign in by itself at the next visit)
        LOGIN.ioTabNoKeep(!keep);
        try {
            delete GAME.sharedObj.data.token;
            if (email && keep) {
                GAME.sharedObj.data.ioAutoEmail = email;
            } else if (email && LOGIN.ioAutoEmail() && LOGIN.ioAutoEmail().toLowerCase() == email.toLowerCase()) {
                delete GAME.sharedObj.data.ioAutoEmail;
            }
            if (KEYS.ioLanguage) {
                GAME.sharedObj.data.language = KEYS.ioLanguage;
            }
            GAME.sharedObj.flush();
        } catch (e) {
        }
    }

    /** Inferno-only: forgets the saved login (refused, logged out). */
    public static ioForgetLogin(): void {
        GAME.token = null;
        try {
            if (GAME.sharedObj) {
                delete GAME.sharedObj.data.token;
                delete GAME.sharedObj.data.ioResumeToken;
                delete GAME.sharedObj.data.ioAutoEmail;
                GAME.sharedObj.flush();
            }
        } catch (e) {
        }
        LOGIN.ioTabSession(null);
        LOGIN.ioTabEmail(null);
    }

    /**
     * Inferno-only: the server refused the saved login (expired, replaced by a login elsewhere, or made on
     * another browser, or before 13 October another network): it is forgotten and the login page shown.
     */
    private static ioTokenRefused(error: string): void {
        // (13 October) the account signed in by itself has a saved login: that next (it asks first if the account
        // is playing somewhere else); the tab's or handed-over session is let go either way
        let auto: string = LOGIN.ioTabEmail() || LOGIN.ioAutoEmail();
        GAME.token = null;
        LOGIN.ioTabSession(null);
        try {
            delete GAME.sharedObj.data.token;
            delete GAME.sharedObj.data.ioResumeToken;
            GAME.sharedObj.flush();
        } catch (e) {
        }
        if (auto) {
            LOGIN.AuthenticateUser([["email", auto], ["saved", "1"]]);
            return;
        }
        LOGIN.ioForgetLogin();
        PLEASEWAIT.Hide();
        if (!LOGIN.authForm || !LOGIN.authForm.parent) {
            LOGIN.authForm = new AuthForm();
            GLOBAL._layerTop.addChild(LOGIN.authForm);
        }
        // (made in another browser, or the browser's cookies cleared: the login page alone says enough)
    }

    public static AuthenticateUser(authInfo: any[]): void {
        let handleLoadSuccessful: Function = null;
        let handleLoadError: Function = null;
        if (GLOBAL._local) {
            if (GLOBAL.INFERNO_ONLY) {
                if (LOGIN._ioLoginPending) {
                    return;
                }
                LOGIN._ioLoginPending = true;
            }
            handleLoadSuccessful = (serverData: any): void => {
                LOGIN._ioRetries = 0;
                if (serverData.hasOwnProperty("error") && serverData.error != 0) {
                    LOGIN._ioLoginPending = false;
                    if (GLOBAL.INFERNO_ONLY && serverData.iokick) {
                        LOGIN.ioAskKick(serverData, authInfo);
                        return;
                    }
                    if (GLOBAL.INFERNO_ONLY && serverData.ionosaved) {
                        // (no saved login for it, or it ran out: the password, and, QoL #517, why it's asked)
                        LOGIN.ioShowForm(LOGIN.ioEmailOf(authInfo));
                        let why: string = serverData.ioreason == "expired" ? KEYS.Get("io_saved_expired", { "v1": serverData.iodays | 0 || 14 }) : (serverData.ioreason == "ended" ? KEYS.Get("io_saved_ended") : "");
                        if (why && LOGIN.authForm) {
                            LOGIN.authForm.ioSay(why);
                        }
                        return;
                    }
                    if (GLOBAL.INFERNO_ONLY && LOGIN.ioEmailOf(authInfo) && !LOGIN.ioHasPassword(authInfo)) {
                        // (a saved login refused for another reason: banned, maintenance) the login page and why
                        LOGIN.ioShowForm(LOGIN.ioEmailOf(authInfo));
                        GLOBAL.Message(as3.str(serverData.error));
                        return;
                    }
                    if (GLOBAL.INFERNO_ONLY && LOGIN.ioIsTokenLogin(authInfo)) {
                        LOGIN.ioTokenRefused(as3.str(serverData.error));
                        return;
                    }
                    GLOBAL.Message(as3.str(serverData.error));
                    return;
                }

                if (serverData.error == 0) {
                    if (GLOBAL.INFERNO_ONLY) {
                        // Remember this account (email and name only, never the password) for the
                        // login page's account list.
                        // The server sends the email back with every login (password or saved token).
                        let ioEmail: string = serverData.email ? String(serverData.email) : null;
                        for (let ioPair of as3.values(authInfo)) {
                            if (!ioEmail && ioPair && ioPair[0] == "email") {
                                ioEmail = String(ioPair[1]);
                            }
                        }
                        // (QoL #516: a login not kept on this computer leaves no name on the login page, and takes its
                        // name off it if it was there)
                        if (ioEmail && LOGIN.ioKeepFor(authInfo)) {
                            IoSavedAccounts.remember(ioEmail, serverData.username ? String(serverData.username) : "");
                        } else if (ioEmail) {
                            IoSavedAccounts.forget(ioEmail);
                        }
                    }
                    if (GLOBAL._local) {
                        // Set token
                        LOGIN.token = as3.str(serverData.token);
                        if (GLOBAL.INFERNO_ONLY) {
                            LOGIN.ioSaveLogin(LOGIN.token, serverData.email ? String(serverData.email) : LOGIN.ioEmailOf(authInfo), LOGIN.ioKeepFor(authInfo));
                        }

                        new URLLoaderApi().load(GLOBAL._apiURL + "bm/getnewmap", [["token", LOGIN.token]], (mapData: any): void => {
                            MapRoomManager.instance.init(Boolean(mapData.newmap), as3.str(mapData.mapheaderurl));
                            LOGIN.Process(serverData);
                        }, GLOBAL.INFERNO_ONLY ? (param1: any = null): void => {
                            // (Inferno-only: the login can be tried again, from the login page)
                            LOGIN._ioLoginPending = false;
                            LOGIN.ioShowForm(LOGIN.ioEmailOf(authInfo));
                            GLOBAL.Message(KEYS.Get("io_t3k_login_error"));
                        } : null);
                    } else {
                        // ToDo: Implement if we are running in a browser.
                        ExternalInterface.call("setItem", "authToken", LOGIN.token);
                    }
                }
            };
            handleLoadError = (error: IOErrorEvent): void => {
                LOGIN._ioLoginPending = false;
                if (GLOBAL.INFERNO_ONLY) {
                    // (QoL #203: "can't reach the server" told apart from "the server had a problem", and no answer
                    // tried again by itself, after 2, 4 and 8 seconds, before the login page and the message)
                    let broken: boolean = error && String(error.text) == "invalid JSON";
                    let offline: boolean = false;
                    try {
                        offline = typeof navigator != "undefined" && navigator.onLine === false;
                    } catch (e) {
                    }
                    if (!broken && LOGIN._ioRetries < 3) {
                        let wait: int = (2000 << LOGIN._ioRetries) | 0;
                        LOGIN._ioRetries++;
                        PLEASEWAIT.Show(KEYS.Get(offline ? "io_login_offline_retry" : "io_login_noanswer_retry", { "v1": (wait / 1000) | 0 }));
                        setTimeout((): void => {
                            PLEASEWAIT.Hide();
                            LOGIN.AuthenticateUser(authInfo);
                        }, wait);
                        return;
                    }
                    LOGIN._ioRetries = 0;
                    LOGIN.ioShowForm(LOGIN.ioEmailOf(authInfo));
                    GLOBAL._layerTop.addChild(GLOBAL.Message(KEYS.Get(broken ? "io_login_server_error" : (offline ? "io_login_offline" : "io_login_noanswer"))));
                    return;
                }
                if (GLOBAL.INFERNO_ONLY) {
                    // (13 October) a sign-in by itself (saved login, the tab's session) that could not reach the
                    // server: the login page under the message, not "Logging in..." for ever
                    LOGIN.ioShowForm(LOGIN.ioEmailOf(authInfo));
                }
                GLOBAL._layerTop.addChild(GLOBAL.Message("An error occurred during login on the server."));
            };
            // (Inferno-only, 13 October: this game keeps the browser's login key, a cookie, so the login can be
            // bound to the browser rather than the network)
            // (QoL #516: and whether the login is kept on this computer or only until the browser closes)
            new URLLoaderApi().load(GLOBAL._apiURL + "player/getinfo", [["version", GLOBAL._version.Get()]].concat(GLOBAL.INFERNO_ONLY ? [["iodevice", "1"], ["ioask", "1"], ["iokeep", LOGIN.ioKeepFor(authInfo) ? "1" : "0"]] : []).concat(authInfo), handleLoadSuccessful, handleLoadError);
        } else {
            ExternalInterface.addCallback("loginsuccessful", (param1: string): void => {
                let _loc2_: any = JSON.parse(param1);
                GLOBAL.WaitHide();
                if (_loc2_.error == 0) {
                    if (LOGIN.checkHash(param1)) {
                        LOGIN.Process(_loc2_);
                    } else {
                        LOGGER.Log("err", "JSLogin", true);
                        GLOBAL.ErrorMessage("JSLogin");
                    }
                } else {
                    GLOBAL.ErrorMessage(as3.str(_loc2_.error), GLOBAL.ERROR_ORANGE_BOX_ONLY);
                }
            });
            if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
                GLOBAL.CallJSWithClient("cc.initApplication", "loginsuccessful", [GLOBAL._version.Get()]);
            } else {
                GLOBAL.CallJS("cc.initApplication", [GLOBAL._version.Get(), "loginsuccessful"]);
            }
            LOGIN.logFlashCapabilities();
        }
    }

    public static Process(serverData: any): void {
        let _loc2_: any = null;
        if (serverData.version != GLOBAL._version.Get()) {
            LOGIN.handleVersionMismatch(serverData);
        } else {
            LOGIN.handleUserLogin(serverData);
        }
    }

    private static handleUserLogin(serverData: any): void {
        if (LOGIN.authForm) {
            LOGIN.authForm.disposeUI();
            LOGIN.authForm = null;
        }
        if (serverData) {
            GLOBAL.player = new Player();
            GLOBAL.player.ID = serverData.userid | 0;
            GLOBAL.player.name = as3.str(serverData.username);
            GLOBAL.player.lastName = as3.str(serverData.last_name);
            GLOBAL.player.picture = as3.str(serverData.pic_square);
            GLOBAL.player.timePlayed = serverData.timeplayed | 0;
            GLOBAL.player.email = as3.str(serverData.email);
            LOGIN._playerID = serverData.userid | 0;
            LOGIN._playerName = as3.str(serverData.username);
            LOGIN._playerLastName = as3.str(serverData.last_name);
            LOGIN._playerPic = as3.str(serverData.pic_square);
            LOGIN._timePlayed = serverData.timeplayed | 0;
            LOGIN._email = as3.str(serverData.email);
            if (serverData.stats) {
                if (serverData.stats.inferno != undefined) {
                    LOGIN._inferno = serverData.stats.inferno | 0;
                }
            }
            // (Inferno-only, QoL #197: the account's Shiny lock, the password asked over its amount)
            if (GLOBAL.INFERNO_ONLY) {
                IoShinyLock.ioFrom(serverData);
            }
            GLOBAL._friendCount = serverData.friendcount | 0;
            GLOBAL._sessionCount = serverData.sessioncount | 0;
            GLOBAL._addTime = serverData.addtime | 0;
            GLOBAL._mapVersion = serverData.mapversion | 0;
            GLOBAL._mailVersion = serverData.mailversion | 0;
            GLOBAL._soundVersion = serverData.soundversion | 0;
            GLOBAL._languageVersion = serverData.languageversion | 0;
            GLOBAL._appid = as3.str(serverData.app_id);
            GLOBAL._tpid = as3.str(serverData.tpid);
            GLOBAL._currencyURL = as3.str(serverData.currency_url);
            if (serverData.bookmarks) {
                MapRoomManager.instance.bookmarkData = serverData.bookmarks;
            } else {
                MapRoomManager.instance.bookmarkData = {};
            }
            if (serverData.settings) {
                LOGIN._settings = serverData.settings;
                RADIO.Setup(LOGIN._settings);
            }
            if (serverData.proxy_email) {
                LOGIN._proxymail = as3.str(serverData.proxy_email);
            }
            if (!serverData.languageversion) {
                GLOBAL._languageVersion = 8;
            }
            if (serverData.sendgift == 1) {
                GLOBAL._canGift = true;
            }
            if (serverData.sendinvite == 1) {
                GLOBAL._canInvite = true;
            }
            BASE._isFan = serverData.isfan | 0;
            if (serverData.ncpCandidate == 1) {
                GLOBAL._fbcncp = serverData.ncpCandidate | 0;
            }
            POPUPS.Setup();
            LOGIN.Digits(LOGIN._playerID);
            LOGIN.Done();
        }
    }

    private static handleVersionMismatch(serverData: any): void {
        if (ExternalInterface.available) {
            let eventData: any = { "tag": "userload", "version_mismatch_h": 1, "vh2": serverData.version, "vh1": GLOBAL._version.Get() };
            GLOBAL.CallJS("cc.logGenericEvent", [eventData]);
        }
        GLOBAL.ErrorMessage(KEYS.Get("msg_updatedgame"), GLOBAL.ERROR_ORANGE_BOX_ONLY);
    }

    public static Digits(param1: int): void {
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc2_: string = as3.str(param1.toString());
        LOGIN._digits = [];
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            LOGIN._digits.push(Number(_loc2_.charAt(_loc3_)) | 0);
            _loc3_++;
        }
        LOGIN._sumdigit = 0;
        if (LOGIN._digits.length >= 3) {
            _loc5_ = as3.str((_loc4_ = (LOGIN._digits[LOGIN._digits.length - 1] + LOGIN._digits[LOGIN._digits.length - 2] + LOGIN._digits[LOGIN._digits.length - 3]) | 0).toString());
            LOGIN._sumdigit = Number(_loc5_.substr(_loc5_.length - 1, 1)) | 0;
        }
    }

    public static Done(): void {
        let _loc1_: int = 0;
        GLOBAL.Setup();
        if (GLOBAL._openBase && GLOBAL._openBase.url && (Boolean(GLOBAL._openBase.userid) || Boolean(GLOBAL._openBase.baseid)) && GLOBAL._openBase.userid != LOGIN._playerID) {
            BASE.yardType = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            if (!GLOBAL._openBase.userid) {
                GLOBAL._openBase.userid = 0;
            }
            if (!GLOBAL._openBase.baseid) {
                GLOBAL._openBase.baseid = 0;
            }
            GLOBAL._currentCell = null;
            GLOBAL.setMode(GLOBAL.e_BASE_MODE.HELP);
            _loc1_ = 1;
            while (_loc1_ < 5) {
                GLOBAL._resources["r" + _loc1_] = new SecNum(0);
                GLOBAL._hpResources["r" + _loc1_] = 0;
                _loc1_++;
            }
            BASE.Load(as3.str(GLOBAL._openBase.url), Number(GLOBAL._openBase.userid), Number(GLOBAL._openBase.baseid));
        } else if (LOGIN._inferno != 0 && !GLOBAL.INFERNO_ONLY) {
            MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
            BASE.yardType = EnumYardType.INFERNO_YARD;
            BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
        } else {
            BASE.yardType = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            // Comment: The Load() function gets called from this block.;
            BASE.Load();
        }
    }

    private static logFlashCapabilities(): void {
        let _loc1_: any = null;
        if (ExternalInterface.available) {
            _loc1_ = { "flash_version": Capabilities.version, "screen_resolution": Capabilities.screenResolutionX + "x" + Capabilities.screenResolutionY, "screen_dpi": Capabilities.screenDPI };
            GLOBAL.CallJS("cc.logFlashCapabilities", [_loc1_]);
        }
    }

    public static checkHash(param1: string): boolean {
        let _loc2_: any[] = param1.split(",\"h\":");
        param1 = _loc2_[0] + "}";
        let _loc3_: string = "{\"h\":" + _loc2_[1];
        let _loc4_: string = param1;
        let _loc5_: any = JSON.parse(param1);
        let _loc6_: any = JSON.parse(_loc3_);
        let _loc7_: string = null;
        if ((_loc7_ = String(md5(LOGIN.getSalt() + _loc4_ + LOGIN.getNum(_loc6_.hn | 0)))) !== _loc6_.h) {
            return false;
        }
        return true;
    }

    public static getNum(param1: int): int {
        return (param1 * (param1 % 11)) | 0;
    }

    public static getSalt(): string {
        return LOGIN.decodeSalt("84V37530976X4W7175W9Z02U3483Y6VW");
    }

    public static decodeSalt(param1: string): string {
        let _loc4_: string = null;
        let _loc2_: any = "";
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            _loc4_ = param1.substring(_loc3_, _loc3_ + 1);
            switch (_loc4_) {
                case "a":
                    _loc2_ += "Z";
                    break;
                case "b":
                    _loc2_ += "Y";
                    break;
                case "c":
                    _loc2_ += "X";
                    break;
                case "d":
                    _loc2_ += "W";
                    break;
                case "e":
                    _loc2_ += "V";
                    break;
                case "f":
                    _loc2_ += "U";
                    break;
                case "g":
                    _loc2_ += "T";
                    break;
                case "h":
                    _loc2_ += "S";
                    break;
                case "i":
                    _loc2_ += "R";
                    break;
                case "j":
                    _loc2_ += "Q";
                    break;
                case "k":
                    _loc2_ += "P";
                    break;
                case "l":
                    _loc2_ += "O";
                    break;
                case "m":
                    _loc2_ += "N";
                    break;
                case "n":
                    _loc2_ += "M";
                    break;
                case "o":
                    _loc2_ += "L";
                    break;
                case "p":
                    _loc2_ += "K";
                    break;
                case "q":
                    _loc2_ += "J";
                    break;
                case "r":
                    _loc2_ += "I";
                    break;
                case "s":
                    _loc2_ += "H";
                    break;
                case "t":
                    _loc2_ += "G";
                    break;
                case "u":
                    _loc2_ += "F";
                    break;
                case "v":
                    _loc2_ += "E";
                    break;
                case "w":
                    _loc2_ += "D";
                    break;
                case "x":
                    _loc2_ += "C";
                    break;
                case "y":
                    _loc2_ += "B";
                    break;
                case "z":
                    _loc2_ += "A";
                    break;
                case "A":
                    _loc2_ += "z";
                    break;
                case "B":
                    _loc2_ += "y";
                    break;
                case "C":
                    _loc2_ += "x";
                    break;
                case "D":
                    _loc2_ += "w";
                    break;
                case "E":
                    _loc2_ += "v";
                    break;
                case "F":
                    _loc2_ += "u";
                    break;
                case "G":
                    _loc2_ += "t";
                    break;
                case "H":
                    _loc2_ += "s";
                    break;
                case "I":
                    _loc2_ += "r";
                    break;
                case "J":
                    _loc2_ += "q";
                    break;
                case "K":
                    _loc2_ += "p";
                    break;
                case "L":
                    _loc2_ += "o";
                    break;
                case "M":
                    _loc2_ += "n";
                    break;
                case "N":
                    _loc2_ += "m";
                    break;
                case "O":
                    _loc2_ += "l";
                    break;
                case "P":
                    _loc2_ += "k";
                    break;
                case "Q":
                    _loc2_ += "j";
                    break;
                case "R":
                    _loc2_ += "i";
                    break;
                case "S":
                    _loc2_ += "h";
                    break;
                case "T":
                    _loc2_ += "g";
                    break;
                case "U":
                    _loc2_ += "f";
                    break;
                case "V":
                    _loc2_ += "e";
                    break;
                case "W":
                    _loc2_ += "d";
                    break;
                case "X":
                    _loc2_ += "c";
                    break;
                case "Y":
                    _loc2_ += "b";
                    break;
                case "Z":
                    _loc2_ += "a";
                    break;
                case "0":
                    _loc2_ += "9";
                    break;
                case "1":
                    _loc2_ += "8";
                    break;
                case "2":
                    _loc2_ += "7";
                    break;
                case "3":
                    _loc2_ += "6";
                    break;
                case "4":
                    _loc2_ += "5";
                    break;
                case "5":
                    _loc2_ += "4";
                    break;
                case "6":
                    _loc2_ += "3";
                    break;
                case "7":
                    _loc2_ += "2";
                    break;
                case "8":
                    _loc2_ += "1";
                    break;
                case "9":
                    _loc2_ += "0";
                    break;
            }
            _loc3_++;
        }
        return as3.str(_loc2_);
    }
}
