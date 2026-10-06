import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { URLRequest } from "flash/net";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceFormPopup, AllianceMessageType, AllianceTabBase, BYMChat, Button_CLIP, Channel, Chat, ChatEvent, GLOBAL, IChatSystem, ImageCache, KEYS, SOUNDS, ScrollSetV, TimeUtils, URLLoaderApi } from "@game";

export class MyAllianceTab extends AllianceTabBase {
    static {
        as3.fields(this, { _chatContent: null, _chatScroll: null, _chatYOff: 0, _chatRowIndex: 0, _chatGeneration: 0, _chatInput: null, _chat: null, _joinChannel: null, _chatChannel: null, _data: null });
    }

    private static TITLE_SIZE: int; // const
    private static BODY_SIZE: int; // const
    private static CONTENT_W_INNER: int; // const
    private static BTN_W: int; // const
    private static BTN_H: int; // const
    private static PAD_TOP: int; // const
    private static TITLE_GAP: int; // const
    private static BTN_GAP: int; // const

    private static PAD: int; // const
    private static COL_GAP: int; // const
    private static LEFT_X: int; // const
    private static LEFT_W: int; // const
    private static LEFT_INNER: int; // const
    private static LEFT_CONTENT_X: int; // const
    private static LEFT_CONTENT_W: int; // const
    private static RIGHT_X: int; // const
    private static RIGHT_W: int; // const

    private static ACTION_BTN_H: int; // const
    // Visible bottom of the beige inner section; bottom-anchored content must
    // stay above this or the brown frame shows through behind it.
    private static INNER_BOTTOM: int; // const
    private static CONTENT_BG_H: int; // const
    private static PANEL_PAD: int; // const
    private static PANEL_H: int; // const
    private static PANEL_Y: int; // const
    private static ACTION_Y: int; // const

    // TAB_LABELS index of the My Alliance tab; re-selected to re-render after a leave.
    private static MY_ALLIANCE_TAB: int; // const

    private static SHIELD_SIZE: int; // const
    private static SHIELD_PAD_R: int; // const
    private static DETAIL_ROW_H: int; // const
    private static DETAIL_ROW_GAP: int; // const
    private static TITLE_Y: int; // const
    private static DETAILS_Y: int; // const

    private static DESC_Y: int; // const
    private static DESC_H: int; // const
    private static LEFT_BTN_Y: int; // const

    private static CHAT_X: int; // const
    private static CHAT_Y: int; // const
    private static CHAT_W: int; // const
    private static CHAT_H: int; // const
    private static SCROLLBAR_W: int; // const
    private static CHAT_MASK_W: int; // const

    private static POST_BTN_W: int; // const

    /**
     * Rows kept on screen, mirroring ALLIANCE_MESSAGE_LIMIT on the server. Without
     * this the transcript grows for the whole session while only 50 are stored, so
     * reopening the popup would silently drop messages the player had just seen.
     */
    private static MAX_CHAT_ROWS: int; // const

    private static ROW_BORDER: uint; // const

    private static ROW_BORDER_H: int; // const

    private static BAND_A: uint; // const
    private static BAND_B: uint; // const
    private static ALLIANCE_CHANNEL_ALIAS: string; // const

    static {
        as3.lazyStatics(this, { TITLE_SIZE: 0, BODY_SIZE: 0, CONTENT_W_INNER: 0, BTN_W: 0, BTN_H: 0, PAD_TOP: 0, TITLE_GAP: 0, BTN_GAP: 0, PAD: 0, COL_GAP: 0, LEFT_X: 0, LEFT_W: 0, LEFT_INNER: 0, LEFT_CONTENT_X: 0, LEFT_CONTENT_W: 0, RIGHT_X: 0, RIGHT_W: 0, ACTION_BTN_H: 0, INNER_BOTTOM: 0, CONTENT_BG_H: 0, PANEL_PAD: 0, PANEL_H: 0, PANEL_Y: 0, ACTION_Y: 0, MY_ALLIANCE_TAB: 0, SHIELD_SIZE: 0, SHIELD_PAD_R: 0, DETAIL_ROW_H: 0, DETAIL_ROW_GAP: 0, TITLE_Y: 0, DETAILS_Y: 0, DESC_Y: 0, DESC_H: 0, LEFT_BTN_Y: 0, CHAT_X: 0, CHAT_Y: 0, CHAT_W: 0, CHAT_H: 0, SCROLLBAR_W: 0, CHAT_MASK_W: 0, POST_BTN_W: 0, MAX_CHAT_ROWS: 0, ROW_BORDER: 0, ROW_BORDER_H: 0, BAND_A: 0, BAND_B: 0, ALLIANCE_CHANNEL_ALIAS: null }, () => {
            MyAllianceTab.TITLE_SIZE = 24;
            MyAllianceTab.BODY_SIZE = 15;
            MyAllianceTab.CONTENT_W_INNER = 500;
            MyAllianceTab.BTN_W = 200;
            MyAllianceTab.BTN_H = 36;
            MyAllianceTab.PAD_TOP = 24;
            MyAllianceTab.TITLE_GAP = 14;
            MyAllianceTab.BTN_GAP = 24;
            MyAllianceTab.PAD = 12;
            MyAllianceTab.COL_GAP = 12;
            MyAllianceTab.LEFT_X = MyAllianceTab.PAD;
            MyAllianceTab.LEFT_W = 318;
            MyAllianceTab.LEFT_INNER = 16;
            MyAllianceTab.LEFT_CONTENT_X = (MyAllianceTab.LEFT_X + MyAllianceTab.LEFT_INNER) | 0;
            MyAllianceTab.LEFT_CONTENT_W = (MyAllianceTab.LEFT_W - MyAllianceTab.LEFT_INNER * 2) | 0;
            MyAllianceTab.RIGHT_X = (MyAllianceTab.LEFT_X + MyAllianceTab.LEFT_W + MyAllianceTab.COL_GAP) | 0;
            MyAllianceTab.RIGHT_W = (AllianceConstants.CONTENT_W - MyAllianceTab.RIGHT_X - MyAllianceTab.PAD) | 0;
            MyAllianceTab.ACTION_BTN_H = 40;
            MyAllianceTab.INNER_BOTTOM = 482;
            MyAllianceTab.CONTENT_BG_H = (MyAllianceTab.INNER_BOTTOM + 10) | 0;
            MyAllianceTab.PANEL_PAD = 14;
            MyAllianceTab.PANEL_H = (MyAllianceTab.ACTION_BTN_H + MyAllianceTab.PANEL_PAD * 2) | 0;
            MyAllianceTab.PANEL_Y = (MyAllianceTab.INNER_BOTTOM - 10 - MyAllianceTab.PANEL_H) | 0;
            MyAllianceTab.ACTION_Y = (MyAllianceTab.PANEL_Y + MyAllianceTab.PANEL_PAD) | 0;
            MyAllianceTab.MY_ALLIANCE_TAB = 1;
            MyAllianceTab.SHIELD_SIZE = 90;
            MyAllianceTab.SHIELD_PAD_R = 12;
            MyAllianceTab.DETAIL_ROW_H = 24;
            MyAllianceTab.DETAIL_ROW_GAP = 26;
            MyAllianceTab.TITLE_Y = 18;
            MyAllianceTab.DETAILS_Y = (MyAllianceTab.TITLE_Y + 30) | 0;
            MyAllianceTab.DESC_Y = 172;
            MyAllianceTab.DESC_H = 175;
            MyAllianceTab.LEFT_BTN_Y = (MyAllianceTab.DESC_Y + MyAllianceTab.DESC_H + 31) | 0;
            MyAllianceTab.CHAT_X = MyAllianceTab.RIGHT_X;
            MyAllianceTab.CHAT_Y = MyAllianceTab.PAD;
            MyAllianceTab.CHAT_W = MyAllianceTab.RIGHT_W;
            MyAllianceTab.CHAT_H = (MyAllianceTab.PANEL_Y - MyAllianceTab.CHAT_Y) | 0;
            MyAllianceTab.SCROLLBAR_W = 16;
            MyAllianceTab.CHAT_MASK_W = (MyAllianceTab.CHAT_W - 2) | 0;
            MyAllianceTab.POST_BTN_W = 130;
            MyAllianceTab.MAX_CHAT_ROWS = 50;
            MyAllianceTab.ROW_BORDER = 9737363;
            MyAllianceTab.ROW_BORDER_H = 1;
            MyAllianceTab.BAND_A = AllianceConstants.SHOUT_BAND0;
            MyAllianceTab.BAND_B = AllianceConstants.SHOUT_BAND1;
            MyAllianceTab.ALLIANCE_CHANNEL_ALIAS = "alliance";
        });
    }
    private _chatContent: MovieClip;
    private _chatScroll: ScrollSetV;
    private _chatYOff: int;
    private _chatRowIndex: int;
    /** Bumped on clear, so avatar loads that finish afterwards are discarded. */
    private _chatGeneration: int;
    private _chatInput: TextField;
    private _chat: IChatSystem;
    /** Alias sent on join; the server resolves it to this player's own alliance. */
    private _joinChannel: Channel;
    /** The resolved channel key, known only once the server confirms the join. */
    private _chatChannel: Channel;
    private _data: any;

    public $ctor(): void {
        super.$ctor();
    }

    public override build(): void {
        ALLIANCES.LoadMyAlliance(as3.bind(this, this._onMyAllianceData));
    }

    /**
     * The My Alliance layout extends below the standard content height (the
     * in-alliance view fills it; the no-alliance prompt simply sits in a taller
     * beige area), so the background always reaches the inner-section bottom.
     */
    public override get contentHeight(): int {
        return MyAllianceTab.CONTENT_BG_H;
    }

    /**
     * Renders the tab from the cached store payload (fetched on popup open and
     * refreshed after mutations, not per tab switch). Receives the alliance data
     * object, or null when the player is unaffiliated or the load failed.
     */
    private _onMyAllianceData(data: any): void {
        if (this.stage == null) {
            return;
        }
        if (data) {
            this._data = data;
            this._buildInAlliance();
        } else {
            this._buildNoAlliance();
        }
    }

    private _buildInAlliance(): void {
        this._buildLeftColumn(this._data);
        this._buildChat();
        this._buildPostBar();
    }

    private _buildLeftColumn(data: any): void {
        const detailBlockW: int = (MyAllianceTab.LEFT_CONTENT_W - MyAllianceTab.SHIELD_SIZE - MyAllianceTab.SHIELD_PAD_R - 12) | 0;

        let tTitle: TextField = as3.as(this.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.width = detailBlockW;
        tTitle.height = 30;
        tTitle.x = MyAllianceTab.LEFT_CONTENT_X;
        tTitle.y = MyAllianceTab.TITLE_Y;
        let titleFmt: TextFormat = new TextFormat("Verdana", 16, 0x000000, true);
        titleFmt.align = TextFormatAlign.LEFT;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = String(data.name);

        let rows: any[] = [[KEYS.Get("alliance_my_rank"), String(data.rank)], [KEYS.Get("alliance_my_level"), String(data.avg_level)], [KEYS.Get("alliance_my_leader"), String(data.leader_name)], [KEYS.Get("alliance_my_members"), String(data.number_of_members)]];
        const labelW: int = 68;
        for (let ri: int = 0; ri < rows.length; ri++) {
            let rowY: int = (MyAllianceTab.DETAILS_Y + ri * MyAllianceTab.DETAIL_ROW_GAP) | 0;
            this._addLabel(this, String(rows[ri][0]), MyAllianceTab.LEFT_CONTENT_X, rowY, labelW, MyAllianceTab.DETAIL_ROW_H, false, TextFormatAlign.LEFT);
            this._addLabel(this, String(rows[ri][1]), (MyAllianceTab.LEFT_CONTENT_X + labelW + 10) | 0, rowY, (detailBlockW - labelW - 10) | 0, MyAllianceTab.DETAIL_ROW_H, true, TextFormatAlign.LEFT);
        }

        let shield: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        shield.mouseEnabled = false;
        shield.x = MyAllianceTab.LEFT_X + MyAllianceTab.LEFT_W - MyAllianceTab.LEFT_INNER - MyAllianceTab.SHIELD_PAD_R - MyAllianceTab.SHIELD_SIZE;
        shield.y = MyAllianceTab.TITLE_Y + 10;
        this._loadAllianceIcon(shield, data.image | 0, MyAllianceTab.SHIELD_SIZE);

        let descBg: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        descBg.mouseEnabled = false;
        descBg.graphics.beginFill(16777215, 1);
        descBg.graphics.lineStyle(1, 3355443, 1);
        descBg.graphics.drawRoundRect(0, 0, MyAllianceTab.LEFT_CONTENT_W, MyAllianceTab.DESC_H, 8, 8);
        descBg.graphics.endFill();
        descBg.x = MyAllianceTab.LEFT_CONTENT_X;
        descBg.y = MyAllianceTab.DESC_Y;

        let descField: TextField = as3.as(this.addChild(new TextField()), TextField);
        descField.wordWrap = true;
        descField.multiline = true;
        descField.selectable = false;
        descField.mouseEnabled = false;
        descField.width = MyAllianceTab.LEFT_CONTENT_W - 16;
        descField.height = MyAllianceTab.DESC_H - 12;
        descField.x = MyAllianceTab.LEFT_CONTENT_X + 8;
        descField.y = MyAllianceTab.DESC_Y + 8;
        descField.defaultTextFormat = new TextFormat("Verdana", 13, 0x333333);
        descField.text = String(data.description);

        const btnGap: int = 24;
        const btnW: int = ((MyAllianceTab.LEFT_CONTENT_W - btnGap) / 2) | 0;

        if (ALLIANCES._isLeader) {
            let editBtn: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
            editBtn.Setup(KEYS.Get("alliance_btn_edit"), false, btnW, MyAllianceTab.ACTION_BTN_H);
            editBtn.x = MyAllianceTab.LEFT_CONTENT_X;
            editBtn.y = MyAllianceTab.LEFT_BTN_Y;
            editBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onEdit));
        }

        let leaveBtn: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        leaveBtn.Setup(KEYS.Get("alliance_btn_leave"), false, btnW, MyAllianceTab.ACTION_BTN_H);
        leaveBtn.x = MyAllianceTab.LEFT_CONTENT_X + btnW + btnGap;
        leaveBtn.y = MyAllianceTab.LEFT_BTN_Y;
        leaveBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onLeave));
    }

    /**
     * Builds the chat viewport and joins the alliance channel on the chat dock's
     * existing connection. The server permits one socket per player, so opening a
     * second transport here would authenticate and close the dock's own — the two
     * features share one socket and separate on channel instead.
     */
    private _buildChat(): void {
        let frame: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        frame.mouseEnabled = false;
        frame.graphics.beginFill(16777215, 1);
        frame.graphics.lineStyle(1, 3355443, 1);
        frame.graphics.drawRect(0, 0, MyAllianceTab.CHAT_W, MyAllianceTab.CHAT_H);
        frame.graphics.endFill();
        frame.x = MyAllianceTab.CHAT_X;
        frame.y = MyAllianceTab.CHAT_Y;

        let container: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        container.x = MyAllianceTab.CHAT_X + 1;
        container.y = MyAllianceTab.CHAT_Y + 1;

        this._chatContent = as3.as(container.addChild(new MovieClip()), MovieClip);
        this._chatYOff = 0;
        this._chatRowIndex = 0;

        let maskMC: MovieClip = as3.as(container.addChild(new MovieClip()), MovieClip);
        maskMC.graphics.beginFill(16711680, 1);
        maskMC.graphics.drawRect(0, 0, MyAllianceTab.CHAT_MASK_W, MyAllianceTab.CHAT_H - 2);
        maskMC.graphics.endFill();
        this._chatContent.mask = maskMC;

        this._chatScroll = as3.as(container.addChild(new ScrollSetV(this._chatContent, maskMC, true)), ScrollSetV);
        this._chatScroll.x = MyAllianceTab.CHAT_MASK_W - MyAllianceTab.SCROLLBAR_W;
        this._chatScroll.y = 0;

        this._joinChannel = new Channel(MyAllianceTab.ALLIANCE_CHANNEL_ALIAS, "system");
        this._chatChannel = null;

        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemovedFromStage));

        Chat.ensureConnected();
        this._chat = BYMChat.chatSystem;

        if (this._chat == null) {
            this._appendSystemRow(KEYS.Get("alliance_chat_unavailable"));
            return;
        }

        this._chat.addEventListener(ChatEvent.LOGIN, as3.bind(this, this._onWsLogin));
        this._chat.addEventListener(ChatEvent.JOIN, as3.bind(this, this._onWsJoin));
        this._chat.addEventListener(ChatEvent.SAY, as3.bind(this, this._onWsSay));

        this._appendSystemRow(KEYS.Get("alliance_chat_connecting"));

        if (this._chat.isLoggedIn) {
            this._chat.join(this._joinChannel);
        }
    }

    /**
     * Joins once the shared transport finishes authenticating. The socket connects
     * asynchronously and may still be opening when the popup is built, so the join
     * waits for login rather than sampling the connection state once.
     */
    private _onWsLogin(e: ChatEvent): void {
        if (!e.Success || this._chat == null) {
            return;
        }
        this._chat.join(this._joinChannel);
    }

    /**
     * Records the channel key the server resolved our join alias to. The dock
     * shares this transport, so its own joins arrive here too and are ignored.
     */
    private _onWsJoin(e: ChatEvent): void {
        if (!e.Success) {
            return;
        }
        let channel: Channel = as3.as(e.Get("channel"), Channel);
        if (channel == null || !BYMChat.isAllianceChannel(channel.Name)) {
            return;
        }
        this._chatChannel = channel;
        this._clearChat();
    }

    /**
     * Empties the chat transcript. Each row carries its own band, so removing the
     * rows takes the backgrounds with them.
     */
    private _clearChat(): void {
        while (this._chatContent.numChildren > 0) {
            this._chatContent.removeChildAt(0);
        }
        this._chatYOff = 0;
        this._chatRowIndex = 0;
        this._chatGeneration++;
    }

    /**
     * Renders an incoming chat message from the shared transport, ignoring
     * anything addressed to a channel other than this alliance's.
     */
    private _onWsSay(event: ChatEvent): void {
        let channel: Channel = as3.as(event.Get("channel"), Channel);
        if (this._chatChannel == null || channel == null || channel.Name != this._chatChannel.Name) {
            return;
        }
        let user: string = as3.as(event.Get("user"), String);
        let message: string = as3.as(event.Get("message"), String);
        if (message == null || message == "") {
            return;
        }
        let picSquare: string = as3.as(event.Get("picsquare"), String);
        let ts: number = Number(event.Get("ts"));

        let messageType: string = as3.as(event.Get("messagetype"), String);
        if (messageType != null && messageType != AllianceMessageType.MESSAGE) {
            this._appendSystemRow(message, picSquare, ts, event.Get("allianceimage") | 0);
            return;
        }

        let name: string = as3.as(event.Get("displayname"), String);
        if (name == null || name == "") {
            name = String(user);
        }
        // (the chat sends "[12] Name"; this window shows the name beside the avatar)
        name = name.replace(/^\s*\[[^\]]*\]\s*/, "");
        this._appendUserRow(name, message, picSquare, ts);
    }

    /**
     * Appends a player chat row (avatar placeholder, name, body) and scrolls
     * the viewport to the newest message.
     */
    /**
     * Appends one player message, laid out as the original shout row was
     * (user-shout-message-template plus alliance.v343.css): a 25px picture
     * inset 5px, the name at x=38 / y=5, the body at x=38 / y=25, over a
     * 40px minimum row, with the relative time pinned to the top right. The
     * picture is drawn bare - the original had no frame around it, so a player
     * without one leaves the space empty.
     */
    private _appendUserRow(name: string, message: string, picSquare: string = null, ts: number = 0): void {
        const PAD: int = 5;
        const AVATAR: int = 32;
        const AVATAR_GAP: int = 8;
        const TEXT_X: int = (PAD + AVATAR + AVATAR_GAP) | 0;
        const NAME_Y: int = 5;
        const BODY_Y: int = 25;
        const MIN_ROW_H: int = Math.max(40, PAD + AVATAR + PAD) | 0;
        const PAD_BOTTOM: int = 8;
        const TIME_W: int = 110;
        const TIME_INSET_RIGHT: int = 3;
        const TIME_INSET_TOP: int = 5;
        const GUTTER: int = 2;
        const textW: int = (MyAllianceTab.CHAT_MASK_W - TEXT_X - PAD - MyAllianceTab.SCROLLBAR_W) | 0;

        let body: TextField = new TextField();
        body.wordWrap = true;
        body.multiline = true;
        body.selectable = false;
        body.mouseEnabled = false;
        body.width = textW;
        body.defaultTextFormat = new TextFormat("Verdana", 12, 0x333333);
        body.text = message;
        let bodyH: int = ((body.textHeight | 0) + 6) | 0;

        let rowH: int = Math.max(MIN_ROW_H, BODY_Y + bodyH + PAD_BOTTOM) | 0;

        let row: MovieClip = this._beginRow(rowH);

        let avatar: MovieClip = as3.as(row.addChild(new MovieClip()), MovieClip);
        avatar.mouseEnabled = false;
        avatar.x = PAD;
        avatar.y = PAD;
        this._loadAvatar(picSquare, avatar, AVATAR);

        let nameField: TextField = as3.as(row.addChild(new TextField()), TextField);
        nameField.selectable = false;
        nameField.mouseEnabled = false;
        nameField.width = textW - TIME_W;
        nameField.height = 18;
        nameField.x = TEXT_X;
        nameField.y = NAME_Y;
        nameField.defaultTextFormat = new TextFormat("Verdana", 12, 0x000000, true);
        nameField.text = name;

        // Timestamps arrive in milliseconds; the shared helper works in seconds.
        if (ts > 0) {
            let timeField: TextField = as3.as(row.addChild(new TextField()), TextField);
            timeField.selectable = false;
            timeField.mouseEnabled = false;
            timeField.width = TIME_W;
            timeField.height = 16;

            timeField.x = MyAllianceTab.CHAT_MASK_W - MyAllianceTab.SCROLLBAR_W - TIME_W - TIME_INSET_RIGHT + GUTTER;
            timeField.y = TIME_INSET_TOP - GUTTER;
            let timeFmt: TextFormat = new TextFormat("Verdana", 10, 0x000000);
            timeFmt.align = TextFormatAlign.RIGHT;
            timeField.defaultTextFormat = timeFmt;
            timeField.text = TimeUtils.TimeDistance(ts / 1000);
        }

        body.x = TEXT_X;
        body.y = BODY_Y;
        body.height = bodyH;
        row.addChild(body);

        this._afterAppend();
    }

    /**
     * Loads a sender's profile picture into their message row, over the grey
     * placeholder that is drawn first. Squashed to a square as the original
     * member rows were, so avatars line up down the column.
     *
     * pic_square is an external URL rather than a bundled asset, so it goes
     * through a Loader like the members table does rather than ImageCache. The
     * placeholder simply stays put for a player with no picture, or one whose
     * picture fails to load.
     *
     * The load outlives the append, and a rejoin clears the transcript, so the
     * generation is checked before drawing - otherwise a late avatar would land
     * on a row that no longer exists.
     *
     * @param {String} url - The sender's pic_square URL, possibly empty
     * @param {MovieClip} holder - The placeholder square to draw into
     * @param {int} size - Width and height to squash the picture to
     */
    private _loadAvatar(url: string, holder: MovieClip, size: int): void {
        let generation: int = 0;
        let loader: Loader = null;
        let onLoad: Function = null;
        let onError: Function = null;
        if (url == null || url == "") {
            return;
        }

        generation = this._chatGeneration;
        loader = new Loader();
        onLoad = null;
        onError = null;

        onLoad = (e: Event): void => {
            loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, onLoad);
            loader.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, onError);
            if (generation != this._chatGeneration) {
                return;
            }
            loader.width = loader.height = size;
            loader.mouseEnabled = false;
            loader.mouseChildren = false;
            holder.addChild(loader);
        };

        onError = (e: IOErrorEvent): void => {
            loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, onLoad);
            loader.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, onError);
        };

        loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoad);
        loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onError, false, 0, true);
        loader.load(new URLRequest(url));
    }

    /**
     * Appends a system row: an alliance shout, or one of our own connection
     * notices.
     *
     * Laid out as the original's system-shout-message-template was - the
     * subject's picture inset 5px, the relative time pinned top right, and the
     * message centred in the box beside the picture rather than across the
     * whole row (.system-message is left:38px, width:310px, text-align:center).
     * Bold, where a player row's body is normal weight, and three pixels
     * higher than one.
     *
     * Connection notices pass neither picture nor timestamp - they are ours,
     * not the original's, and have no subject to show - so their text spans the
     * full width instead of sitting indented past an empty avatar slot.
     *
     * @param {String} message - The text to show, already composed by the server.
     * @param {String} picSquare - The subject's picture, null for a notice.
     * @param {Number} ts - Milliseconds since epoch, 0 for a notice.
     */
    private _appendSystemRow(message: string, picSquare: string = null, ts: number = 0, allianceImage: int = 0): void {
        const PAD: int = 5;
        const AVATAR: int = 32;
        const AVATAR_GAP: int = 8;
        const BODY_Y: int = 22;
        const MIN_ROW_H: int = Math.max(40, PAD + AVATAR + PAD) | 0;
        const PAD_BOTTOM: int = 8;
        const TIME_W: int = 110;
        const TIME_INSET_RIGHT: int = 3;
        const TIME_INSET_TOP: int = 5;
        const GUTTER: int = 2;

        let hasShield: boolean = allianceImage > 0;
        let hasAvatar: boolean = hasShield || (picSquare != null && picSquare != "");
        let textX: int = PAD;
        if (hasAvatar) {
            textX = (PAD + AVATAR + AVATAR_GAP) | 0;
        }
        let textW: int = (MyAllianceTab.CHAT_MASK_W - textX - PAD - MyAllianceTab.SCROLLBAR_W) | 0;

        let body: TextField = new TextField();
        body.wordWrap = true;
        body.multiline = true;
        body.selectable = false;
        body.mouseEnabled = false;
        body.width = textW;
        let fmt: TextFormat = new TextFormat("Verdana", 12, 0x333333, true);
        fmt.align = TextFormatAlign.CENTER;
        body.defaultTextFormat = fmt;
        body.text = message;
        let bodyH: int = ((body.textHeight | 0) + 6) | 0;

        let rowH: int = Math.max(MIN_ROW_H, BODY_Y + bodyH + PAD_BOTTOM) | 0;

        let row: MovieClip = this._beginRow(rowH);

        if (hasAvatar) {
            let avatar: MovieClip = as3.as(row.addChild(new MovieClip()), MovieClip);
            avatar.mouseEnabled = false;
            avatar.x = PAD;
            avatar.y = PAD;

            if (hasShield) {
                this._loadAllianceIcon(avatar, allianceImage, AVATAR);
            } else {
                this._loadAvatar(picSquare, avatar, AVATAR);
            }
        }

        if (ts > 0) {
            let timeField: TextField = as3.as(row.addChild(new TextField()), TextField);
            timeField.selectable = false;
            timeField.mouseEnabled = false;
            timeField.width = TIME_W;
            timeField.height = 16;
            timeField.x = MyAllianceTab.CHAT_MASK_W - MyAllianceTab.SCROLLBAR_W - TIME_W - TIME_INSET_RIGHT + GUTTER;
            timeField.y = TIME_INSET_TOP - GUTTER;

            let timeFmt: TextFormat = new TextFormat("Verdana", 10, 0x000000);
            timeFmt.align = TextFormatAlign.RIGHT;
            timeField.defaultTextFormat = timeFmt;
            timeField.text = TimeUtils.TimeDistance(ts / 1000);
        }

        body.x = textX;
        body.y = BODY_Y;
        body.height = bodyH;
        row.addChild(body);

        this._afterAppend();
    }

    /**
     * Creates one row, draws its band, and places it at the bottom of the transcript.
     *
     * Each row owns its own graphics and children rather than everything sharing the
     * content clip, so dropping the oldest is a removeChild plus a shift of the rows
     * below it - no redraw, and no avatars reloaded.
     *
     * @param {int} rowH - Height of the row being added.
     * @returns {MovieClip} The row, whose children use row-local coordinates.
     */
    private _beginRow(rowH: int): MovieClip {
        let row: MovieClip = as3.as(this._chatContent.addChild(new MovieClip()), MovieClip);
        row.mouseEnabled = false;
        row.y = this._chatYOff;
        row.rowHeight = rowH;

        this._drawBand(row, rowH, this._nextBandColor());

        this._chatYOff += rowH;
        return row;
    }

    /**
     * Drops the oldest rows once the transcript passes MAX_CHAT_ROWS, shifting what
     * remains up by exactly the height removed. Colours are baked into each row, so
     * neighbours keep alternating as the window rolls forward.
     */
    private _trimRows(): void {
        while (this._chatContent.numChildren > MyAllianceTab.MAX_CHAT_ROWS) {
            let oldest: MovieClip = as3.as(this._chatContent.getChildAt(0), MovieClip);
            let shift: int = oldest.rowHeight | 0;

            this._chatContent.removeChildAt(0);

            let i: int = 0;
            while (i < this._chatContent.numChildren) {
                this._chatContent.getChildAt(i).y -= shift;
                i++;
            }

            this._chatYOff -= shift;
        }
    }

    private _nextBandColor(): uint {
        let color: uint = (this._chatRowIndex % 2 == 0) ? MyAllianceTab.BAND_A : MyAllianceTab.BAND_B;
        this._chatRowIndex++;
        return color;
    }

    /**
     * Enforces the row cap, then resizes the scrollbar to the new content height
     * and pins the view to the latest message.
     */
    private _afterAppend(): void {
        this._trimRows();

        if (this._chatScroll != null) {
            this._chatScroll.scrollToBottom();
        }
    }

    /**
     * Fills a row with its alternating band colour and the 1px #949493 bottom border
     * the original had (.shout-message).
     *
     * The separator is a filled rect on the row's last pixel rather than a stroke on
     * the boundary, which would straddle the seam and be half-covered by the row below.
     */
    private _drawBand(row: MovieClip, rowH: int, color: uint): void {
        row.graphics.beginFill(color, 1);
        row.graphics.drawRect(0, 0, MyAllianceTab.CHAT_MASK_W, rowH);
        row.graphics.endFill();

        row.graphics.beginFill(MyAllianceTab.ROW_BORDER, 1);
        row.graphics.drawRect(0, rowH - MyAllianceTab.ROW_BORDER_H, MyAllianceTab.CHAT_MASK_W, MyAllianceTab.ROW_BORDER_H);
        row.graphics.endFill();
    }

    private _buildPostBar(): void {
        const GAP: int = 26;

        let panel: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        panel.mouseEnabled = false;
        panel.graphics.beginFill(AllianceConstants.ACTION_BG, 1);
        panel.graphics.lineStyle(1, 7229230, 1);
        panel.graphics.drawRect(0, 0, MyAllianceTab.CHAT_W, MyAllianceTab.PANEL_H);
        panel.graphics.endFill();
        panel.x = MyAllianceTab.CHAT_X;
        panel.y = MyAllianceTab.PANEL_Y;

        const btnX: int = (MyAllianceTab.CHAT_X + MyAllianceTab.CHAT_W - MyAllianceTab.PANEL_PAD - MyAllianceTab.POST_BTN_W) | 0;
        const inputX: int = (MyAllianceTab.CHAT_X + MyAllianceTab.PANEL_PAD) | 0;
        const inputW: int = (btnX - GAP - inputX) | 0;

        let inputBg: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        inputBg.mouseEnabled = false;
        inputBg.graphics.beginFill(16777215, 1);
        inputBg.graphics.lineStyle(1, 8947848, 1);
        inputBg.graphics.drawRoundRect(0, 0, inputW, MyAllianceTab.ACTION_BTN_H, 2, 2);
        inputBg.graphics.endFill();
        inputBg.x = inputX;
        inputBg.y = MyAllianceTab.ACTION_Y;

        const FIELD_H: int = 18;
        const MAX_CHARS: int = 200;
        this._chatInput = as3.as(this.addChild(new TextField()), TextField);
        this._chatInput.type = TextFieldType.INPUT;
        this._chatInput.background = false;
        this._chatInput.border = false;
        this._chatInput.selectable = true;
        this._chatInput.mouseEnabled = true;
        this._chatInput.maxChars = MAX_CHARS;
        this._chatInput.width = inputW - 12;
        this._chatInput.height = FIELD_H;
        this._chatInput.x = inputX + 6;
        this._chatInput.y = MyAllianceTab.ACTION_Y + (((MyAllianceTab.ACTION_BTN_H - FIELD_H) / 2) | 0);
        this._chatInput.defaultTextFormat = new TextFormat("Verdana", 12, 0x333333);
        this._chatInput.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this._onInputKey));

        let postBtn: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        postBtn.Setup(KEYS.Get("alliance_btn_post"), false, MyAllianceTab.POST_BTN_W, MyAllianceTab.ACTION_BTN_H);
        postBtn.x = btnX;
        postBtn.y = MyAllianceTab.ACTION_Y;
        postBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onPost));
    }

    /**
     * Loads an alliance shield icon into a container via ImageCache, scaled to fit.
     * IDs 1-20 use the _large suffix; 21+ use _medium (matches AllianceFormPopup).
     */
    private _loadAllianceIcon(container: MovieClip, id: int, size: int): void {
        let suffix: string = id <= 20 ? "_large" : "_medium";
        let key: string = "alliances/" + id + suffix + ".png";
        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            let mc: MovieClip = as3.as(args[0], MovieClip);
            let ts: int = args[1] | 0;
            if (bmd.width > 0 && bmd.height > 0) {
                let scale: number = Math.min(ts / bmd.width, ts / bmd.height);
                bmp.scaleX = bmp.scaleY = scale;
                bmp.x = ((ts - bmd.width * scale) / 2) | 0;
                bmp.y = ((ts - bmd.height * scale) / 2) | 0;
            }
            mc.addChild(bmp);
        }, true, 4, "", [container, size]);
    }

    private _onEdit(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._data == null) {
            return;
        }

        new AllianceFormPopup().Show(AllianceFormPopup.MODE_EDIT, String(this._data.name), this._data.image | 0, String(this._data.description));
    }

    /**
     * Handles the Leave Alliance button. A leader with members remaining cannot
     * leave and is told to promote a successor first; otherwise a confirmation is shown, using the
     * disband warning when they are the last member and the plain leave warning
     * otherwise — matching the original's two variants.
     */
    private _onLeave(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._data == null) {
            return;
        }
        let members: int = this._data.number_of_members | 0;
        if (ALLIANCES._isLeader && members > 1) {
            GLOBAL.Message(KEYS.Get("alliance_err_leader_cannot_leave", { "alliance": String(this._data.name) }));
            return;
        }
        let confirmKey: string = (ALLIANCES._isLeader && members <= 1) ? "alliance_disband_confirm" : "alliance_leave_confirm";
        GLOBAL.Message(KEYS.Get(confirmKey, { "alliance": String(this._data.name) }), KEYS.Get("btn_yes"), as3.bind(this, this._confirmLeave), null, KEYS.Get("btn_no"), null, null);
    }

    private _confirmLeave(): void {
        // A non-empty body is required: Flash downgrades a POST with no data to a
        // GET, which would miss the POST route. The server ignores the payload and
        // identifies the alliance from the auth token.
        let r: URLLoaderApi = new URLLoaderApi();
        r.load(GLOBAL._allianceURL + "leavealliance", [["confirm", "1"]], as3.bind(this, this._onLeaveComplete), as3.bind(this, this._onLeaveFail));
    }

    /**
     * Handles the leave/disband response. On success the player's alliance state
     * is cleared and the My Alliance tab is re-selected, which now renders the
     * "create an alliance" prompt; a present `error` field surfaces a message.
     */
    private _onLeaveComplete(response: any): void {
        if (response && response.error) {
            GLOBAL.Message(String(response.error));
            return;
        }
        ALLIANCES.Clear();
        ALLIANCES._allianceID = 0;
        ALLIANCES.InvalidateMyAlliance();
        if (ALLIANCEWINDOW._mc != null) {
            ALLIANCEWINDOW._mc.SelectTab(MyAllianceTab.MY_ALLIANCE_TAB);
        }
    }

    private _onLeaveFail(e: IOErrorEvent): void {
        GLOBAL.Message(KEYS.Get("alliance_err_generic"));
    }

    private _onInputKey(e: KeyboardEvent): void {
        if (e.keyCode == Keyboard.ENTER) {
            this._sendChat();
        }
    }

    private _onPost(e: MouseEvent): void {
        SOUNDS.Play("click1");
        this._sendChat();
    }

    /**
     * Sends the input text over the shared transport. Until the server confirms
     * the join there is no channel to send on, so we surface a status row instead.
     */
    private _sendChat(): void {
        if (this._chatInput == null) {
            return;
        }
        let text: string = this._chatInput.text;
        if (text == null || text.replace(/^\s+|\s+$/g, "") == "") {
            return;
        }
        if (this._chat != null && this._chat.isConnected && this._chatChannel != null) {
            this._chat.say(this._chatChannel, text);
        } else {
            this._appendSystemRow(KEYS.Get("alliance_chat_disconnected"));
        }
        this._chatInput.text = "";
    }

    /**
     * Leaves the alliance channel when this tab is removed (tab switch or popup
     * close). The socket belongs to the chat dock and stays open — disconnecting
     * it here would drop the player out of global chat as well.
     */
    private _onRemovedFromStage(e: Event): void {
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemovedFromStage));
        if (this._chat != null) {
            this._chat.removeEventListener(ChatEvent.LOGIN, as3.bind(this, this._onWsLogin));
            this._chat.removeEventListener(ChatEvent.JOIN, as3.bind(this, this._onWsJoin));
            this._chat.removeEventListener(ChatEvent.SAY, as3.bind(this, this._onWsSay));
            if (this._chatChannel != null) {
                this._chat.leave(this._chatChannel);
            }
            this._chat = null;
        }
        this._chatChannel = null;
    }

    private _buildNoAlliance(): void {
        const titleH: int = (MyAllianceTab.TITLE_SIZE + 8) | 0;
        const innerX: int = ((this.CONTENT_W - MyAllianceTab.CONTENT_W_INNER) / 2) | 0;

        let tBody: TextField = new TextField();
        tBody.wordWrap = true;
        tBody.multiline = true;
        tBody.selectable = false;
        tBody.mouseEnabled = false;
        tBody.width = MyAllianceTab.CONTENT_W_INNER;
        let bodyFmt: TextFormat = new TextFormat("Verdana", MyAllianceTab.BODY_SIZE, 0x333333);
        bodyFmt.align = TextFormatAlign.CENTER;
        tBody.defaultTextFormat = bodyFmt;
        tBody.text = KEYS.Get("alliance_no_alliance_desc");
        tBody.height = (tBody.textHeight | 0) + 6;

        const startY: int = MyAllianceTab.PAD_TOP;

        let tTitle: TextField = as3.as(this.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = MyAllianceTab.CONTENT_W_INNER;
        tTitle.height = titleH;
        let titleFmt: TextFormat = new TextFormat("Groboldov", MyAllianceTab.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = KEYS.Get("alliance_no_alliance_title");
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = innerX;
        tTitle.y = startY;

        tBody.x = innerX;
        tBody.y = startY + titleH + MyAllianceTab.TITLE_GAP;
        this.addChild(tBody);

        let btn: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        btn.Setup(KEYS.Get("alliance_no_alliance_btn"), false, MyAllianceTab.BTN_W, MyAllianceTab.BTN_H);
        btn.x = ((this.CONTENT_W - MyAllianceTab.BTN_W) / 2) | 0;
        btn.y = tBody.y + tBody.height + MyAllianceTab.BTN_GAP;
        btn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onCreateAlliance));
    }

    private _onCreateAlliance(e: MouseEvent): void {
        SOUNDS.Play("click1");
        new AllianceFormPopup().Show(AllianceFormPopup.MODE_CREATE);
    }
}
