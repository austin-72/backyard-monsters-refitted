package com.auth {
    import flash.net.SharedObject;
    import flash.display.Shape;
    import flash.filters.GlowFilter;
    import flash.display.GradientType;
    import flash.geom.Matrix;
    import flash.display.Sprite;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;
    import flash.text.TextFieldType;
    import flash.text.TextFieldAutoSize;
    import flash.text.AntiAliasType;
    import flash.events.MouseEvent;
    import flash.events.Event;
    import flash.ui.MouseCursor;
    import flash.ui.Mouse;
    import flash.events.MouseEvent;
    import flash.text.TextFormat;
    import flash.display.Bitmap;
    import flash.display.Loader;
    import flash.net.URLRequest;
    import flash.events.FocusEvent;
    import flash.text.TextFormatAlign;
    import flash.events.IOErrorEvent;
    import flash.utils.Timer;
    import flash.events.TimerEvent;

    // TODO: This file needs a complete refactor. It is currently very messy and hard to read.
    public class AuthForm extends Sprite {

        private var isRegisterForm:Boolean = false;

        private var formContainer:Sprite;

        private var borderContainer:Sprite;

        private var loadingContainer:Sprite;

        private var navContainer:Sprite;

        private var selectField:Sprite;

        private var dropdownMenu:Sprite;

        private var usernameInput:TextField;

        private var emailInput:TextField;

        private var passwordInput:TextField;

        private var usernameValue:String = "";

        private var emailValue:String = "";

        private var passwordValue:String = "";

        private var emailErrorText:TextField;

        private var passwordErrorText:TextField;

        private var errMessage:TextField;

        private var submitButton:Sprite;

        private var hasAccountText:TextField;

        private var defaultText:TextField;

        private var hasAccountFormat:TextFormat;

        private var button:Sprite;

        private var buttonText:TextField;

        private var image:Bitmap;

        private var loader:Loader;

        private var startY:Number;

        private var verticalSpacingBetweenBlocks:Number = 0;

        private var BLACK:uint = 0x000000;

        private var WHITE:uint = 0xFFFFFF;

        private var RED:uint = 0xFF0000;

        private var BACKGROUND:uint = 0x1D232A;

        private var LIGHT_GRAY:uint = 0xC9C9C9;

        private var PRIMARY:uint = 0x004DE5;

        private var SECONDARY:uint = 0x00CDB8;

        private var checkContentLoadedTimer:Timer;

        private var languages:Array;

        private var background:Sprite;

        private var contentContainer:Sprite;

        private const DESIGN_WIDTH:Number = 760;

        private const DESIGN_HEIGHT:Number = 670;

        public function AuthForm() {
            if (GLOBAL.INFERNO_ONLY) {
                // Inferno theme: orange and ember accents on a volcanic background, the form on the game's
                // parchment popup frame (see ioCard / ioInputBox / createButton).
                PRIMARY = 0xB5541A;
                SECONDARY = 0xFF8C1E;
                RED = 0xC0392B;
            }
            background = new Sprite();
            addChild(background);

            contentContainer = new Sprite();
            addChild(contentContainer);

            addEventListener(Event.ADDED_TO_STAGE, formAddedToStageHandler);

            GLOBAL.eventDispatcher.addEventListener("initError", function(event:Event):void {
                    errMessage.text = GLOBAL.initError;
                    // If loadingContainer is present, refresh the loading screen to update the title
                    if (loadingContainer && loadingContainer.parent) {
                        Loading();
                    }
                });

            checkContentLoadedTimer = new Timer(1000);
            checkContentLoadedTimer.addEventListener(TimerEvent.TIMER, checkContentLoaded);
            checkContentLoadedTimer.start();
        }

        private function checkContentLoaded(event:TimerEvent):void {
            // True: Once we receive the language file and supported languages from the server
            // This also let's us know whether a connection has been established.
            if (GLOBAL.textContentLoaded && GLOBAL.supportedLangsLoaded) {
                checkContentLoadedTimer.stop();
                checkContentLoadedTimer.removeEventListener(TimerEvent.TIMER, checkContentLoaded);
                if (loadingContainer && loadingContainer.parent) {
                    contentContainer.removeChild(loadingContainer);
                }
                handleContentLoaded();
            }
            else {
                if (!loadingContainer.parent) {
                    Loading();
                }
            }
        }

        public function formAddedToStageHandler(event:Event):void {
            removeEventListener(Event.ADDED_TO_STAGE, formAddedToStageHandler);

            drawBackground();
            centerContent();
            stage.addEventListener(Event.RESIZE, onStageResize);

            if (!GLOBAL.textContentLoaded && !GLOBAL.supportedLangsLoaded) {
                Loading();
            }
            else {
                // If text content is already loaded, proceed with UI setup
                if (loadingContainer && loadingContainer.parent) {
                    contentContainer.removeChild(loadingContainer);
                }
                handleContentLoaded();
            }
        }

        private function onStageResize(event:Event):void {
            drawBackground();
            centerContent();
            GLOBAL.RefreshScreen();
            GLOBAL.ResizeLayer(GLOBAL._layerTop);
        }

        private function drawBackground():void {
            // slight hack but its only 2-lines of shit
            var offsetX:Number = -(stage.stageWidth - DESIGN_WIDTH) / 2;
            var offsetY:Number = -(stage.stageHeight - DESIGN_HEIGHT) / 2;
            background.graphics.clear();
            if (GLOBAL.INFERNO_ONLY) {
                var glow:Matrix = new Matrix();
                glow.createGradientBox(stage.stageWidth * 1.3, stage.stageHeight * 1.3, 0, offsetX - stage.stageWidth * 0.15, offsetY - stage.stageHeight * 0.05);
                background.graphics.beginGradientFill(GradientType.RADIAL, [0x6A1E0A, 0x2A0B06, 0x100403], [1, 1, 1], [0, 150, 255], glow);
            }
            else {
                background.graphics.beginFill(BACKGROUND);
            }
            background.graphics.drawRect(offsetX, offsetY, stage.stageWidth, stage.stageHeight);
            background.graphics.endFill();
        }

        private function centerContent():void {
            contentContainer.x = 0;
            contentContainer.y = 0;
        }

        private function handleContentLoaded():void {
            // Global Initialization
            navContainer = new Sprite();
            formContainer = new Sprite();
            usernameInput = new TextField();
            emailInput = new TextField();
            passwordInput = new TextField();
            emailErrorText = new TextField();
            buttonText = new TextField();
            passwordErrorText = new TextField();
            hasAccountText = new TextField();

            var formWidth:Number = 450;
            var formHeight:Number = 600;

            languages = KEYS.supportedLanguagesJson;
            var selectInput:Sprite = createSelectInput();
            contentContainer.addChild(selectInput);
            selectInput.x = 20;
            selectInput.y = 10;

            HeaderTitle();
            contentContainer.addChild(navContainer);

            formContainer.graphics.drawRect(0, 0, formWidth, formHeight);
            formContainer.x = 155;
            formContainer.y = 45;
            contentContainer.addChild(formContainer);
            if (GLOBAL.INFERNO_ONLY) {
                this.ioCard(formWidth);
            }

            // Y-position for the first input field
            startY = 345;

            // Get image asset
            this.loader = new Loader();
            this.loader.load(new URLRequest(GLOBAL.cdnUrl + "assets/popups/C5-LAB-150.png"));
            this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoaded);
            this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, function(e:IOErrorEvent):void {
                });

            usernameInput = createBlock(0, 0, "Username");
            emailInput = createBlock(350, 35, "Email");
            passwordInput = createBlock(350, 35, "Password", true);
            CreateBorder(emailInput);
            CreateBorder(passwordInput);

            // Create button
            submitButton = createButton();
            submitButton.x = (formContainer.width - submitButton.width) / 2;
            submitButton.y = startY + 28;
            formContainer.addChild(submitButton);
            submitButton.addEventListener(MouseEvent.CLICK, submitButtonClickHandler);

            // Link
            FormNavigate();
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
        private function ioWhatsDifferent():void {
            var button:Sprite = new Sprite();
            button.name = "ioWhatsDifferent";
            var label:TextField = new TextField();
            var format:TextFormat = new TextFormat("Groboldov", 13, 0xFFC27A);
            label.defaultTextFormat = format;
            label.embedFonts = true;
            label.antiAliasType = AntiAliasType.NORMAL;
            label.selectable = false;
            label.mouseEnabled = false;
            label.autoSize = TextFieldAutoSize.LEFT;
            label.text = KEYS.Get("io_whats_different").toLocaleUpperCase();
            var w:Number = Math.ceil(label.textWidth) + 26;
            var h:Number = 30;
            // (placed as the language picker places its label, so the two line up)
            label.x = (w - label.textWidth) / 2;
            label.y = (h - label.textHeight) / 2;
            var draw:Function = function(over:Boolean):void {
                button.graphics.clear();
                button.graphics.lineStyle(1, SECONDARY);
                button.graphics.beginFill(SECONDARY, over ? 0.3 : 0.12);
                button.graphics.drawRect(0, 0, w, h);
                button.graphics.endFill();
            };
            draw(false);
            button.addChild(label);
            button.buttonMode = true;
            button.useHandCursor = true;
            button.mouseChildren = false;
            button.x = DESIGN_WIDTH - 20 - w;
            button.y = 10;
            button.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    draw(true);
                });
            button.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    draw(false);
                });
            button.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    GLOBAL.gotoURL(GLOBAL.serverUrl + "whats-different");
                });
            contentContainer.addChild(button);
        }

        private function Loading():void {
            // Remove previous loadingContainer if present
            if (loadingContainer && loadingContainer.parent) {
                loadingContainer.parent.removeChild(loadingContainer);
            }

            loadingContainer = new Sprite();
            contentContainer.addChild(loadingContainer);

            var contentWidth:Number = 400;

            // Create title
            var loadingTitle:TextField = new TextField();
            var titleFormat:TextFormat = new TextFormat();
            titleFormat.font = "Groboldov";
            titleFormat.size = 32;
            titleFormat.color = WHITE;
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
            var loadingDesc:TextField;
            if (!GLOBAL.versionMismatch) {
                loadingDesc = new TextField();
                var descFormat:TextFormat = new TextFormat();
                descFormat.font = "Verdana";
                descFormat.size = 14;
                descFormat.color = LIGHT_GRAY;
                descFormat.align = TextFormatAlign.CENTER;
                loadingDesc.defaultTextFormat = descFormat;
                loadingDesc.htmlText = "<font color='#ffffff'>Taking a while? Check our </font><font color='" + (GLOBAL.INFERNO_ONLY ? "#FF8C1E" : "#00CDB8") + "'><u>#server-status</u></font><font color='#ffffff'> on Discord.</font>";
                loadingDesc.width = contentWidth;
                loadingDesc.height = 28;
                loadingDesc.x = 0;
                loadingDesc.y = 50; // Fixed position
                loadingDesc.selectable = false;
                loadingDesc.embedFonts = true;
                loadingDesc.antiAliasType = AntiAliasType.ADVANCED;
                loadingDesc.autoSize = TextFieldAutoSize.NONE;
                mousePointerCursor(loadingDesc);
                loadingDesc.addEventListener(MouseEvent.CLICK, DiscordLink);
                loadingContainer.addChild(loadingDesc);
            }

            // Create error message
            errMessage = new TextField();
            var errFormat:TextFormat = new TextFormat();
            errFormat.font = "Verdana";
            errFormat.size = 16;
            errFormat.color = RED;
            errFormat.align = TextFormatAlign.CENTER;
            errFormat.leading = 5;
            errMessage.defaultTextFormat = errFormat;
            errMessage.htmlText = GLOBAL.initError;
            errMessage.width = contentWidth;
            errMessage.x = 0;
            errMessage.wordWrap = true;
            errMessage.multiline = true;
            errMessage.embedFonts = true;
            errMessage.antiAliasType = AntiAliasType.ADVANCED;
            errMessage.autoSize = TextFieldAutoSize.LEFT;

            // Position elements based on version mismatch
            if (GLOBAL.versionMismatch) {
                loadingTitle.y = 140;
                errMessage.y = 190;

                var updateImageLoader:Loader = new Loader();
                updateImageLoader.load(new URLRequest(GLOBAL.serverUrl + "assets/popups/fantastic.png"));
                updateImageLoader.contentLoaderInfo.addEventListener(Event.COMPLETE, function(e:Event):void {
                        var img:Bitmap = Bitmap(updateImageLoader.content);
                        img.x = (contentWidth - img.width) / 2;
                        img.y = 0;
                        loadingContainer.addChildAt(img, 0);
                    });
            }
            else {
                // Positions for normal loading (no image)
                loadingTitle.y = 0;
                errMessage.y = 90;
            }

            // Add elements to container
            loadingContainer.addChild(loadingTitle);
            loadingContainer.addChild(errMessage);

            // Fixed container position
            loadingContainer.x = 200;
            loadingContainer.y = 200;
        }

        public static function DiscordLink(param1:Event = null):void {
            GLOBAL.gotoURL("https://discord.gg/bymrefitted");
        }

        private function HeaderTitle():void {
            var navWidth:Number = 800;
            var navHeight:Number = 50;

            navContainer.graphics.drawRect(0, 0, navWidth, navHeight);
            navContainer.x = -20;
            navContainer.y = 50;

            var textContainer:Sprite = new Sprite();
            navContainer.addChild(textContainer);

            var titlePrefix:TextField = createRichText(KEYS.Get("auth_header_prefix"), WHITE);
            textContainer.addChild(titlePrefix);

            var titleSuffix:TextField = createRichText(KEYS.Get("auth_header_suffix"), SECONDARY);
            textContainer.addChild(titleSuffix);
            titleSuffix.x = titlePrefix.x + titlePrefix.width;

            textContainer.x = (navWidth - textContainer.width) / 2;
            textContainer.y = (navHeight - textContainer.height) / 2 + 30;

            if (GLOBAL.INFERNO_ONLY) {
                var subtitle:TextField = new TextField();
                var subtitleFormat:TextFormat = new TextFormat("Groboldov", 16, 0xFFC27A);
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
                navContainer.addChild(subtitle);
            }
        }

        // Essentially creates a 'span' element.
        private function createRichText(text:String, color:uint):TextField {
            var textField:TextField = new TextField();
            var textFormat:TextFormat = new TextFormat();
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

        private function onImageLoaded(event:Event):void {
            image = Bitmap(loader.content);

            image.x = 150;
            image.y = GLOBAL.INFERNO_ONLY ? 132 : 150;
            if (GLOBAL.INFERNO_ONLY) {
                // The saved-account list takes the picture's place on the login form.
                image.visible = isRegisterForm || IoSavedAccounts.list().length == 0;
            }
            image.scaleX = 1;
            image.scaleY = 1;
            formContainer.addChild(image);
        }

        // Function to create and position input fields
        private function createBlock(width:Number, height:Number, placeholder:String = "", isPassword:Boolean = false):TextField {
            var input:TextField = createInputField(width, height, placeholder, isPassword);
            formContainer.addChild(input);

            input.x = (formContainer.width - input.width) / 2;
            input.y = startY;

            input.addEventListener(Event.CHANGE, function(event:Event):void {
                    if (placeholder == "Email") {
                        emailValue = input.text;
                    }
                    else if (placeholder == "Password") {
                        passwordValue = input.text;
                    }
                    else if (placeholder == "Username") {
                        usernameValue = input.text;
                    }
                });

            // Gap between each block
            startY += input.height + 20;

            return input;
        }

        private function createInputField(width:Number, height:Number, placeholder:String = "", isPassword:Boolean = false):TextField {
            var input:TextField = new TextField();
            input.type = TextFieldType.INPUT;
            input.width = width;
            input.height = height;

            // Normal input
            var inputTextFormat:TextFormat = new TextFormat();
            inputTextFormat.font = "Verdana";
            inputTextFormat.size = 14;
            inputTextFormat.color = GLOBAL.INFERNO_ONLY ? 0x3A1A08 : WHITE;

            input.embedFonts = true;
            input.antiAliasType = AntiAliasType.NORMAL;
            input.defaultTextFormat = inputTextFormat;

            // Placeholder
            var placeholderTextFormat:TextFormat = new TextFormat();
            placeholderTextFormat.font = "Verdana";
            placeholderTextFormat.size = 14;
            placeholderTextFormat.color = GLOBAL.INFERNO_ONLY ? 0x9A8060 : WHITE;

            input.text = placeholder;
            input.setTextFormat(placeholderTextFormat);

            if (isPassword)
                input.displayAsPassword = true;

            if (placeholder) {
                input.text = placeholder;

                input.addEventListener(FocusEvent.FOCUS_IN, function(event:FocusEvent):void {
                        if (input.text == placeholder) {
                            input.text = "";
                            input.setTextFormat(inputTextFormat);
                        }
                    });

                input.addEventListener(FocusEvent.FOCUS_OUT, function(event:FocusEvent):void {
                        if (input.text == "") {
                            input.text = placeholder;
                            input.setTextFormat(placeholderTextFormat);
                        }
                    });
            }

            return input;
        }

        private function createSelectInput(defaultOption:String = "English"):Sprite {
            selectField = new Sprite();
            var selectWidth:Number = 80;
            var selectHeight:Number = 30;
            selectField.graphics.lineStyle(1, WHITE);
            selectField.graphics.drawRect(0, 0, selectWidth, selectHeight);

            defaultText = new TextField();
            var defaultTextStyle:TextFormat = new TextFormat();
            defaultTextStyle.font = "Groboldov";
            defaultTextStyle.size = 13;

            defaultText.textColor = WHITE;
            defaultText.embedFonts = true;
            defaultText.defaultTextFormat = defaultTextStyle;
            defaultText.text = defaultOption.toLocaleUpperCase();
            defaultText.x = (selectWidth - defaultText.textWidth) / 2;
            defaultText.y = (selectHeight - defaultText.textHeight) / 2;
            mousePointerCursor(defaultText);
            selectField.addChild(defaultText);

            // Create the dropdown menu
            dropdownMenu = new Sprite();
            dropdownMenu.visible = false;
            selectField.addChild(dropdownMenu);

            // Populate the dropdown menu with options
            for (var index:int = 0; index < languages.length; index++) {
                var langSelectText:TextField = new TextField();
                var langSelectTextStyle:TextFormat = new TextFormat();
                langSelectTextStyle.font = "Groboldov";
                langSelectTextStyle.size = 13;

                langSelectText.embedFonts = true;
                langSelectText.textColor = WHITE;
                langSelectText.defaultTextFormat = langSelectTextStyle;
                langSelectText.text = languages[index].toLocaleUpperCase();
                langSelectText.y = index * 30;
                langSelectText.width = 200;
                langSelectText.selectable = false;
                langSelectText.antiAliasType = AntiAliasType.NORMAL;
                langSelectText.addEventListener(MouseEvent.CLICK, langSelectClickHandler);
                mousePointerCursor(langSelectText);
                dropdownMenu.addChild(langSelectText);
            }

            // Handle click events to toggle the dropdown menu visibility
            selectField.addEventListener(MouseEvent.CLICK, function(event:MouseEvent):void {
                    dropdownMenu.visible = !dropdownMenu.visible;
                });

            dropdownMenu.y = 50;

            return selectField;
        }

        // Function to handle language select event
        private function langSelectClickHandler(event:MouseEvent):void {
            var selectedLanguage:String = event.currentTarget.text;
            defaultText.text = selectedLanguage;
            defaultText.width = 200;
            dropdownMenu.visible = true;

            var textWidth:Number = defaultText.textWidth;
            var newSelectWidth:Number = textWidth + 23;

            selectField.graphics.clear();
            selectField.graphics.lineStyle(1, WHITE);
            selectField.graphics.drawRect(0, 0, newSelectWidth, 30);

            // Iterate over the supported languages and pass them to KEYS.Setup()
            // to grab available language file.
            for each (var language:String in languages) {
                if (selectedLanguage.toLocaleLowerCase() === language.toLocaleLowerCase()) {
                    KEYS.Setup(language.toLowerCase());
                    return;
                }
            }
            KEYS.Setup("english");
        }

        private function CreateBorder(input:TextField):Sprite {
            if (GLOBAL.INFERNO_ONLY) {
                return this.ioInputBox(input);
            }
            borderContainer = new Sprite();
            borderContainer.graphics.lineStyle(1, WHITE);
            borderContainer.graphics.moveTo(0, 2);
            borderContainer.graphics.lineTo(input.width, 2);
            borderContainer.x = input.x;
            borderContainer.y = input.y + input.height;

            formContainer.addChild(borderContainer);
            return borderContainer;
        }

        private function createButton():Sprite {
            var formRadius:Number = 16;
            button = new Sprite();
            updateButtonColor();
            button.buttonMode = true;
            button.useHandCursor = true;
            button.mouseChildren = false;

            buttonText = new TextField();
            buttonText.textColor = WHITE;
            buttonText.width = button.width;
            buttonText.height = button.height;
            buttonText.selectable = false;
            buttonText.mouseEnabled = false;

            var textFormat:TextFormat = new TextFormat();
            textFormat.font = "Groboldov";
            textFormat.size = 16;
            textFormat.align = TextFormatAlign.CENTER;
            buttonText.embedFonts = true;
            buttonText.defaultTextFormat = textFormat;
            updateButtonText();

            buttonText.autoSize = TextFieldAutoSize.CENTER;
            if (GLOBAL.INFERNO_ONLY) {
                buttonText.filters = [new GlowFilter(0x5A2A06, 1, 3, 3, 8, 2)];
            }
            buttonText.x = (button.width - buttonText.width) / 2;
            buttonText.y = (button.height - buttonText.height) / 2;
            mousePointerCursor(button);

            button.addChild(buttonText);

            return button;
        }

        private function FormNavigate():void {
            var linkContainer:Sprite = new Sprite();
            linkContainer.buttonMode = true;
            linkContainer.useHandCursor = true;
            linkContainer.mouseChildren = false;

            hasAccountText = new TextField();
            hasAccountText.autoSize = TextFieldAutoSize.LEFT;
            hasAccountText.x = linkContainer.width / 2;

            hasAccountFormat = new TextFormat();
            hasAccountFormat.size = 16;
            updateLinkColour();
            updateLinkText();

            hasAccountText.y = 0;
            linkContainer.addChild(hasAccountText);

            linkContainer.x = (formContainer.width - linkContainer.width) / 2;
            linkContainer.y = submitButton.y + submitButton.height + 15;
            mousePointerCursor(linkContainer);

            formContainer.addChild(linkContainer);
            linkContainer.addEventListener(MouseEvent.CLICK, function(event:Event):void {
                    isRegisterForm = !isRegisterForm;
                    updateState();
                });
            if (GLOBAL.INFERNO_ONLY) {
                this.ioRegisterWarning(linkContainer.y + 30);
            }
        }

        /** Inferno-only: the advice under the register form, in a dark red glow that pulses. */
        private var _ioWarning:TextField = null;

        private var _ioWarningGlow:GlowFilter = null;

        private var _ioWarningPhase:Number = 0;

        private function ioRegisterWarning(param1:Number):void {
            var field:TextField = new TextField();
            var format:TextFormat = new TextFormat("Groboldov", 15, 0xFFF4E0, false);
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
            field.visible = isRegisterForm;
            formContainer.addChild(field);
            this._ioWarning = field;
            field.addEventListener(Event.ENTER_FRAME, this.ioPulseWarning);
        }

        /** The glow swells and fades about once a second while the register form shows. */
        private function ioPulseWarning(param1:Event):void {
            if (!this._ioWarning || !this._ioWarning.visible) {
                return;
            }
            this._ioWarningPhase += 0.11;
            var k:Number = 0.5 + 0.5 * Math.sin(this._ioWarningPhase);
            this._ioWarningGlow.blurX = this._ioWarningGlow.blurY = 5 + 9 * k;
            this._ioWarningGlow.strength = 2 + 3 * k;
            this._ioWarningGlow.alpha = 0.55 + 0.45 * k;
            this._ioWarning.filters = [this._ioWarningGlow];
        }

        private function updateFormFields():void {
            if (isRegisterForm) {
                usernameInput.width = 350;
                usernameInput.height = 35;
                usernameInput.x = 50;
                usernameInput.y = emailInput.y - usernameInput.height - 20;
                CreateBorder(usernameInput);
            }
        }

        private function updateLinkText():void {
            hasAccountText.embedFonts = true;
            hasAccountText.antiAliasType = AntiAliasType.NORMAL;
            hasAccountText.text = isRegisterForm ? KEYS.Get("auth_login_link") : KEYS.Get("auth_register_link");
        }

        private function updateLinkColour():void {
            hasAccountFormat.color = isRegisterForm ? SECONDARY : PRIMARY;
            hasAccountFormat.font = "Verdana";
            hasAccountText.defaultTextFormat = hasAccountFormat;
            hasAccountText.setTextFormat(hasAccountFormat);
        }

        private function updateButtonText():void {
            button.graphics.beginFill(isRegisterForm ? PRIMARY : SECONDARY);
            buttonText.text = isRegisterForm ? KEYS.Get("auth_register_btn").toUpperCase() : KEYS.Get("auth_login_btn").toUpperCase();
        }

        private function updateButtonColor():void {
            if (GLOBAL.INFERNO_ONLY) {
                // Gold, like the game's highlighted buttons; the register button is a deeper orange.
                var shade:Matrix = new Matrix();
                shade.createGradientBox(350, 50, Math.PI / 2);
                button.graphics.clear();
                button.graphics.lineStyle(2, 0x6A3A0A);
                button.graphics.beginGradientFill(GradientType.LINEAR, isRegisterForm ? [0xFFB35A, 0xD9661A] : [0xFFE27A, 0xE8A21E], [1, 1], [0, 255], shade);
                button.graphics.drawRoundRect(0, 0, 350, 50, 14);
                button.graphics.endFill();
                return;
            }
            button.graphics.beginFill(isRegisterForm ? SECONDARY : PRIMARY);
            button.graphics.drawRoundRect(0, 0, 350, 50, 12);
            button.graphics.endFill();
        }

        private function mousePointerCursor(element:*):void {
            element.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    Mouse.cursor = MouseCursor.BUTTON;
                });

            element.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    Mouse.cursor = MouseCursor.AUTO;
                });
        }

        private function submitButtonClickHandler(event:MouseEvent):void {
            clearErrorMessages();

            var isUsernameValid:Boolean = isValidUsername(usernameValue);
            var isEmailValid:Boolean = isValidEmail(emailValue);
            var isPasswordValid:Boolean = isValidPassword(passwordValue);

            if (isEmailValid && isPasswordValid) {
                if (isRegisterForm) {
                    if (isUsernameValid) {
                        var newUser:Array = [["username", usernameValue], ["email", emailValue], ["password", passwordValue], ["last_name", ""], ["pic_square", ""]];
                        newUser.push(["ref", ioReferralCode()]);
                        // Inferno-only: one registration at a time. Clicked twice, the second was refused with "An
                        // account with this username already exists." over the first one's success (bug report #58).
                        if (GLOBAL.INFERNO_ONLY) {
                            if (_ioRegistering) {
                                return;
                            }
                            _ioRegistering = true;
                        }

                        new URLLoaderApi().load(GLOBAL._apiURL + "player/register", newUser, registerNewUser, function(event:IOErrorEvent):void {
                                _ioRegistering = false;
                                GLOBAL.Message("An error occurred during registration on the server.");
                            });
                    }
                    else {
                        GLOBAL.Message("<b>Usernames must be:</b><br><br>• At least 2 characters long.<br>• No longer than 12 characters.<br>• Can only include numbers and letters.");
                    }
                }
                else {
                    // Authentication call
                    const authInfo:Array = [["email", emailValue], ["password", passwordValue]];
                    LOGIN.AuthenticateUser(authInfo);
                }
            }
            else {
                if (!isEmailValid) {
                    showErrorMessage(emailInput, "Please enter a valid email address");
                }
                if (!isPasswordValid) {
                    showErrorMessage(passwordInput, "Password must be at least 8 characters long and contain\nat least 1 special character");
                }
                if (!isUsernameValid && isRegisterForm) {
                    GLOBAL.Message("<b>Usernames must be:</b><br><br>• At least 2 characters long.<br>• No longer than 12 characters.<br>• Can only include numbers and letters.");
                }
            }
        }

        /** The invite code this game was started with (GAME.setLauncherVars), or "". */
        private function ioReferralCode():String {
            try {
                var so:SharedObject = SharedObject.getLocal("bymr_data", "/");
                return so.data.ioReferral ? String(so.data.ioReferral) : "";
            }
            catch (e:Error) {
            }
            return "";
        }

        private var _ioRegistering:Boolean = false;

        private function registerNewUser(serverData:Object):void {
            _ioRegistering = false;
            if (serverData.hasOwnProperty("error")) {
                GLOBAL.Message(serverData.error);
                return;
            }
            GLOBAL.Message("You have successfully registered an account. Please login to continue.");
            try {
                // The invite has been used: it must not be sent with a second account from this machine.
                var so:SharedObject = SharedObject.getLocal("bymr_data", "/");
                delete so.data.ioReferral;
                so.flush();
            }
            catch (e:Error) {
            }
            isRegisterForm = false;
            updateState();
        }

        private function isValidUsername(username:String):Boolean {
            var pattern:RegExp = /^[a-zA-Z0-9_]+$/;
            return username.length >= 2 && username.length <= 12 && pattern.test(username);
        }

        private function isValidEmail(email:String):Boolean {
            var emailPattern:RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
            return emailPattern.test(email);
        }

        private function isValidPassword(password:String):Boolean {
            var trimmed:String = password.replace(/^\s+|\s+$/g, "");
            return trimmed.length >= 8 && /[^a-zA-Z0-9]/.test(trimmed);
        }

        private function clearErrorMessages():void {
            emailErrorText.text = "";
            passwordErrorText.text = "";
        }

        private function showErrorMessage(inputField:TextField, errorMessage:String):void {
            var errorText:TextField = new TextField();
            errorText.htmlText = errorMessage;
            errorText.textColor = RED;
            errorText.x = inputField.x;
            ;
            errorText.y = inputField.y + inputField.height + 5;
            errorText.width = inputField.width + 100;
            errorText.height = 40;
            if (GLOBAL.INFERNO_ONLY) {
                // Inferno-only: in the form's font, and both under the password field (the email's own line was
                // half hidden behind the password field, in the player's default serif font)
                errorText.setTextFormat(new TextFormat("Verdana", 10, RED));
                errorText.selectable = false;
                errorText.mouseEnabled = false;
                errorText.y = passwordInput.y + passwordInput.height + 3;
                if (inputField == passwordInput && emailErrorText && emailErrorText.text) {
                    errorText.y += emailErrorText.textHeight + 2;
                }
            }
            formContainer.addChild(errorText);

            if (inputField == emailInput) {
                emailErrorText = errorText;
            }
            else if (inputField == passwordInput) {
                passwordErrorText = errorText;
            }
        }

        public function updateState():void {
            if (GLOBAL.INFERNO_ONLY) {
                if (this._ioAccounts) {
                    this._ioAccounts.visible = !isRegisterForm;
                }
                if (image) {
                    image.visible = isRegisterForm || IoSavedAccounts.list().length == 0;
                }
            }
            updateFormFields();
            if (GLOBAL.INFERNO_ONLY) {
                if (this._ioWarning) {
                    this._ioWarning.visible = isRegisterForm;
                }
                // The username field only belongs to the register form.
                usernameInput.visible = isRegisterForm;
                if (this._ioUserBox) {
                    this._ioUserBox.visible = isRegisterForm;
                }
            }
            updateButtonText();
            updateButtonColor();
            updateLinkText();
            updateLinkColour();
        }

        public function disposeUI():void {
            if (stage) {
                stage.removeEventListener(Event.RESIZE, onStageResize);
            }

            // Stop timer
            if (checkContentLoadedTimer) {
                checkContentLoadedTimer.stop();
                checkContentLoadedTimer.removeEventListener(TimerEvent.TIMER, checkContentLoaded);
            }

            // Remove event listeners
            if (this._ioWarning) {
                this._ioWarning.removeEventListener(Event.ENTER_FRAME, this.ioPulseWarning);
            }
            if (submitButton)
                submitButton.removeEventListener(MouseEvent.CLICK, submitButtonClickHandler);

            // Dispose bitmap data to free memory
            if (image)
                image.bitmapData.dispose();

            // Unload loader
            if (loader) {
                loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoaded);
                loader.unload();
            }

            // Clear background graphics
            if (background)
                background.graphics.clear();

            if (this.parent)
                this.parent.removeChild(this);
        }

    
        // ---------------------------------------------------------------------------------------------
        // Inferno-only look and saved accounts
        // ---------------------------------------------------------------------------------------------

        private var _ioAccounts:Sprite = null;

        private var _ioUserBox:Sprite = null;

        /** The form sits on the game's parchment popup frame. */
        private function ioCard(width:Number):void {
            var card:frame_CLIP = new frame_CLIP();
            card.width = width;
            card.height = 480;
            card.x = 0;
            card.y = 110;
            card.Setup(false);
            formContainer.addChildAt(card, 0);
        }

        /** A parchment box behind an input field, under it in the display list. */
        private function ioInputBox(input:TextField):Sprite {
            var box:Sprite = new Sprite();
            box.graphics.lineStyle(2, 0x9A7248);
            box.graphics.beginFill(0xFFFBEA);
            box.graphics.drawRoundRect(0, 0, input.width + 20, input.height + 6, 12, 12);
            box.graphics.endFill();
            box.x = input.x - 10;
            box.y = input.y - 3;
            input.y += 7;
            input.height = Math.max(input.height - 6, 22);
            formContainer.addChildAt(box, formContainer.getChildIndex(input));
            if (input == usernameInput) {
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
        private function ioBuildAccounts():void {
            var accounts:Array = IoSavedAccounts.list();
            if (this._ioAccounts && this._ioAccounts.parent) {
                this._ioAccounts.parent.removeChild(this._ioAccounts);
            }
            this._ioAccounts = new Sprite();
            this._ioAccounts.visible = !isRegisterForm;
            formContainer.addChild(this._ioAccounts);
            if (image) {
                image.visible = isRegisterForm || accounts.length == 0;
            }
            if (accounts.length == 0) {
                return;
            }

            // heading with a rule either side
            var heading:TextField = this.ioLabel("WHO'S PLAYING?", "Groboldov", 16, 0x5A3418, true);
            heading.width = 450;
            heading.y = 121;
            this._ioAccounts.addChild(heading);
            var ruleWidth:Number = heading.textWidth;
            this._ioAccounts.graphics.lineStyle(2, 0xB08A5A);
            this._ioAccounts.graphics.moveTo(45, 132);
            this._ioAccounts.graphics.lineTo(225 - ruleWidth / 2 - 10, 132);
            this._ioAccounts.graphics.moveTo(225 + ruleWidth / 2 + 10, 132);
            this._ioAccounts.graphics.lineTo(405, 132);

            // Tiles narrow a little when there are many, to stay inside the frame's side borders.
            var tileWidth:int = Math.min(IO_TILE_W, int((450 - 2 * 24 - (accounts.length - 1) * IO_TILE_GAP) / accounts.length));
            var total:int = accounts.length * tileWidth + (accounts.length - 1) * IO_TILE_GAP;
            var x:int = int((450 - total) / 2);
            var chosenEmail:String = "";
            for each (var account:Object in accounts) {
                var chosen:Boolean = emailValue.toLowerCase() == String(account.email).toLowerCase();
                if (chosen) {
                    chosenEmail = String(account.email);
                }
                var tile:Sprite = this.ioAccountTile(account, chosen, tileWidth);
                tile.x = x;
                tile.y = 151;
                this._ioAccounts.addChild(tile);
                x += tileWidth + IO_TILE_GAP;
            }

            var email:TextField = this.ioLabel(chosenEmail, "Verdana", 11, 0x7A5A3A, false);
            email.width = 450;
            email.y = 151 + IO_TILE_H + 8;
            this._ioAccounts.addChild(email);
        }

        private static const IO_TILE_W:int = 78;

        private static const IO_TILE_H:int = 100;

        private static const IO_TILE_GAP:int = 12;

        /** The Inferno monster portraits a tile can show; each account always gets the same one. */
        private static const IO_PORTRAITS:Array = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8"];

        private static function ioPortraitFor(param1:String):String {
            var hash:int = 0;
            var i:int = 0;
            while (i < param1.length) {
                hash = (hash * 31 + param1.charCodeAt(i)) & 0x7FFFFFFF;
                i++;
            }
            return IO_PORTRAITS[hash % IO_PORTRAITS.length];
        }

        private function ioLabel(text:String, font:String, size:int, colour:uint, embedded:Boolean):TextField {
            var field:TextField = new TextField();
            var format:TextFormat = new TextFormat(font, size, colour, !embedded);
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

        private function ioAccountTile(account:Object, chosen:Boolean, w:int):Sprite {
            var email:String = String(account.email);
            var name:String = account.name ? String(account.name) : email.split("@")[0];
            var tile:Sprite = new Sprite();
            tile.buttonMode = true;
            mousePointerCursor(tile);

            // card: gold with an orange glow when chosen, parchment otherwise
            if (chosen) {
                var shade:Matrix = new Matrix();
                shade.createGradientBox(w, IO_TILE_H, Math.PI / 2);
                tile.graphics.lineStyle(3, 0xD66A16);
                tile.graphics.beginGradientFill(GradientType.LINEAR, [0xFFF0C0, 0xF6D280], [1, 1], [0, 255], shade);
                tile.filters = [new GlowFilter(0xFF8214, 0.8, 12, 12, 2, 2)];
            }
            else {
                tile.graphics.lineStyle(2, 0xB08A5A);
                tile.graphics.beginFill(0xFAF1D6);
            }
            tile.graphics.drawRoundRect(0, 0, w, IO_TILE_H, 24, 24);
            tile.graphics.endFill();

            // round portrait with a dark rim
            var portrait:Sprite = new Sprite();
            portrait.x = int((w - 50) / 2);
            portrait.y = 10;
            portrait.graphics.beginFill(0xC8A870);
            portrait.graphics.drawCircle(25, 25, 25);
            portrait.graphics.endFill();
            tile.addChild(portrait);
            var picture:Loader = new Loader();
            var circle:Shape = new Shape();
            circle.graphics.beginFill(0);
            circle.graphics.drawCircle(25, 25, 25);
            circle.graphics.endFill();
            portrait.addChild(circle);
            picture.mask = circle;
            portrait.addChild(picture);
            picture.contentLoaderInfo.addEventListener(Event.COMPLETE, function(e:Event):void {
                    // cover the circle: scale the short side to 50 and centre
                    var scale:Number = 50 / Math.min(picture.content.width, picture.content.height);
                    picture.content.scaleX = picture.content.scaleY = scale;
                    if (picture.content is Bitmap) {
                        Bitmap(picture.content).smoothing = true;
                    }
                    picture.content.x = (50 - picture.content.width) / 2;
                    picture.content.y = (50 - picture.content.height) / 2;
                });
            picture.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, function(e:IOErrorEvent):void {
                });
            picture.load(new URLRequest(GLOBAL.cdnUrl + "assets/monsters/" + ioPortraitFor(name.toLowerCase()) + "-medium.jpg"));
            var rim:Shape = new Shape();
            rim.graphics.lineStyle(2, 0x6A3A0A);
            rim.graphics.drawCircle(portrait.x + 25, 35, 25);
            tile.addChild(rim);

            // name, shortened to fit the tile
            var label:TextField = this.ioLabel(name, "Groboldov", 13, 0x3A1A08, true);
            label.width = w;
            label.y = 67;
            while (label.textWidth > w - 8 && name.length > 3) {
                name = name.substr(0, name.length - 1);
                label.text = name + "...";
            }
            tile.addChild(label);

            // forget: a small red x on the corner
            var forget:Sprite = new Sprite();
            forget.graphics.lineStyle(2, 0x5A1408);
            forget.graphics.beginFill(0xB83A22);
            forget.graphics.drawCircle(0, 0, 8);
            forget.graphics.endFill();
            forget.graphics.lineStyle(2, 0xFFFFFF);
            forget.graphics.moveTo(-3.5, -3.5);
            forget.graphics.lineTo(3.5, 3.5);
            forget.graphics.moveTo(3.5, -3.5);
            forget.graphics.lineTo(-3.5, 3.5);
            forget.x = w - 4;
            forget.y = 4;
            forget.buttonMode = true;
            tile.addChild(forget);

            forget.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    IoSavedAccounts.forget(email);
                    ioBuildAccounts();
                });
            tile.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    emailValue = email;
                    emailInput.text = email;
                    emailInput.setTextFormat(emailInput.defaultTextFormat);
                    clearErrorMessages();
                    ioBuildAccounts();
                    if (stage) {
                        stage.focus = passwordInput;
                    }
                });
            return tile;
        }

        private static function ioEscape(param1:String):String {
            return param1.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    }
}