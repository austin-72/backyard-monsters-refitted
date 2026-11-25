import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, EventDispatcher, IOErrorEvent, SecurityErrorEvent } from "flash/events";
import { URLLoader, URLRequest } from "flash/net";
import { setTimeout } from "flash/utils";
import { GLOBAL } from "@game";

export class KEYS extends ASObject {
    public static _setup: boolean = false;

    public static _storageURL: string = "";

    public static languageFileJson: any = null;

    /** Inferno-only: the language last set up (the login page's choice), kept with a saved login (LOGIN). */
    public static ioLanguage: string = null;

    public static supportedLanguagesJson: any[] = null;

    private static dispatcher: EventDispatcher = new EventDispatcher();

    public static LANGUAGE_FILE_LOADED: string = "languageFileLoaded";

    // Processes the JSON language file from the server
    // Replaces #placeholders# within JSON with dynamic values
    /**
     * Inferno-only: the English words for the monsters added to the Inferno, used when the language file
     * doesn't have them (an old copy of it, or a language that lacks them), so they are never shown as
     * their keys. The files in server/public/gamestage/assets/ stay the ones to edit.
     */
    public static readonly IO_FALLBACK: any = { "io_whats_different": "What's different?", "bdg_hp_upgrade": "<b>Health:</b> Increases from #v1# to #v2# (#v3#%)", "#m_clinkerjaw#": "Clinkerjaw", "#mi_Clinkerjaw#": "Clinkerjaw", "io_bi_wall_4": "Studded Iron Block", "io_bi_wall_5": "Fireblack Block", "io_bi_wall_4_str_desc": "Instantly upgrades #v1# of your blocks to Studded Iron, saving you #v2# resources.", "io_bi_wall_5_str_desc": "Instantly upgrades #v1# of your blocks to Fireblack, saving you #v2# resources.", "io_msg_walls_studded": "All your walls have been upgraded to Studded Iron!", "io_msg_walls_fireblack": "All your walls have been upgraded to Fireblack!", "io_heavytrap_desc": "Hidden from attackers until it's too late. Only a champion stepping on it sets it off, but its blast hits every monster nearby for 25,000 damage.", "mi_Clinkerjaw_desc": "Furnace slag that got hungry. Its crust is packed with dormant Spurtz: crack Clinkerjaw open and two or three small ones hatch out and carry on the attack, and the magma it spills heals the monsters around it. <b>Favorite Target: Whatever is nearest its allies or what they are attacking, within 10 blocks.</b>", "mi_Clinkerjaw_stream": "#fname# unearthed Clinkerjaw in Backyard Monsters: Inferno.", "mi_Clinkerjaw_streambody": "Crack the crust, release the Spurtz.", "emerge_mondesc_mi_Clinkerjaw_desc": "A lumpy black rock with teeth. Something inside is glowing. <b>Favorite Target: Whatever is nearest its allies or what they are attacking</b>", "#m_flickerfiend#": "Flickerfiend", "#mi_Flickerfiend#": "Flickerfiend", "mi_Flickerfiend_desc": "An imp made of heat-shimmer, too nimble to set off traps. After every third strike it vanishes for a second and reappears beside another building, and whatever was fired at it misses.", "mi_Flickerfiend_stream": "#fname# unearthed Flickerfiend in Backyard Monsters: Inferno.", "mi_Flickerfiend_streambody": "Look straight at it and it's already somewhere else.", "emerge_mondesc_mi_Flickerfiend_desc": "You can only see it out of the corner of your eye. <b>Favorite Target: Anything</b>", "#m_ashkarr#": "Ashkarr", "#mi_Ashkarr#": "Ashkarr", "mi_Ashkarr_desc": "A demon herald. Every few seconds she roars: her side's monsters nearby move faster, and the enemy's are rooted to the spot (they can still fight). Several Ashkarrs don't stack.", "mi_Ashkarr_stream": "#fname# unearthed Ashkarr in Backyard Monsters: Inferno.", "mi_Ashkarr_streambody": "Moloch's warlord. One roar, and the battlefield changes hands.", "emerge_mondesc_mi_Ashkarr_desc": "A tall ash-skinned herald crowned in burning horns, dragging a molten cleaver. <b>Favorite Target: Anything</b>", "#m_fusebug#": "Fusebug", "#mi_Fusebug#": "Fusebug", "mi_Fusebug_desc": "A beetle with a lit fuse for a tail. It runs at the nearest defense and blows itself up.", "mi_Fusebug_stream": "#fname# unearthed Fusebug in Backyard Monsters: Inferno.", "mi_Fusebug_streambody": "It only has to work once.", "emerge_mondesc_mi_Fusebug_desc": "A shiny black beetle with a sparking fuse on its back. <b>Favorite Target: Defenses</b>", "#m_emberghoul#": "Emberghoul", "#mi_Emberghoul#": "Emberghoul", "mi_Emberghoul_desc": "A gaunt furnace-ghoul that heals itself with every hit it lands. <b>Favorite Target: Anything; when hurt, whatever is out of reach of every defense within 15 blocks.</b>", "mi_Emberghoul_stream": "#fname# unearthed Emberghoul in Backyard Monsters: Inferno.", "mi_Emberghoul_streambody": "Every wound it gives, it takes for itself.", "emerge_mondesc_mi_Emberghoul_desc": "A skeletal ghoul with a grate in its chest and coals for a heart. <b>Favorite Target: Anything (out of reach of defenses when hurt)</b>", "attack_log_fusebug": "A Fusebug <b>blew up!</b>", "#b_wart#": "Wart", "pop_wart_msg2": "Mmmm, wart stew.", "pop_wart_msg3": "These things sprout like boils.", "pop_wart_msg4": "Just an old wart.", "pop_goldenwart_desc": "You've picked a golden wart worth #v1# Shiny. <b>Warts grow back every day.</b>", "io_cloc_err_upgrading": "Your #v1# is being upgraded. You can unlock monsters again once the upgrade is done.", "io_acad_err_upgrading": "Academy Upgrading", "base_builderr_ownyard1": "You can only place this in your own yard.", "base_uperr_stillfortifying": "Cannot upgrade yet, still calcifying!", "msg_sfactory_cantupgrade1": "You can not upgrade this building as it's currently building a Chaos Weapon.<br><br>First open it and cancel the weapon.", "msg_sfactory_cantupgrade2": "You can not upgrade this building as it currently has a Chaos Weapon.<br><br>First deploy the weapon.", "io_noshiny_body": "Shiny can't be bought here: collect your Daily Reward, pick golden warts and invite friends to earn more.", "#mi_Basilisk#": "Basilisk", "#m_basilisk#": "Basilisk", "mi_Basilisk_desc": "A spined serpent that slithers over walls, coils round its prey and squeezes eight times a second. Double damage to monsters. Point at a building in an attack to send him there first.", "mi_Basilisk_stream": "#fname# was joined by the Basilisk in Backyard Monsters: Inferno.", "mi_Basilisk_streambody": "It watched a hundred battles. Then it chose a side.", "emerge_mondesc_mi_Basilisk_desc": "Red and black coils, spines down his back, eyes like embers. <b>Favorite Target: Anything (the building you point at first)</b>", "io_qt_basilisk": "Something in the Ashes", "io_qd_basilisk": "Something has been watching you fight. Win battle after battle, and in time it may decide to fight at your side.", "io_login_noanswer_retry": "Can't reach the server. Trying again in #v1# s…", "io_login_offline_retry": "You appear to be offline. Trying again in #v1# s…", "io_login_noanswer": "<b>Can't reach the server.</b><br><br>Check your connection, then log in again. If it keeps happening, the server may be down for a moment.", "io_login_offline": "<b>You appear to be offline.</b><br><br>Log in again once your connection is back.", "io_login_server_error": "<b>The server had a problem.</b><br><br>Please try again in a minute.", "io_auth_logging_in": "Logging in…", "io_auth_creating": "Creating account…", "io_auth_typo": "Did you mean <b>#v2#</b>?<br><br>You typed #v1#. Your account logs in with this address, so check it.", "io_auth_typo_use": "Use #v1#", "io_auth_typo_keep": "Keep mine", "io_saved_expired": "Your saved login ran out (unused for #v1# days): type your password.", "io_saved_ended": "Your saved login was ended (a password change or a sign-out): type your password.", "io_forgot_undo": "Forgot #v1#. <u><b>Undo</b></u>", "io_saved_note": "Remembered in this browser for #v1# days, up to #v2# accounts.", "io_syn_line_damage": "<b>Synergy:</b> with #v1# fighting beside it, +#v2#% damage", "io_syn_line_armor": "<b>Synergy:</b> with #v1# fighting beside it, #v2#% armor", "io_syn_champion": "<b>Champion:</b> champions have no synergies" , "io_cru_name": "Soul Crucible", "io_cru_desc": "Pour surplus bone, coal, sulfur or magma into the fire and take another back. Each level gives a better rate and lets you pour more in a day.", "io_cru_special": "Level #v1#: pour up to #v2#% of your storage a day.", "btn_opensoulcrucible": "Open Crucible", "io_cru_own_yard": "The Soul Crucible can only be used in your own main yard.", "io_cru_off": "The Soul Crucible is closed.", "io_cru_pour": "Pour in", "io_cru_take": "Take out", "io_cru_amount": "Amount", "io_cru_max": "Max", "io_cru_btn": "Pour", "io_cru_room": "room #v1#", "io_cru_head": "Level #v1#: up to #v2#% of your storage a day. Higher levels give better rates.", "io_cru_today": "Today: #v1# of #v2# poured, #v3# left.", "io_cru_result": "Pour <b>#v1# #v2#</b> and take <b>#v3# #v4#</b>.", "io_cru_pick": "Pick what to pour, what to take, and how much.", "io_cru_err_cap": "Today's #v1# is poured. Come back tomorrow, or upgrade the Soul Crucible.", "io_cru_err_min": "The least you can pour is #v1#.", "io_cru_err_have": "Your yard has #v1# #v2#.", "io_cru_err_left": "You can pour #v1# more today.", "io_cru_err_room": "Your storage has room for #v1# more #v2#. Pour less.", "io_cru_done": "Poured #v1# #v2# for #v3# #v4#.", "io_cru_full": "Your #v1# storage is nearly full.", "io_cru_full_btn": "Pour it", "io_cru_rate": "#v1# into #v2# gives back #v3#% at this level.", "io_cru_level": "Level #v1#", "io_cru_swap": "swap", "io_cru_tag_pour": "POUR", "io_cru_tag_take": "TAKE", "io_cru_today_cap": "Poured today: <b>#v1#</b> of #v2# (#v3#% of your storage a day)", "io_plan4_outposts": "Outposts (shared)", "io_plan4_other_outpost": "saved in another outpost", "io_plan4_from_other": "<b>Saved in another outpost:</b> your buildings were matched by kind, nearest first.<br><br>", "io_plan4_save_title": "SAVE OUTPOST LAYOUT", "io_plan4_load_title": "LOAD OUTPOST LAYOUT", "io_dv_name_furnace": "Furnace Pact", "io_dv_name_hoarder": "Hoarder's Seal", "io_dv_name_merchant": "Merchant's Due", "io_dv_name_shift": "Second Shift", "io_dv_name_bloodlust": "Bloodlust", "io_dv_name_horde": "Swift Horde", "io_dv_name_ranks": "Thin the Ranks", "io_dv_name_bastion": "Bone Bastion", "io_dv_name_traps": "Wrath Traps", "io_dv_name_kitbinder": "Kitbinder", "io_dv_short_furnace": "+#v1#% bone and coal", "io_dv_short_hoarder": "+#v1#% storage", "io_dv_short_merchant": "#v1#% off everything", "io_dv_short_shift": "An extra worker", "io_dv_short_bloodlust": "+#v1#% monster damage", "io_dv_short_horde": "#v1#% faster monsters", "io_dv_short_ranks": "+#v1#% housing", "io_dv_short_bastion": "+#v1#% tower damage", "io_dv_short_traps": "+#v1#% trap damage", "io_dv_short_kitbinder": "Kits #v1#% cheaper", "io_dv_boon_furnace": "Bone and coal production +#v1#%", "io_dv_boon_hoarder": "Storage +#v1#%", "io_dv_boon_merchant": "Everything bought with resources costs #v1#% less", "io_dv_boon_shift": "An extra worker, who stays until his last job is done", "io_dv_boon_bloodlust": "Your attacking monsters deal +#v1#% damage", "io_dv_boon_horde": "Your monsters move #v1#% faster on attack", "io_dv_boon_ranks": "Monster housing +#v1#%", "io_dv_boon_bastion": "Your towers deal +#v1#% damage", "io_dv_boon_traps": "Your traps deal +#v1#% damage", "io_dv_boon_kitbinder": "Outpost kits cost #v1#% less", "io_dv_price_furnace": "No sulfur or magma production, in your yard and every outpost", "io_dv_price_hoarder": "When it ends, anything over #v1#% of your normal storage burns away", "io_dv_price_merchant": "Shiny to finish things early costs #v1#% more", "io_dv_price_shift": "No resource production at all", "io_dv_price_bloodlust": "They take +#v1#% damage", "io_dv_price_horde": "Their health is −#v1#%", "io_dv_price_ranks": "Monsters cost #v1#% more to make, and any over your normal housing when it ends run off", "io_dv_price_bastion": "Tower range −#v1#%", "io_dv_price_traps": "Re-arming traps costs #v1#×", "io_dv_price_kitbinder": "Kits built while it runs start with no damage protection", "io_dv_bargains": "TODAY'S BARGAINS", "io_dv_ledger": "The Devil's Ledger", "io_dv_accepts": "The undersigned accepts, without appeal:", "io_dv_boon_lbl": "THE BOON · #v1#", "io_dv_price_lbl": "THE PRICE · #v1#", "io_dv_hours": "#v1# HOURS", "io_dv_unbreakable": "Once signed, it can't be broken.", "io_dv_signature": "Signature", "io_dv_sign": "Sign in blood", "io_dv_close": "Close the book (refuse all three)", "io_dv_deals": "THE DEVIL DEALS", "io_dv_signed_in": "Signed in blood", "io_dv_signed_title": "#v1# is signed", "io_dv_signed_text": "The ink is dry. The boon starts now; the price follows as written.", "io_dv_closed_title": "The book is closed", "io_dv_closed_text": "The Devil will be back with other bargains.", "io_dv_pill": "#v1# · #v2#", "io_dv_pill_many": "#v1# contracts · #v2#", "io_dv_ledger_title": "Your contracts with the Devil", "io_dv_ledger_line": "<b>#v1#</b><br>Boon: #v2# (#v3#)<br>Price: #v4# (#v5#)", "io_dv_left": "#v1# left", "io_dv_ended": "ended", "io_dv_burned": "Hoarder's Seal has ended: #v1# resources over your storage burned away.", "io_dv_burned_none": "Hoarder's Seal has ended. Nothing was over your storage, so nothing burned.", "io_dv_worker_gone": "The Devil's worker has gone back below.", "io_dv_worker_loan": "That worker is the Devil's, only on loan: Moloch won't take him.", "io_bt_desc": "Sprays a musk no monster can resist. Pick any monster you have met, at any level, and send them at your yard to test your defenses. Practice raids put your yard back exactly as it was.", "io_bt_tab_ow": "Overworld", "io_bt_tab_owc": "Overworld champs", "io_bt_tab_inf": "Inferno", "io_bt_tab_infc": "Inferno champs", "io_bt_tab_hfo": "Hell Freezes Over", "io_bt_lv": "Lv #v1#", "io_bt_cost": "#v1# musk", "io_bt_other_levels": "+#v1# at other levels", "io_bt_tip": "Shift-click − or + for 10 at a time. The arrows on a card pick its level.", "io_bt_about_practice": "<b>Practice:</b> only a test. Afterwards your yard is put back exactly as it was: nothing destroyed, nothing taken, nothing to repair.", "io_bt_about_real": "<b>Real:</b> like a real raid. What they destroy needs repairing, and what they take is gone.", "io_bt_wave": "This wave", "io_bt_clear": "Clear", "io_bt_wave_empty": "Pick monsters on the left. Each one uses musk, and the baiter holds more at each level.", "io_bt_more": "+#v1# more", "io_bt_row": "#v1# · Lv #v2#", "io_bt_musk": "#v1# / #v2# musk", "io_bt_dir": "Comes from", "io_bt_dir_all": "All", "io_bt_dir_any": "Anywhere", "io_bt_practice": "Practice", "io_bt_real": "Real", "io_bt_once": "At once", "io_bt_waves": "#v1# waves", "io_bt_speed": "2× speed", "io_bt_saved": "Saved waves", "io_bt_slot": "Wave #v1#", "io_bt_save": "Save…", "io_bt_saved_as": "Saved as Wave #v1#.", "io_bt_slot_empty": "Nothing is saved there yet. Pick a wave, press Save…, then a slot.", "io_bt_empty_save": "Pick some monsters first, then save the wave.", "io_bt_send": "Bait them!", "io_bt_page": "#v1# / #v2#", "io_bt_hfo_locked": "Finish the Hell Freezes Over event to bait Rimegrave and the ice cretins here.", "io_bt_none_inf": "Unlock Inferno monsters in the Strongbox to bait them here.", "io_bt_none_infc": "Unlock Inferno champions in the Strongbox to bait them here.", "io_bt_own_yard": "The Monster Baiter only works in your own yard.", "io_bt_broken": "Your Monster Baiter is destroyed. Repair it first.", "io_bt_busy": "Not now: your yard is already under attack.", "io_bt_empty_send": "Pick some monsters for the wave first.", "io_bt_next_wave": "Wave #v1# of #v2# in #v3# s", "io_bt_rep_title": "Baiter report", "io_bt_rep_practice": "Practice raid: your yard is back exactly as it was.", "io_bt_rep_real": "Real raid: anything damaged is being repaired.", "io_bt_rep_scared": "You sounded the siren.", "io_bt_rep_sum": "#v1# sent · #v2# killed · #v3# got away · #v4#", "io_bt_rep_row": "#v1# of #v2# killed", "io_bt_rep_lost": "Buildings destroyed: #v1#", "io_bt_rep_damage": "Yard damaged: #v1#%", "io_bt_rep_walls": "walls broken: #v1#", "io_bt_rep_traps": "traps set off: #v1#", "io_bt_rep_would_take": "They would have taken: #v1#", "io_bt_rep_took": "They took: #v1#", "io_bt_rep_nothing": "nothing", "io_bt_again": "Send again", "io_bt_change": "Change the wave", "io_bt_close": "Close", "io_mon2_tg_valgos": "Walls, storage", "io_mon2_tg_malphus": "Resources out of defences' reach", "io_mon2_tg_grokus": "Resources, defences", "io_mon2_tg_clinkerjaw": "What its allies attack (#v1# blocks)", "io_mon2_tg_emberghoul": "Anything; when hurt, out of defences' reach", "io_mon2_dmg_walls2": "Walls ×2", "io_mon2_dmg_storage_half": "Storage ×0.5", "io_mon2_dmg_defences_half": "Defences ×0.5", "io_mon2_teleports": "Teleports", "io_mon2_ab_teleport": "Teleports up to #v1# blocks ahead every #v2# s", "io_mon2_ab_sneak": "Keeps out of the defences' reach when it can", "io_fb_what_building": "#v1# (level #v2#)", "io_fb_what_window": "Window: #v1#", "io_fb_what_button": "Button “#v1#”", "io_fb_what_button_plain": "A button", "io_fb_what_text": "Text “#v1#”", "io_fb_what_part": "Part of the screen", "io_fb_about": "About", "io_fb_bug": "Report a bug…", "io_fb_idea": "Suggest a change…", "io_fb_mine": "My reports", "io_fb_copy_text": "Copy “#v1#”", "io_fb_copy_info": "Copy game info", "io_fb_shot": "Save a screenshot", "io_fb_full_leave": "Leave full screen", "io_fb_full": "Full screen", "io_fb_settings": "Settings", "io_fb_reload": "Reload the game", "io_fb_admin": "Admin", "io_fb_shift_hint": "Shift + right-click: the browser's menu", "io_fb_login_first": "Log in to send a report", "io_fb_reload_ask": "Reload the game? Anything not saved yet may be lost.", "io_fb_copied": "Copied", "io_fb_copy_this": "Copy this:", "io_fb_as_admin": "Sent as an admin", "io_fb_kind_bug": "Bug", "io_fb_kind_idea": "Suggestion", "io_fb_no_shot": "No screenshot could be taken.", "io_fb_smaller": "Smaller", "io_fb_bigger": "Bigger", "io_fb_none": "No highlight", "io_fb_pick_hint": "Click the picture to pick something else, or drag to draw a box around it.", "io_fb_attach_shot": "Attach this screenshot", "io_fb_hide_chat": "Hide the chat in it", "io_fb_add_pic": "Add a picture…", "io_fb_how_often": "How often?", "io_fb_often_once": "Once", "io_fb_often_some": "Sometimes", "io_fb_often_always": "Every time", "io_fb_sent_with": "Sent with it: where you are in the game, your last few clicks and the game's version.", "io_fb_send": "Send", "io_fb_cancel": "Cancel", "io_fb_title_bug": "Report a bug", "io_fb_title_idea": "Suggest a change", "io_fb_q_bug": "What happened? What did you expect instead?", "io_fb_q_idea": "What would you change, and why?", "io_fb_what_box": "A box you drew", "io_fb_about_screen": "The whole screen", "io_fb_pic_remove": "Remove the picture", "io_fb_err_pic": "That picture couldn't be read.", "io_fb_err_short": "Please write a little more (at least #v1# characters).", "io_fb_sending": "Sending…", "io_fb_err_limit": "You've sent a lot of reports: please try again later.", "io_fb_err_send": "It couldn't be sent: #v1#", "io_fb_err_net": "no answer from the server", "io_fb_thanks": "Thank you! You can follow it under My reports.", "io_fb_chat_hidden": "(chat hidden)", "io_fb_mine_title": "My reports", "io_fb_close": "Close", "io_fb_st_new": "Received", "io_fb_st_seen": "Read", "io_fb_st_planned": "Planned", "io_fb_st_done": "Done", "io_fb_st_declined": "Not planned", "io_fb_mine_none": "You haven't sent any reports yet.", "io_fb_new": "New", "io_fb_reply": "The team's answer:", "io_fb_h_settings": "Bugs and ideas", "io_fb_settings_hint_touch": "A screenshot of the game goes with it: tap it to show what you mean.", "io_fb_settings_hint": "Or right-click anything in the game: it is highlighted in your report.", "io_fb_area_chat": "the chat", "io_fb_area_top": "the top bar", "io_fb_area_menu": "the menu at the bottom", "io_fb_area_window": "the window", "io_fb_area_yard": "the yard", "io_fb_what_button_in": "A button in #v1#", "io_fb_what_part_of": "Part of #v1#"};

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(language: string = "english", tries: int = 0): void {
        KEYS._setup = true;
        KEYS.ioLanguage = language;
        let languageFile: URLLoader = new URLLoader();
        // (Inferno-only: a fresh copy each session. The file had no version in its name, so a browser or
        // proxy could keep an old copy for hours after new strings were deployed.)
        // (QoL #236: the server now tags the file and the browser keeps it, asking only whether it changed: the
        // same address each time, so that works)
        languageFile.load(new URLRequest(KEYS._storageURL + language + ".json" + (GLOBAL.INFERNO_ONLY ? "" : "?t=" + ((new Date().getTime() / 60000) | 0))));
        languageFile.addEventListener(Event.COMPLETE, KEYS.handleLangFileSucc);
        languageFile.addEventListener(IOErrorEvent.IO_ERROR, (event: IOErrorEvent): void => {
            // (Inferno-only, QoL #213, 14 October: the login page waited for ever when the file didn't come. Tried
            // again (after 1.5, 3 and 4.5 s), then English, then English every 5 seconds until it comes.)
            if (!GLOBAL.INFERNO_ONLY) {
                return;
            }
            KEYS.ioRetries++;
            if (tries < 3) {
                setTimeout((): void => {
                    KEYS.Setup(language, (tries + 1) | 0);
                }, 1500 * (tries + 1));
            } else if (language != "english") {
                KEYS.Setup("english", 0);
            } else {
                setTimeout((): void => {
                    KEYS.Setup("english", tries);
                }, 5000);
            }
        });
    }

    /** Inferno-only: how many times the language file or the language list had to be asked for again. */
    public static ioRetries: int = 0;

    public static GetSupportedLanguages(tries: int = 0): void {
        let languages: URLLoader = new URLLoader();
        languages.load(new URLRequest(GLOBAL._apiURL + "supportedLangs"));
        languages.addEventListener(Event.COMPLETE, KEYS.handleSupportedLangsSucc);
        let failed: Function = (): void => {
            // (Inferno-only, QoL #213: asked again three times, then the login page goes on with English alone)
            if (!GLOBAL.INFERNO_ONLY || GLOBAL.supportedLangsLoaded) {
                return;
            }
            KEYS.ioRetries++;
            if (tries < 3) {
                setTimeout((): void => {
                    KEYS.GetSupportedLanguages((tries + 1) | 0);
                }, 1500 * (tries + 1));
                return;
            }
            KEYS.supportedLanguagesJson = ["English"];
            GLOBAL.supportedLangsLoaded = true;
        };
        languages.addEventListener(IOErrorEvent.IO_ERROR, (event: IOErrorEvent): void => {
            failed();
        });
        languages.addEventListener(SecurityErrorEvent.SECURITY_ERROR, (event: SecurityErrorEvent): void => {
            failed();
        });
    }

    private static handleLangFileSucc(data: Event): void {
        let rawData: string = String(data.target.data);
        KEYS.languageFileJson = JSON.parse(rawData);
        GLOBAL.textContentLoaded = true;
        GLOBAL.eventDispatcher.dispatchEvent(new Event(KEYS.LANGUAGE_FILE_LOADED));
    }

    private static handleSupportedLangsSucc(data: Event): void {
        let rawData: string = String(data.target.data);
        KEYS.supportedLanguagesJson = as3.as(JSON.parse(rawData), Array);
        GLOBAL.supportedLangsLoaded = true;
    }

    public static Get(jsonKeyPath: string, placeholders: any = null): string {
        if (KEYS.languageFileJson == null || !KEYS.languageFileJson.hasOwnProperty(jsonKeyPath)) {
            if (KEYS.IO_FALLBACK.hasOwnProperty(jsonKeyPath)) {
                return as3.str(placeholders != null ? KEYS.replacePlaceholders(as3.str(KEYS.IO_FALLBACK[jsonKeyPath]), placeholders) : KEYS.IO_FALLBACK[jsonKeyPath]);
            }
        }
        if (KEYS.languageFileJson == null) {
            return jsonKeyPath;
        }
        let jsonValue: any = KEYS.languageFileJson;
        if (jsonValue.hasOwnProperty(jsonKeyPath)) {
            let value: any = jsonValue[jsonKeyPath];
            if (as3.is(value, String)) {
                let jsonString: string = as3.as(value, String);
                if (placeholders != null && jsonString != null) {
                    jsonString = KEYS.replacePlaceholders(jsonString, placeholders);
                }
                if (jsonString != null && jsonString.indexOf("#cm#") >= 0) {
                    // Close Enough's minutes (bug report B4): what the server sets (io_price_closeenough)
                    jsonString = jsonString.split("#cm#").join(String(GLOBAL.INFERNO_ONLY ? Math.max(1, (GLOBAL.ioCloseEnough / 60) | 0) : 5));
                }
                return jsonString;
            }
            return String(value);
        }
        return jsonKeyPath;
    }

    private static replacePlaceholders(input: string, placeholders: any): string {
        for (let key in placeholders) {
            if (placeholders.hasOwnProperty(key)) {
                let placeholder: string = "#" + key + "#";
                input = input.split(placeholder).join(placeholders[key]);
            }
        }
        return input;
    }
}
