<p align="center">
  <img width="90%" src="./server/public/assets/popups/outpost-takeover.png">
</p>

<br>

![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Browser](https://img.shields.io/badge/browser-%23E8501C.svg?style=for-the-badge&logo=googlechrome&logoColor=white)

<br>

## About this fork: Inferno Map Room 2

This is a fork of [Backyard Monsters Refitted](https://github.com/bym-refitted/backyard-monsters-refitted),
the preservation project that rebuilt Kixeye's 2010 Flash strategy game with a new server.
All of the restoration work, the decompiled client and the server it runs on, is theirs.

The fork changes what the game is. In the original, the Inferno is a side area you unlock late, under
your overworld yard. Here **the Inferno is the whole game**: you start in an Inferno yard, you play on the
Map Room 2 world map, and everything on that map (tribes, outposts, resources, monsters) is Inferno.
It is built on base commit `6d706bd`.

<br>

## How to connect

The public server is **https://inferno.maproom2.com**.

Open it in a current browser (Chrome, Edge, Firefox or Safari) and play. There is nothing to install and
nothing to update: every visit loads the current build. It also works on phones and tablets; see
[WEB-CLIENT.md](./misc_markdown/WEB-CLIENT.md) for details. The game is made for the browser only: no Flash version is built any more.

Accounts are made in the game itself (email and password). They belong to this server only and are not
shared with the main Backyard Monsters Refitted servers.

**Bring a friend.** The Invite Friends button in the game gives you a personal invite link. A friend who
starts the game from that link and registers earns you both 250 shiny, paid when their yard is created.
(Two accounts on the same internet connection don't count.)

<br>

## What is different from the original game

| | Original (Refitted) | This fork |
|---|---|---|
| Where you play | Overworld yard; the Inferno is unlocked later | An Inferno yard from the first minute, no tutorial |
| World map | Map Room 1, 2 or 3 | Map Room 2 only (0-399 on each side), in Inferno art, with a zoom-out view and jump-to-coordinates. Portals lead down to the Depths of Hell, a 10 x 10 layer of Moloch strongholds |
| Resources | Twigs, pebbles, putty, goo | Bone, coal, sulfur, magma everywhere: top bar, store, map, quests |
| Wild monsters | Four overworld tribes | The same four tribes as devils (Hellionnaire, Kozmodeus, Abaddonakki, Beelzenaut): Inferno buildings and monsters, yards turned around |
| Bosses on the map | None | Moloch strongholds (levels 46 and 50) built from the last Inferno descent bases |
| Outposts | One worker | Two workers in every outpost |
| Outpost kits | Three - Regular, Mega, and Ultra | Six - Ember, Brimstone, Demon, Damnation, Underlord, and Apocalypse - plus three kits of your own, saved from your outposts |
| Catapult | Twigs, pebbles, putty | Marilyn Monstroe, Candy Jars and Sulfur Bombs, four sizes each |
| Defenders after an attack | Survivors are back at full health | Wounded defenders stay wounded until their owner comes home |
| Pace | Original build times and production | Faster building/upgrading (4x), doubled production (magma x4), one-second hatching |
| Shiny | A monthly grant | A daily login reward, a streak that pays more every 7th and 14th day |
| Invites | Facebook invites | An invite link that pays both players 250 shiny |
| Chat | WebSocket on its own ports | Rides on ordinary web requests, so it works behind a web-only tunnel. Global and Alliance tabs, Who's Online, emotes, moderators |
| Getting the game | Download a client, update it yourself | Played in the browser (TypeScript, no Flash), always the current build |

**New in the game:**
- **Monsters:** Korath and Drull as monsters, Rezghul (bought with magma, and he teleports), Ashkarr, the
  Basilisk, Clinkerjaw, Flickerfiend, Fusebug and Emberghoul. Valgos, Malphus, Grokus, Clinkerjaw and the
  Emberghoul each have a favourite target of their own (Malphus even walks around your towers' reach).
- **Defenses:** the Cinder Coil and the Obsidian Mortar; the Sharpshooter and the Blast Tower go to level 10,
  the Quake Tower, Magma Tower, Cinder Coil and Obsidian Mortar to level 8; walls to level 5 (Studded Iron and
  Fireblack), upgraded all at once for resources or Shiny; heavy traps that only champions set off; and
  calcification, rings of bone that protect towers, Resource Pods and the Under Hall.
- **The Monster Baiter:** send any overworld monster or champion at any level, the Inferno monsters you have
  unlocked, and more, at your own yard. Practice raids put the yard back exactly as it was afterwards, and
  every raid ends with a report.
- **The Devil's Contract:** three bargains a day, each a boon with a price.
- **The Soul Crucible:** pour a resource you have too much of into its fire and take another back.
- **The Brimstone Pit** (a building): games played with Shiny, among them Magma Drop, Brimstone
  Scratchers, Higher or Lower, Wormzer Roulette, Bone Pile, Cinderjack, Magma Slots, Devil's Dice, The
  Undertaker's Offer, Balthazar's Ascent, Magma Derby and Korath's Fortune. More games open as the Pit
  levels up.
- **The Devil's Arcade** (a building): sixteen games, solo or against other players, for its leaderboards
  only (nothing is won or lost). Among them Hellgate Defense and Hellgate Defense 2 (tower defense), Siege,
  Wormzer, Fusebug Blast, Balthazar's Flight and Valgos Golf.
- **Moloch's Gauntlet:** a monthly ladder of Moloch yards, played from the main yard, with Shiny and
  resource rewards.
- **The Quest Book:** a tree of quests in categories, with chests and three daily quests.
- **Leaderboards, attack logs and replays:** Outposts, Alliances, Gamblers and Hellgate boards; My attacks
  and Attacks on me, with replays to watch, share in chat or download.
- **Alliances:** a window with Overview, Board, Outposts, Members, Power-Ups, Recruit, Invites and Browse;
  officers; tags and crests; relocation invites between members. They rank by empire value.
- **Your yard:** pets, the D.A.V.E. Club (yard grounds, signs, champion skins), animated decorations, the
  Champion Statue, overworld decorations, the Yard Planner working in the Inferno (with export and import), the
  Incubation Control Station, General Store and Monster Juicer in the Inferno, and worker sacrifice for Shiny.
- **Play:** keyboard shortcuts in the yard, the map and attacks; saved logins on the login page; one play
  session at a time, with a choice to play here; the page's own settings (resolution, volume, ask before
  spending Shiny, reduce motion).

Plus a long list of fixes to battle performance and to crashes the Inferno had in the base game. The
in-game Change Log (top bar) lists what changed each day.

<br>

## Running your own server

| Document | What it covers |
|---|---|
| [RUNNING-INFERNO-ONLY.md](./misc_markdown/RUNNING-INFERNO-ONLY.md) | Setting the server up with Docker, backups, building the client, going public |
| [CONFIG.md](./misc_markdown/CONFIG.md) | Every config file, what it controls, and what an operator usually changes |
| [RELEASE-CHECKLIST.md](./misc_markdown/RELEASE-CHECKLIST.md) | What to check and set before other people play on it |
| [UPDATES.md](./misc_markdown/UPDATES.md) | How to put out an update: the server, the game, the Change Log, the notes and GitHub |
| [GOING-PUBLIC-CLOUDFLARE.md](./misc_markdown/GOING-PUBLIC-CLOUDFLARE.md) | Running behind a Cloudflare tunnel |
| [ADMIN-GUIDE.md](./misc_markdown/ADMIN-GUIDE.md) | The operator's daily work: bug and cheat reports, bans, compensation, announcements, maintenance, backups |
| [OPERATIONS-LOGS-AND-SECRETS.md](./misc_markdown/OPERATIONS-LOGS-AND-SECRETS.md) | Logs, secrets, admins and moderators |
| [TROUBLESHOOTING.md](./misc_markdown/TROUBLESHOOTING.md) | Problems an operator meets, and their fixes |
| [WEB-CLIENT.md](./misc_markdown/WEB-CLIENT.md) | The browser client: publishing, watch mode, phones, working on the game's code |
| [BUG-REPORTS.md](./misc_markdown/BUG-REPORTS.md) | How the automatic bug reports work |
| [SECURITY.md](./SECURITY.md) | How to report a security problem |

The settings are in several files, not one. Most of the game's numbers are in
`server/src/config/InfernoOnlyConfig.ts`; the Brimstone Pit, the Devil's Arcade, alliances, pets, replays and
the Depths of Hell have config files of their own next to it; the server's address, ports, database and
secrets are in `server/.env`. [CONFIG.md](./misc_markdown/CONFIG.md) lists them all. Most settings reach the client as flags on every
yard load, so changing a number needs a server restart (with Docker, `docker compose up --build -d`) and no
new client. Your own server's address is given to the game when it is published (`SERVER_URL` for
`publish-web`; see [RUNNING-INFERNO-ONLY.md](./misc_markdown/RUNNING-INFERNO-ONLY.md)). `publish-web` stamps the build itself and builds the game made to
load fast (minified, its art in one file, compressed ahead, kept by browsers until the next build):
[WEB-CLIENT.md](./misc_markdown/WEB-CLIENT.md), "Publishing".

The base project's setup guides still apply to everything this fork did not touch:
[server and database](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Server-&-Database-Setup),
[Docker](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Docker-Setup). (Its client recompilation
guide is for the Flash client, which this fork no longer has: the game is the TypeScript in `client-web/src`,
built with `publish-web`.)

<br>

## Credits and contributing

Backyard Monsters was made by Kixeye. The restoration is the work of the
[Backyard Monsters Refitted team](https://github.com/bym-refitted/backyard-monsters-refitted); if you want to
help preserve the original game, contribute there. Issues and pull requests about the Inferno-only changes
are welcome here. The base project's [contributing guidelines](./CONTRIBUTING.md) apply. Security problems
in this fork go to this server's operator, not to the upstream team: see [SECURITY.md](./SECURITY.md).

<br>

## Preservation of digital heritage
- [Exemption to PCCPSACT](https://www.federalregister.gov/documents/2018/10/26/2018-23241/exemption-to-prohibition-on-circumvention-of-copyright-protection-systems-for-access-control), exemptions to the provision of the Digital Millennium Copyright Act (“DMCA”).
- [EFGAMP](https://efgamp.eu/), the European Federation of Video Game Archives, Museums and Preservation projects.
- [UNESCO PERSIST Programme](https://unescopersist.org/), helps ensure that digital information can continue to be accessed in the future.
- [The Internet Archive](https://archive.org/), a digital library of Internet sites and other cultural artifacts in digital form.
- [Flashpoint Archive](https://flashpointarchive.org/), the webgame preservation project.
- [Adobe Flash Player Archive](https://archive.org/download/flashplayerarchive/), the Adobe Inc. archive.org Flash Player Archive.
- [Stop Killing Games](https://www.stopkillinggames.com/) a campaign advocating for the legal right to preserve and play digital games.

<br />

## License [![GPL v3](https://img.shields.io/badge/GPL%20v3-blue)](http://www.gnu.org/licenses/gpl-3.0)

```
Backyard Monsters preservation project.
Copyright (C) 2025 | The Backyard Monsters Refitted team
See the GNU General Public License <https://www.gnu.org/licenses/>.
```

This fork is distributed under the same terms as the base project. See [LICENSE](./LICENSE).
