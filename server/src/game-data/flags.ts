import { devConfig } from "../config/GameConfig.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { crucibleConfig } from "../config/CrucibleConfig.js";
import { assetMapVersion } from "../services/assetMap.js";
import { getActiveInvasion } from "../services/events/wmi/getActiveInvasion.js";
import { setupInvasionEvent } from "../services/events/wmi/setupInvasionEvent.js";

/**
 * Gets the current invasion flags.
 * These flags are used to determine the state of Wild Monster Invasion events.
 */
const getInvasionFlags = () => {
  const activeInvasion = getActiveInvasion();
  // (Inferno-only: the invasions switched off, infernoOnlyConfig.invasions: no invasion on, whatever the calendar says)
  if (infernoOnlyConfig.enabled && !infernoOnlyConfig.invasions?.enabled) {
    return { invasionpop: -1, invasionpop2: -1, activeInvasion, io_invasions: 0 };
  }
  const invasionPhases = setupInvasionEvent(activeInvasion).phases;
  return { ...invasionPhases, activeInvasion, io_invasions: 1 };
};

/**
 * Configuration flags for game settings.
 * These flags are used to enable/disable features in game.
 */
export const getFlags = () => ({
  // Platforms:
  viximo: 0,
  kongregate: 0,
  discordOldEnough: 0,

  // Settings:
  maproom: 1,
  maproom2: 0, // controlled by baseLoad.ts based on town hall level
  mr2upgraded: 0,
  // In inferno-only mode the portal / descent / legacy inferno map are switched off:
  // the whole game already is the inferno.
  inferno: devConfig.inferno && !infernoOnlyConfig.enabled ? 1 : 0,
  infernoMapBlocked: devConfig.infernoMaproom ? 1 : 0,

  // Inferno-only tunables, read by the custom client (GLOBAL.ts "io_*" getters).
  infernoonly: infernoOnlyConfig.enabled ? 1 : 0,
  io_rezghul: infernoOnlyConfig.enabled && infernoOnlyConfig.rezghul.enabled ? 1 : 0,
  io_rezghulcost: infernoOnlyConfig.rezghul.magmaCost,
  io_build: 0,
  // Inferno-only (14 October): the yard's nods (client IoTilt.nod): 0 no one, 1 admins only (for now), 2 everyone
  io_nod: infernoOnlyConfig.enabled ? 1 : 0,
  // Inferno-only (21 October): the yard drawn by the graphics card (client Renderer's GL path) and the big-crowd savings
  // (client MonsterBase.ioLodBegin); 0 turns either off for everyone
  io_gl: 1,
  io_lod: 1,
  io_outpost_capacity: infernoOnlyConfig.outpostCapacity,
  io_welcome_title: infernoOnlyConfig.welcome.title,
  io_welcome_body: infernoOnlyConfig.welcome.body,
  io_welcome_image: infernoOnlyConfig.welcome.image,
  io_worker_sacrifice: infernoOnlyConfig.enabled ? infernoOnlyConfig.workerSacrificeShiny : 0,
  // Shiny prices the client computes itself (InfernoOnlyConfig.prices); the rest come with the store table
  io_price_move_main: infernoOnlyConfig.prices.moveMainYard,
  io_price_move_outpost: infernoOnlyConfig.prices.moveOutpost,
  io_price_takeover: infernoOnlyConfig.prices.takeoverOutpost,
  io_price_kits: JSON.stringify(infernoOnlyConfig.prices.kits),
  io_price_wall_stone: infernoOnlyConfig.prices.wallToStone,
  io_price_wall_iron: infernoOnlyConfig.prices.wallStoneToIron,
  // (22 November, the user's: a wall's step to level 4 twice its step to 3, to 5 twice its step to 4)
  io_price_wall_studded: 2 * infernoOnlyConfig.prices.wallStoneToIron,
  io_price_wall_fireblack: 4 * infernoOnlyConfig.prices.wallStoneToIron,
  io_price_topup: JSON.stringify(infernoOnlyConfig.prices.topup),
  io_price_repair: infernoOnlyConfig.prices.repairAll,
  io_price_closeenough: infernoOnlyConfig.prices.closeEnoughMinutes * 60,
  io_price_finish_first: infernoOnlyConfig.prices.finishNowFirstHour,
  io_price_finish_hour: infernoOnlyConfig.prices.finishNowPerHour,
  io_invite: "",
  io_invite_shiny: 0,
  io_invite_download: "",
  io_notice: "",
  /** The login streak as JSON {day, collected, streakDays, offerDay?, offerShiny?} for the Daily Reward button. */
  io_streak: "",
  /** Hell Freezes Over: the player's progress as JSON (services/events/hfo.ts hfoView), once it started for them. */
  io_hfo: "",
  io_fmi: "",
  /** Trick or Treat: the event and the player's doors as JSON (services/events/trickOrTreat.ts totView). */
  io_tot: "",
  /** Trick or Treat over: the Mini-Pumpkins just put in storage (base/load, once). */
  io_tot_gift: 0,
  /** 1 for admins: the game shows the Admin button (services/admin). */
  io_admin: 0,
  /** A server-wide announcement from the admin panel as JSON {id, text}; each player sees it once. */
  io_announce: "",
  io_catapult: infernoOnlyConfig.enabled ? JSON.stringify(infernoOnlyConfig.catapult) : "",
  /** The Soul Crucible: its building id, rates and daily caps by level as JSON (config/CrucibleConfig.ts); "" when off. */
  io_crucible:
    infernoOnlyConfig.enabled && crucibleConfig.enabled
      ? JSON.stringify({
          building: crucibleConfig.buildingType,
          rates: crucibleConfig.rates,
          levels: crucibleConfig.dailyCapOfStorage.length,
          caps: crucibleConfig.dailyCapOfStorage,
          floor: crucibleConfig.dailyCapFloor,
          min: crucibleConfig.minPour,
        })
      : "",
  /** Monster synergies: the pairings and their numbers as JSON (InfernoOnlyConfig.synergy); "" when off. */
  io_synergy: infernoOnlyConfig.enabled && infernoOnlyConfig.synergy.enabled ? JSON.stringify(infernoOnlyConfig.synergy) : "",
  /** The Devil's Contract: its contracts and their numbers as JSON (InfernoOnlyConfig.devil); "" when off. */
  io_devil: infernoOnlyConfig.enabled && infernoOnlyConfig.devil.enabled ? JSON.stringify(infernoOnlyConfig.devil) : "",
  /** The yard's lighting for everyone, and the spooky yard's Halloween calendar, as JSON (InfernoOnlyConfig.yardLighting). */
  io_lighting: infernoOnlyConfig.enabled && infernoOnlyConfig.yardLighting.enabled ? JSON.stringify(infernoOnlyConfig.yardLighting) : "",
  /** Wild tribe attacks: tribes, level bands and monster lists as JSON (InfernoOnlyConfig.wildAttacks). */
  io_wildattacks: infernoOnlyConfig.enabled && infernoOnlyConfig.wildAttacks.enabled ? JSON.stringify(infernoOnlyConfig.wildAttacks) : "",
  /** When the player's last wild attack started, on any of their yards (set per player: playerFlags.ts). */
  io_wildlast: 0,
  /** Added to picture requests as ?v= (InfernoOnlyConfig.assetVersion). */
  io_assetv: infernoOnlyConfig.enabled ? infernoOnlyConfig.assetVersion : 0,
  /** (23 October) The pictures' version, from their content (services/assetMap.ts): the game's /assetmap list's. */
  io_assetmap: infernoOnlyConfig.enabled ? assetMapVersion() : "",
  /** Shadows under buildings in the yard (InfernoOnlyConfig.yardShadows). */
  io_shadows: !infernoOnlyConfig.enabled || infernoOnlyConfig.yardShadows ? 1 : 0,
  /** Shadows while a building is held in the yard (InfernoOnlyConfig.yardShadowsWhileMoving). */
  io_moveshadows: !infernoOnlyConfig.enabled || infernoOnlyConfig.yardShadowsWhileMoving ? 1 : 0,
  /** 1: the yard is drawn whole every frame (InfernoOnlyConfig.yardPartialRedraw false). */
  io_fullredraw: infernoOnlyConfig.enabled && !infernoOnlyConfig.yardPartialRedraw ? 1 : 0,
  /** The yard in view is drawn again from scratch this often, a strip at a time (InfernoOnlyConfig.redrawSweepMs). */
  io_sweepms: infernoOnlyConfig.enabled ? Math.max(0, infernoOnlyConfig.redrawSweepMs) : 0,
  io_chathttp: infernoOnlyConfig.enabled && infernoOnlyConfig.chatTransport === "http" ? 1 : 0,
  io_hideui: infernoOnlyConfig.enabled ? infernoOnlyConfig.hiddenUi.join(",") : "",
  io_decooff: infernoOnlyConfig.enabled ? infernoOnlyConfig.disabledDecorations.join(",") : "",
  io_kitpagetest: infernoOnlyConfig.enabled && infernoOnlyConfig.kitPagingTest ? 1 : 0,
  io_alliances: !infernoOnlyConfig.enabled || infernoOnlyConfig.alliances ? 1 : 0,
  io_resmult: infernoOnlyConfig.resourceMultiplier,
  io_magmamult: infernoOnlyConfig.magmaMultiplier,
  io_timediv: infernoOnlyConfig.buildTimeDivisor,
  /** (18 October) Attacks while the player is online, watched as they happen (InfernoOnlyConfig.liveAttacks). */
  io_liveattacks: infernoOnlyConfig.enabled && (infernoOnlyConfig.liveAttacks?.enabled ?? true) ? 1 : 0,
  /** The top bar's Leaderboards button (leaderboards/game). */
  io_leaderboards: infernoOnlyConfig.enabled ? 1 : 0,
  io_hatch: infernoOnlyConfig.hatchSeconds,
  showProgressBar: 0,
  gamestats: 0,
  logfps: 0,
  templog: 0,
  gamestatsb: 1,
  split_loadtime: 1,
  split2: 0,
  splituserid2: 15151832,
  split: 0,
  splituserid: 14619212,
  efl: 200,
  sal: 0,
  numchatrooms: 0,
  savedelay: 3,
  fb_api_curl_timeout: 2,
  pageinterval: 25,
  empire_value_limit: 831186222,
  nwm_relocate: 1,
  attacking: 1,
  attacklog: 1,
  messaging: devConfig.allowedMessageType.message ? 1 : 0,
  sroverlay: 0,
  leaderboard: 1,
  fanfriendbookmarkquests: 1,
  ticker: 0,
  chat: infernoOnlyConfig.enabled && !infernoOnlyConfig.chat ? 0 : 2, // Enable chat (0=disabled, 1=no display, 2=display)
  invites: 0, // Diable friend invites
  gifts: 0, // Disable gifts
  event1: 1,
  event2: 0,
  ...getInvasionFlags(),
  iframestart_override: 0,
  mushrooms: infernoOnlyConfig.enabled && !infernoOnlyConfig.mushrooms ? 0 : 1,
  chatwhitelist: "",
  chatblacklist: 0,
  welcome_email: 1,
  email_reengagement: 1,
  countrycodeblacklist: "",
  radio: 1,
  plinko: 0,
  midgameIncentive: 0,
  showFBCEarn: infernoOnlyConfig.enabled && infernoOnlyConfig.hiddenUi.includes("earn") ? 0 : 1,
  trialpayDealspot: 1,
  showFBCDaily: 0,
  validate_percent: 0,
  autoban_validate_fail: 0,
  autoban_client: 0,
  yp_version: 2,
  ers: 0, // Used for enabling canScheduleNewEvent() in ReplayableEventHandler.ts on client
  // King of the Hill (the Krallen event) is an overworld feature; off on inferno-only servers.
  krallen: infernoOnlyConfig.enabled ? 0 : 1,
  subscriptions: infernoOnlyConfig.enabled && infernoOnlyConfig.hiddenUi.includes("daveclub") ? 0 : 1,
  krallen_duration: 7,
  subscriptions_ab: 0,
  subscriptions_ab_admin: 0,
  krallen_award_threshold: 250000000,
  krallen_special1_award_threshold: 750000000,
  krallen_special2_award_threshold: 7000000000,
  saveicon: 1,
  event3start: 1364313600,
  event3end: 1364832000,
  currencystart: 1362168000,
  currencyend: 1362340800,
  updating: 0,
  topups: 1,
  topup_gifts: 1,
  gamedebug: 1,
});
