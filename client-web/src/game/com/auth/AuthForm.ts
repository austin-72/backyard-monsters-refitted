import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, GradientType, Loader, Shape, Sprite } from "flash/display";
import { Event, FocusEvent, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { SharedObject, URLRequest } from "flash/net";
import { AntiAliasType, TextField, TextFieldAutoSize, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Mouse, MouseCursor } from "flash/ui";
import { Timer } from "flash/utils";
import { GLOBAL, IoSavedAccounts, KEYS, LOGIN, URLLoaderApi, frame_CLIP } from "@game";

// TODO: This file needs a complete refactor. It is currently very messy and hard to read.
export class AuthForm extends Sprite {
    static {
        as3.fields(this, { isRegisterForm: false, formContainer: null, borderContainer: null, loadingContainer: null, navContainer: null, selectField: null, dropdownMenu: null, usernameInput: null, emailInput: null, passwordInput: null, usernameValue: "", emailValue: "", passwordValue: "", emailErrorText: null, passwordErrorText: null, errMessage: null, submitButton: null, hasAccountText: null, defaultText: null, hasAccountFormat: null, button: null, buttonText: null, image: null, loader: null, startY: NaN, verticalSpacingBetweenBlocks: 0, BLACK: 0, WHITE: 16777215, RED: 16711680, BACKGROUND: 1909546, LIGHT_GRAY: 13224393, PRIMARY: 19941, SECONDARY: 52664, checkContentLoadedTimer: null, languages: null, background: null, contentContainer: null, DESIGN_WIDTH: 760, DESIGN_HEIGHT: 670, _ioWarning: null, _ioWarningGlow: null, _ioWarningPhase: 0, _ioRegistering: false, _ioAccounts: null, _ioUserBox: null });
    }

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

    public $ctor(): void {
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
    }

    private centerContent(): void {
        this.contentContainer.x = 0;
        this.contentContainer.y = 0;
    }

    private handleContentLoaded(): void {
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
        let selectInput: Sprite = this.createSelectInput();
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
        this.CreateBorder(this.emailInput);
        this.CreateBorder(this.passwordInput);

        // Create button
        this.submitButton = this.createButton();
        this.submitButton.x = (this.formContainer.width - this.submitButton.width) / 2;
        this.submitButton.y = this.startY + 28;
        this.formContainer.addChild(this.submitButton);
        this.submitButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.submitButtonClickHandler));

        // Link
        this.FormNavigate();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioBuildAccounts();
            this.ioWhatsDifferent();
        }
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
            button.graphics.lineStyle(1, this.SECONDARY);
            button.graphics.beginFill(this.SECONDARY, over ? 0.3 : 0.12);
            button.graphics.drawRect(0, 0, w, h);
            button.graphics.endFill();
        };
        draw(false);
        button.addChild(label);
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
            GLOBAL.gotoURL(GLOBAL.serverUrl + "whats-different");
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
        loadingTitle.text = GLOBAL.versionMismatch ? "New Update Available!" : "Connecting to the server";
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

        // Fixed container position
        this.loadingContainer.x = 200;
        this.loadingContainer.y = 200;
    }

    public static DiscordLink(param1: Event = null): void {
        GLOBAL.gotoURL("https://discord.gg/bymrefitted");
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
            subtitle.text = "Custom server: Inferno Maproom 2";
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
        this.image = as3.cast(this.loader.content, Bitmap);

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

        input.text = placeholder;
        input.setTextFormat(placeholderTextFormat);

        if (isPassword) {
            input.displayAsPassword = true;
        }

        if (placeholder) {
            input.text = placeholder;

            input.addEventListener(FocusEvent.FOCUS_IN, (event: FocusEvent): void => {
                if (input.text == placeholder) {
                    input.text = "";
                    input.setTextFormat(inputTextFormat);
                }
            });

            input.addEventListener(FocusEvent.FOCUS_OUT, (event: FocusEvent): void => {
                if (input.text == "") {
                    input.text = placeholder;
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
        this.selectField.graphics.lineStyle(1, this.WHITE);
        this.selectField.graphics.drawRect(0, 0, selectWidth, selectHeight);

        this.defaultText = new TextField();
        let defaultTextStyle: TextFormat = new TextFormat();
        defaultTextStyle.font = "Groboldov";
        defaultTextStyle.size = 13;

        this.defaultText.textColor = this.WHITE;
        this.defaultText.embedFonts = true;
        this.defaultText.defaultTextFormat = defaultTextStyle;
        this.defaultText.text = defaultOption.toLocaleUpperCase();
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

        this.selectField.graphics.clear();
        this.selectField.graphics.lineStyle(1, this.WHITE);
        this.selectField.graphics.drawRect(0, 0, newSelectWidth, 30);

        // Iterate over the supported languages and pass them to KEYS.Setup()
        // to grab available language file.
        for (const $value of as3.values(this.languages)) {
            let language: string = as3.str($value);
            if (selectedLanguage.toLocaleLowerCase() === language.toLocaleLowerCase()) {
                KEYS.Setup(language.toLowerCase());
                return;
            }
        }
        KEYS.Setup("english");
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
        linkContainer.addEventListener(MouseEvent.CLICK, (event: Event): void => {
            this.isRegisterForm = !this.isRegisterForm;
            this.updateState();
        });
        if (GLOBAL.INFERNO_ONLY) {
            this.ioRegisterWarning(linkContainer.y + 30);
        }
    }

    private ioRegisterWarning(param1: number): void {
        let field: TextField = new TextField();
        let format: TextFormat = new TextFormat("Groboldov", 15, 0xFFF4E0, false);
        format.align = TextFormatAlign.CENTER;
        field.defaultTextFormat = format;
        field.embedFonts = true;
        field.antiAliasType = AntiAliasType.ADVANCED;
        field.selectable = false;
        field.mouseEnabled = false;
        field.wordWrap = true;
        field.multiline = true;
        field.width = 380;
        field.height = 44;
        field.x = (450 - field.width) / 2;
        field.y = param1;
        field.name = "ioRegisterWarning";
        field.text = "We recommend a fake email and a password you do not use elsewhere!";
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
            this.usernameInput.y = this.emailInput.y - this.usernameInput.height - 20;
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

    private updateButtonText(): void {
        this.button.graphics.beginFill(this.isRegisterForm ? this.PRIMARY : this.SECONDARY);
        this.buttonText.text = this.isRegisterForm ? KEYS.Get("auth_register_btn").toUpperCase() : KEYS.Get("auth_login_btn").toUpperCase();
    }

    private updateButtonColor(): void {
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

        let isUsernameValid: boolean = this.isValidUsername(this.usernameValue);
        let isEmailValid: boolean = this.isValidEmail(this.emailValue);
        let isPasswordValid: boolean = this.isValidPassword(this.passwordValue);

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
                        this._ioRegistering = true;
                    }

                    new URLLoaderApi().load(GLOBAL._apiURL + "player/register", newUser, as3.bind(this, this.registerNewUser), (event: IOErrorEvent): void => {
                        this._ioRegistering = false;
                        GLOBAL.Message("An error occurred during registration on the server.");
                    });
                } else {
                    GLOBAL.Message("<b>Usernames must be:</b><br><br>• At least 2 characters long.<br>• No longer than 12 characters.<br>• Can only include numbers and letters.");
                }
            } else {
                // Authentication call
                const authInfo: any[] = [["email", this.emailValue], ["password", this.passwordValue]];
                LOGIN.AuthenticateUser(authInfo);
            }
        } else {
            if (!isEmailValid) {
                this.showErrorMessage(this.emailInput, "Please enter a valid email address");
            }
            if (!isPasswordValid) {
                this.showErrorMessage(this.passwordInput, "Password must be at least 8 characters long and contain\nat least 1 special character");
            }
            if (!isUsernameValid && this.isRegisterForm) {
                GLOBAL.Message("<b>Usernames must be:</b><br><br>• At least 2 characters long.<br>• No longer than 12 characters.<br>• Can only include numbers and letters.");
            }
        }
    }

    /** The invite code this game was started with (GAME.setLauncherVars), or "". */
    private ioReferralCode(): string {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            return so.data.ioReferral ? String(so.data.ioReferral) : "";
        } catch (e) {
        }
        return "";
    }

    private registerNewUser(serverData: any): void {
        this._ioRegistering = false;
        if (serverData.hasOwnProperty("error")) {
            GLOBAL.Message(as3.str(serverData.error));
            return;
        }
        GLOBAL.Message("You have successfully registered an account. Please login to continue.");
        try {
            // The invite has been used: it must not be sent with a second account from this machine.
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            delete so.data.ioReferral;
            so.flush();
        } catch (e) {
        }
        this.isRegisterForm = false;
        this.updateState();
    }

    private isValidUsername(username: string): boolean {
        let pattern: RegExp = /^[a-zA-Z0-9_]+$/;
        return username.length >= 2 && username.length <= 12 && pattern.test(username);
    }

    private isValidEmail(email: string): boolean {
        let emailPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        return emailPattern.test(email);
    }

    private isValidPassword(password: string): boolean {
        let trimmed: string = password.replace(/^\s+|\s+$/g, "");
        return trimmed.length >= 8 && /[^a-zA-Z0-9]/.test(trimmed);
    }

    private clearErrorMessages(): void {
        this.emailErrorText.text = "";
        this.passwordErrorText.text = "";
    }

    private showErrorMessage(inputField: TextField, errorMessage: string): void {
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
    }

    public disposeUI(): void {
        if (this.stage) {
            this.stage.removeEventListener(Event.RESIZE, as3.bind(this, this.onStageResize));
        }

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
        let card: frame_CLIP = new frame_CLIP();
        card.width = width;
        card.height = 480;
        card.x = 0;
        card.y = 110;
        card.Setup(false);
        this.formContainer.addChildAt(card, 0);
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
     * Clicking a tile fills in its email and moves to the password; its x forgets it. The chosen
     * account's tile is gold and its email shows under the row.
     */
    private ioBuildAccounts(): void {
        let accounts: any[] = IoSavedAccounts.list();
        if (this._ioAccounts && this._ioAccounts.parent) {
            this._ioAccounts.parent.removeChild(this._ioAccounts);
        }
        this._ioAccounts = new Sprite();
        this._ioAccounts.visible = !this.isRegisterForm;
        this.formContainer.addChild(this._ioAccounts);
        if (this.image) {
            this.image.visible = this.isRegisterForm || accounts.length == 0;
        }
        if (accounts.length == 0) {
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
            x = (x + (tileWidth + AuthForm.IO_TILE_GAP)) | 0;
        }

        let email: TextField = this.ioLabel(chosenEmail, "Verdana", 11, 8018490, false);
        email.width = 450;
        email.y = 151 + AuthForm.IO_TILE_H + 8;
        this._ioAccounts.addChild(email);
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
        tile.addChild(forget);

        forget.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            IoSavedAccounts.forget(email);
            this.ioBuildAccounts();
        });
        tile.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            this.emailValue = email;
            this.emailInput.text = email;
            this.emailInput.setTextFormat(this.emailInput.defaultTextFormat);
            this.clearErrorMessages();
            this.ioBuildAccounts();
            if (this.stage) {
                this.stage.focus = this.passwordInput;
            }
        });
        return tile;
    }

    private static ioEscape(param1: string): string {
        return param1.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
