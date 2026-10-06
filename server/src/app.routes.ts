import { whatsDifferent } from "./controllers/whatsDifferent.js";
import { changelog } from "./controllers/changelog.js";
import { questClaimController, questEventController, questStatusController } from "./controllers/quests/ioQuests.js";
import { clientVersion, serveGameClient } from "./controllers/client/serveGameClient.js";
import { getGauntletStatus } from "./controllers/events/gauntletStatus.js";
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
import { casinoHistory, casinoRotateSeed, casinoState, magmaDropPlay, scratchBuy, rouletteSpin, slotsSpin, fortuneSpin, favorSpin, casinoLive, bonePileStart, bonePileReveal, bonePileCashout, ascentStateCtl, ascentBet, ascentCashout, derbyStateCtl, derbyBet } from "./controllers/casino/casino.js";
import { casinoEnabled } from "./config/CasinoConfig.js";
import { casinoOneAtATime } from "./middleware/casinoQueue.js";
import { chatPoll } from "./chat/chatHttpBridge.js";
import { adminApiLimiter, adminSignInLimiter, chatPollLimiter } from "./middleware/rateLimiters.js";
import Router from "@koa/router";

import { logRequest } from "./middleware/logRequest.js";
import { apiVersion } from "./middleware/apiVersioning.js";
import { verifyUserAuth, verifyAccountStatus } from "./middleware/auth.js";
import { verifyApiConsumer } from "./middleware/apiConsumer.js";
import {
  changeUsernameLimiter,
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
  replaysLimiter,
  alliancesLimiter,
  terrainLimiter,
  casinoLimiter,
} from "./middleware/rateLimiters.js";
import { Status } from "./enums/StatusCodes.js";
import { alliancesEnabled, mapRoom3Enabled } from "./config/InfernoOnlyConfig.js";
import { permissionErr } from "./errors/errors.js";

import { init } from "./controllers/init.js";
import { supportedLangs } from "./controllers/supportedLangs.js";

import { login } from "./controllers/auth/login.js";
import { register } from "./controllers/auth/register.js";
import { forgotPassword } from "./controllers/auth/forgotPassword.js";
import { resetPassword } from "./controllers/auth/resetPassword.js";
import { changeUsername } from "./controllers/auth/changeUsername.js";
import { getAccount } from "./controllers/auth/getAccount.js";
import { updateSettings } from "./controllers/auth/updateSettings.js";

import { baseLoad } from "./controllers/base/load/baseLoad.js";
import { baseSave } from "./controllers/base/save/baseSave.js";
import { updateSaved } from "./controllers/base/save/updateSaved.js";
import { migrateBase } from "./controllers/maproom/v2/migrateBase.js";
import { relocateAnywhere } from "./controllers/maproom/v2/relocateAnywhere.js";
import { collectDaily } from "./controllers/user/collectDaily.js";
import { reportBug } from "./controllers/debug/reportBug.js";
import { adminApi, adminPanel, adminSignIn, adminSignInCode } from "./controllers/admin/adminApi.js";
import { adminTestMode } from "./controllers/admin/adminTestMode.js";
import { adminDesign } from "./controllers/admin/adminDesign.js";
import { getPlayerKits, saveKit } from "./controllers/maproom/v2/playerKits.js";
import { myOutposts } from "./controllers/maproom/v2/myOutposts.js";
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

import { getAvailableWorlds } from "./controllers/leaderboards/getAvailableWorlds.js";
import { getLeaderboards } from "./controllers/leaderboards/getLeaderboards.js";
import { getGameLeaderboardsController } from "./controllers/leaderboards/getGameLeaderboards.js";
import { getAttackLogs } from "./controllers/attacklogs/getAttackLogs.js";
import { getGameAttackLogs } from "./controllers/attacklogs/getGameAttackLogs.js";
import { petsBuy, petsList, petsName, petsPlace } from "./controllers/pets/pets.js";
import { replayChunk, replayDownload, replayGet, replayImport } from "./controllers/replays/replays.js";

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
import { purchasePowerup } from "./controllers/alliance/purchasePowerup.js";
import { deletePinController, getOutposts, getPins, movePinController, savePinController, setOfficer } from "./controllers/alliance/ioAllianceBoard.js";

const router = new Router();

/**  ────────────────────────────────────────────────
* 📦 General
* ──────────────────────────────────────────────── */
router.post("/init", logRequest, init);

// Chat over HTTP polling, for servers reachable only through a web tunnel (see chatHttpBridge.ts)
router.post("/chat/poll", chatPollLimiter, chatPoll);
router.get("/connection", (ctx) => (ctx.status = Status.OK));
// Inferno-only: the login page's "What's different?" button (the overview of every change, as a PDF)
router.get("/whats-different", whatsDifferent);
router.get("/changelog", changelog);
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
router.post("/api/:apiVersion/player/register", apiVersion, registerLimiter, logRequest, register);
router.post("/api/:apiVersion/player/forgotPassword", apiVersion, forgotPassword);
router.post("/api/:apiVersion/player/reset-password", resetPassword);
router.get("/api/:apiVersion/supportedLangs", apiVersion, logRequest, supportedLangs);
router.get("/api/:apiVersion/player/account", apiVersion, verifyUserAuth, getAccount);
router.post("/api/:apiVersion/player/changeusername", apiVersion, verifyUserAuth, changeUsernameLimiter, logRequest, changeUsername);
router.post("/api/:apiVersion/player/settings", apiVersion, verifyUserAuth, logRequest, updateSettings);

/**  ────────────────────────────────────────────────
* 📦 Base
* ──────────────────────────────────────────────── */
router.post("/base/load", verifyUserAuth, logRequest, baseLoad);
router.post("/base/save", verifyUserAuth, logRequest, baseSave);
router.post("/base/updatesaved", verifyUserAuth, logRequest, updateSaved);
router.post("/base/migrate", verifyUserAuth, logRequest, migrateBase);
// Inferno-only: Relocate in the map room (controllers/maproom/v2/relocateAnywhere.ts)
router.post("/base/relocate", verifyUserAuth, logRequest, relocateAnywhere);
// Flash Player sends a POST that carries no form fields as a GET, so calls the client makes without
// parameters (collect, playerkits, invitetargets) are accepted either way, like the stock getmessagetargets.
router.post("/dailyreward/collect", verifyUserAuth, logRequest, collectDaily);
// Moloch's Gauntlet, the monthly event (services/events/gauntlet.ts); its attacks go through base/load and base/save.
router.post("/gauntlet/status", verifyUserAuth, logRequest, getGauntletStatus);
router.get("/gauntlet/status", verifyUserAuth, logRequest, getGauntletStatus); // (Flash sends a POST with no data as a GET)
// Inferno-only: the quest book (controllers/quests/ioQuests.ts, services/quests/)
router.post("/quests/status", verifyUserAuth, logRequest, questStatusController);
router.get("/quests/status", verifyUserAuth, logRequest, questStatusController);
router.post("/quests/claim", verifyUserAuth, logRequest, questClaimController);
router.post("/quests/event", verifyUserAuth, logRequest, questEventController);
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
router.post("/api/:apiVersion/bm/base/save", apiVersion, verifyUserAuth, logRequest, infernoSave);
router.post("/api/:apiVersion/bm/base/updatesaved", verifyUserAuth, logRequest, updateSaved);
router.post("/api/:apiVersion/bm/base/infernomonsters", apiVersion, verifyUserAuth, logRequest, infernoMonsters);
router.post("/api/:apiVersion/bm/neighbours/get", apiVersion, verifyUserAuth, logRequest, getNeighbours);

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
// Inferno-only: attack replays (config/ReplayConfig.ts, services/replays/replays.ts). The file download needs only
// the replay's key (it opens in the browser, which sends no session): whoever has the key can watch it anyway.
router.post("/replays/chunk", verifyUserAuth, verifyAccountStatus, replaysLimiter, replayChunk);
router.post("/replays/get", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayGet);
router.get("/replays/get", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayGet);
router.post("/replays/import", verifyUserAuth, verifyAccountStatus, replaysLimiter, logRequest, replayImport);
router.get("/replays/file", publicReadLimiter, replayDownload);
router.get("/worldmapv2/alliances", verifyApiConsumer, alliancesLimiter, logRequest, getAlliances);
router.post("/worldmapv2/setmapversion", verifyUserAuth, logRequest, setMapVersion);
router.post("/worldmapv2/takeoverCell", verifyUserAuth, verifyAccountStatus, logRequest, takeoverCell);
router.post("/worldmapv2/applykit", verifyUserAuth, verifyAccountStatus, logRequest, applyKit);
router.post("/worldmapv2/invitetargets", verifyUserAuth, logRequest, getInviteTargets);
router.get("/worldmapv2/invitetargets", verifyUserAuth, logRequest, getInviteTargets);
router.post("/worldmapv2/playerkits", verifyUserAuth, logRequest, getPlayerKits);
// Inferno-only: the Outposts list (the "Next outpost" button)
router.post("/worldmapv2/myoutposts", verifyUserAuth, logRequest, myOutposts);
router.get("/worldmapv2/myoutposts", verifyUserAuth, logRequest, myOutposts);
router.get("/worldmapv2/playerkits", verifyUserAuth, logRequest, getPlayerKits);
router.post("/worldmapv2/saveplayerkit", verifyUserAuth, verifyAccountStatus, logRequest, saveKit);
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
router.post("/casino/ascent/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, ascentStateCtl);
router.post("/casino/ascent/bet", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, ascentBet);
router.post("/casino/ascent/cashout", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, ascentCashout);
router.post("/casino/derby/state", verifyUserAuth, casinoLimiter, casinoOneAtATime, derbyStateCtl);
router.post("/casino/derby/bet", verifyUserAuth, casinoLimiter, casinoOneAtATime, logRequest, derbyBet);
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
router.post("/alliance/searchalliances", verifyUserAuth, searchAlliancesLimiter, logRequest, searchAlliances);
router.post("/alliance/requestjoin", verifyUserAuth, allianceJoinRequestLimiter, logRequest, requestJoin);
router.post("/alliance/inviteuser", verifyUserAuth, allianceInviteLimiter, logRequest, inviteUser);
router.get("/alliance/getpowerups", verifyUserAuth, logRequest, getPowerups);
router.post("/alliance/activatepowerup", verifyUserAuth, logRequest, activatePowerup);
router.post("/alliance/purchasepowerup", verifyUserAuth, logRequest, purchasePowerup);
router.post("/alliance/changeinvitestatus", verifyUserAuth, logRequest, changeInviteStatus);
router.get("/alliance/getmessages", verifyUserAuth, logRequest, getMessages);
router.post("/alliance/deletemessages", verifyUserAuth, logRequest, deleteMessages);
router.post("/alliance/kickmember", verifyUserAuth, logRequest, kickMember);
router.post("/alliance/promotemember", verifyUserAuth, logRequest, promoteMember);
router.post("/alliance/changerelationship", verifyUserAuth, logRequest, changeRelationship);
// Inferno-only: the board, the outposts history, officers (controllers/alliance/ioAllianceBoard.ts)
router.get("/alliance/pins", verifyUserAuth, logRequest, getPins);
router.post("/alliance/pins", verifyUserAuth, logRequest, getPins);
router.post("/alliance/savepin", verifyUserAuth, alliancesLimiter, logRequest, savePinController);
router.post("/alliance/deletepin", verifyUserAuth, logRequest, deletePinController);
router.post("/alliance/movepin", verifyUserAuth, logRequest, movePinController);
router.get("/alliance/outposts", verifyUserAuth, logRequest, getOutposts);
router.post("/alliance/outposts", verifyUserAuth, logRequest, getOutposts);
router.post("/alliance/setofficer", verifyUserAuth, logRequest, setOfficer);

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

export default router;