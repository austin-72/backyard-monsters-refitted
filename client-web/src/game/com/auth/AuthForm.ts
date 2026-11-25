import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, GradientType, Graphics, InteractiveObject, Loader, Shape, Sprite } from "flash/display";
import { Event, FocusEvent, IOErrorEvent, KeyboardEvent, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { SharedObject, URLRequest } from "flash/net";
import { AntiAliasType, TextField, TextFieldAutoSize, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard, Mouse, MouseCursor } from "flash/ui";
import { Timer, setTimeout } from "flash/utils";
import { GLOBAL, IOBuild, IoKit, IoSavedAccounts, KEYS, LOGIN, MESSAGE, URLLoaderApi, frame_CLIP } from "@game";

// TODO: This file needs a complete refactor. It is currently very messy and hard to read.
export class AuthForm extends Sprite {
    static {
        as3.fields(this, { isRegisterForm: false, formContainer: null, borderContainer: null, loadingContainer: null, navContainer: null, selectField: null, dropdownMenu: null, usernameInput: null, emailInput: null, passwordInput: null, usernameValue: "", emailValue: "", passwordValue: "", emailErrorText: null, passwordErrorText: null, errMessage: null, submitButton: null, hasAccountText: null, defaultText: null, hasAccountFormat: null, button: null, buttonText: null, image: null, loader: null, startY: NaN, verticalSpacingBetweenBlocks: 0, BLACK: 0, WHITE: 16777215, RED: 16711680, BACKGROUND: 1909546, LIGHT_GRAY: 13224393, PRIMARY: 19941, SECONDARY: 52664, checkContentLoadedTimer: null, languages: null, background: null, contentContainer: null, DESIGN_WIDTH: 760, DESIGN_HEIGHT: 670, _ioBg: null, _ioBgShade: null, _ioWarning: null, _ioWarningGlow: null, _ioWarningPhase: 0, _ioRegistering: false, _ioAccounts: null, _ioUserBox: null, _ioShowPassword: false, _ioKeysOn: false, _ioButtonGlow: null, _ioCaps: null, _ioEye: null, _ioSelectW: 0, _ioPendingEmail: null, _ioFirstPassword: null, _ioConfirmLine: null, _ioRulesLine: null, _ioBuilt: false, _ioEmailBox: null, _ioPassBox: null, _ioLink: null, _ioPassDy: 0, _ioErrUser: null, _ioErrEmail: null, _ioErrPass: null, _ioConfirmedPassword: null, _ioChooser: null, _ioChooserOn: false, _ioTiles: null, _ioGlowing: null, _ioGlowSaved: null, _ioInvite: null, _ioInviteLine: null, _ioHeadPrefix: null, _ioHeadSuffix: null, _ioHeadBox: null, _ioWhatsDiff: null, _ioLangOn: false, _ioKeepBox: null });
    }

    /**
     * Inferno-only: this form's newer words in English (keys io_auth2_*), for when the language file doesn't have them, or
     * hasn't come yet: the sign-in form can show before it has.
     */
    private static readonly IO_EN: any = { "io_auth2_create": "Create account", "io_auth2_have": "I have an account", "io_auth2_name_bad": "Use 2 to 12 letters, numbers or _ (no spaces).", "io_auth2_name_taken": "That name is taken.", "io_auth2_try": "Try:", "io_auth2_email_taken": "This email already has an account.", "io_auth2_login_instead": "Log in instead", "io_auth2_invited": "#v1# invited you: you both get #v2# Shiny", "io_acc_keep": "Keep me signed in on this computer (#v1# days)", "io_rules_link": "Rules", "io_try_again": "Try again", "io_t3k_auth_username": "Username", "io_t3k_auth_email": "Email", "io_t3k_auth_password": "Password", "io_t3k_auth_email_or_name": "Email or username", "io_t3k_auth_password_again": "Password again", "io_t3k_auth_rule_name": "Name: 2-12 letters, numbers or _", "io_t3k_auth_rule_pw": "Password: 8+ with a symbol", "io_t3k_auth_update": "New Update Available!", "io_t3k_auth_connecting": "Connecting to the server", "io_t3k_auth_slow": "Taking a while? The game keeps trying.", "io_t3k_auth_slow_check": "<font color='#ffffff'>Taking a while? Check </font><font color='#FF8C1E'><u>#v1#</u></font><font color='#ffffff'>.</font>", "io_t3k_auth_status": "the server's status", "io_t3k_auth_discord": "our Discord", "io_t3k_auth_offline": "You appear to be offline. The game tries again as soon as you are back online.", "io_t3k_auth_copy_details": "Copy the details (for a bug report)", "io_t3k_auth_copied": "Copied", "io_t3k_auth_subtitle": "Inferno Map Room 2 \u00B7 a custom server", "io_t3k_auth_warning": "Your email doesn't have to be real, but you log in with it: note it down. Use a password you don't use anywhere else!", "io_t3k_auth_register_error": "An error occurred during registration on the server.", "io_t3k_auth_need_email_or_name": "Please enter your email or username", "io_t3k_auth_need_valid_email": "Please enter a valid email address", "io_t3k_auth_need_password": "Please enter your password", "io_t3k_auth_pw_rule1": "Password must be at least 8 characters long and contain", "io_t3k_auth_pw_rule2": "at least 1 special character", "io_t3k_auth_again_line": "Type the same password again, to be sure of it.", "io_t3k_auth_nomatch_line": "The two didn't match. Type your password, then once more.", "io_t3k_auth_caps": "Caps Lock is on" };

    /**
     * Inferno-only (QoL #235): a field's hint ("Email", "Password", ...) in the player's language. The English word
     * stays the field's own name in the code (createBlock's placeholder); this is only what is shown.
     */
    private static ioHintWord(en: string): string {
        let key: string = en == "Username" ? "io_t3k_auth_username" : en == "Email" ? "io_t3k_auth_email" : en == "Password" ? "io_t3k_auth_password" : en == "Email or username" ? "io_t3k_auth_email_or_name" : en == "Password again" ? "io_t3k_auth_password_again" : null;
        return GLOBAL.INFERNO_ONLY && key ? AuthForm.ioT(key) : en;
    }

    /** Inferno-only (QoL #235): "Password must be at least 8 characters long and contain" and its second line. */
    private static ioPasswordRule(): string {
        return AuthForm.ioT("io_t3k_auth_pw_rule1") + "\n" + AuthForm.ioT("io_t3k_auth_pw_rule2");
    }

    /** KEYS.Get, or the English above when the language file doesn't have the key. */
    private static ioT(key: string, placeholders: any = null): string {
        let said: string = KEYS.Get(key, placeholders);
        if ((!said || said == key) && AuthForm.IO_EN.hasOwnProperty(key)) {
            said = String(AuthForm.IO_EN[key]);
            if (placeholders != null) {
                for (let k in placeholders) {
                    said = said.split("#" + k + "#").join(String(placeholders[k]));
                }
            }
        }
        return said;
    }

    /** (Inferno-only) the form was built (it could be built a second time, once loaded, by the timer). */
    private _ioBuilt: boolean;
    /** The input boxes round the email and the password (the username's is _ioUserBox). */
    private _ioEmailBox: Sprite;
    private _ioPassBox: Sprite;
    /** The "Register" / "Login" link under the button. */
    private _ioLink: Sprite;
    /** (QoL #513) how far the password field is moved down, on the register form, for the email's error line. */
    private _ioPassDy: number;
    /** (QoL #513) the error line under each sign-up field: the text, then any links (a free name, Log in instead). */
    private _ioErrUser: Sprite;
    private _ioErrEmail: Sprite;
    private _ioErrPass: Sprite;
    /** (QoL #513) the password already typed twice, before the server turned the name or the address down. */
    private _ioConfirmedPassword: string;
    /** (QoL #521) the two choices on a first visit, and whether they show. */
    private _ioChooser: Sprite;
    private _ioChooserOn: boolean;
    /** (QoL #525) the saved-account tiles, for Tab. */
    private _ioTiles: any[];
    /** (QoL #525) what Tab glows, and its own filters. */
    private _ioGlowing: Sprite;
    private _ioGlowSaved: any[];
    /** (QoL #520) {name, shiny}: who sent the invite this game was opened with, and the line saying so. */
    private _ioInvite: any;
    private _ioInviteLine: TextField;
    /** (QoL #522) what changes with the language. */
    private _ioHeadPrefix: TextField;
    private _ioHeadSuffix: TextField;
    private _ioHeadBox: Sprite;
    private _ioWhatsDiff: Sprite;
    private _ioLangOn: boolean;
    /** (QoL #516) "Keep me signed in on this computer (14 days)", under the login form's link. */
    private _ioKeepBox: Sprite;

    private static readonly IO_TILE_W: int = 78;

    private static readonly IO_TILE_H: int = 100;

    private static readonly IO_TILE_GAP: int = 12;

    /** The Inferno monster portraits a tile can show; each account always gets the same one. */
    private static readonly IO_PORTRAITS: any[] = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8"];
    private isRegisterForm: boolean;
    private formContainer: Sprite;
    private borderContainer: Sprite;
    private loadingContainer: Sprite;
    private navContainer: Sprite;
    private selectField: Sprite;
    private dropdownMenu: Sprite;
    private usernameInput: TextField;
    private emailInput: TextField;
    private passwordInput: TextField;
    private usernameValue: string;
    private emailValue: string;
    private passwordValue: string;
    private emailErrorText: TextField;
    private passwordErrorText: TextField;
    private errMessage: TextField;
    private submitButton: Sprite;
    private hasAccountText: TextField;
    private defaultText: TextField;
    private hasAccountFormat: TextFormat;
    private button: Sprite;
    private buttonText: TextField;
    private image: Bitmap;
    private loader: Loader;
    private startY: number;
    private verticalSpacingBetweenBlocks: number;
    private BLACK: uint;
    private WHITE: uint;
    private RED: uint;
    private BACKGROUND: uint;
    private LIGHT_GRAY: uint;
    private PRIMARY: uint;
    private SECONDARY: uint;
    private checkContentLoadedTimer: Timer;
    private languages: any[];
    private background: Sprite;
    private contentContainer: Sprite;
    private DESIGN_WIDTH: number;
    private DESIGN_HEIGHT: number;
    // ---- Inferno-only (9 October, the user's: "When the page loads there is a cool new background, make that the
    // background behind the sign in page as well"): the page's loading screen behind the form, the Inferno map
    // room art (client-web/public/inferno-bg.jpg, art/seo/og-image.py) under the same orange glow and dark edges.
    // The gradient above shows until it has loaded (and stays, if it can't be).
    private _ioBg: Bitmap;
    private _ioBgShade: Shape;
    /** Inferno-only: the advice under the register form, in a dark red glow that pulses. */
    private _ioWarning: TextField;
    private _ioWarningGlow: GlowFilter;
    private _ioWarningPhase: number;
    private _ioRegistering: boolean;
    // ---------------------------------------------------------------------------------------------
    // Inferno-only look and saved accounts
    // ---------------------------------------------------------------------------------------------
    private _ioAccounts: Sprite;
    private _ioUserBox: Sprite;
    // ---------------------------------------------------------------------------------------------
    // Inferno-only: the keyboard and small comforts (9 October, the user's "Make the login screen work
    // better: tab to switch between field or login button, enter to go to the next tab or login and
    // anything else that adds comfort")
    //  - Tab and Shift+Tab go round the fields and the button (the button glows when it has the focus)
    //  - Enter goes to the next field, and logs in (or registers) from the password or the button; Space on the
    //    button too; with nothing chosen, Enter goes to the first empty field or logs in
    //  - Enter or Escape closes a message over the form (a wrong password: back in the password, selected)
    //  - the email field ready to type in when the page opens; the last account's email filled in, the
    //    password ready (not on phones and tablets, where it would open the keyboard at once)
    //  - an eye to show the password; "Caps Lock is on" while typing it with Caps Lock on
    // ---------------------------------------------------------------------------------------------
    /** Whether the eye shows the password as typed. */
    private _ioShowPassword: boolean;
    /** QoL #510: registering, the password as first typed, while it is asked again (null otherwise). */
    private _ioFirstPassword: string;
    /** "Type it again" under the password field while it is asked again. */
    private _ioConfirmLine: TextField;
    private _ioKeysOn: boolean;
    private _ioButtonGlow: GlowFilter;
    private _ioCaps: TextField;
    private _ioEye: Sprite;

    public $ctor(): void {
        this._ioButtonGlow = new GlowFilter(0xFF8A1E, 0.95, 14, 14, 3, 2);
        super.$ctor();
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno theme: orange and ember accents on a volcanic background, the form on the game's
            // parchment popup frame (see ioCard / ioInputBox / createButton).
            this.PRIMARY = 11883546;
            this.SECONDARY = 16747550;
            this.RED = 12597547;
        }
        this.background = new Sprite();
        this.addChild(this.background);
        if (GLOBAL.INFERNO_ONLY) {
            this.ioLoadBackground();
        }

        this.contentContainer = new Sprite();
        this.addChild(this.contentContainer);

        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.formAddedToStageHandler));

        GLOBAL.eventDispatcher.addEventListener("initError", (event: Event): void => {
            this.errMessage.text = GLOBAL.initError;
            // If loadingContainer is present, refresh the loading screen to update the title
            if (this.loadingContainer && this.loadingContainer.parent) {
                this.Loading();
            }
        });

        this.checkContentLoadedTimer = new Timer(1000);
        this.checkContentLoadedTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.checkContentLoaded));
        this.checkContentLoadedTimer.start();
    }

    private checkContentLoaded(event: TimerEvent): void {
        // True: Once we receive the language file and supported languages from the server
        // This also let's us know whether a connection has been established.
        if (GLOBAL.textContentLoaded && GLOBAL.supportedLangsLoaded) {
            this.checkContentLoadedTimer.stop();
            this.checkContentLoadedTimer.removeEventListener(TimerEvent.TIMER, as3.bind(this, this.checkContentLoaded));
            if (this.loadingContainer && this.loadingContainer.parent) {
                this.contentContainer.removeChild(this.loadingContainer);
            }
            this.handleContentLoaded();
        } else {
            if (!this.loadingContainer.parent) {
                this.Loading();
            }
        }
    }

    public formAddedToStageHandler(event: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.formAddedToStageHandler));

        this.drawBackground();
        this.centerContent();
        this.stage.addEventListener(Event.RESIZE, as3.bind(this, this.onStageResize));

        if (!GLOBAL.textContentLoaded && !GLOBAL.supportedLangsLoaded) {
            this.Loading();
        } else {
            // If text content is already loaded, proceed with UI setup
            if (this.loadingContainer && this.loadingContainer.parent) {
                this.contentContainer.removeChild(this.loadingContainer);
            }
            this.handleContentLoaded();
        }
    }

    private onStageResize(event: Event): void {
        this.drawBackground();
        this.centerContent();
        GLOBAL.RefreshScreen();
        GLOBAL.ResizeLayer(GLOBAL._layerTop);
    }

    private drawBackground(): void {
        // slight hack but its only 2-lines of shit
        let offsetX: number = -(this.stage.stageWidth - this.DESIGN_WIDTH) / 2;
        let offsetY: number = -(this.stage.stageHeight - this.DESIGN_HEIGHT) / 2;
        this.background.graphics.clear();
        if (GLOBAL.INFERNO_ONLY) {
            let glow: Matrix = new Matrix();
            glow.createGradientBox(this.stage.stageWidth * 1.3, this.stage.stageHeight * 1.3, 0, offsetX - this.stage.stageWidth * 0.15, offsetY - this.stage.stageHeight * 0.05);
            this.background.graphics.beginGradientFill(GradientType.RADIAL, [0x6A1E0A, 0x2A0B06, 0x100403], [1, 1, 1], [0, 150, 255], glow);
        } else {
            this.background.graphics.beginFill(this.BACKGROUND);
        }
        this.background.graphics.drawRect(offsetX, offsetY, this.stage.stageWidth, this.stage.stageHeight);
        this.background.graphics.endFill();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioPlaceBackground(offsetX, offsetY, this.stage.stageWidth, this.stage.stageHeight);
        }
    }

    private ioLoadBackground(): void {
        let bgLoader: Loader = null;
        bgLoader = new Loader();
        bgLoader.contentLoaderInfo.addEventListener(Event.COMPLETE, (e: Event): void => {
            let bm: Bitmap = as3.as(bgLoader.content, Bitmap);
            if (!bm || !this.background) {
                return;
            }
            bm.smoothing = true;
            this._ioBg = bm;
            this._ioBgShade = new Shape();
            this.background.addChild(this._ioBg);
            this.background.addChild(this._ioBgShade);
            if (this.stage) {
                this.drawBackground();
            }
        });
        bgLoader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, (e: IOErrorEvent): void => {
        });
        try {
            bgLoader.load(new URLRequest(GLOBAL.serverUrl + "web/inferno-bg.jpg"));
        } catch (err) {
        }
    }

    /** The art covering the screen (cut at the edges, never stretched), the glow and the dark edges over it. */
    private ioPlaceBackground(x: number, y: number, w: number, h: number): void {
        if (!this._ioBg || !this._ioBg.bitmapData) {
            return;
        }
        let bw: number = this._ioBg.bitmapData.width;
        let bh: number = this._ioBg.bitmapData.height;
        let k: number = Math.max(w / bw, h / bh);
        this._ioBg.scaleX = this._ioBg.scaleY = k;
        this._ioBg.x = x + (w - bw * k) / 2;
        this._ioBg.y = y + (h - bh * k) / 2;
        let g: Graphics = this._ioBgShade.graphics;
        g.clear();
        // (as the loading screen: an orange glow a little below the middle, the edges going dark)
        let glow: Matrix = new Matrix();
        glow.createGradientBox(w * 1.2, h * 1.2, 0, x - w * 0.1, y - h * 0.0);
        g.beginGradientFill(GradientType.RADIAL, [0xFF5A14, 0xFF5A14], [0.28, 0], [0, 153], glow);
        g.drawRect(x, y, w, h);
        g.endFill();
        let edge: Matrix = new Matrix();
        edge.createGradientBox(w * 1.15, h * 1.15, 0, x - w * 0.075, y - h * 0.075);
        g.beginGradientFill(GradientType.RADIAL, [0x080201, 0x080201], [0, 0.85], [77, 255], edge);
        g.drawRect(x, y, w, h);
        g.endFill();
    }

    private centerContent(): void {
        this.contentContainer.x = 0;
        this.contentContainer.y = 0;
        // (Inferno-only, QoL #518: on a phone held upright, the form as wide as the screen)
        if (GLOBAL.INFERNO_ONLY) {
            this.ioPortraitFit();
        }
    }

    /**
     * Inferno-only (QoL #518): on a phone held upright (GLOBAL.ioOnPhone, the stage taller than wide) the stage keeps
     * its 760 pixels across a 390 px screen, so the 450 px card came out half size (its fields read like 7 px). There
     * the form (the card and the heading over it) is scaled up to the screen's width, up to twice, in the middle of
     * the screen; the language picker and What's different go to the top corners above the heading. Landscape, and
     * any computer: as designed.
     */
    private ioPortraitFit(): void {
        if (!GLOBAL.INFERNO_ONLY || !this.contentContainer) {
            return;
        }
        let k: number = 1;
        let sw: number = this.stage ? this.stage.stageWidth : this.DESIGN_WIDTH;
        let sh: number = this.stage ? this.stage.stageHeight : this.DESIGN_HEIGHT;
        if (GLOBAL.ioOnPhone && this.stage && sh > sw * 1.15) {
            k = Math.min((sw - 24) / AuthForm.IO_CARD_W, (sh - 140) / AuthForm.IO_CARD_H, 2);
        }
        if (k <= 1.02) {
            k = 1;
        }
        // (never scaled: nothing to put back)
        if (k == 1 && this.contentContainer.scaleX == 1) {
            return;
        }
        this.contentContainer.scaleX = this.contentContainer.scaleY = k;
        // (the design's 760 x 670 is in the middle of the stage: its visible part starts left and above it)
        let left: number = -(sw - this.DESIGN_WIDTH) / 2;
        let top: number = -(sh - this.DESIGN_HEIGHT) / 2;
        if (k > 1) {
            this.contentContainer.x = Math.round(left + sw / 2 - AuthForm.IO_CARD_CX * k);
            this.contentContainer.y = Math.round(top + sh / 2 - AuthForm.IO_CARD_CY * k);
        }
        // (the picker and What's different: in the screen's top corners, over the heading, or where they were)
        let cornerY: number = k > 1 ? -46 : 10;
        if (this.selectField) {
            this.selectField.x = k > 1 ? Math.round((left + 12 - this.contentContainer.x) / k) : 20;
            this.selectField.y = cornerY;
        }
        if (this._ioWhatsDiff) {
            this._ioWhatsDiff.x = k > 1 ? Math.round((left + sw - 12 - this.contentContainer.x) / k - this._ioWhatsDiff.width) : this.DESIGN_WIDTH - 20 - this._ioWhatsDiff.width;
            this._ioWhatsDiff.y = cornerY;
        }
    }

    /** QoL #518: the part of the form that fills a phone's width: the card (450 wide at x 155) and its margin. */
    private static readonly IO_CARD_W: int = 470;

    /** ...and its height: the heading (from y 10) to the card's foot (645). */
    private static readonly IO_CARD_H: int = 660;

    /** Its middle, in the form's own pixels. */
    private static readonly IO_CARD_CX: int = 380;

    private static readonly IO_CARD_CY: int = 330;

    private handleContentLoaded(): void {
        // (Inferno-only: once. Added to the stage once everything had loaded, the form was built there and again by
        // the timer a second later, one form over the other)
        if (GLOBAL.INFERNO_ONLY && this._ioBuilt) {
            return;
        }
        // Global Initialization
        this.navContainer = new Sprite();
        this.formContainer = new Sprite();
        this.usernameInput = new TextField();
        this.emailInput = new TextField();
        this.passwordInput = new TextField();
        this.emailErrorText = new TextField();
        this.buttonText = new TextField();
        this.passwordErrorText = new TextField();
        this.hasAccountText = new TextField();

        let formWidth: number = 450;
        let formHeight: number = 600;

        this.languages = KEYS.supportedLanguagesJson;
        // (Inferno-only, QoL #233: the picker shows the language in use)
        let selectInput: Sprite = GLOBAL.INFERNO_ONLY && KEYS.ioLanguage ? this.createSelectInput(KEYS.ioLanguage.charAt(0).toUpperCase() + KEYS.ioLanguage.substr(1)) : this.createSelectInput();
        this.contentContainer.addChild(selectInput);
        selectInput.x = 20;
        selectInput.y = 10;

        this.HeaderTitle();
        this.contentContainer.addChild(this.navContainer);

        this.formContainer.graphics.drawRect(0, 0, formWidth, formHeight);
        this.formContainer.x = 155;
        this.formContainer.y = 45;
        this.contentContainer.addChild(this.formContainer);
        if (GLOBAL.INFERNO_ONLY) {
            this.ioCard(formWidth);
        }

        // Y-position for the first input field
        this.startY = 345;

        // Get image asset
        this.loader = new Loader();
        this.loader.load(new URLRequest(GLOBAL.cdnUrl + "assets/popups/C5-LAB-150.png"));
        this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onImageLoaded));
        this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, (e: IOErrorEvent): void => {
        });

        this.usernameInput = this.createBlock(0, 0, "Username");
        this.emailInput = this.createBlock(350, 35, "Email");
        this.passwordInput = this.createBlock(350, 35, "Password", true);
        // (QoL #204: a phone shows its email keyboard for the email, and Next / Go on the Enter key)
        this.emailInput.ioInputMode = "email";
        this.emailInput.ioEnterKey = "next";
        this.usernameInput.ioEnterKey = "next";
        this.passwordInput.ioEnterKey = "go";
        this._ioEmailBox = this.CreateBorder(this.emailInput);
        this._ioPassBox = this.CreateBorder(this.passwordInput);

        // Create button
        this.submitButton = this.createButton();
        this.submitButton.x = (this.formContainer.width - this.submitButton.width) / 2;
        this.submitButton.y = this.startY + 28;
        this.formContainer.addChild(this.submitButton);
        this.submitButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.submitButtonClickHandler));

        // Link
        this.FormNavigate();
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #521: no account saved in this browser, and none asked for: a first visit)
            let fresh: boolean = IoSavedAccounts.list().length == 0 && !this._ioPendingEmail && !this._ioPendingSay;
            this.ioBuildAccounts();
            this.ioWhatsDifferent();
            // (QoL #516: under the link, before the keys are set up: Tab reaches it)
            this.ioBuildKeep();
            this.ioComfort();
            // (QoL #512: the rules, ticked as they are met, while the register form is filled in)
            for (let f of [this.usernameInput, this.passwordInput]) {
                f.addEventListener(Event.CHANGE, (e: Event): void => {
                    this.ioRules();
                });
            }
            this.ioOpening(fresh);
            // (QoL #518: the picker and What's different exist now)
            this.ioPortraitFit();
            // (QoL #522: another language picked: the form's words change at once)
            if (!this._ioLangOn) {
                this._ioLangOn = true;
                GLOBAL.eventDispatcher.addEventListener(KEYS.LANGUAGE_FILE_LOADED, as3.bind(this, this.ioOnLanguage));
            }
            this._ioBuilt = true;
        }
    }

    /**
     * QoL #520, #521: how the form opens. A friend's invite link (its code kept by GAME, read here) asks the server who sent
     * it; with no account saved in this browser the register form opens at once, the line over it saying who invited.
     * A first visit without one: two equal choices, Create account and I have an account.
     */
    private ioOpening(fresh: boolean): void {
        let code: string = this.ioReferralCode();
        if (code) {
            this.ioAskInviter(code);
        }
        if (!fresh) {
            return;
        }
        if (code) {
            this.isRegisterForm = true;
            this.updateState();
            if (!GLOBAL.ioOnPhone) {
                this.ioFocus(this.usernameInput);
            }
            return;
        }
        this.ioShowChooser(true);
        // (nothing chosen yet: no field takes the keys)
        if (this.stage) {
            this.stage.focus = null;
        }
        this.submitButton.filters = [];
    }

    /** QoL #521: the two choices of a first visit, where the fields and the button are, or back to the form. */
    private ioShowChooser(on: boolean): void {
        this._ioChooserOn = on;
        if (on && !this._ioChooser) {
            this._ioChooser = new Sprite();
            this._ioChooser.name = "ioAuthChooser";
            let create: Sprite = this.ioBigButton("ioAuthCreate", "io_auth2_create", (): void => {
                this.ioChoose(true);
            });
            create.x = 50;
            create.y = 372;
            this._ioChooser.addChild(create);
            let have: Sprite = this.ioBigButton("ioAuthHaveAccount", "io_auth2_have", (): void => {
                this.ioChoose(false);
            });
            have.x = 50;
            have.y = 442;
            this._ioChooser.addChild(have);
            this.formContainer.addChild(this._ioChooser);
        }
        this.ioApplyChooser();
    }

    private ioChoose(register: boolean): void {
        this._ioChooserOn = false;
        this.isRegisterForm = register;
        this.updateState();
        this.ioFocus(register ? this.usernameInput : this.emailInput);
    }

    /** While the choices show, the fields, the button and the link don't. */
    private ioApplyChooser(): void {
        let on: boolean = this._ioChooserOn;
        let form: any[] = [this.emailInput, this.passwordInput, this._ioEmailBox, this._ioPassBox, this._ioEye, this.submitButton, this._ioLink];
        for (let o of form) {
            if (o) {
                o.visible = !on;
            }
        }
        if (on) {
            let more: any[] = [this.usernameInput, this._ioUserBox, this._ioWarning, this._ioRulesLine, this._ioCaps, this._ioInviteLine];
            for (let o of more) {
                if (o) {
                    o.visible = false;
                }
            }
        }
        if (this._ioChooser) {
            this._ioChooser.visible = on;
        }
        this.ioKeepShow();
    }

    /** One of the two equal choices: the molten button, as wide as the form's own. */
    private ioBigButton(name: string, key: string, onClick: Function): Sprite {
        let b: Sprite = new Sprite();
        b.name = name;
        b.buttonMode = true;
        b.useHandCursor = true;
        b.mouseChildren = false;
        let draw: Function = (): void => {
            b.graphics.clear();
            if (IoKit.slice(b.graphics, "btn_molten", 0, 0, 350, 50)) {
                return;
            }
            let shade: Matrix = new Matrix();
            shade.createGradientBox(350, 50, Math.PI / 2);
            b.graphics.lineStyle(2, 6961674);
            b.graphics.beginGradientFill(GradientType.LINEAR, [0xFFE27A, 0xE8A21E], [1, 1], [0, 255], shade);
            b.graphics.drawRoundRect(0, 0, 350, 50, 14);
            b.graphics.endFill();
        };
        draw();
        IoKit.whenLoaded(["btn_molten"], (): void => {
            draw();
        });
        let label: TextField = new TextField();
        let format: TextFormat = new TextFormat("Groboldov", 16, this.WHITE);
        format.align = TextFormatAlign.CENTER;
        label.defaultTextFormat = format;
        label.embedFonts = true;
        label.antiAliasType = AntiAliasType.NORMAL;
        label.selectable = false;
        label.mouseEnabled = false;
        label.width = 350;
        label.height = 24;
        label.y = 13;
        label.filters = [new GlowFilter(0x5A2A06, 1, 3, 3, 8, 2)];
        label.text = AuthForm.ioT(key).toUpperCase();
        b.addChild(label);
        (b as any).ioKey = key;
        this.ioActivatable(b, onClick);
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            onClick();
        });
        this.mousePointerCursor(b);
        return b;
    }

    /** (QoL #525) what Enter (or Space) does on `s` once Tab has reached it; its glow goes when the focus does. */
    private ioActivatable(s: Sprite, onActivate: Function): void {
        (s as any).ioActivate = onActivate;
        s.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            if (this._ioGlowing == s) {
                this.ioGlowOff();
            }
        });
    }

    private ioGlowOff(): void {
        if (this._ioGlowing) {
            this._ioGlowing.filters = this._ioGlowSaved || [];
        }
        this._ioGlowing = null;
        this._ioGlowSaved = null;
    }

    /** QoL #520: who sent the invite (GET /invite/<code>): only a name the server knows and a reward it really pays. */
    private ioAskInviter(code: string): void {
        try {
            let w: any = window as any;
            w.fetch(String(GLOBAL.serverUrl || "/") + "invite/" + encodeURIComponent(code)).then((r: any): any => r.json()).then((j: any): void => {
                if (j && j.error === 0 && j.name && Number(j.shiny) > 0) {
                    this._ioInvite = { "name": String(j.name), "shiny": Number(j.shiny) | 0 };
                    this.ioShowInvite();
                }
            }, (): void => {
            });
        } catch (e) {
        }
    }

    /** "Ann invited you: you both get 250 Shiny", under the picture, on the register form. */
    private ioShowInvite(): void {
        if (!this._ioInvite || !this.formContainer) {
            return;
        }
        if (!this._ioInviteLine) {
            let field: TextField = new TextField();
            let format: TextFormat = new TextFormat("Groboldov", 14, 0xFFD27A);
            format.align = TextFormatAlign.CENTER;
            field.defaultTextFormat = format;
            field.embedFonts = true;
            field.antiAliasType = AntiAliasType.NORMAL;
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = 450;
            field.height = 20;
            field.y = 284;
            field.name = "ioAuthInvite";
            field.filters = [new GlowFilter(0x000000, 1, 4, 4, 6, 2)];
            this.formContainer.addChild(field);
            this._ioInviteLine = field;
        }
        this._ioInviteLine.text = AuthForm.ioT("io_auth2_invited", { "v1": String(this._ioInvite.name).replace(/[<>&]/g, ""), "v2": this._ioInvite.shiny });
        this._ioInviteLine.visible = this.isRegisterForm && !this._ioChooserOn;
    }

    /**
     * QoL #522: another language picked (KEYS.Setup loads its file while the form stays): the form's words in it at once,
     * the header, the button, the link, What's different, the choices, the invite line and the saved accounts' note.
     */
    private ioOnLanguage(e: Event = null): void {
        if (!this.formContainer || !this.buttonText) {
            return;
        }
        if (this._ioHeadPrefix && this._ioHeadSuffix && this._ioHeadBox) {
            this._ioHeadPrefix.text = KEYS.Get("auth_header_prefix");
            this._ioHeadSuffix.text = KEYS.Get("auth_header_suffix");
            this._ioHeadSuffix.x = this._ioHeadPrefix.x + this._ioHeadPrefix.width;
            this._ioHeadBox.x = (800 - this._ioHeadBox.width) / 2;
        }
        let busy: boolean = this.isRegisterForm ? this._ioRegistering : LOGIN.ioLoginPending;
        if (!busy) {
            this.updateButtonText();
            this.updateButtonColor();
            this.buttonText.x = (this.button.width - this.buttonText.width) / 2;
        }
        this.updateLinkText();
        this.updateLinkColour();
        if (this._ioLink) {
            this._ioLink.x = (450 - this._ioLink.width) / 2;
        }
        if (this._ioWhatsDiff && this._ioWhatsDiff.parent) {
            this._ioWhatsDiff.parent.removeChild(this._ioWhatsDiff);
            this.ioWhatsDifferent();
            // (QoL #518: where a phone held upright has it)
            this.ioPortraitFit();
        }
        if (this._ioChooser) {
            for (let i: int = 0; i < this._ioChooser.numChildren; i++) {
                let choice: any = this._ioChooser.getChildAt(i);
                let label: TextField = as3.as(choice.getChildAt(0), TextField);
                if (label && choice.ioKey) {
                    label.text = AuthForm.ioT(String(choice.ioKey)).toUpperCase();
                }
            }
        }
        this.ioShowInvite();
        this.ioBuildAccounts();
        // (QoL #516: the keep-me-signed-in box's words)
        if (this._ioKeepBox && this._ioKeepBox.parent) {
            this._ioKeepBox.parent.removeChild(this._ioKeepBox);
            this._ioKeepBox = null;
            this.ioBuildKeep();
        }
    }

    private ioLanguageOff(): void {
        if (this._ioLangOn) {
            this._ioLangOn = false;
            GLOBAL.eventDispatcher.removeEventListener(KEYS.LANGUAGE_FILE_LOADED, as3.bind(this, this.ioOnLanguage));
        }
    }

    private _ioRulesLine: TextField;

    /** QoL #512: the username's and the password's rules under the password, each ticked once met (register only). */
    public ioRules(): void {
        // (QoL #513, #521: not over the password's own error line, nor while the first visit's choices show)
        let show: boolean = this.isRegisterForm && this._ioFirstPassword == null && !!this.passwordInput && !this.ioErrShown(this.passwordInput) && !this._ioChooserOn;
        if (!show) {
            if (this._ioRulesLine) {
                this._ioRulesLine.visible = false;
            }
            return;
        }
        if (!this._ioRulesLine) {
            let field: TextField = new TextField();
            field.defaultTextFormat = new TextFormat("Verdana", 11, 0xFFE6C8);
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = 400;
            field.height = 18;
            field.name = "ioRegisterRules";
            field.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 1)];
            this.formContainer.addChild(field);
            this._ioRulesLine = field;
        }
        let name: string = String(this.usernameValue || "");
        let pw: string = String(this.passwordValue || "");
        let nameOk: boolean = /^[a-zA-Z0-9_]{2,12}$/.test(name);
        let pwOk: boolean = pw.length >= 8 && /[^a-zA-Z0-9]/.test(pw);
        let tick: Function = (ok: boolean, text: string): string => "<font color=\"" + (ok ? "#8CE07A" : "#FFE6C8") + "\">" + (ok ? "✓ " : "· ") + text + "</font>";
        this._ioRulesLine.htmlText = tick(nameOk, AuthForm.ioT("io_t3k_auth_rule_name")) + "   " + tick(pwOk, AuthForm.ioT("io_t3k_auth_rule_pw"));
        this._ioRulesLine.x = this.passwordInput.x;
        this._ioRulesLine.y = this.passwordInput.y + this.passwordInput.height + 4;
        this._ioRulesLine.visible = true;
    }

    /**
     * Inferno-only: "What's different?" at the top right, across from the language picker and drawn like
     * it (2 October). Opens, in a new page, the overview of every change to the base game as a PDF: the
     * server's /whats-different sends the browser on to the current copy.
     */
    private ioWhatsDifferent(): void {
        let button: Sprite = null;
        let w: number = NaN;
        let h: number = NaN;
        let draw: Function = null;
        button = new Sprite();
        button.name = "ioWhatsDifferent";
        this._ioWhatsDiff = button;
        let label: TextField = new TextField();
        let format: TextFormat = new TextFormat("Groboldov", 13, 0xFFC27A);
        label.defaultTextFormat = format;
        label.embedFonts = true;
        label.antiAliasType = AntiAliasType.NORMAL;
        label.selectable = false;
        label.mouseEnabled = false;
        label.autoSize = TextFieldAutoSize.LEFT;
        label.text = KEYS.Get("io_whats_different").toLocaleUpperCase();
        w = Math.ceil(label.textWidth) + 26;
        h = 30;
        // (placed as the language picker places its label, so the two line up)
        label.x = (w - label.textWidth) / 2;
        label.y = (h - label.textHeight) / 2;
        draw = (over: boolean): void => {
            button.graphics.clear();
            // (the UI kit's obsidian button, 11 October)
            if (IoKit.slice(button.graphics, over ? "btn_obsidian_h" : "btn_obsidian", 0, 0, w, h)) {
                return;
            }
            button.graphics.lineStyle(1, this.SECONDARY);
            button.graphics.beginFill(this.SECONDARY, over ? 0.3 : 0.12);
            button.graphics.drawRect(0, 0, w, h);
            button.graphics.endFill();
        };
        draw(false);
        IoKit.whenLoaded(["btn_obsidian", "btn_obsidian_h"], (): void => {
            draw(false);
        });
        button.addChild(label);
        // (QoL #643: the Rules, under "What's different?", part of its button so it follows it)
        let rulesLink: TextField = new TextField();
        rulesLink.name = "ioAuthRules";
        rulesLink.defaultTextFormat = new TextFormat("Groboldov", 12, 0xFFC27A);
        rulesLink.embedFonts = true;
        rulesLink.selectable = false;
        rulesLink.mouseEnabled = false;
        rulesLink.autoSize = TextFieldAutoSize.LEFT;
        rulesLink.htmlText = "<u>" + AuthForm.ioT("io_rules_link") + "</u>";
        rulesLink.x = w - rulesLink.width;
        rulesLink.y = h + 3;
        button.addChild(rulesLink);
        button.buttonMode = true;
        button.useHandCursor = true;
        button.mouseChildren = false;
        button.x = this.DESIGN_WIDTH - 20 - w;
        button.y = 10;
        button.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        button.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        button.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            GLOBAL.gotoURL(GLOBAL.serverUrl + (e.localY > h ? "rules" : "whats-different"));
        });
        this.contentContainer.addChild(button);
    }

    private Loading(): void {
        let contentWidth: number = NaN;
        let updateImageLoader: Loader = null;
        // Remove previous loadingContainer if present
        if (this.loadingContainer && this.loadingContainer.parent) {
            this.loadingContainer.parent.removeChild(this.loadingContainer);
        }

        this.loadingContainer = new Sprite();
        this.contentContainer.addChild(this.loadingContainer);

        contentWidth = 400;

        // Create title
        let loadingTitle: TextField = new TextField();
        let titleFormat: TextFormat = new TextFormat();
        titleFormat.font = "Groboldov";
        titleFormat.size = 32;
        titleFormat.color = this.WHITE;
        titleFormat.align = TextFormatAlign.CENTER;
        loadingTitle.defaultTextFormat = titleFormat;
        loadingTitle.text = GLOBAL.INFERNO_ONLY ? AuthForm.ioT(GLOBAL.versionMismatch ? "io_t3k_auth_update" : "io_t3k_auth_connecting") : GLOBAL.versionMismatch ? "New Update Available!" : "Connecting to the server";
        loadingTitle.width = contentWidth;
        loadingTitle.height = 38;
        loadingTitle.x = 0;
        loadingTitle.selectable = false;
        loadingTitle.embedFonts = true;
        loadingTitle.antiAliasType = AntiAliasType.ADVANCED;
        loadingTitle.autoSize = TextFieldAutoSize.NONE;

        // Create description (only for non-version mismatch)
        let loadingDesc: TextField = null;
        if (!GLOBAL.versionMismatch) {
            loadingDesc = new TextField();
            let descFormat: TextFormat = new TextFormat();
            descFormat.font = "Verdana";
            descFormat.size = 14;
            descFormat.color = this.LIGHT_GRAY;
            descFormat.align = TextFormatAlign.CENTER;
            loadingDesc.defaultTextFormat = descFormat;
            loadingDesc.htmlText = "<font color='#ffffff'>Taking a while? Check our </font><font color='" + (GLOBAL.INFERNO_ONLY ? "#FF8C1E" : "#00CDB8") + "'><u>#server-status</u></font><font color='#ffffff'> on Discord.</font>";
            // (Inferno-only, QoL #202: this server's own links, from its config; none set: no link)
            if (GLOBAL.INFERNO_ONLY) {
                loadingDesc.htmlText = "<font color='#ffffff'>" + AuthForm.ioT("io_t3k_auth_slow") + "</font>";
                AuthForm.ioCommunity((c: any): void => {
                    if (c && (c.status || c.discord)) {
                        loadingDesc.htmlText = AuthForm.ioT("io_t3k_auth_slow_check", { "v1": AuthForm.ioT(c.status ? "io_t3k_auth_status" : "io_t3k_auth_discord") });
                    }
                });
            }
            loadingDesc.width = contentWidth;
            loadingDesc.height = 28;
            loadingDesc.x = 0;
            loadingDesc.y = 50;
            // Fixed position
            loadingDesc.selectable = false;
            loadingDesc.embedFonts = true;
            loadingDesc.antiAliasType = AntiAliasType.ADVANCED;
            loadingDesc.autoSize = TextFieldAutoSize.NONE;
            this.mousePointerCursor(loadingDesc);
            loadingDesc.addEventListener(MouseEvent.CLICK, AuthForm.DiscordLink);
            this.loadingContainer.addChild(loadingDesc);
        }

        // Create error message
        this.errMessage = new TextField();
        let errFormat: TextFormat = new TextFormat();
        errFormat.font = "Verdana";
        errFormat.size = 16;
        errFormat.color = this.RED;
        errFormat.align = TextFormatAlign.CENTER;
        errFormat.leading = 5;
        this.errMessage.defaultTextFormat = errFormat;
        this.errMessage.htmlText = GLOBAL.initError;
        this.errMessage.width = contentWidth;
        this.errMessage.x = 0;
        this.errMessage.wordWrap = true;
        this.errMessage.multiline = true;
        this.errMessage.embedFonts = true;
        this.errMessage.antiAliasType = AntiAliasType.ADVANCED;
        this.errMessage.autoSize = TextFieldAutoSize.LEFT;

        // Position elements based on version mismatch
        if (GLOBAL.versionMismatch) {
            loadingTitle.y = 140;
            this.errMessage.y = 190;

            updateImageLoader = new Loader();
            updateImageLoader.load(new URLRequest(GLOBAL.serverUrl + "assets/popups/fantastic.png"));
            updateImageLoader.contentLoaderInfo.addEventListener(Event.COMPLETE, (e: Event): void => {
                let img: Bitmap = as3.cast(updateImageLoader.content, Bitmap);
                img.x = (contentWidth - img.width) / 2;
                img.y = 0;
                this.loadingContainer.addChildAt(img, 0);
            });
        } else {
            // Positions for normal loading (no image)
            loadingTitle.y = 0;
            this.errMessage.y = 90;
        }

        // Add elements to container
        this.loadingContainer.addChild(loadingTitle);
        this.loadingContainer.addChild(this.errMessage);

        // (Inferno-only, QoL #214: a start that failed: offline said so, Try again, and the details to copy)
        if (GLOBAL.INFERNO_ONLY && GLOBAL.initError && !GLOBAL.versionMismatch) {
            this.ioInitFailed(contentWidth);
        }

        // Fixed container position
        this.loadingContainer.x = 200;
        this.loadingContainer.y = 200;
    }

    private static _ioOnlineWait: boolean = false;

    /** QoL #214: under the error, Try again (and by itself when the browser is back online) and Copy the details. */
    private ioInitFailed(contentWidth: number): void {
        let w: any = window as any;
        let offline: boolean = !!(w.navigator && w.navigator.onLine === false);
        if (offline) {
            this.errMessage.htmlText = AuthForm.ioT("io_t3k_auth_offline");
        }
        let retry: Function = (): void => {
            GLOBAL.initError = "";
            this.Loading();
            GLOBAL.init(0);
        };
        let y: number = this.errMessage.y + Math.max(24, this.errMessage.textHeight + 14);
        let again: Sprite = this.ioLinkButton(AuthForm.ioT("io_try_again"), 15, (): void => {
            retry();
        });
        again.name = "ioInitRetry";
        again.x = (contentWidth - again.width) / 2;
        again.y = y;
        this.loadingContainer.addChild(again);
        let details: string = "Error: " + String(GLOBAL.initError) + "\nBuild: " + String(IOBuild.stamp) + "\nTime: " + new Date().toISOString() + "\nOnline: " + (offline ? "no" : "yes") + "\nBrowser: " + String(w.navigator ? w.navigator.userAgent : "");
        let copy: Sprite = this.ioLinkButton(AuthForm.ioT("io_t3k_auth_copy_details"), 11, (): void => {
            try {
                w.navigator.clipboard.writeText(details);
                ((copy.getChildAt(0) as any) as TextField).text = AuthForm.ioT("io_t3k_auth_copied");
            } catch (e) {
            }
        });
        copy.name = "ioInitCopy";
        copy.x = (contentWidth - copy.width) / 2;
        copy.y = again.y + again.height + 8;
        this.loadingContainer.addChild(copy);
        if (!AuthForm._ioOnlineWait && w.addEventListener) {
            AuthForm._ioOnlineWait = true;
            w.addEventListener("online", (): void => {
                AuthForm._ioOnlineWait = false;
                if (GLOBAL.initError && this.loadingContainer && this.loadingContainer.stage) {
                    retry();
                }
            }, { once: true });
        }
    }

    /** An underlined orange link, as the login page's others. */
    private ioLinkButton(label: string, size: int, onClick: Function): Sprite {
        let b: Sprite = new Sprite();
        let t: TextField = new TextField();
        let f: TextFormat = new TextFormat("Verdana", size, 0xFF8C1E, true, false, true);
        t.defaultTextFormat = f;
        t.text = label;
        t.autoSize = TextFieldAutoSize.LEFT;
        t.selectable = false;
        t.embedFonts = true;
        t.antiAliasType = AntiAliasType.ADVANCED;
        b.addChild(t);
        b.buttonMode = true;
        b.mouseChildren = false;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            onClick();
        });
        return b;
    }

    public static DiscordLink(param1: Event = null): void {
        if (GLOBAL.INFERNO_ONLY) {
            let c: any = AuthForm._ioCommunity;
            let url: string = c ? String(c.status || c.discord || "") : "";
            if (url) {
                GLOBAL.gotoURL(url);
            }
            return;
        }
        GLOBAL.gotoURL("https://discord.gg/bymrefitted");
    }

    /** Inferno-only (QoL #202): this server's community links ({discord, status}), once asked for. */
    public static _ioCommunity: any = null;

    private static _ioCommunityWaiting: any[] = null;

    /** The community links, asked for once (`done` gets them, or null when the server can't say). */
    public static ioCommunity(done: Function): void {
        if (AuthForm._ioCommunity) {
            done(AuthForm._ioCommunity);
            return;
        }
        if (AuthForm._ioCommunityWaiting) {
            AuthForm._ioCommunityWaiting.push(done);
            return;
        }
        AuthForm._ioCommunityWaiting = [done];
        let finish: Function = (c: any): void => {
            AuthForm._ioCommunity = c;
            let list: any[] = AuthForm._ioCommunityWaiting || [];
            AuthForm._ioCommunityWaiting = null;
            for (let f of list) {
                try {
                    f(c);
                } catch (e) {
                }
            }
        };
        try {
            let w: any = window as any;
            w.fetch(String(GLOBAL.serverUrl || "/") + "community").then((r: any): any => r.json()).then((j: any): void => {
                finish(j && j.error === 0 ? j : null);
            }, (): void => {
                finish(null);
            });
        } catch (e) {
            finish(null);
        }
    }

    private HeaderTitle(): void {
        let navWidth: number = 800;
        let navHeight: number = 50;

        this.navContainer.graphics.drawRect(0, 0, navWidth, navHeight);
        this.navContainer.x = -20;
        this.navContainer.y = 50;

        let textContainer: Sprite = new Sprite();
        this.navContainer.addChild(textContainer);

        let titlePrefix: TextField = this.createRichText(KEYS.Get("auth_header_prefix"), this.WHITE);
        textContainer.addChild(titlePrefix);

        let titleSuffix: TextField = this.createRichText(KEYS.Get("auth_header_suffix"), this.SECONDARY);
        textContainer.addChild(titleSuffix);
        titleSuffix.x = titlePrefix.x + titlePrefix.width;

        textContainer.x = (navWidth - textContainer.width) / 2;
        textContainer.y = (navHeight - textContainer.height) / 2 + 30;
        // (QoL #522: kept, to be put in another language)
        this._ioHeadPrefix = titlePrefix;
        this._ioHeadSuffix = titleSuffix;
        this._ioHeadBox = textContainer;

        if (GLOBAL.INFERNO_ONLY) {
            let subtitle: TextField = new TextField();
            let subtitleFormat: TextFormat = new TextFormat("Groboldov", 16, 0xFFC27A);
            subtitleFormat.align = TextFormatAlign.CENTER;
            subtitle.defaultTextFormat = subtitleFormat;
            subtitle.embedFonts = true;
            subtitle.antiAliasType = AntiAliasType.NORMAL;
            subtitle.selectable = false;
            subtitle.width = navWidth;
            subtitle.height = 24;
            subtitle.y = textContainer.y + textContainer.height + 2;
            // (QoL #529: the name first, spelled as everywhere else)
            subtitle.text = AuthForm.ioT("io_t3k_auth_subtitle");
            subtitle.filters = [new GlowFilter(0x000000, 1, 4, 4, 6, 2)];
            this.navContainer.addChild(subtitle);
        }
    }

    // Essentially creates a 'span' element.
    private createRichText(text: string, color: uint): TextField {
        let textField: TextField = new TextField();
        let textFormat: TextFormat = new TextFormat();
        textFormat.font = "Groboldov";
        textFormat.size = 32;
        textFormat.color = color;
        textField.embedFonts = true;
        textField.antiAliasType = AntiAliasType.NORMAL;
        textField.autoSize = TextFieldAutoSize.LEFT;
        textField.defaultTextFormat = textFormat;
        textField.text = text;
        if (GLOBAL.INFERNO_ONLY) {
            textField.filters = [new GlowFilter(0x000000, 1, 4, 4, 6, 2)];
        }
        return textField;
    }

    private onImageLoaded(event: Event): void {
        // (13 October, bug report #90: the form was closed while its picture loaded, a refused saved login replacing it
        // with another, and the loader unloaded: no picture to place, nothing to place it in)
        let picture: Bitmap = this.loader ? as3.as(this.loader.content, Bitmap) : null;
        if (!picture || !this.formContainer) {
            return;
        }
        this.image = picture;

        this.image.x = 150;
        this.image.y = GLOBAL.INFERNO_ONLY ? 132 : 150;
        if (GLOBAL.INFERNO_ONLY) {
            // The saved-account list takes the picture's place on the login form.
            this.image.visible = this.isRegisterForm || IoSavedAccounts.list().length == 0;
        }
        this.image.scaleX = 1;
        this.image.scaleY = 1;
        this.formContainer.addChild(this.image);
    }

    // Function to create and position input fields
    private createBlock(width: number, height: number, placeholder: string = "", isPassword: boolean = false): TextField {
        let input: TextField = null;
        input = this.createInputField(width, height, placeholder, isPassword);
        this.formContainer.addChild(input);

        input.x = (this.formContainer.width - input.width) / 2;
        input.y = this.startY;

        input.addEventListener(Event.CHANGE, (event: Event): void => {
            // (Inferno-only: the error lines go once the player fixes the field)
            // (QoL #513: and of the sign-up's own lines, only this field's: the others' problems are still there)
            if (GLOBAL.INFERNO_ONLY) {
                this.clearErrorMessages(input);
            }
            if (placeholder == "Email") {
                this.emailValue = input.text;
            } else if (placeholder == "Password") {
                this.passwordValue = input.text;
            } else if (placeholder == "Username") {
                this.usernameValue = input.text;
            }
        });

        // Gap between each block
        this.startY += input.height + 20;

        return input;
    }

    private createInputField(width: number, height: number, placeholder: string = "", isPassword: boolean = false): TextField {
        let input: TextField = null;
        let inputTextFormat: TextFormat = null;
        let placeholderTextFormat: TextFormat = null;
        input = new TextField();
        input.type = TextFieldType.INPUT;
        input.width = width;
        input.height = height;

        // Normal input
        inputTextFormat = new TextFormat();
        inputTextFormat.font = "Verdana";
        inputTextFormat.size = 14;
        inputTextFormat.color = GLOBAL.INFERNO_ONLY ? 0x3A1A08 : this.WHITE;

        input.embedFonts = true;
        input.antiAliasType = AntiAliasType.NORMAL;
        input.defaultTextFormat = inputTextFormat;

        // Placeholder
        placeholderTextFormat = new TextFormat();
        placeholderTextFormat.font = "Verdana";
        placeholderTextFormat.size = 14;
        placeholderTextFormat.color = GLOBAL.INFERNO_ONLY ? 0x9A8060 : this.WHITE;

        input.text = AuthForm.ioHintWord(placeholder);
        input.setTextFormat(placeholderTextFormat);

        if (isPassword) {
            input.displayAsPassword = true;
            // (Inferno-only, QoL #527: the server takes at most 72; more was cut without a word)
            if (GLOBAL.INFERNO_ONLY) {
                input.maxChars = 72;
            }
        }
        // (Inferno-only, 9 October: the word "Password" showed as stars; it is shown as itself, the stars only
        // for what is typed, and not at all while the eye shows the password)
        if (isPassword && placeholder && GLOBAL.INFERNO_ONLY) {
            input.displayAsPassword = false;
        }

        if (placeholder) {
            input.text = AuthForm.ioHintWord(placeholder);
            // (the hint shown can change with the form: the login form's email field also takes a username)
            (input as any).ioHint = AuthForm.ioHintWord(placeholder);
            (input as any).ioHintFormat = placeholderTextFormat;

            input.addEventListener(FocusEvent.FOCUS_IN, (event: FocusEvent): void => {
                if (input.text == placeholder || input.text == (input as any).ioHint) {
                    input.text = "";
                    input.setTextFormat(inputTextFormat);
                }
                if (isPassword && GLOBAL.INFERNO_ONLY) {
                    input.displayAsPassword = !this._ioShowPassword;
                }
            });

            input.addEventListener(FocusEvent.FOCUS_OUT, (event: FocusEvent): void => {
                if (input.text == "") {
                    if (isPassword && GLOBAL.INFERNO_ONLY) {
                        input.displayAsPassword = false;
                    }
                    input.text = (input as any).ioHint || placeholder;
                    input.setTextFormat(placeholderTextFormat);
                }
            });
        }

        return input;
    }

    private createSelectInput(defaultOption: string = "English"): Sprite {
        this.selectField = new Sprite();
        let selectWidth: number = 80;
        let selectHeight: number = 30;
        this.ioSelectFace(selectWidth);
        if (GLOBAL.INFERNO_ONLY) {
            IoKit.whenLoaded(["btn_obsidian"], (): void => {
                this.ioSelectFace(this._ioSelectW > 0 ? this._ioSelectW : selectWidth);
            });
        }

        this.defaultText = new TextField();
        let defaultTextStyle: TextFormat = new TextFormat();
        defaultTextStyle.font = "Groboldov";
        defaultTextStyle.size = 13;

        this.defaultText.textColor = this.WHITE;
        this.defaultText.embedFonts = true;
        this.defaultText.defaultTextFormat = defaultTextStyle;
        this.defaultText.text = defaultOption.toLocaleUpperCase();
        if (GLOBAL.INFERNO_ONLY && this.defaultText.textWidth + 23 > selectWidth) {
            selectWidth = this.defaultText.textWidth + 23;
            this.ioSelectFace(selectWidth);
        }
        this.defaultText.x = (selectWidth - this.defaultText.textWidth) / 2;
        this.defaultText.y = (selectHeight - this.defaultText.textHeight) / 2;
        this.mousePointerCursor(this.defaultText);
        this.selectField.addChild(this.defaultText);

        // Create the dropdown menu
        this.dropdownMenu = new Sprite();
        this.dropdownMenu.visible = false;
        this.selectField.addChild(this.dropdownMenu);

        // Populate the dropdown menu with options
        for (let index: int = 0; index < this.languages.length; index++) {
            let langSelectText: TextField = new TextField();
            let langSelectTextStyle: TextFormat = new TextFormat();
            langSelectTextStyle.font = "Groboldov";
            langSelectTextStyle.size = 13;

            langSelectText.embedFonts = true;
            langSelectText.textColor = this.WHITE;
            langSelectText.defaultTextFormat = langSelectTextStyle;
            langSelectText.text = as3.str(this.languages[index].toLocaleUpperCase());
            langSelectText.y = index * 30;
            langSelectText.width = 200;
            langSelectText.selectable = false;
            langSelectText.antiAliasType = AntiAliasType.NORMAL;
            langSelectText.addEventListener(MouseEvent.CLICK, as3.bind(this, this.langSelectClickHandler));
            this.mousePointerCursor(langSelectText);
            this.dropdownMenu.addChild(langSelectText);
        }

        // Handle click events to toggle the dropdown menu visibility
        this.selectField.addEventListener(MouseEvent.CLICK, (event: MouseEvent): void => {
            this.dropdownMenu.visible = !this.dropdownMenu.visible;
        });

        this.dropdownMenu.y = 50;

        return this.selectField;
    }

    // Function to handle language select event
    private langSelectClickHandler(event: MouseEvent): void {
        let selectedLanguage: string = as3.str(event.currentTarget.text);
        this.defaultText.text = selectedLanguage;
        this.defaultText.width = 200;
        this.dropdownMenu.visible = true;

        let textWidth: number = this.defaultText.textWidth;
        let newSelectWidth: number = textWidth + 23;

        this.ioSelectFace(newSelectWidth);

        // Iterate over the supported languages and pass them to KEYS.Setup()
        // to grab available language file.
        for (const $value of as3.values(this.languages)) {
            let language: string = as3.str($value);
            if (selectedLanguage.toLocaleLowerCase() === language.toLocaleLowerCase()) {
                KEYS.Setup(language.toLowerCase());
                // (Inferno-only, QoL #233: kept for the next visit, logged in or not)
                if (GLOBAL.INFERNO_ONLY) {
                    try {
                        let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
                        so.data.language = language.toLowerCase();
                        so.flush();
                    } catch (e) {
                    }
                }
                return;
            }
        }
        KEYS.Setup("english");
    }

    private _ioSelectW: number;

    /** (13 October) an email chosen before the form was built (LOGIN.ioShowForm): put in once it is. */
    private _ioPendingEmail: string;

    /** The language picker's face: the UI kit's obsidian button (Inferno, 11 October), else the white outline. */
    private ioSelectFace(w: number): void {
        this._ioSelectW = w;
        this.selectField.graphics.clear();
        if (GLOBAL.INFERNO_ONLY && IoKit.slice(this.selectField.graphics, "btn_obsidian", 0, 0, w, 30)) {
            return;
        }
        this.selectField.graphics.lineStyle(1, this.WHITE);
        this.selectField.graphics.drawRect(0, 0, w, 30);
    }

    private CreateBorder(input: TextField): Sprite {
        if (GLOBAL.INFERNO_ONLY) {
            return this.ioInputBox(input);
        }
        this.borderContainer = new Sprite();
        this.borderContainer.graphics.lineStyle(1, this.WHITE);
        this.borderContainer.graphics.moveTo(0, 2);
        this.borderContainer.graphics.lineTo(input.width, 2);
        this.borderContainer.x = input.x;
        this.borderContainer.y = input.y + input.height;

        this.formContainer.addChild(this.borderContainer);
        return this.borderContainer;
    }

    private createButton(): Sprite {
        let formRadius: number = 16;
        this.button = new Sprite();
        this.updateButtonColor();
        this.button.buttonMode = true;
        this.button.useHandCursor = true;
        this.button.mouseChildren = false;

        this.buttonText = new TextField();
        this.buttonText.textColor = this.WHITE;
        this.buttonText.width = this.button.width;
        this.buttonText.height = this.button.height;
        this.buttonText.selectable = false;
        this.buttonText.mouseEnabled = false;

        let textFormat: TextFormat = new TextFormat();
        textFormat.font = "Groboldov";
        textFormat.size = 16;
        textFormat.align = TextFormatAlign.CENTER;
        this.buttonText.embedFonts = true;
        this.buttonText.defaultTextFormat = textFormat;
        this.updateButtonText();

        this.buttonText.autoSize = TextFieldAutoSize.CENTER;
        if (GLOBAL.INFERNO_ONLY) {
            this.buttonText.filters = [new GlowFilter(0x5A2A06, 1, 3, 3, 8, 2)];
        }
        this.buttonText.x = (this.button.width - this.buttonText.width) / 2;
        this.buttonText.y = (this.button.height - this.buttonText.height) / 2;
        this.mousePointerCursor(this.button);

        this.button.addChild(this.buttonText);

        return this.button;
    }

    private FormNavigate(): void {
        let linkContainer: Sprite = new Sprite();
        linkContainer.buttonMode = true;
        linkContainer.useHandCursor = true;
        linkContainer.mouseChildren = false;

        this.hasAccountText = new TextField();
        this.hasAccountText.autoSize = TextFieldAutoSize.LEFT;
        this.hasAccountText.x = linkContainer.width / 2;

        this.hasAccountFormat = new TextFormat();
        this.hasAccountFormat.size = 16;
        this.updateLinkColour();
        this.updateLinkText();

        this.hasAccountText.y = 0;
        linkContainer.addChild(this.hasAccountText);

        linkContainer.x = (this.formContainer.width - linkContainer.width) / 2;
        linkContainer.y = this.submitButton.y + this.submitButton.height + 15;
        this.mousePointerCursor(linkContainer);

        this.formContainer.addChild(linkContainer);
        let toggle: Function = (): void => {
            this.isRegisterForm = !this.isRegisterForm;
            this.updateState();
            if (GLOBAL.INFERNO_ONLY) {
                this.ioFocus(this.isRegisterForm ? this.usernameInput : (this.emailValue ? this.passwordInput : this.emailInput));
            }
        };
        linkContainer.addEventListener(MouseEvent.CLICK, (event: Event): void => {
            toggle();
        });
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #525: reached with Tab, Enter follows it)
            linkContainer.name = "ioAuthSwitch";
            this._ioLink = linkContainer;
            this.ioActivatable(linkContainer, toggle);
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioRegisterWarning(linkContainer.y + 30);
        }
    }

    /**
     * Inferno-only (QoL #516): "Keep me signed in on this computer (14 days)", a box to tick under the login form's link
     * (LOGIN.ioKeep, for the sign-in with the password). Unticked: the login lasts until the browser is closed, and the
     * account's name isn't kept on this page. Ticked or not, the browser remembers the choice for the next time (the
     * game's local data, "bymr_data", ioKeepLogin); ticked at first. Not on the register form.
     */
    private ioBuildKeep(): void {
        if (this._ioKeepBox || !this._ioLink) {
            return;
        }
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            LOGIN.ioKeep = so.data.ioKeepLogin !== false;
        } catch (e) {
        }
        let box: Sprite = new Sprite();
        box.name = "ioKeepSignedIn";
        box.buttonMode = true;
        box.useHandCursor = true;
        box.mouseChildren = false;
        box.tabEnabled = true;
        this.mousePointerCursor(box);
        let label: TextField = new TextField();
        let format: TextFormat = new TextFormat("Verdana", 12, 0x5A3418, true);
        label.defaultTextFormat = format;
        label.selectable = false;
        label.mouseEnabled = false;
        label.autoSize = TextFieldAutoSize.LEFT;
        label.text = AuthForm.ioT("io_acc_keep", { "v1": 14 });
        label.x = 22;
        label.y = -1;
        box.addChild(label);
        let draw: Function = (): void => {
            let g: Graphics = box.graphics;
            g.clear();
            // (a clear area to click, the label's too)
            g.beginFill(0xFFFFFF, 0.01);
            g.drawRect(-4, -4, 26 + label.width, 24);
            g.endFill();
            g.lineStyle(2, 10121800);
            g.beginFill(16776170);
            g.drawRoundRect(0, 0, 16, 16, 5, 5);
            g.endFill();
            if (LOGIN.ioKeep) {
                g.lineStyle(3, 0xD66A16);
                g.moveTo(3.5, 8.5);
                g.lineTo(7, 12);
                g.lineTo(13, 4);
            }
        };
        let toggle: Function = (): void => {
            LOGIN.ioKeep = !LOGIN.ioKeep;
            try {
                let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
                so.data.ioKeepLogin = LOGIN.ioKeep;
                so.flush();
            } catch (e) {
            }
            draw();
        };
        draw();
        box.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            toggle();
        });
        this.ioActivatable(box, toggle);
        box.x = Math.round((450 - (22 + label.width)) / 2);
        box.y = this._ioLink.y + 32;
        this.formContainer.addChild(box);
        this._ioKeepBox = box;
        this.ioKeepShow();
    }

    /** QoL #516: the box shows on the login form only (not the register form, nor the first visit's two choices). */
    private ioKeepShow(): void {
        if (this._ioKeepBox) {
            this._ioKeepBox.visible = !this.isRegisterForm && !this._ioChooserOn;
        }
    }

    private ioRegisterWarning(param1: number): void {
        let field: TextField = new TextField();
        // (15 October: 13 point over 420, two lines; at 15 over 380 its third line ran past the frame's bottom)
        let format: TextFormat = new TextFormat("Groboldov", 13, 0xFFF4E0, false);
        format.align = TextFormatAlign.CENTER;
        field.defaultTextFormat = format;
        field.embedFonts = true;
        field.antiAliasType = AntiAliasType.ADVANCED;
        field.selectable = false;
        field.mouseEnabled = false;
        field.wordWrap = true;
        field.multiline = true;
        field.width = 420;
        field.height = 40;
        field.x = (450 - field.width) / 2;
        field.y = param1;
        field.name = "ioRegisterWarning";
        // (Inferno-only, 14 October, QoL #205: the email is the login, so the player is told to keep it)
        field.text = AuthForm.ioT("io_t3k_auth_warning");
        this._ioWarningGlow = new GlowFilter(0x8B0000, 1, 8, 8, 3, 2);
        field.filters = [this._ioWarningGlow];
        field.visible = this.isRegisterForm;
        this.formContainer.addChild(field);
        this._ioWarning = field;
        field.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPulseWarning));
    }

    /** The glow swells and fades about once a second while the register form shows. */
    private ioPulseWarning(param1: Event): void {
        if (!this._ioWarning || !this._ioWarning.visible) {
            return;
        }
        this._ioWarningPhase += 0.11;
        let k: number = 0.5 + 0.5 * Math.sin(this._ioWarningPhase);
        this._ioWarningGlow.blurX = this._ioWarningGlow.blurY = 5 + 9 * k;
        this._ioWarningGlow.strength = 2 + 3 * k;
        this._ioWarningGlow.alpha = 0.55 + 0.45 * k;
        this._ioWarning.filters = [this._ioWarningGlow];
    }

    private updateFormFields(): void {
        if (this.isRegisterForm) {
            this.usernameInput.width = 350;
            this.usernameInput.height = 35;
            this.usernameInput.x = 50;
            // (Inferno-only, QoL #513: a little higher, for its own error line between it and the email)
            this.usernameInput.y = this.emailInput.y - this.usernameInput.height - (GLOBAL.INFERNO_ONLY ? 29 : 20);
            this.CreateBorder(this.usernameInput);
        }
    }

    private updateLinkText(): void {
        this.hasAccountText.embedFonts = true;
        this.hasAccountText.antiAliasType = AntiAliasType.NORMAL;
        this.hasAccountText.text = this.isRegisterForm ? KEYS.Get("auth_login_link") : KEYS.Get("auth_register_link");
    }

    private updateLinkColour(): void {
        this.hasAccountFormat.color = this.isRegisterForm ? this.SECONDARY : this.PRIMARY;
        this.hasAccountFormat.font = "Verdana";
        this.hasAccountText.defaultTextFormat = this.hasAccountFormat;
        this.hasAccountText.setTextFormat(this.hasAccountFormat);
    }

    /**
     * Inferno-only (QoL #515): "LOGGING IN…" / "CREATING ACCOUNT…" on the button while the server is asked; back to
     * the button's own word when it has answered. On a slow line the click seemed to do nothing.
     */
    private ioShowBusy(): void {
        let busy: boolean = this.isRegisterForm ? this._ioRegistering : LOGIN.ioLoginPending;
        if (!busy || !this.buttonText) {
            return;
        }
        this.buttonText.text = KEYS.Get(this.isRegisterForm ? "io_auth_creating" : "io_auth_logging_in").toUpperCase();
        this.buttonText.x = (this.button.width - this.buttonText.width) / 2;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioBusyTick));
    }

    private ioBusyTick(e: Event = null): void {
        let busy: boolean = this.isRegisterForm ? this._ioRegistering : LOGIN.ioLoginPending;
        if (busy && this.stage) {
            return;
        }
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioBusyTick));
        if (this.buttonText) {
            this.buttonText.text = this.isRegisterForm ? KEYS.Get("auth_register_btn").toUpperCase() : KEYS.Get("auth_login_btn").toUpperCase();
            this.buttonText.x = (this.button.width - this.buttonText.width) / 2;
        }
    }

    private updateButtonText(): void {
        this.button.graphics.beginFill(this.isRegisterForm ? this.PRIMARY : this.SECONDARY);
        this.buttonText.text = this.isRegisterForm ? KEYS.Get("auth_register_btn").toUpperCase() : KEYS.Get("auth_login_btn").toUpperCase();
    }

    private updateButtonColor(): void {
        if (GLOBAL.INFERNO_ONLY && this.button && IoKit.has("btn_molten") && IoKit.has("btn_molten_h")) {
            // the UI kit's molten button (11 October): the register button the brighter one
            this.button.graphics.clear();
            IoKit.slice(this.button.graphics, this.isRegisterForm ? "btn_molten_h" : "btn_molten", 0, 0, 350, 50);
            return;
        }
        if (GLOBAL.INFERNO_ONLY && this.button) {
            IoKit.whenLoaded(["btn_molten", "btn_molten_h"], (): void => {
                this.updateButtonColor();
            });
        }
        if (GLOBAL.INFERNO_ONLY) {
            // Gold, like the game's highlighted buttons; the register button is a deeper orange.
            let shade: Matrix = new Matrix();
            shade.createGradientBox(350, 50, Math.PI / 2);
            this.button.graphics.clear();
            this.button.graphics.lineStyle(2, 6961674);
            this.button.graphics.beginGradientFill(GradientType.LINEAR, this.isRegisterForm ? [0xFFB35A, 0xD9661A] : [0xFFE27A, 0xE8A21E], [1, 1], [0, 255], shade);
            this.button.graphics.drawRoundRect(0, 0, 350, 50, 14);
            this.button.graphics.endFill();
            return;
        }
        this.button.graphics.beginFill(this.isRegisterForm ? this.SECONDARY : this.PRIMARY);
        this.button.graphics.drawRoundRect(0, 0, 350, 50, 12);
        this.button.graphics.endFill();
    }

    private mousePointerCursor(element: any): void {
        element.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            Mouse.cursor = MouseCursor.BUTTON;
        });

        element.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            Mouse.cursor = MouseCursor.AUTO;
        });
    }

    private submitButtonClickHandler(event: MouseEvent): void {
        this.clearErrorMessages();
        if (GLOBAL.INFERNO_ONLY) {
            // (spaces around a pasted address or name are not part of it)
            this.emailValue = this.emailValue.replace(/^\s+|\s+$/g, "");
            this.usernameValue = this.usernameValue.replace(/^\s+|\s+$/g, "");
        }

        let isUsernameValid: boolean = this.isValidUsername(this.usernameValue);
        let isEmailValid: boolean = this.isValidEmail(this.emailValue);
        if (GLOBAL.INFERNO_ONLY && !this.isRegisterForm && !isEmailValid) {
            // (QoL #196: signing in, the username works too; the server finds the account's email)
            isEmailValid = this.isValidUsername(this.emailValue);
        }
        let isPasswordValid: boolean = this.isValidPassword(this.passwordValue);
        if (GLOBAL.INFERNO_ONLY && !this.isRegisterForm) {
            // (logging in: the server checks the password; the new-password rules are only for registering, and
            // turned away older passwords before they were sent)
            isPasswordValid = this.passwordValue.length > 0;
        }
        if (GLOBAL.INFERNO_ONLY && this.isRegisterForm && (!isUsernameValid || !isEmailValid || !isPasswordValid)) {
            // (QoL #513: each problem under its own field, the name's too (it was a popup), and the first field to fix
            // gets the focus (it was the password's))
            if (!isUsernameValid) {
                this.ioFieldError(this.usernameInput, AuthForm.ioT("io_auth2_name_bad"));
            }
            if (!isEmailValid) {
                this.ioFieldError(this.emailInput, AuthForm.ioT("io_t3k_auth_need_valid_email"));
            }
            if (!isPasswordValid) {
                this.ioFieldError(this.passwordInput, AuthForm.ioPasswordRule());
            }
            this.ioFocus(!isUsernameValid ? this.usernameInput : (!isEmailValid ? this.emailInput : this.passwordInput));
            return;
        }

        if (isEmailValid && isPasswordValid) {
            if (this.isRegisterForm) {
                if (isUsernameValid) {
                    let newUser: any[] = [["username", this.usernameValue], ["email", this.emailValue], ["password", this.passwordValue], ["last_name", ""], ["pic_square", ""]];
                    newUser.push(["ref", this.ioReferralCode()]);
                    // Inferno-only: one registration at a time. Clicked twice, the second was refused with "An
                    // account with this username already exists." over the first one's success (bug report #58).
                    if (GLOBAL.INFERNO_ONLY) {
                        if (this._ioRegistering) {
                            return;
                        }
                        // (QoL #511: "gmial.com"? asked once, before anything else: a typo in the address loses the
                        // account, as there is no reset by email)
                        let fixed: string = AuthForm.ioDomainTypo(this.emailValue);
                        if (fixed && !this._ioTypoAsked) {
                            this._ioTypoAsked = true;
                            GLOBAL.Message(KEYS.Get("io_auth_typo", { "v1": this.emailValue, "v2": fixed }), KEYS.Get("io_auth_typo_use", { "v1": fixed.split("@")[1] }), (): void => {
                                this.emailValue = fixed;
                                if (this.emailInput) {
                                    this.emailInput.text = fixed;
                                }
                                this.submitButtonClickHandler(null);
                            }, null, KEYS.Get("io_auth_typo_keep"), (): void => {
                                this.submitButtonClickHandler(null);
                            });
                            return;
                        }
                        // (QoL #510: the password typed twice. There is no reset from the game: a typo lost the
                        // account)
                        if (!this.ioPasswordTwice()) {
                            return;
                        }
                        this._ioRegistering = true;
                    }

                    if (GLOBAL.INFERNO_ONLY) {
                        this.ioShowBusy();
                    }
                    new URLLoaderApi().load(GLOBAL._apiURL + "player/register", newUser, as3.bind(this, this.registerNewUser), (event: IOErrorEvent): void => {
                        this._ioRegistering = false;
                        GLOBAL.Message(GLOBAL.INFERNO_ONLY ? AuthForm.ioT("io_t3k_auth_register_error") : "An error occurred during registration on the server.");
                    });
                } else {
                    GLOBAL.Message("<b>Usernames must be:</b><br><br>• At least 2 characters long.<br>• No longer than 12 characters.<br>• Can only include numbers and letters.");
                }
            } else {
                // Authentication call
                const authInfo: any[] = [["email", this.emailValue], ["password", this.passwordValue]];
                LOGIN.AuthenticateUser(authInfo);
                if (GLOBAL.INFERNO_ONLY) {
                    this.ioShowBusy();
                }
            }
        } else {
            if (!isEmailValid) {
                this.showErrorMessage(this.emailInput, GLOBAL.INFERNO_ONLY ? AuthForm.ioT(!this.isRegisterForm ? "io_t3k_auth_need_email_or_name" : "io_t3k_auth_need_valid_email") : "Please enter a valid email address");
            }
            if (!isPasswordValid) {
                this.showErrorMessage(this.passwordInput, GLOBAL.INFERNO_ONLY ? (!this.isRegisterForm ? AuthForm.ioT("io_t3k_auth_need_password") : AuthForm.ioPasswordRule()) : "Password must be at least 8 characters long and contain\nat least 1 special character");
            }
            if (GLOBAL.INFERNO_ONLY) {
                // (to the first field that needs fixing)
                this.ioFocus(!isEmailValid ? this.emailInput : (!isPasswordValid ? this.passwordInput : null));
            }
            if (!isUsernameValid && this.isRegisterForm) {
                GLOBAL.Message("<b>Usernames must be:</b><br><br>• At least 2 characters long.<br>• No longer than 12 characters.<br>• Can only include numbers and letters.");
            }
        }
    }

    /**
     * Inferno-only (QoL #510): registering, the password is asked a second time in the same field. The first
     * Register keeps it and empties the field ("Type the password again"); the second goes on when the two match,
     * or starts over when they don't. True: typed twice and the same.
     */
    private ioPasswordTwice(): boolean {
        // (QoL #513: typed twice already, before the server turned the name or the address down: not asked again)
        if (this._ioConfirmedPassword != null && this._ioFirstPassword == null && this.passwordValue == this._ioConfirmedPassword) {
            return true;
        }
        if (this._ioFirstPassword == null) {
            this._ioFirstPassword = this.passwordValue;
            this.ioAskPassword(AuthForm.ioHintWord("Password again"), AuthForm.ioT("io_t3k_auth_again_line"), 0xFFE6A0);
            return false;
        }
        if (this.passwordValue == this._ioFirstPassword) {
            this._ioConfirmedPassword = this.passwordValue;
            this.ioPasswordAsked();
            return true;
        }
        this._ioFirstPassword = null;
        this.ioAskPassword(AuthForm.ioHintWord("Password"), AuthForm.ioT("io_t3k_auth_nomatch_line"), 0xFF9A7A);
        return false;
    }

    /** The password field emptied, its hint `hint`, and `line` under it until the password is taken. */
    private ioAskPassword(hint: string, line: string, colour: uint): void {
        (this.passwordInput as any).ioHint = hint;
        this.passwordValue = "";
        this.passwordInput.text = "";
        if (!this._ioConfirmLine) {
            let field: TextField = new TextField();
            field.defaultTextFormat = new TextFormat("Verdana", 11, colour);
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = 380;
            field.height = 18;
            field.name = "ioPasswordAgain";
            field.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 1)];
            this.formContainer.addChild(field);
            this._ioConfirmLine = field;
        }
        let format: TextFormat = new TextFormat("Verdana", 11, colour);
        this._ioConfirmLine.defaultTextFormat = format;
        this._ioConfirmLine.text = line;
        this._ioConfirmLine.setTextFormat(format);
        this._ioConfirmLine.x = this.passwordInput.x;
        this._ioConfirmLine.y = this.passwordInput.y + this.passwordInput.height + 4;
        this._ioConfirmLine.visible = true;
        if (this._ioRulesLine) {
            this._ioRulesLine.visible = false;
        }
        this.ioFocus(this.passwordInput);
    }

    /** The second asking over (taken, or the form switched). */
    private ioPasswordAsked(): void {
        this._ioFirstPassword = null;
        if (this.passwordInput) {
            (this.passwordInput as any).ioHint = AuthForm.ioHintWord("Password");
            if (this.passwordInput.text == AuthForm.ioHintWord("Password again")) {
                this.passwordInput.text = AuthForm.ioHintWord("Password");
            }
        }
        if (this._ioConfirmLine) {
            this._ioConfirmLine.visible = false;
        }
    }

    /** The invite code this game was started with (GAME.setLauncherVars), or "". */
    private ioReferralCode(): string {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            // (QoL #519: an invite kept over 30 days is dropped)
            if (GLOBAL.INFERNO_ONLY && so.data.ioReferral && so.data.ioReferralAt && Date.now() - Number(so.data.ioReferralAt) > 30 * 86400000) {
                delete so.data.ioReferral;
                delete so.data.ioReferralAt;
                so.flush();
            }
            return so.data.ioReferral ? String(so.data.ioReferral) : "";
        } catch (e) {
        }
        return "";
    }

    private registerNewUser(serverData: any): void {
        this._ioRegistering = false;
        if (serverData.hasOwnProperty("error")) {
            // (Inferno-only, QoL #513, #514: what the server found wrong, each under its field: a taken name with free
            // ones to pick, a taken address with Log in instead)
            if (GLOBAL.INFERNO_ONLY && this.isRegisterForm && this.ioServerProblems(serverData)) {
                return;
            }
            GLOBAL.Message(as3.str(serverData.error));
            return;
        }
        // (Inferno-only, QoL #511: the welcome says which address the account logs in with)
        if (GLOBAL.INFERNO_ONLY) {
            LOGIN.ioNewAccountEmail = this.emailValue;
        }
        // (Inferno-only, QoL #509: logged in at once. "Please login to continue" lost new players there, and an
        // invite only pays once the friend's yard is made)
        if (!GLOBAL.INFERNO_ONLY) {
            GLOBAL.Message("You have successfully registered an account. Please login to continue.");
        }
        try {
            // The invite has been used: it must not be sent with a second account from this machine.
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            delete so.data.ioReferral;
            delete so.data.ioReferralAt;
            so.flush();
        } catch (e) {
        }
        this.isRegisterForm = false;
        this.updateState();
        if (GLOBAL.INFERNO_ONLY) {
            LOGIN.AuthenticateUser([["email", this.emailValue], ["password", this.passwordValue]]);
        }
    }

    /** (Inferno-only, QoL #511) the typo question was asked for this form */
    private _ioTypoAsked: boolean;

    /** QoL #511: the address with a common mail domain's typo put right ("ann@gmial.com" → "ann@gmail.com"), or null. */
    public static ioDomainTypo(email: string): string {
        let at: int = email.lastIndexOf("@");
        if (at < 1) {
            return null;
        }
        let domain: string = email.substr(at + 1).toLowerCase();
        let known: string[] = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com", "live.com", "aol.com", "hotmail.fr", "yahoo.fr", "orange.fr", "free.fr", "gmx.de", "web.de", "hotmail.co.uk", "yahoo.co.uk", "proton.me", "protonmail.com", "msn.com", "me.com", "mail.com", "yandex.ru", "mail.ru", "uol.com.br", "bol.com.br", "terra.com.br", "hotmail.es", "yahoo.es", "ymail.com", "googlemail.com", "rocketmail.com", "hotmail.de", "hotmail.it", "outlook.fr", "outlook.es", "live.fr", "live.co.uk", "gmx.net", "gmx.com", "gmx.fr", "laposte.net", "sfr.fr", "wanadoo.fr", "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "yahoo.com.br", "hotmail.com.br", "outlook.com.br", "pm.me", "tutanota.com", "zoho.com", "qq.com", "163.com", "naver.com", "libero.it", "virgilio.it", "t-online.de", "bigpond.com", "shaw.ca", "rogers.com", "btinternet.com", "mac.com", "ya.ru", "seznam.cz", "wp.pl", "o2.pl", "onet.pl", "inbox.lv", "abv.bg"];
        // (a domain that isn't a common one's typo is left alone; "Keep mine" is always offered)
        if (known.indexOf(domain) >= 0) {
            return null;
        }
        let best: string = null;
        let bestD: int = 3;
        for (let k of known) {
            let d: int = AuthForm.ioDistance(domain, k);
            if (d < bestD) {
                bestD = d;
                best = k;
            }
        }
        // (one or two letters off, and not a short domain that is merely like one: "me.co" is not "me.com")
        return best && domain.length >= 6 && bestD <= (domain.length >= 9 ? 2 : 1) ? email.substr(0, at + 1) + best : null;
    }

    /** Letters to change, add or remove to make one word the other (a swap of two counts once). */
    private static ioDistance(a: string, b: string): int {
        let d: any[] = [];
        for (let i: int = 0; i <= a.length; i++) {
            d[i] = [i];
        }
        for (let j: int = 0; j <= b.length; j++) {
            d[0][j] = j;
        }
        for (let i: int = 1; i <= a.length; i++) {
            for (let j: int = 1; j <= b.length; j++) {
                let cost: int = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
                if (i > 1 && j > 1 && a.charAt(i - 1) == b.charAt(j - 2) && a.charAt(i - 2) == b.charAt(j - 1)) {
                    d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
                }
            }
        }
        return d[a.length][b.length] | 0;
    }

    private isValidUsername(username: string): boolean {
        let pattern: RegExp = /^[a-zA-Z0-9_]+$/;
        return username.length >= 2 && username.length <= 12 && pattern.test(username);
    }

    private isValidEmail(email: string): boolean {
        // (Inferno-only: endings longer than four letters, .online or .email, are addresses too)
        let emailPattern: RegExp = GLOBAL.INFERNO_ONLY ? /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/ : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        return emailPattern.test(email);
    }

    private isValidPassword(password: string): boolean {
        let trimmed: string = password.replace(/^\s+|\s+$/g, "");
        return trimmed.length >= 8 && /[^a-zA-Z0-9]/.test(trimmed);
    }

    private clearErrorMessages(only: TextField = null): void {
        this.emailErrorText.text = "";
        this.passwordErrorText.text = "";
        if (GLOBAL.INFERNO_ONLY) {
            if (only) {
                this.ioClearFieldError(only);
            } else {
                this.ioClearFieldErrors();
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Inferno-only (QoL #513, #514): the sign-up's problems, each on a line under its own field, with what can be
    // done about it: a free name to pick for a taken one, Log in instead for an address that has an account.
    // ---------------------------------------------------------------------------------------------

    /** The server's problems (register.ts, data.io), each under its field; false when it sent none of those. */
    private ioServerProblems(serverData: any): boolean {
        let io: any = serverData && serverData.errorDetails && serverData.errorDetails.data ? serverData.errorDetails.data.io : null;
        if (!io || !io.fields) {
            return false;
        }
        let fields: any = io.fields;
        let taken: any = io.taken || {};
        let first: TextField = null;
        if (fields.username) {
            let picks: any[] = [];
            if (taken.username && io.suggestions) {
                for (let s of as3.values(io.suggestions)) {
                    let name: string = String(s);
                    if (/^[a-zA-Z0-9_]{2,12}$/.test(name) && picks.length < 3) {
                        picks.push({ "label": name, "name": "ioAuthSuggest" + picks.length, "fn": (): void => {
                            this.ioUseSuggestion(name);
                        } });
                    }
                }
            }
            let said: string = taken.username ? AuthForm.ioT("io_auth2_name_taken") + (picks.length ? " " + AuthForm.ioT("io_auth2_try") : "") : String(fields.username);
            this.ioFieldError(this.usernameInput, said, picks);
            first = this.usernameInput;
        }
        if (fields.email) {
            let instead: any[] = taken.email ? [{ "label": AuthForm.ioT("io_auth2_login_instead"), "name": "ioAuthLoginInstead", "fn": (): void => {
                this.ioLoginInstead();
            } }] : null;
            this.ioFieldError(this.emailInput, taken.email ? AuthForm.ioT("io_auth2_email_taken") : String(fields.email), instead);
            first = first || this.emailInput;
        }
        if (fields.password) {
            this.ioFieldError(this.passwordInput, String(fields.password));
            first = first || this.passwordInput;
        }
        if (!first) {
            return false;
        }
        this.ioFocus(first);
        return true;
    }

    /** A free name picked: in the field, its line gone, on to what is left to fix (or the button). */
    private ioUseSuggestion(name: string): void {
        this.usernameValue = name;
        this.usernameInput.text = name;
        this.usernameInput.setTextFormat(this.usernameInput.defaultTextFormat);
        this.ioClearFieldError(this.usernameInput);
        this.ioRules();
        this.ioFocus(this.ioErrShown(this.emailInput) ? this.emailInput : (this.ioErrShown(this.passwordInput) ? this.passwordInput : this.submitButton));
    }

    /** The address has an account: the login form with it in, the password next. */
    private ioLoginInstead(): void {
        this.isRegisterForm = false;
        this.updateState();
        this.clearErrorMessages();
        this.ioFocus(this.passwordInput);
    }

    private ioErrHolderOf(field: TextField, make: boolean): Sprite {
        let holder: Sprite = field == this.usernameInput ? this._ioErrUser : (field == this.emailInput ? this._ioErrEmail : (field == this.passwordInput ? this._ioErrPass : null));
        if (holder || !make || !(field == this.usernameInput || field == this.emailInput || field == this.passwordInput)) {
            return holder;
        }
        holder = new Sprite();
        holder.name = field == this.usernameInput ? "ioAuthErrUsername" : (field == this.emailInput ? "ioAuthErrEmail" : "ioAuthErrPassword");
        // (in the style of the "didn't match" line under the password)
        let line: TextField = new TextField();
        line.defaultTextFormat = new TextFormat("Verdana", 11, 0xFF9A7A);
        line.selectable = false;
        line.mouseEnabled = false;
        line.multiline = true;
        line.autoSize = TextFieldAutoSize.LEFT;
        line.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 1)];
        holder.addChild(line);
        holder.visible = false;
        this.formContainer.addChild(holder);
        if (field == this.usernameInput) {
            this._ioErrUser = holder;
        } else if (field == this.emailInput) {
            this._ioErrEmail = holder;
        } else {
            this._ioErrPass = holder;
        }
        return holder;
    }

    private ioBoxOf(field: TextField): Sprite {
        return field == this.usernameInput ? this._ioUserBox : (field == this.emailInput ? this._ioEmailBox : (field == this.passwordInput ? this._ioPassBox : null));
    }

    /** `text` under the field's box, then the links in `actions` ({label, name, fn}) on the same line while they fit. */
    private ioFieldError(field: TextField, text: string, actions: any[] = null): void {
        let holder: Sprite = this.ioErrHolderOf(field, true);
        if (!holder) {
            return;
        }
        while (holder.numChildren > 1) {
            holder.removeChildAt(1);
        }
        let line: TextField = as3.as(holder.getChildAt(0), TextField);
        line.text = text;
        let box: Sprite = this.ioBoxOf(field);
        holder.x = field.x - 4;
        holder.y = box ? box.y + box.height - 1 : field.y + field.height + 2;
        let x: number = line.textWidth + 10;
        for (let a of as3.values(actions || [])) {
            let act: Function = a.fn;
            let link: Sprite = this.ioLinkButton(String(a.label), 11, (): void => {
                act();
            });
            link.name = String(a.name);
            link.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 1)];
            // (only what fits inside the card)
            if (holder.x + x + link.width > 440) {
                break;
            }
            link.x = x;
            link.y = -1;
            this.ioActivatable(link, act);
            holder.addChild(link);
            x += link.width + 10;
        }
        holder.visible = true;
        this.formContainer.setChildIndex(holder, this.formContainer.numChildren - 1);
        if (field == this.passwordInput) {
            // (where "Type it again" and the rules are)
            if (this._ioConfirmLine) {
                this._ioConfirmLine.visible = false;
            }
            this.ioRules();
        }
    }

    private ioErrShown(field: TextField): boolean {
        let holder: Sprite = this.ioErrHolderOf(field, false);
        return !!holder && holder.visible;
    }

    private ioClearFieldError(field: TextField): void {
        let holder: Sprite = this.ioErrHolderOf(field, false);
        if (!holder || !holder.visible) {
            return;
        }
        if (this._ioGlowing && this._ioGlowing.parent == holder) {
            this.ioGlowOff();
        }
        while (holder.numChildren > 1) {
            holder.removeChildAt(1);
        }
        (holder.getChildAt(0) as any).text = "";
        holder.visible = false;
        if (field == this.passwordInput) {
            // (the rules back where the line was)
            this.ioRules();
        }
    }

    private ioClearFieldErrors(): void {
        this.ioClearFieldError(this.usernameInput);
        this.ioClearFieldError(this.emailInput);
        this.ioClearFieldError(this.passwordInput);
    }

    /** (QoL #525) a field's links, for Tab, after the field. */
    private ioPushActs(order: any[], field: TextField): void {
        let holder: Sprite = this.ioErrHolderOf(field, false);
        if (!holder || !holder.visible) {
            return;
        }
        for (let i: int = 1; i < holder.numChildren; i++) {
            order.push(holder.getChildAt(i));
        }
    }

    /** (QoL #513) the register form moves the password field (and its box, eye and Caps Lock line) down by `dy`. */
    private ioShiftPassword(dy: number): void {
        let by: number = dy - this._ioPassDy;
        if (!by) {
            return;
        }
        this._ioPassDy = dy;
        let moved: any[] = [this.passwordInput, this._ioPassBox, this._ioEye, this._ioCaps];
        for (let o of moved) {
            if (o) {
                o.y += by;
            }
        }
    }

    private showErrorMessage(inputField: TextField, errorMessage: string): void {
        if (this._ioConfirmLine) {
            // (an error line goes where "Type it again" is)
            this._ioConfirmLine.visible = false;
        }
        let errorText: TextField = new TextField();
        errorText.htmlText = errorMessage;
        errorText.textColor = this.RED;
        errorText.x = inputField.x;
        errorText.y = inputField.y + inputField.height + 5;
        errorText.width = inputField.width + 100;
        errorText.height = 40;
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only: in the form's font, and both under the password field (the email's own line was
            // half hidden behind the password field, in the player's default serif font)
            errorText.setTextFormat(new TextFormat("Verdana", 10, this.RED));
            errorText.selectable = false;
            errorText.mouseEnabled = false;
            errorText.y = this.passwordInput.y + this.passwordInput.height + 3;
            if (inputField == this.passwordInput && this.emailErrorText && this.emailErrorText.text) {
                errorText.y += this.emailErrorText.textHeight + 2;
            }
        }
        this.formContainer.addChild(errorText);

        if (inputField == this.emailInput) {
            this.emailErrorText = errorText;
        } else if (inputField == this.passwordInput) {
            this.passwordErrorText = errorText;
        }
    }

    public updateState(): void {
        if (GLOBAL.INFERNO_ONLY) {
            if (this._ioAccounts) {
                this._ioAccounts.visible = !this.isRegisterForm;
            }
            if (this.image) {
                this.image.visible = this.isRegisterForm || IoSavedAccounts.list().length == 0;
            }
        }
        this.updateFormFields();
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #513: on the register form, room under the email for its own error line; the lines of the form
            // left go with it)
            this.ioShiftPassword(this.isRegisterForm ? 6 : 0);
            this.ioClearFieldErrors();
        }
        if (GLOBAL.INFERNO_ONLY && this._ioFirstPassword != null) {
            this.ioPasswordAsked();
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioRules();
        }
        if (GLOBAL.INFERNO_ONLY && this.emailInput) {
            // (QoL #196: signing in takes the username too)
            let hint: string = AuthForm.ioHintWord(this.isRegisterForm ? "Email" : "Email or username");
            let was: string = String((this.emailInput as any).ioHint || AuthForm.ioHintWord("Email"));
            if (this.emailInput.text == was || this.emailInput.text == AuthForm.ioHintWord("Email") || this.emailInput.text == AuthForm.ioHintWord("Email or username")) {
                this.emailInput.text = hint;
                if ((this.emailInput as any).ioHintFormat) {
                    this.emailInput.setTextFormat((this.emailInput as any).ioHintFormat);
                }
            }
            (this.emailInput as any).ioHint = hint;
        }
        if (GLOBAL.INFERNO_ONLY) {
            if (this._ioWarning) {
                this._ioWarning.visible = this.isRegisterForm;
            }
            // The username field only belongs to the register form.
            this.usernameInput.visible = this.isRegisterForm;
            if (this._ioUserBox) {
                this._ioUserBox.visible = this.isRegisterForm;
            }
        }
        this.updateButtonText();
        this.updateButtonColor();
        this.updateLinkText();
        this.updateLinkColour();
        if (GLOBAL.INFERNO_ONLY) {
            // (the link's words change with the form: kept in the middle)
            if (this._ioLink) {
                this._ioLink.x = (450 - this._ioLink.width) / 2;
            }
            this.ioShowInvite();
            this.ioApplyChooser();
        }
    }

    public disposeUI(): void {
        if (this.stage) {
            this.stage.removeEventListener(Event.RESIZE, as3.bind(this, this.onStageResize));
        }
        this.ioKeysOff();
        this.ioLanguageOff();

        // Stop timer
        if (this.checkContentLoadedTimer) {
            this.checkContentLoadedTimer.stop();
            this.checkContentLoadedTimer.removeEventListener(TimerEvent.TIMER, as3.bind(this, this.checkContentLoaded));
        }

        // Remove event listeners
        if (this._ioWarning) {
            this._ioWarning.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPulseWarning));
        }
        if (this.submitButton) {
            this.submitButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.submitButtonClickHandler));
        }

        // Dispose bitmap data to free memory
        if (this.image) {
            this.image.bitmapData.dispose();
        }

        // Unload loader
        if (this.loader) {
            this.loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, as3.bind(this, this.onImageLoaded));
            this.loader.unload();
        }

        // Clear background graphics
        if (this.background) {
            this.background.graphics.clear();
        }

        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    /** The form sits on the game's parchment popup frame. */
    private ioCard(width: number): void {
        // the UI kit's obsidian card with its forged rim (11 October); the stock frame if the kit can't be had
        let kit: Sprite = new Sprite();
        kit.name = "ioAuthCard";
        kit.x = 0;
        kit.y = 110;
        kit.mouseEnabled = false;
        this.formContainer.addChildAt(kit, 0);
        let draw: Function = (): void => {
            kit.graphics.clear();
            // (taller than the stock frame was: it holds the register link and the warning under the button)
            if (IoKit.panel(kit.graphics, 0, 0, width, 540)) {
                IoKit.frame(kit.graphics, 0, 0, width, 540);
            }
        };
        draw();
        IoKit.whenLoaded(["panel", "panel_tile", "frame"], draw);
        IoKit.whenFailed(["panel", "panel_tile", "frame"], (): void => {
            let card: frame_CLIP = new frame_CLIP();
            card.width = width;
            card.height = 480;
            card.x = 0;
            card.y = 110;
            card.Setup(false);
            this.formContainer.addChildAt(card, 0);
        });
    }

    /** A parchment box behind an input field, under it in the display list. */
    private ioInputBox(input: TextField): Sprite {
        let box: Sprite = new Sprite();
        box.graphics.lineStyle(2, 10121800);
        box.graphics.beginFill(16776170);
        box.graphics.drawRoundRect(0, 0, input.width + 20, input.height + 6, 12, 12);
        box.graphics.endFill();
        box.x = input.x - 10;
        box.y = input.y - 3;
        input.y += 7;
        input.height = Math.max(input.height - 6, 22);
        this.formContainer.addChildAt(box, this.formContainer.getChildIndex(input));
        // (a click on the box round the field, not only on its text line, puts the caret in it; 9 October)
        box.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (this.stage && input.visible) {
                this.stage.focus = input;
                input.setSelection(input.text.length, input.text.length);
            }
        });
        if (input == this.usernameInput) {
            // Drawn again each time the register form opens: keep only the latest.
            if (this._ioUserBox && this._ioUserBox.parent) {
                this._ioUserBox.parent.removeChild(this._ioUserBox);
            }
            this._ioUserBox = box;
        }
        return box;
    }

    /**
     * "Who's playing?": the accounts that have logged in on this computer (IoSavedAccounts: emails and
     * names only, never passwords) as a row of portrait tiles where the picture is on the login form.
     * Clicking a tile signs in with the browser's saved login for it (13 October), or fills in its email and moves
     * to the password when it has none; its x forgets it, saved login and all. The chosen
     * account's tile is gold and its email shows under the row.
     */
    private ioBuildAccounts(): void {
        // (QoL #526: one being forgotten is left out while its Undo shows)
        let accounts: any[] = IoSavedAccounts.list().filter((a: any): boolean => !this._ioForgetting || String(a.email).toLowerCase() != this._ioForgetting.toLowerCase());
        if (this._ioAccounts && this._ioAccounts.parent) {
            this._ioAccounts.parent.removeChild(this._ioAccounts);
        }
        this._ioAccounts = new Sprite();
        this._ioAccounts.visible = !this.isRegisterForm;
        this._ioTiles = [];
        this.formContainer.addChild(this._ioAccounts);
        if (this.image) {
            this.image.visible = this.isRegisterForm || accounts.length == 0;
        }
        if (accounts.length == 0 && !this._ioForgetting) {
            return;
        }

        // heading with a rule either side
        let heading: TextField = this.ioLabel("WHO'S PLAYING?", "Groboldov", 16, 5911576, true);
        heading.width = 450;
        heading.y = 121;
        this._ioAccounts.addChild(heading);
        let ruleWidth: number = heading.textWidth;
        this._ioAccounts.graphics.lineStyle(2, 11569754);
        this._ioAccounts.graphics.moveTo(45, 132);
        this._ioAccounts.graphics.lineTo(225 - ruleWidth / 2 - 10, 132);
        this._ioAccounts.graphics.moveTo(225 + ruleWidth / 2 + 10, 132);
        this._ioAccounts.graphics.lineTo(405, 132);

        // Tiles narrow a little when there are many, to stay inside the frame's side borders.
        let tileWidth: int = Math.min(AuthForm.IO_TILE_W, ((450 - 2 * 24 - (accounts.length - 1) * AuthForm.IO_TILE_GAP) / accounts.length) | 0) | 0;
        let total: int = (accounts.length * tileWidth + (accounts.length - 1) * AuthForm.IO_TILE_GAP) | 0;
        let x: int = ((450 - total) / 2) | 0;
        let chosenEmail: string = "";
        for (let account of as3.values(accounts)) {
            let chosen: boolean = this.emailValue.toLowerCase() == String(account.email).toLowerCase();
            if (chosen) {
                chosenEmail = String(account.email);
            }
            let tile: Sprite = this.ioAccountTile(account, chosen, tileWidth);
            tile.x = x;
            tile.y = 151;
            this._ioAccounts.addChild(tile);
            this._ioTiles.push(tile);
            x = (x + (tileWidth + AuthForm.IO_TILE_GAP)) | 0;
        }

        // (QoL #544: with none picked, how long they are kept and how many, before one silently drops off)
        let email: TextField = this.ioLabel(chosenEmail || KEYS.Get("io_saved_note", { "v1": 14, "v2": IoSavedAccounts.MAX }), "Verdana", chosenEmail ? 11 : 10, 8018490, false);
        email.name = "ioSavedNote";
        email.width = 450;
        email.y = 151 + AuthForm.IO_TILE_H + 8;
        this._ioAccounts.addChild(email);
        if (this._ioForgetting) {
            // (QoL #526) "Forgot Ann. Undo" where the address shows
            email.visible = false;
            let undo: Sprite = new Sprite();
            undo.name = "ioForgetUndo";
            undo.buttonMode = true;
            this.mousePointerCursor(undo);
            let line: TextField = this.ioLabel("", "Verdana", 11, 8018490, false);
            line.htmlText = KEYS.Get("io_forgot_undo", { "v1": this._ioForgettingName.replace(/[<>&]/g, "") });
            line.width = 450;
            undo.addChild(line);
            undo.y = email.y;
            undo.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                this._ioForgetting = null;
                this.ioBuildAccounts();
            });
            this._ioAccounts.addChild(undo);
        }
    }

    /** (Inferno-only, QoL #526) the account whose tile was just closed, kept for 5 s in case of Undo */
    private _ioForgetting: string;

    private _ioForgettingName: string;

    /** QoL #526: the tile goes at once; the saved login is ended 5 s later, unless Undo was pressed. */
    private ioForgetLater(email: string, name: string): void {
        if (this._ioForgetting && this._ioForgetting != email) {
            // (a second one closed: the first is forgotten now)
            LOGIN.ioForgetSaved(this._ioForgetting);
        }
        this._ioForgetting = email;
        this._ioForgettingName = name;
        this.ioBuildAccounts();
        setTimeout((): void => {
            if (this._ioForgetting == email) {
                this._ioForgetting = null;
                LOGIN.ioForgetSaved(email);
                if (this.formContainer) {
                    this.ioBuildAccounts();
                }
            }
        }, 5000);
    }

    private static ioPortraitFor(param1: string): string {
        let hash: int = 0;
        let i: int = 0;
        while (i < param1.length) {
            hash = (hash * 31 + param1.charCodeAt(i)) & 0x7FFFFFFF;
            i++;
        }
        return as3.str(AuthForm.IO_PORTRAITS[hash % AuthForm.IO_PORTRAITS.length]);
    }

    private ioLabel(text: string, font: string, size: int, colour: uint, embedded: boolean): TextField {
        let field: TextField = new TextField();
        let format: TextFormat = new TextFormat(font, size, colour, !embedded);
        format.align = TextFormatAlign.CENTER;
        field.defaultTextFormat = format;
        field.embedFonts = embedded;
        field.antiAliasType = AntiAliasType.NORMAL;
        field.selectable = false;
        field.mouseEnabled = false;
        field.height = size + 8;
        field.text = text;
        return field;
    }

    private ioAccountTile(account: any, chosen: boolean, w: int): Sprite {
        let email: string = null;
        let picture: Loader = null;
        email = String(account.email);
        let name: string = as3.str(account.name ? String(account.name) : email.split("@")[0]);
        let tile: Sprite = new Sprite();
        tile.buttonMode = true;
        this.mousePointerCursor(tile);

        // card: gold with an orange glow when chosen, parchment otherwise
        if (chosen) {
            let shade: Matrix = new Matrix();
            shade.createGradientBox(w, AuthForm.IO_TILE_H, Math.PI / 2);
            tile.graphics.lineStyle(3, 14051862);
            tile.graphics.beginGradientFill(GradientType.LINEAR, [0xFFF0C0, 0xF6D280], [1, 1], [0, 255], shade);
            tile.filters = [new GlowFilter(0xFF8214, 0.8, 12, 12, 2, 2)];
        } else {
            tile.graphics.lineStyle(2, 11569754);
            tile.graphics.beginFill(16445910);
        }
        tile.graphics.drawRoundRect(0, 0, w, AuthForm.IO_TILE_H, 24, 24);
        tile.graphics.endFill();

        // round portrait with a dark rim
        let portrait: Sprite = new Sprite();
        portrait.x = ((w - 50) / 2) | 0;
        portrait.y = 10;
        portrait.graphics.beginFill(13150320);
        portrait.graphics.drawCircle(25, 25, 25);
        portrait.graphics.endFill();
        tile.addChild(portrait);
        picture = new Loader();
        let circle: Shape = new Shape();
        circle.graphics.beginFill(0);
        circle.graphics.drawCircle(25, 25, 25);
        circle.graphics.endFill();
        portrait.addChild(circle);
        picture.mask = circle;
        portrait.addChild(picture);
        picture.contentLoaderInfo.addEventListener(Event.COMPLETE, (e: Event): void => {
            // cover the circle: scale the short side to 50 and centre
            let scale: number = 50 / Math.min(picture.content.width, picture.content.height);
            picture.content.scaleX = picture.content.scaleY = scale;
            if (picture.content instanceof Bitmap) {
                as3.cast(picture.content, Bitmap).smoothing = true;
            }
            picture.content.x = (50 - picture.content.width) / 2;
            picture.content.y = (50 - picture.content.height) / 2;
        });
        picture.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, (e: IOErrorEvent): void => {
        });
        picture.load(new URLRequest(GLOBAL.cdnUrl + "assets/monsters/" + AuthForm.ioPortraitFor(name.toLowerCase()) + "-medium.jpg"));
        let rim: Shape = new Shape();
        rim.graphics.lineStyle(2, 6961674);
        rim.graphics.drawCircle(portrait.x + 25, 35, 25);
        tile.addChild(rim);

        // name, shortened to fit the tile
        let label: TextField = this.ioLabel(name, "Groboldov", 13, 3807752, true);
        label.width = w;
        label.y = 67;
        while (label.textWidth > w - 8 && name.length > 3) {
            name = name.substr(0, name.length - 1);
            label.text = name + "...";
        }
        tile.addChild(label);

        // forget: a small red x on the corner
        let forget: Sprite = new Sprite();
        forget.graphics.lineStyle(2, 5903368);
        forget.graphics.beginFill(12073506);
        forget.graphics.drawCircle(0, 0, 8);
        forget.graphics.endFill();
        forget.graphics.lineStyle(2, 16777215);
        forget.graphics.moveTo(-3.5, -3.5);
        forget.graphics.lineTo(3.5, 3.5);
        forget.graphics.moveTo(3.5, -3.5);
        forget.graphics.lineTo(-3.5, 3.5);
        forget.x = w - 4;
        forget.y = 4;
        forget.buttonMode = true;
        forget.name = "ioForget";
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #526: a bigger place to press than the 16 px dot; a near miss signed in)
            forget.graphics.lineStyle(0, 0, 0);
            forget.graphics.beginFill(0, 0);
            forget.graphics.drawCircle(0, 0, 15);
            forget.graphics.endFill();
        }
        tile.addChild(forget);

        forget.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            // (13 October) its saved login ended too, on the server and in this browser
            if (GLOBAL.INFERNO_ONLY) {
                this.ioForgetLater(email, name);
                return;
            }
            LOGIN.ioForgetSaved(email);
            this.ioBuildAccounts();
        });
        let pick: Function = (): void => {
            this.ioUseEmail(email);
            // (13 October) signed in with the browser's saved login for it, if it has one; if not, the password
            LOGIN.ioSignInSaved(email);
        };
        tile.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            pick();
        });
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #525: reached with Tab, Enter picks it)
            tile.name = "ioAuthTile";
            this.ioActivatable(tile, pick);
        }
        return tile;
    }

    /** (Inferno-only, QoL #517) a line under the password field (why it's asked for) */
    public ioSay(text: string): void {
        if (!this.passwordInput || this._ioPendingEmail) {
            this._ioPendingSay = text;
            return;
        }
        // (QoL #521: said on the login form, not over the first visit's choices)
        if (this._ioChooserOn) {
            this.ioShowChooser(false);
        }
        this.showErrorMessage(this.passwordInput, text);
    }

    private _ioPendingSay: string;

    private ioPendingSay(): void {
        if (this._ioPendingSay) {
            let say: string = this._ioPendingSay;
            this._ioPendingSay = null;
            this.ioSay(say);
        }
    }

    /** Inferno-only: `email` chosen (its tile gold), the password next. */
    public ioUseEmail(email: string): void {
        if (!this.emailInput || !this.passwordInput) {
            this._ioPendingEmail = email;
            return;
        }
        // (QoL #521: an account asked for: the login form, not the first visit's choices)
        if (this._ioChooserOn) {
            this.ioShowChooser(false);
        }
        this.emailValue = email;
        this.emailInput.text = email;
        this.emailInput.setTextFormat(this.emailInput.defaultTextFormat);
        this.clearErrorMessages();
        this.ioBuildAccounts();
        this.ioFocus(this.passwordInput);
    }

    private ioComfort(): void {
        if (!this.stage || this._ioKeysOn) {
            return;
        }
        this._ioKeysOn = true;
        this.stage.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.ioKeyDown));
        this.stage.addEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.ioKeyUp));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioRemoved));
        this.submitButton.tabEnabled = true;
        this.submitButton.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            this.submitButton.filters = [];
        });
        this.passwordInput.addEventListener(FocusEvent.FOCUS_IN, (e: FocusEvent): void => {
            this.ioCapsCheck();
        });
        this.passwordInput.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            if (this._ioCaps) {
                this._ioCaps.visible = false;
            }
        });
        this.ioBuildEye();
        this.ioBuildCaps();
        if (this._ioPendingEmail) {
            let pending: string = this._ioPendingEmail;
            this._ioPendingEmail = null;
            this.ioUseEmail(pending);
            this.ioPendingSay();
            return;
        }
        this.ioPendingSay();
        // ready to type: the last account's email in, the password next; or the email
        if (!GLOBAL.ioOnPhone) {
            let accounts: any[] = IoSavedAccounts.list();
            if (!this.emailValue && accounts.length) {
                this.emailValue = String(accounts[0].email);
                this.emailInput.text = this.emailValue;
                this.emailInput.setTextFormat(this.emailInput.defaultTextFormat);
                this.ioBuildAccounts();
            }
            this.ioFocus(this.emailValue ? this.passwordInput : this.emailInput);
        }
    }

    private ioRemoved(e: Event): void {
        this.ioKeysOff();
        this.ioLanguageOff();
    }

    private ioKeysOff(): void {
        if (!this._ioKeysOn) {
            return;
        }
        this._ioKeysOn = false;
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioRemoved));
        if (this.stage) {
            this.stage.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.ioKeyDown));
            this.stage.removeEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.ioKeyUp));
        }
    }

    /** The fields and the button, in order (the username only on the register form). */
    private ioOrder(): any[] {
        let order: any[] = [];
        if (GLOBAL.INFERNO_ONLY && this._ioChooserOn && this._ioChooser) {
            // (QoL #521: only the two choices while they show)
            for (let i: int = 0; i < this._ioChooser.numChildren; i++) {
                order.push(this._ioChooser.getChildAt(i));
            }
            return order;
        }
        if (GLOBAL.INFERNO_ONLY && !this.isRegisterForm && this._ioAccounts && this._ioAccounts.visible && this._ioTiles) {
            // (QoL #525: the saved accounts' tiles first, as they are above the fields)
            for (let t of this._ioTiles) {
                if (t.parent) {
                    order.push(t);
                }
            }
        }
        if (this.isRegisterForm) {
            order.push(this.usernameInput);
            // (QoL #525: a field's links, a free name or Log in instead, after it)
            this.ioPushActs(order, this.usernameInput);
        }
        order.push(this.emailInput);
        this.ioPushActs(order, this.emailInput);
        order.push(this.passwordInput, this.submitButton);
        if (GLOBAL.INFERNO_ONLY && this._ioLink && this._ioLink.visible) {
            // (QoL #525: and the Register (or Login) link under the button)
            order.push(this._ioLink);
        }
        if (GLOBAL.INFERNO_ONLY && this._ioKeepBox && this._ioKeepBox.visible) {
            // (QoL #516: the keep-me-signed-in box under the link, Space or Enter ticks it)
            order.push(this._ioKeepBox);
        }
        return order;
    }

    /** Gives a field the focus with what is in it selected (so it can be typed over), or the button its glow. */
    private ioFocus(target: any): void {
        if (!this.stage || !target) {
            return;
        }
        this.stage.focus = as3.cast(as3.as(target, Sprite) || as3.as(target, TextField), InteractiveObject);
        if (GLOBAL.INFERNO_ONLY) {
            this.ioGlowOff();
        }
        if (target == this.submitButton) {
            this.submitButton.filters = [this._ioButtonGlow];
            return;
        }
        this.submitButton.filters = [];
        if (GLOBAL.INFERNO_ONLY && target instanceof Sprite) {
            // (QoL #525: a tile, a link or a choice reached with Tab glows as the button does)
            let s: Sprite = as3.as(target, Sprite);
            this._ioGlowSaved = s.filters || [];
            this._ioGlowing = s;
            s.filters = this._ioGlowSaved.concat([this._ioButtonGlow]);
            return;
        }
        let field: TextField = as3.as(target, TextField);
        if (field && this.ioValueOf(field)) {
            field.setSelection(0, field.text.length);
        }
    }

    private ioValueOf(field: TextField): string {
        return field == this.emailInput ? this.emailValue : (field == this.passwordInput ? this.passwordValue : (field == this.usernameInput ? this.usernameValue : ""));
    }

    /** A message shown over the form (the topmost), or null. */
    private ioOpenMessage(): MESSAGE {
        let layer: any = GLOBAL._layerTop;
        if (!layer) {
            return null;
        }
        let i: int = ((layer.numChildren | 0) - 1) | 0;
        while (i >= 0) {
            let m: MESSAGE = as3.as(layer.getChildAt(i), MESSAGE);
            if (m && m.stage && m.visible) {
                return m;
            }
            i--;
        }
        return null;
    }

    private ioKeyDown(e: KeyboardEvent): void {
        if (!this.stage || !this.parent || !this.emailInput || !this.emailInput.parent) {
            return;
        }
        let code: uint = e.keyCode;
        let message: MESSAGE = this.ioOpenMessage();
        if (message) {
            if (code == Keyboard.ENTER || code == Keyboard.ESCAPE) {
                // only a message (an OK at most): closed, and back to the password (a wrong one, most often)
                if (message.bAction2 && message.bAction2.visible) {
                    return;
                }
                if (code == Keyboard.ENTER && message.bAction && message.bAction.visible) {
                    message.Action(null);
                } else {
                    message.Hide();
                }
                this.ioFocus(this.isRegisterForm && !this.usernameValue ? this.usernameInput : (this.emailValue ? this.passwordInput : this.emailInput));
            }
            return;
        }
        let order: any[] = this.ioOrder();
        let at: int = order.indexOf(this.stage.focus);
        if (code == Keyboard.TAB) {
            let next: int = (at < 0 ? (e.shiftKey ? order.length - 1 : 0) : (at + (e.shiftKey ? -1 : 1) + order.length) % order.length) | 0;
            this.ioFocus(order[next]);
            return;
        }
        let focused: any = this.stage.focus;
        if ((code == Keyboard.ENTER || code == Keyboard.SPACE) && focused && focused != this.submitButton && !(focused instanceof TextField) && focused.ioActivate) {
            // (QoL #525: Enter, or Space, on a tile, a link or a choice reached with Tab)
            let act: Function = focused.ioActivate;
            act();
            return;
        }
        if (code == Keyboard.ENTER && this._ioChooserOn) {
            // (QoL #521: nothing chosen yet)
            return;
        }
        if (code == Keyboard.ENTER) {
            if (this.stage.focus == this.passwordInput || this.stage.focus == this.submitButton) {
                this.ioSubmit();
                return;
            }
            if (at >= 0) {
                // (QoL #525: on to the next field, past the links: Enter in the email is not Log in instead)
                let to: int = (at + 1) | 0;
                while (to < order.length && !(order[to] instanceof TextField) && order[to] != this.submitButton) {
                    to++;
                }
                this.ioFocus(order[to]);
                return;
            }
            // nothing chosen: the first empty field, or log in
            for (let o of as3.values(order)) {
                if (o instanceof TextField && !this.ioValueOf(as3.as(o, TextField))) {
                    this.ioFocus(o);
                    return;
                }
            }
            this.ioSubmit();
            return;
        }
        if (code == Keyboard.SPACE && this.stage.focus == this.submitButton) {
            this.ioSubmit();
            return;
        }
        this.ioCapsCheck();
    }

    private ioKeyUp(e: KeyboardEvent): void {
        this.ioCapsCheck();
    }

    private ioSubmit(): void {
        if (this.stage && this.stage.focus instanceof TextField) {
            // (the field's own text is what is sent, as the button would see it)
            this.stage.focus = this.submitButton;
        }
        this.submitButtonClickHandler(null);
    }

    /** "Caps Lock is on", over the password while it is being typed with Caps Lock on. */
    private ioBuildCaps(): void {
        let field: TextField = new TextField();
        let format: TextFormat = new TextFormat("Verdana", 10, 0xB83A10, true);
        format.align = TextFormatAlign.RIGHT;
        field.defaultTextFormat = format;
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = 200;
        field.height = 16;
        field.text = AuthForm.ioT("io_t3k_auth_caps");
        field.x = this.passwordInput.x + this.passwordInput.width + 10 - field.width;
        field.y = this.passwordInput.y - 27;
        field.name = "ioCapsLock";
        field.visible = false;
        this.formContainer.addChild(field);
        this._ioCaps = field;
    }

    private ioCapsCheck(): void {
        if (this._ioCaps) {
            let on: boolean = Boolean(this.stage && this.stage.focus == this.passwordInput && Keyboard.capsLock);
            if (on && GLOBAL.INFERNO_ONLY) {
                // (QoL #513: over the field, or, while the email's error line is there, inside the field by the eye)
                this._ioCaps.y = this.ioErrShown(this.emailInput) ? this.passwordInput.y + 7 : this.passwordInput.y - 27;
            }
            this._ioCaps.visible = on;
        }
    }

    /** The eye at the right end of the password field: shows or hides what is typed. */
    private ioBuildEye(): void {
        let eye: Sprite = new Sprite();
        eye.name = "ioShowPassword";
        eye.buttonMode = true;
        eye.useHandCursor = true;
        this.mousePointerCursor(eye);
        // the field makes room for it
        this.passwordInput.width -= 30;
        eye.x = this.passwordInput.x + this.passwordInput.width + 16;
        eye.y = this.passwordInput.y + this.passwordInput.height / 2;
        this.formContainer.addChild(eye);
        this._ioEye = eye;
        this.ioDrawEye();
        eye.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        eye.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            this._ioShowPassword = !this._ioShowPassword;
            if (this.passwordValue) {
                this.passwordInput.displayAsPassword = !this._ioShowPassword;
            }
            this.ioDrawEye();
            if (this.stage) {
                this.stage.focus = this.passwordInput;
                this.passwordInput.setSelection(this.passwordInput.text.length, this.passwordInput.text.length);
            }
        });
    }

    private ioDrawEye(): void {
        let g: any = this._ioEye.graphics;
        g.clear();
        // a clear area to click
        g.beginFill(0xFFFBEA, 0.01);
        g.drawRect(-14, -12, 28, 24);
        g.endFill();
        let c: uint = (this._ioShowPassword ? 0xD66A16 : 0x8A6A48) >>> 0;
        g.lineStyle(2, c);
        g.moveTo(-10, 0);
        g.curveTo(0, -10, 10, 0);
        g.curveTo(0, 10, -10, 0);
        g.lineStyle(0, 0, 0);
        g.beginFill(c);
        g.drawCircle(0, 0, 3.2);
        g.endFill();
        if (!this._ioShowPassword) {
            // struck through: hidden
            g.lineStyle(2, c);
            g.moveTo(-9, 7);
            g.lineTo(9, -7);
        }
    }

    private static ioEscape(param1: string): string {
        return param1.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
