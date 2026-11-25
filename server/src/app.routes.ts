import { takeLead, undoKick } from "./controllers/alliance/ioAllianceRoster.js";
import { inviter } from "./controllers/auth/inviter.js";
import { guideMore, guideMorePage, guidePage, rulesPage, whatsDifferentGuide } from "./controllers/guide.js";
import { PLAYER_PAGES, playerPage } from "./controllers/playerPages.js";
import { changelog } from "./controllers/changelog.js";
import { assetMap } from "./controllers/assetMap.js";
import { questClaimController, questEventController, questRerollController, questStatusController } from "./controllers/quests/ioQuests.js";
import { clientVersion, serveGameClient } from "./controllers/client/serveGameClient.js";
import { gauntletCatapultController, getGauntletStatus } from "./controllers/events/gauntletStatus.js";
import { fmiStatusController, fmiWaveEndController, fmiWaveStartController } from "./controllers/events/fmi.js";
import { totKnockController, totStatusController, totTrickEndController, totTrickStartController } from "./controllers/events/trickOrTreat.js";
import {
  hfoClearController,
  hfoSeenController,
  hfoSpawnController,
  hfoStatusController,
  hfoThawController,
  hfoTowersController,
  hfoTryController,
  hfoWaveEndController,
  hfoWaveStartController,
} from "./controllers/events/hfo.js";
import { casinoHistory, casinoRotateSeed, casinoState, magmaDropPlay, scratchBuy, rouletteSpin, slotsSpin, fortuneSpin, favorSpin, casinoLive, bonePileStart, bonePileReveal, bonePileCashout, blackjackStart, blackjackAct, hiloStart, hiloGuess, hiloCashout, dealStart, dealOpen, dealDecide, ascentStateCtl, ascentBet, ascentCashout, derbyStateCtl, derbyBet, diceSit, diceLeave, diceStateCtl, diceBet, diceBank, ascentTakeBack, derbyTakeBack, diceTakeBack } from "./controllers/casino/casino.js";
import { changeEmail, changeEmailLimiter } from "./controllers/auth/changeEmail.js";
import { shinyLockLimiter, shinyLockSettings } from "./controllers/auth/shinyLockSettings.js";
import { joinPolicyController, playerCardController, restoreAllianceController } from "./controllers/alliance/ioSocial.js";
import { officerPermsController } from "./controllers/alliance/ioOfficerPerms.js";
import { endMySessions, mySessions } from "./controllers/auth/accountSessions.js";
import { casinoEnabled } from "./config/CasinoConfig.js";
import { casinoOneAtATime } from "./middleware/casinoQueue.js";
import { chatPoll } from "./chat/chatHttpBridge.js";
import { adminApiLimiter, adminSignInLimiter, chatPollAddressLimiter, chatPollLimiter, forgotPasswordLimiter } from "./middleware/rateLimiters.js";
import Router from "@koa/router";

import { logRequest } from "./middleware/logRequest.js";
import { apiVersion } from "./middleware/apiVersioning.js";
import { verifyUserAuth, verifyAccountStatus } from "./middleware/auth.js";
import { verifyApiConsumer } from "./middleware/apiConsumer.js";
import {
  changeUsernameLimiter,
  changePasswordLimiter,
  debugDataLimiter,
  getAreaLimiter,
  getCellsLimiter,
  loginLimiter,
  publicReadLimiter,
  registerLimiter,
  allianceInviteLimiter,
  allianceJoinRequestLimiter,
  searchAlliancesLimiter,
  snapshotLimiter,
  mapDataLimiter,
  attackLogsLimiter,
  petsLimiter,
  crucibleLimiter,
  feedbackLimiter,
  devilLimiter,
  whosOnlineLimiter,
  allianceBoardLimiter,
  daveLimiter,
  replaysLimiter,
  attackWatchLimiter,
  liveFramesLimiter,
  alliancesLimiter,
  terrainLimiter,
  casinoLimiter,
  arcadeLimiter,
  tdLimiter,
  questLimiter,
} from "./middleware/rateLimiters.js";
import { Status } from "./enums/StatusCodes.js";
import { alliancesEnabled, mapRoom3Enabled } from "./config/InfernoOnlyConfig.js";
import { permissionErr } from "./errors/errors.js";

import { init } from "./controllers/init.js";
import { supportedLangs } from "./controllers/supportedLangs.js";

import { login } from "./controllers/auth/login.js";
import { forgetLogin } from "./controllers/auth/forgetLogin.js";
import { logout, endAfterClosingSave } from "./controllers/auth/logout.js";
import { register } from "./controllers/auth/register.js";
import { forgotPassword } from "./controllers/auth/forgotPassword.js";
import { resetPassword } from "./controllers/auth/resetPassword.js";
import { changePassword } from "./controllers/auth/changePassword.js";
import { community } from "./controllers/community.js";
import { announcementSeen } from "./controllers/announcementSeen.js";
import { myFeedback, sendFeedback } from "./controllers/feedback.js";
import { changeUsername } from "./controllers/auth/changeUsername.js";
import { getAccount } from "./controllers/auth/getAccount.js";
import { updateSettings } from "./controllers/auth/updateSettings.js";

import { baseLoad } from "./controllers/base/load/baseLoad.js";
import { baseSave } from "./controllers/base/save/baseSave.js";
import { updateSaved } from "./controllers/base/save/updateSaved.js";
import { migrateBase } from "./controllers/maproom/v2/migrateBase.js";
import { relocateAnywhere } from "./controllers/maproom/v2/relocateAnywhere.js";
import { buyBackDaily, collectDaily, dailyStatus } from "./controllers/user/collectDaily.js";
import { reportBug } from "./controllers/debug/reportBug.js";
import { whosOnline } from "./controllers/chat/whosOnline.js";
import { adminApi, adminPanel, adminSignIn, adminSignInCode } from "./controllers/admin/adminApi.js";
import { adminTestMode } from "./controllers/admin/adminTestMode.js";
import { adminDesign } from "./controllers/admin/adminDesign.js";
import { hellgate } from "./controllers/td/hellgate.js";
import { arcade } from "./controllers/arcade/arcade.js";
import { deleteKit, getPlayerKits, renameKit, saveKit } from "./controllers/maproom/v2/playerKits.js";
import { outpostName } from "./controllers/maproom/v2/outpostName.js";
import { gauntletLayout } from "./controllers/maproom/v2/gauntletLayout.js";
import { abandonOutpostController } from "./controllers/maproom/v2/abandonOutpost.js";
import { myOutposts } from "./controllers/maproom/v2/myOutposts.js";
import { healOutposts } from "./controllers/maproom/v2/healOutposts.js";
import { ioReach } from "./controllers/maproom/v2/ioReach.js";
import { getInviteTargets, migrateCheck, migrateToFriend, rejectMigrateToFriend } from "./controllers/maproom/v2/relocateInvite.js";

import { getNewMap } from "./controllers/maproom/getNewMap.js";
import { setMapVersion } from "./controllers/maproom/setMapVersion.js";
import { infernoSave } from "./controllers/inferno/infernoSave.js";
import { infernoMonsters } from "./controllers/inferno/infernoMonsters.js";
import { getNeighbours } from "./controllers/maproom/getNeighbours.js";

import { getArea } from "./controllers/maproom/v2/getArea.js";
import { getSnapshot } from "./controllers/maproom/v2/bulk/getSnapshot.js";
import { getMapData } from "./controllers/maproom/v2/bulk/getMapData.js";
import { getTerrain } from "./controllers/maproom/v2/bulk/getTerrain.js";
import { getAlliances } from "./controllers/maproom/v2/bulk/getAlliances.js";
import { takeoverCell } from "./controllers/maproom/v2/takeoverCell.js";
import { canAttack } from "./controllers/maproom/v2/canAttack.js";
import { applyKit } from "./controllers/maproom/v2/applyKit.js";
import { transferMonsters } from "./controllers/maproom/v2/transferMonsters.js";
import { saveBookmarks } from "./controllers/maproom/v2/saveBookmarks.js";

import { initialPlayerCellData } from "./controllers/maproom/v3/initialPlayerCellData.js";
import { getMapRoomCells } from "./controllers/maproom/v3/getCells.js";
import { relocate } from "./controllers/maproom/v3/relocate.js";
import { getFriendInfo } from "./controllers/maproom/v3/getFriendInfo.js";

import { getMessageTargets } from "./controllers/mail/getMessageTargets.js";
import { getMessageThreads } from "./controllers/mail/getMessageThreads.js";
import { getMessageThread } from "./controllers/mail/getMessageThread.js";
import { sendMessage } from "./controllers/mail/sendMessage.js";
import { reportMessageThread } from "./controllers/mail/reportMessageThread.js";

import { getTemplates } from "./controllers/yardplanner/getTemplates.js";
import { saveTemplate } from "./controllers/yardplanner/saveTemplate.js";
import { deleteTemplate } from "./controllers/yardplanner/deleteTemplate.js";
import { layoutSources, previousTemplates, restoreKit, restoreTemplate, sharedLayout, shareLayout } from "./controllers/yardplanner/ioLayouts.js";

import { getAvailableWorlds } from "./controllers/leaderboards/getAvailableWorlds.js";
import { getLeaderboards } from "./controllers/leaderboards/getLeaderboards.js";
import { getGameLeaderboardsController } from "./controllers/leaderboards/getGameLeaderboards.js";
import { getAttackLogs } from "./controllers/attacklogs/getAttackLogs.js";
import { getGameAttackLogs } from "./controllers/attacklogs/getGameAttackLogs.js";
import { petsBuy, petsGrow, petsList, petsName, petsPlace, petsRelease } from "./controllers/pets/pets.js";
import { crucibleGetStatus, cruciblePour } from "./controllers/crucible/crucible.js";
import { devilGetState, devilRefuse, devilSettle, devilSign } from "./controllers/devil/devil.js";
import { shopBuy, shopCoat, shopGuard, shopHop, shopInfo, shopStatue, shopScout, shopTag } from "./controllers/shop/ioShop.js";
import { trophiesOf } from "./controllers/events/trophies.js";
import { workersSacrifice, workersUnsacrifice } from "./controllers/workers/workers.js";
import { terrainSet } from "./controllers/yard/terrain.js";
import { daveBuy, daveSet } from "./controllers/yard/dave.js";
import { attackWatchStatus, liveList, liveTicket, liveView, replayChunk, replayDownload, replayFavourite, replayGet, replayImport, replayLive, replayRaid } from "./controllers/replays/replays.js";

import { wildMonsterInvasion } from "./controllers/events/wildMonsterInvasion.js";
import { recordDebugData } from "./controllers/debug/recordDebugData.js";

import { createAlliance } from "./controllers/alliance/createAlliance.js";
import { editAlliance } from "./controllers/alliance/editAlliance.js";
import { leaveAlliance } from "./controllers/alliance/leaveAlliance.js";
import { myAlliance } from "./controllers/alliance/myAlliance.js";
import { searchAlliances } from "./controllers/alliance/searchAlliances.js";
import { myAllianceMembers } from "./controllers/alliance/myAllianceMembers.js";
import { allianceMembers } from "./controllers/alliance/allianceMembers.js";
import { suggestedMembers } from "./controllers/alliance/suggestedMembers.js";
import { requestJoin } from "./controllers/alliance/requestJoin.js";
import { inviteUser } from "./controllers/alliance/inviteUser.js";
import { changeInviteStatus } from "./controllers/alliance/changeInviteStatus.js";
import { getMessages } from "./controllers/alliance/getMessages.js";
import { deleteMessages } from "./controllers/alliance/deleteMessages.js";
import { kickMember } from "./controllers/alliance/kickMember.js";
import { promoteMember } from "./controllers/alliance/promoteMember.js";
import { changeRelationship } from "./controllers/alliance/changeRelationship.js";
import { getPowerups } from "./controllers/alliance/getPowerups.js";
import { activatePowerup } from "./controllers/alliance/activatePowerup.js";
import { isAdmin } from "./services/admin/admin.js";
import { purchasePowerup } from "./controllers/alliance/purchasePowerup.js";
import { planPowerupController } from "./controllers/alliance/planPowerup.js";
import { deletePinController, getOutposts, getPins, movePinController, pinLifeController, savePinController, sentInvitesController, setOfficer } from "./controllers/alliance/ioAllianceBoard.js";

const router = new Router();

/**  ────────────────────────────────────────────────
* 📦 General
* ──────────────────────────────────────────────── */
router.post("/init", logRequest, init);

// Chat over HTTP polling, for servers reachable only through a web tunnel (see chatHttpBridge.ts)
router.post("/chat/poll", chatPollAddressLimiter, chatPollLimiter, chatPoll);
// Inferno-only (13 October): the chat bar's Who's Online list
router.post("/chat/online", verifyUserAuth, whosOnlineLimiter, whosOnline);
router.get("/connection", (ctx) => (ctx.status = Status.OK));
// Inferno-only: the login page's "What's different?" button (the overview of every change, as a PDF)
router.get("/whats-different", whatsDifferentGuide); // (QoL #642: the guide, no longer the PDF)
router.get("/guide", guidePage);
router.get("/guide/more", guideMorePage);
router.post("/guide/more", verifyUserAuth, guideMore);
router.get("/rules", rulesPage);
// Inferno-only (QoL #644-#646): the players' help pages in public/docs (controllers/playerPages.ts)
router.get("/faq", playerPage(PLAYER_PAGES.faq));
router.get("/shiny", playerPage(PLAYER_PAGES.shiny));
router.get("/schedule", playerPage(PLAYER_PAGES.schedule));
router.get("/changes", playerPage(PLAYER_PAGES.changelog)); // (QoL #649: the Change Log page)
router.get("/changelog", changelog);
// (Inferno-only, 23 October: each picture's version from its content: services/assetMap.ts)
router.get("/assetmap", assetMap);
// (Inferno-only, QoL #202: this server's community links, before login)
router.get("/community", community);
router.post("/changelog", changelog);

// The game client, for launching the standalone Flash Player from a URL (see serveGameClient.ts)
// (A plain one-segment pattern: this router version has no inline regular expressions. The handler
// passes anything that is not "<name>.swf" straight on.)
router.get("/:file", serveGameClient);

// Inferno-only admin panel (controllers/admin/adminApi.ts). "/admin" also matches "/:file" above,
// which passes anything that is not a .swf on to these.
router.post("/admin/session", verifyUserAuth, logRequest, adminSignInCode);
router.post("/admin/testmode", verifyUserAuth, logRequest, adminTestMode);
// Inferno-only: the Designer (kits, wild tribe and Moloch layouts; services/admin/designs.ts).
router.post("/admin/design", verifyUserAuth, logRequest, adminDesign);
// Inferno-only: Hellgate Defense, the tower defense minigame (services/td/hellgate.ts).
router.post("/td", verifyUserAuth, tdLimiter, logRequest, hellgate);
// Inferno-only: the Devil's Arcade (services/arcade/; its live games on the socket /arcade/ws, services/arcade/hub.ts).
router.post("/arcade", verifyUserAuth, arcadeLimiter, logRequest, arcade);
router.get("/admin/signin", adminSignInLimiter, adminSignIn);
router.get("/admin", adminPanel);
router.post("/admin/api/:action", adminApiLimiter, adminApi);
// The launcher asks which build of the game is current (a POST: never cached). GET works too, for a browser.
router.post("/client/version", clientVersion);
router.get("/client/version", clientVersion);

/**  ────────────────────────────────────────────────
* 📦 Auth
* ──────────────────────────────────────────────── */
router.post("/api/:apiVersion/player/getinfo", apiVersion, loginLimiter, logRequest, login);
router.post("/api/:apiVersion/player/forgetlogin", apiVersion, loginLimiter, forgetLogin);
router.post("/api/:apiVersion/player/logout", apiVersion, verifyUserAuth, logout);
router.post("/api/:apiVersion/player/register", apiVersion, registerLimiter, logRequest, register);
// (Inferno-only, QoL #520: who an invite code belongs to, for the sign-up form before login)
router.get("/invite/:code", publicReadLimiter, inviter);
router.post("/api/:apiVersion/player/forgotPassword", apiVersion, forgotPasswordLimiter, forgotPassword);
router.post("/api/:apiVersion/player/reset-password", resetPassword);
router.get("/api/:apiVersion/supportedLangs", apiVersion, logRequest, supportedLangs);
router.get("/api/:apiVersion/player/account", apiVersion, verifyUserAuth, getAccount);
router.post("/api/:apiVersion/player/changeusername", apiVersion, verifyUserAuth, changeUsernameLimiter, logRequest, changeUsername);
// (Inferno-only, QoL #198: a new password while logged in)
router.post("/api/:apiVersion/player/changepassword", apiVersion, verifyUserAuth, changePasswordLimiter, logRequest, changePassword);
// (Inferno-only, QoL #200: the player's own signed-in browsers, in the page's settings)
router.get("/api/:apiVersion/player/sessions", apiVersion, verifyUserAuth, mySessions);
router.post("/api/:apiVersion/player/sessions", apiVersion, verifyUserAuth, mySessions);
router.post("/api/:apiVersion/player/sessions/end", apiVersion, verifyUserAuth, logRequest, endMySessions);
// (QoL #199, #197: change email; the Shiny lock)
router.post("/api/:apiVersion/player/changeemail", apiVersion, verifyUserAuth, changeEmailLimiter, logRequest, changeEmail);
router.post("/api/:apiVersion/player/shinylock", apiVersion, verifyUserAuth, shinyLockLimiter, logRequest, shinyLockSettings);
// (Inferno-only, QoL #485: the announcement shown to this account)
router.post("/api/:apiVersion/player/announcementseen", apiVersion, verifyUserAuth, logRequest, announcementSeen);
router.post("/api/:apiVersion/player/settings", apiVersion, verifyUserAuth, logRequest, updateSettings);

/**  ────────────────────────────────────────────────
* 📦 Base
* ──────────────────────────────────────────────── */
router.post("/base/load", verifyUserAuth, logRequest, baseLoad);
router.post("/base/save", verifyUserAuth, logRequest, endAfterClosingSave, baseSave);
router.post("/base/updatesaved", verifyUserAuth, logRequest, updateSaved);
router.post("/base/migrate", verifyUserAuth, logRequest, migrateBase);
// Inferno-only: Relocate in the map room (controllers/maproom/v2/relocateAnywhere.ts)
router.post("/base/relocate", verifyUserAuth, logRequest, relocateAnywhere);
// Flash Player sends a POST that carries no form fields as a GET, so calls the client makes without
// parameters (collect, playerkits, invitetargets) are accepted either way, like the stock getmessagetargets.
router.post("/dailyreward/collect", verifyUserAuth, logRequest, collectDaily);
// (QoL #126: the streak as the daily popup shows it, and buying a lost streak back)
router.post("/dailyreward/status", verifyUserAuth, logRequest, dailyStatus);
router.get("/dailyreward/status", verifyUserAuth, logRequest, dailyStatus);
router.post("/dailyreward/buyback", verifyUserAuth, logRequest, buyBackDaily);
// Moloch's Gauntlet, the monthly event (services/events/gauntlet.ts); its attacks go through base/load and base/save.
router.post("/gauntlet/status", verifyUserAuth, logRequest, getGauntletStatus);
router.get("/gauntlet/status", verifyUserAuth, logRequest, getGauntletStatus); // (Flash sends a POST with no data as a GET)
router.post("/gauntlet/catapult", verifyUserAuth, logRequest, gauntletCatapultController);
// The Frozen Monster Invasions, monthly (services/events/fmi.ts); their waves are fought in the main yard.
router.post("/fmi/status", verifyUserAuth, logRequest, fmiStatusController);
router.post("/fmi/wavestart", verifyUserAuth, verifyAccountStatus, logRequest, fmiWaveStartController);
router.post("/fmi/waveend", verifyUserAuth, verifyAccountStatus, logRequest, fmiWaveEndController);
// Trick or Treat, the Inferno's Halloween (services/events/trickOrTreat.ts); its tricks are raids on the main yard.
router.post("/tot/status", verifyUserAuth, logRequest, totStatusController);
router.post("/tot/knock", verifyUserAuth, verifyAccountStatus, logRequest, totKnockController);
router.post("/tot/trickstart", verifyUserAuth, verifyAccountStatus, logRequest, totTrickStartController);
router.post("/tot/trickend", verifyUserAuth, verifyAccountStatus, logRequest, totTrickEndController);
// Inferno-only: the quest book (controllers/quests/ioQuests.ts, services/quests/)
router.post("/quests/status", verifyUserAuth, logRequest, questStatusController);
router.get("/quests/status", verifyUserAuth, logRequest, questStatusController);
router.post("/quests/claim", verifyUserAuth, questLimiter, logRequest, questClaimController);
router.post("/quests/event", verifyUserAuth, questLimiter, logRequest, questEventController);
// (QoL #119: one free daily-quest reroll a day)
// (QoL #187: a player's card for the name menu)
router.get("/playercard", verifyUserAuth, logRequest, playerCardController);
router.post("/playercard", verifyUserAuth, logRequest, playerCardController);
router.post("/quests/reroll", verifyUserAuth, questLimiter, logRequest, questRerollController);
// Hell Freezes Over, the one-time story event (services/events/hfo.ts)
router.post("/hfo/status", verifyUserAuth, logRequest, hfoStatusController);
router.get("/hfo/status", verifyUserAuth, logRequest, hfoStatusController);
router.post("/hfo/spawn", verifyUserAuth, logRequest, hfoSpawnController);
router.post("/hfo/clear", verifyUserAuth, logRequest, hfoClearController);
router.post("/hfo/try", verifyUserAuth, logRequest, hfoTryController);
router.post("/hfo/towers", verifyUserAuth, logRequest, hfoTowersController);
router.post("/hfo/thaw", verifyUserAuth, logRequest, hfoThawController);
router.post("/hfo/wavestart", verifyUserAuth, logRequest, hfoWaveStartController);
router.post("/hfo/waveend", verifyUserAuth, logRequest, hfoWaveEndController);
router.post("/hfo/seen", verifyUserAuth, logRequest, hfoSeenController);
router.get("/dailyreward/collect", verifyUserAuth, logRequest, collectDaily);
router.post("/base/migratecheck", verifyUserAuth, logRequest, migrateCheck);
router.post("/base/migratetofriend", verifyUserAuth, logRequest, migrateToFriend);
router.post("/base/rejectmigratetofriend", verifyUserAuth, logRequest, rejectMigrateToFriend);

/**  ────────────────────────────────────────────────
* 📦 Map Room 1 / Inferno
* ──────────────────────────────────────────────── */
router.post("/api/:apiVersion/bm/getnewmap", apiVersion, verifyUserAuth, logRequest, getNewMap);
router.post("/api/:apiVersion/bm/base/load", apiVersion, verifyUserAuth, logRequest, baseLoad);
router.post("/api/:apiVersion/bm/base/save", apiVersion, verifyUserAuth, logRequest, endAfterClosingSave, infernoSave);
router.post("/api/:apiVersion/bm/base/updatesaved", verifyUserAuth, logRequest, updateSaved);
router.post("/api/:apiVersion/bm/base/infernomonsters", apiVersion, verifyUserAuth, logRequest, infernoMonsters);
router.post("/api/:apiVersion/bm/neighbours/get", apiVersion, verifyUserAuth, logRequest, getNeighbours);
// (18 October) a server failure on purpose, for admins only: the bug reports' test of a 500 (bug-context-test). Odd
// values no longer give one (they answer 400), so the test needs a failure it can count on.
router.post("/api/:apiVersion/bm/base/iofail", apiVersion, verifyUserAuth, logRequest, async (ctx) => {
  if (!isAdmin(ctx.authUser)) throw permissionErr();
  throw new Error("A server failure on purpose (an admin testing the bug reports).");
});

/**  ────────────────────────────────────────────────
* 📦 Map Room 2
* ──────────────────────────────────────────────── */
router.post("/worldmapv2/getarea", verifyUserAuth, verifyAccountStatus, getAreaLimiter, logRequest, getArea);
// Inferno-only: what the player's yards reach through the underworld's portals (services/maproom/v2/underworld.ts)
router.post("/worldmapv2/ioreach", verifyUserAuth, verifyAccountStatus, getAreaLimiter, logRequest, ioReach);
router.get("/worldmapv2/ioreach", verifyUserAuth, verifyAccountStatus, getAreaLimiter, logRequest, ioReach);
router.get("/worldmapv2/terrain", verifyApiConsumer, terrainLimiter, logRequest, getTerrain);
router.get("/worldmapv2/snapshot", verifyApiConsumer, snapshotLimiter, logRequest, getSnapshot);
router.post("/worldmapv2/mapdata", verifyUserAuth, verifyAccountStatus, mapDataLimiter, logRequest, getMapData);
// Inferno-only: the game's leaderboards (the top bar's button), made every 5 minutes for everyone.
router.post("/leaderboards/game", verifyUserAuth, verifyAccountStatus, mapDataLimiter, logRequest, getGameLeaderboardsController);
router.get("/leaderboards/game", verifyUserAuth, verifyAccountStatus, mapDataLimiter, logRequest, getGameLeaderboardsController); // (Flash sends a POST with no data as a GET)
// Inferno-only: the game's attack logs (the top bar's button next to the leaderboards).
router.post("/attacklogs/game", verifyUserAuth, verifyAccountStatus, attackLogsLimiter, logRequest, getGameAttackLogs);
router.get("/attacklogs/game", verifyUserAuth, verifyAccountStatus, attackLogsLimiter, logRequest, getGameAttackLogs);
// Inferno-only: pets (config/PetsConfig.ts, services/pets/pets.ts): the Pets tab in the Buildings menu's Decorations
router.post("/pets/list", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsList);
router.get("/pets/list", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsList);
router.post("/pets/buy", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsBuy);
router.post("/pets/place", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsPlace);
router.post("/pets/name", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsName);
router.post("/pets/grow", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsGrow);
// (QoL #503: a pet given back; QoL #607: trophies of players, for the icons by their names)
router.post("/pets/release", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, petsRelease);
// Inferno-only: the Soul Crucible (config/CrucibleConfig.ts, services/crucible/crucible.ts): resources poured for others
router.post("/crucible/status", verifyUserAuth, verifyAccountStatus, crucibleLimiter, logRequest, crucibleGetStatus);
router.get("/crucible/status", verifyUserAuth, verifyAccountStatus, crucibleLimiter, logRequest, crucibleGetStatus);
router.post("/crucible/pour", verifyUserAuth, verifyAccountStatus, crucibleLimiter, logRequest, cruciblePour);
// Inferno-only (13 November): the Devil's Contract (services/devil/devilContract.ts)
router.post("/devil/state", verifyUserAuth, verifyAccountStatus, devilLimiter, logRequest, devilGetState);
router.post("/devil/sign", verifyUserAuth, verifyAccountStatus, devilLimiter, logRequest, devilSign);
router.post("/devil/refuse", verifyUserAuth, verifyAccountStatus, devilLimiter, logRequest, devilRefuse);
router.post("/devil/settle", verifyUserAuth, verifyAccountStatus, devilLimiter, logRequest, devilSettle);
// Inferno-only (22 October): the Store's Extras, and Gift Wrap (services/shop/ioShop.ts)
router.post("/shop/info", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopInfo);
router.get("/shop/info", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopInfo);
router.post("/shop/buy", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopBuy);
router.post("/shop/coat", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopCoat);
router.post("/shop/tag", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopTag);
router.post("/shop/guard", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopGuard);
router.post("/shop/hop", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopHop);
router.post("/shop/statue", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopStatue);
router.post("/shop/scout", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, shopScout);
router.post("/trophies/of", verifyUserAuth, verifyAccountStatus, daveLimiter, logRequest, trophiesOf);
// Inferno-only: a worker sacrificed to Moloch for Shiny (services/workers/sacrifice.ts)
router.post("/workers/sacrifice", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, workersSacrifice);
// (QoL #497: Moloch gives a sacrificed worker back within 2 minutes, while the Shiny is unspent)
router.post("/workers/unsacrifice", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, workersUnsacrifice);
// Inferno-only: the D.A.V.E. Club's ground for the main yard (services/yard/terrain.ts)
router.post("/terrain/set", verifyUserAuth, verifyAccountStatus, petsLimiter, logRequest, terrainSet);
// Inferno-only: the D.A.V.E. Club's other choices (services/yard/dave.ts)
router.post("/dave/set", verifyUserAuth, verifyAccountStatus, daveLimiter, logRequest, daveSet);
router.post("/dave/buy", verifyUserAuth, verifyAccountStatus, daveLimiter, logRequest, daveBuy);
// Inferno-only: attack replays (config/ReplayConfig.ts, services/replays/replays.ts). The file download needs only
// the replay's key (it opens in the browser, which sends no session): whoever has the key can watch it anyway.
router.post("/replays/chunk", verifyUserAuth, verifyAccountStatus, replaysLimiter, replayChunk);
router.post("/replays/raid", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayRaid); // (QoL #96: a wild raid's replay and attack log)
router.post("/replays/get", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayGet);
// (18 October, the user's: attacks watched as they happen, services/replays/liveAttacks.ts)
router.post("/replays/live", verifyUserAuth, verifyAccountStatus, replaysLimiter, replayLive);
router.post("/attackwatch/status", verifyUserAuth, attackWatchLimiter, attackWatchStatus);
router.get("/attackwatch/status", verifyUserAuth, attackWatchLimiter, attackWatchStatus);
// (18 October, the user's: the Watch menu, services/live/liveActivity.ts)
router.post("/live/list", verifyUserAuth, attackWatchLimiter, liveList);
router.post("/live/ticket", verifyUserAuth, attackWatchLimiter, liveTicket);
router.post("/live/view", verifyUserAuth, liveFramesLimiter, liveView);
router.get("/replays/get", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayGet);
router.post("/replays/import", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayImport);
// (QoL #97: a replay kept for good, at most 10 a player)
router.post("/replays/favourite", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayFavourite);
router.get("/replays/file", publicReadLimiter, replayDownload);
router.get("/worldmapv2/alliances", verifyApiConsumer, alliancesLimiter, logRequest, getAlliances);
router.post("/worldmapv2/setmapversion", verifyUserAuth, logRequest, setMapVersion);
router.post("/worldmapv2/takeoverCell", verifyUserAuth, verifyAccountStatus, logRequest, takeoverCell);
// (Inferno-only, QoL #69: can this yard be attacked now? asked before the map is left)
router.post("/worldmapv2/canattack", verifyUserAuth, verifyAccountStatus, canAttack);
router.post("/worldmapv2/applykit", verifyUserAuth, verifyAccountStatus, logRequest, applyKit);
router.post("/worldmapv2/invitetargets", verifyUserAuth, logRequest, getInviteTargets);
router.get("/worldmapv2/invitetargets", verifyUserAuth, logRequest, getInviteTargets);
router.post("/worldmapv2/playerkits", verifyUserAuth, logRequest, getPlayerKits);
// Inferno-only: the Outposts list (the "Next outpost" button)
router.post("/worldmapv2/myoutposts", verifyUserAuth, logRequest, myOutposts);
router.get("/worldmapv2/myoutposts", verifyUserAuth, logRequest, myOutposts);
router.post("/worldmapv2/healoutposts", verifyUserAuth, logRequest, healOutposts);
router.get("/worldmapv2/playerkits", verifyUserAuth, logRequest, getPlayerKits);
router.post("/worldmapv2/saveplayerkit", verifyUserAuth, verifyAccountStatus, logRequest, saveKit);
// (QoL #337 #326 #343: player kits renamed and deleted; outposts named; one outpost abandoned)
router.post("/worldmapv2/renameplayerkit", verifyUserAuth, verifyAccountStatus, logRequest, renameKit);
router.post("/worldmapv2/deleteplayerkit", verifyUserAuth, verifyAccountStatus, logRequest, deleteKit);
router.post("/worldmapv2/restoreplayerkit", verifyUserAuth, verifyAccountStatus, logRequest, restoreKit);
router.post("/worldmapv2/outpostname", verifyUserAuth, verifyAccountStatus, logRequest, outpostName);
// (QoL #345: the Gauntlet gate's layout, its traps hidden)
router.post("/worldmapv2/gauntletlayout", verifyUserAuth, logRequest, gauntletLayout);
router.get("/worldmapv2/gauntletlayout", verifyUserAuth, logRequest, gauntletLayout);
router.post("/worldmapv2/abandonoutpost", verifyUserAuth, verifyAccountStatus, logRequest, abandonOutpostController);
router.post("/worldmapv2/transferassets", verifyUserAuth, verifyAccountStatus, logRequest, transferMonsters);
router.post("/api/:apiVersion/player/savebookmarks", apiVersion, verifyUserAuth, verifyAccountStatus, logRequest, saveBookmarks);

/**  ────────────────────────────────────────────────
* 📦 Map Room 3
* ──────────────────────────────────────────────── */
// Inferno-only: Map Room 3 can be switched off entirely in config/InfernoOnlyConfig.ts
router.use("/worldmapv3", async (_ctx, next) => {
  if (!mapRoom3Enabled()) throw permissionErr();
  await next();
});

router.post("/worldmapv3/initworldmap", verifyUserAuth, verifyAccountStatus, logRequest, initialPlayerCellData);
router.get("/worldmapv3/initworldmap", verifyUserAuth, verifyAccountStatus, logRequest, initialPlayerCellData);
router.post("/worldmapv3/getcells", verifyUserAuth, verifyAccountStatus, getCellsLimiter, logRequest, getMapRoomCells);
router.get("/worldmapv3/relocate", verifyUserAuth, verifyAccountStatus, logRequest, relocate);
router.get("/worldmapv3/getfriendinfo", verifyUserAuth, verifyAccountStatus, getFriendInfo);
router.get("/worldmapv3/setmapversion", verifyUserAuth, verifyAccountStatus, logRequest, setMapVersion);
router.post("/worldmapv3/setmapversion", verifyUserAuth, verifyAccountStatus, logRequest, setMapVersion);

/**  ────────────────────────────────────────────────
* 📦 Mail
* ──────────────────────────────────────────────── */
router.get("/api/:apiVersion/player/getmessagetargets", apiVersion, verifyUserAuth, logRequest, getMessageTargets);
router.get("/api/:apiVersion/player/getmessagethreads", apiVersion, verifyUserAuth, logRequest, getMessageThreads);
router.post("/api/:apiVersion/player/getmessagethread", apiVersion, verifyUserAuth, logRequest, getMessageThread);
router.post("/api/:apiVersion/player/sendmessage", apiVersion, verifyUserAuth, logRequest, sendMessage);
router.post("/api/:apiVersion/player/reportmessagethread", apiVersion, verifyUserAuth, logRequest, reportMessageThread);

/**  ────────────────────────────────────────────────
* 📦 Yard Planner
* ──────────────────────────────────────────────── */
router.get("/api/:apiVersion/bm/yardplanner/gettemplates", apiVersion, verifyUserAuth, logRequest, getTemplates);
router.post("/api/:apiVersion/bm/yardplanner/savetemplate", apiVersion, verifyUserAuth, logRequest, saveTemplate);
// The client asks for layouts with the base it is planning (a POST); older clients send nothing (a GET).
router.post("/api/:apiVersion/bm/yardplanner/gettemplates", apiVersion, verifyUserAuth, logRequest, getTemplates);
router.post("/api/:apiVersion/bm/yardplanner/deletetemplate", apiVersion, verifyUserAuth, logRequest, deleteTemplate);
// (Inferno-only, QoL #492 #686 #688: earlier versions and Restore, every yard's slots for Import, layouts shared in chat)
router.post("/api/:apiVersion/bm/yardplanner/previous", apiVersion, verifyUserAuth, logRequest, previousTemplates);
router.post("/api/:apiVersion/bm/yardplanner/restoretemplate", apiVersion, verifyUserAuth, logRequest, restoreTemplate);
router.post("/api/:apiVersion/bm/yardplanner/layoutsources", apiVersion, verifyUserAuth, logRequest, layoutSources);
router.post("/api/:apiVersion/bm/yardplanner/sharelayout", apiVersion, verifyUserAuth, verifyAccountStatus, logRequest, shareLayout);
router.post("/api/:apiVersion/bm/yardplanner/sharedlayout", apiVersion, verifyUserAuth, logRequest, sharedLayout);
router.get("/api/:apiVersion/bm/yardplanner/sharedlayout", apiVersion, verifyUserAuth, logRequest, sharedLayout);

/**  ────────────────────────────────────────────────
* 📦 Leaderboards & Attack Logs
* ──────────────────────────────────────────────── */
router.get("/api/:apiVersion/worlds", publicReadLimiter, getAvailableWorlds);
router.get("/api/:apiVersion/leaderboards", publicReadLimiter, getLeaderboards);
router.get("/api/:apiVersion/attacklogs", verifyUserAuth, getAttackLogs);

/**  ────────────────────────────────────────────────
* 📦 Alliances
* ──────────────────────────────────────────────── */
// Inferno-only: alliances can be switched off in config/InfernoOnlyConfig.ts
router.use("/casino", async (ctx, next) => {
  // (casino/state still answers when closed, so the lobby can say so)
  if (!casinoEnabled() && !ctx.path.endsWith("/casino/state")) {
    ctx.status = Status.OK;
    ctx.body = { error: "The Brimstone Pit is closed." };
    return;
  }
  await next();
});
// The Brimstone Pit, the Inferno casino (config/CasinoConfig.ts, services/casino/).
router.post("/casino/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, casinoState);
router.get("/casino/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, casinoState); // (Flash sends a POST with no data as a GET)
router.post("/casino/seed/rotate", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, casinoRotateSeed);
router.post("/casino/history", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, casinoHistory);
router.get("/casino/history", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, casinoHistory);
router.post("/casino/magmadrop/play", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, magmaDropPlay);
router.post("/casino/scratch/buy", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, scratchBuy);
router.post("/casino/roulette/spin", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, rouletteSpin);
router.post("/casino/slots/spin", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, slotsSpin);
router.post("/casino/fortune/spin", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, fortuneSpin);
router.post("/casino/favor/spin", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, favorSpin);
router.post("/casino/live", verifyUserAuth, casinoLimiter, casinoOneAtATime, casinoLive);
router.post("/casino/bonepile/start", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, bonePileStart);
router.post("/casino/bonepile/reveal", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, bonePileReveal);
router.post("/casino/bonepile/cashout", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, bonePileCashout);
router.post("/casino/blackjack/start", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, blackjackStart);
router.post("/casino/blackjack/act", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, blackjackAct);
router.post("/casino/hilo/start", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, hiloStart);
router.post("/casino/hilo/guess", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, hiloGuess);
router.post("/casino/hilo/cashout", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, hiloCashout);
router.post("/casino/deal/start", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, dealStart);
router.post("/casino/deal/open", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, dealOpen);
router.post("/casino/deal/decide", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, dealDecide);
router.post("/casino/ascent/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, ascentStateCtl);
router.post("/casino/ascent/bet", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, ascentBet);
router.post("/casino/ascent/cashout", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, ascentCashout);
// (QoL #504: a bet taken back before its round starts)
router.post("/casino/ascent/takeback", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, ascentTakeBack);
router.post("/casino/derby/takeback", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, derbyTakeBack);
router.post("/casino/dice/takeback", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, diceTakeBack);
router.post("/casino/derby/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, derbyStateCtl);
router.post("/casino/derby/bet", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, derbyBet);
router.post("/casino/dice/sit", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, diceSit);
router.post("/casino/dice/leave", verifyUserAuth, casinoLimiter, casinoOneAtATime, diceLeave);
router.post("/casino/dice/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, diceStateCtl);
router.post("/casino/dice/bet", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, diceBet);
router.post("/casino/dice/bank", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, diceBank);
router.use("/alliance", async (_ctx, next) => {
  if (!alliancesEnabled()) throw permissionErr();
  await next();
});

router.post("/alliance/createalliance", verifyUserAuth, logRequest, createAlliance);
router.post("/alliance/editalliance", verifyUserAuth, logRequest, editAlliance);
router.post("/alliance/leavealliance", verifyUserAuth, logRequest, leaveAlliance);
router.get("/alliance/myalliance", verifyUserAuth, logRequest, myAlliance);
router.get("/alliance/myalliancemembers", verifyUserAuth, logRequest, myAllianceMembers);
router.get("/alliance/alliancemembers", verifyUserAuth, logRequest, allianceMembers);
router.post("/alliance/alliancemembers", verifyUserAuth, logRequest, allianceMembers);
router.get("/alliance/getsuggestedmembers", verifyUserAuth, logRequest, suggestedMembers);
// (QoL #163: with the Recruit filters the game sends a POST)
router.post("/alliance/getsuggestedmembers", verifyUserAuth, logRequest, suggestedMembers);
router.post("/alliance/searchalliances", verifyUserAuth, searchAlliancesLimiter, logRequest, searchAlliances);
router.post("/alliance/requestjoin", verifyUserAuth, allianceJoinRequestLimiter, logRequest, requestJoin);
router.post("/alliance/inviteuser", verifyUserAuth, allianceInviteLimiter, logRequest, inviteUser);
router.get("/alliance/getpowerups", verifyUserAuth, logRequest, getPowerups);
router.post("/alliance/activatepowerup", verifyUserAuth, logRequest, activatePowerup);
router.post("/alliance/purchasepowerup", verifyUserAuth, logRequest, purchasePowerup);
// (Inferno-only, 22 October: a power-up's planned start)
router.post("/alliance/planpowerup", verifyUserAuth, logRequest, planPowerupController);
router.post("/alliance/changeinvitestatus", verifyUserAuth, logRequest, changeInviteStatus);
router.get("/alliance/getmessages", verifyUserAuth, logRequest, getMessages);
router.post("/alliance/deletemessages", verifyUserAuth, logRequest, deleteMessages);
router.post("/alliance/kickmember", verifyUserAuth, logRequest, kickMember);
router.post("/alliance/promotemember", verifyUserAuth, logRequest, promoteMember);
router.post("/alliance/changerelationship", verifyUserAuth, logRequest, changeRelationship);
// Inferno-only: the board, the outposts history, officers (controllers/alliance/ioAllianceBoard.ts)
router.get("/alliance/pins", verifyUserAuth, logRequest, getPins);
router.post("/alliance/pins", verifyUserAuth, logRequest, getPins);
router.post("/alliance/savepin", verifyUserAuth, allianceBoardLimiter, logRequest, savePinController);
router.post("/alliance/deletepin", verifyUserAuth, logRequest, deletePinController);
router.post("/alliance/movepin", verifyUserAuth, logRequest, movePinController);
router.get("/alliance/outposts", verifyUserAuth, logRequest, getOutposts);
router.post("/alliance/outposts", verifyUserAuth, logRequest, getOutposts);
router.post("/alliance/setofficer", verifyUserAuth, logRequest, setOfficer);
// Inferno-only: keep / renew a pin (QoL #177), the alliance's unanswered invites and taking one back (QoL #164)
router.post("/alliance/pinlife", verifyUserAuth, logRequest, pinLifeController);
router.get("/alliance/sentinvites", verifyUserAuth, logRequest, sentInvitesController);
router.post("/alliance/sentinvites", verifyUserAuth, logRequest, sentInvitesController);
// (QoL #501: undo a kick for 5 minutes; QoL #172: an officer takes the lead after 14 days without the leader)
router.post("/alliance/undokick", verifyUserAuth, logRequest, undoKick);
router.post("/alliance/takelead", verifyUserAuth, logRequest, takeLead);
// (QoL #166 #502: join policy; a disbanded alliance restored)
router.get("/alliance/joinpolicy", verifyUserAuth, logRequest, joinPolicyController);
router.post("/alliance/joinpolicy", verifyUserAuth, logRequest, joinPolicyController);
router.post("/alliance/restore", verifyUserAuth, logRequest, restoreAllianceController);
// (QoL #174: what the leader lets officers do)
router.get("/alliance/officerperms", verifyUserAuth, logRequest, officerPermsController);
router.post("/alliance/officerperms", verifyUserAuth, logRequest, officerPermsController);

/**  ────────────────────────────────────────────────
* 📦 Events
* ──────────────────────────────────────────────── */
router.get("/api/:apiVersion/events/wmi", apiVersion, logRequest, wildMonsterInvasion);

/**  ────────────────────────────────────────────────
* 📦 Debug
* ──────────────────────────────────────────────── */
router.post("/api/:apiVersion/player/recorddebugdata", apiVersion, debugDataLimiter, recordDebugData);
// Inferno-only automatic bug reports from the game (services/admin/bugReports.ts).
router.post("/bugreport", debugDataLimiter, reportBug);
// Inferno-only (25 November): the game's right-click menu: a bug report or a suggestion from a player, and their own
// reports with the answers (controllers/feedback.ts, services/feedback/playerFeedback.ts).
// (no logRequest: its pictures would fill the console)
router.post("/feedback", verifyUserAuth, feedbackLimiter, sendFeedback);
router.post("/feedback/mine", verifyUserAuth, feedbackLimiter, logRequest, myFeedback);

export default router;