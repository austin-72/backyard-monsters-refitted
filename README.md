<p align="center">
  <img width="90%" src="./server/public/assets/popups/outpost-takeover.png">
</p>

<br>

![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![ActionScript](https://img.shields.io/badge/ActionScript-%23DD0031.svg?style=for-the-badge)

<br>

## About this fork: Inferno MR2

This is a fork of [Backyard Monsters Refitted](https://github.com/bym-refitted/backyard-monsters-refitted),
the preservation project that rebuilt Kixeye's 2010 Flash strategy game with a new server.
All of the restoration work, the decompiled client and the server it runs on, is theirs.

The fork changes what the game is. In the original, the Inferno is a side area you unlock late, under
your overworld yard. Here **the Inferno is the whole game**: you start in an Inferno yard, you play on the
Map Room 2 world map, and everything on that map (tribes, outposts, resources, monsters) is Inferno.
It is built on base commit `6d706bd`.

<br>

## How to connect

The public server is **https://inferno-mr2.maproom2.com**. You need the standalone Adobe Flash Player
(the "projector"), which is a single program with no install.

**The easy way (Windows)**
1. Download the player pack, `Inferno-MR2.zip` (on this repository's Releases page), and unzip it anywhere.
2. Double-click **Launch-inferno-mr2**.
3. Register an account in the game and play.

**By hand (any system)**
1. Get a standalone Flash Player projector: there is one in this repository at
   `client/archived/flashplayers/flashplayer.exe`, and Adobe's are kept in the
   [Flash Player Archive](https://archive.org/download/flashplayerarchive/).
2. Open it, choose **File > Open**, and enter the address below, without quotes:
   ```
   https://inferno-mr2.maproom2.com/play.swf
   ```
   From a command line: `flashplayer.exe https://inferno-mr2.maproom2.com/play.swf`

That address is a small launcher. Each time it starts it asks the server which build of the game is
current and downloads exactly that one, so there is nothing to update by hand. If the game ever says a
newer version has been published, close it and start it again.

Accounts are made in the game itself (email and password). They belong to this server only and are not
shared with the main Backyard Monsters Refitted servers.

<br>

## What is different from the original game

| | Original (Refitted) | This fork |
|---|---|---|
| Where you play | Overworld yard; the Inferno is unlocked later | An Inferno yard from the first minute, no tutorial |
| World map | Map Room 1, 2 or 3 | Map Room 2 only, with a lava theme, a zoom-out view and jump-to-coordinates |
| Resources | Twigs, pebbles, putty, goo | Bone, coal, sulfur, magma everywhere: top bar, store, map, quests |
| Wild monsters | Four overworld tribes | The same four tribes as devils: Inferno buildings and monsters, yards turned around |
| Bosses on the map | None | Moloch strongholds (levels 46 and 50) built from the last Inferno descent bases |
| Outposts | Overworld outposts | Inferno outposts with their own building limits |
| Outpost kits | None | Six ready-made outpost layouts a player can apply to an outpost, Ember to Apocalypse |
| Catapult | Twigs, pebbles, putty | Marilyn Monstroe, Candy Jars and Sulfur Bombs, four sizes each |
| Defenders after an attack | Survivors are back at full health | Wounded defenders stay wounded until their owner comes home |
| Pace | Original build times and production | Faster building, doubled production, one-second hatching |
| Chat | WebSocket on its own ports | Rides on ordinary web requests, so it works behind a web-only tunnel |
| Getting the game | Download a client, update it yourself | Opened from a web address; checks for and downloads updates at every start |

Also in: Rezghul (bought with magma), the Hatchery Control Center, Monster Juicer, General Store and Yard
Planner working in the Inferno, overworld decorations, alliances with their powerups, and a long list of
fixes to battle performance and to crashes the Inferno had in the base game.

Taken out: Map Room 1 and 3, the overworld, King of the Hill, Incubator Overdrive, and the gift, invite,
earn-shiny and D.A.V.E. Club buttons.

**Not there yet:** champions, the Monster Lab and the Chaos Lab and Factory; Academy training stops at
level 5; several buildings still show overworld art, and the Inferno quest icons are missing.

<br>

## Running your own server

| Document | What it covers |
|---|---|
| [RUNNING-INFERNO-ONLY.md](./RUNNING-INFERNO-ONLY.md) | Setting the server up with Docker, going public behind a tunnel, building the client |
| [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) | What to check and set before other people play on it |
| [INFERNO-ONLY-NOTES.md](./INFERNO-ONLY-NOTES.md) | What was changed and why, and every setting |

Nearly everything that can be tuned is in one file, `server/src/config/InfernoOnlyConfig.ts`, and most of it
reaches the client as flags, so changing a number needs a server restart and no new client. Your own server's
address goes in `asconfig.stable.json`; the launcher and the player-pack shortcut carry the public server's
address and need changing too.

The base project's setup guides still apply to everything this fork did not touch:
[server and database](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Server-&-Database-Setup),
[client recompilation](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Client-Recompilation-Guide),
[Docker](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Docker-Setup).

<br>

## Credits and contributing

Backyard Monsters was made by Kixeye. The restoration is the work of the
[Backyard Monsters Refitted team](https://github.com/bym-refitted/backyard-monsters-refitted); if you want to
help preserve the original game, contribute there. Issues and pull requests about the Inferno-only changes
are welcome here. The base project's [contributing guidelines](./CONTRIBUTING.md) apply.

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
