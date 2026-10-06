# Bug report: Backyard Monsters Refitted client (AS3 v128)

These defects exist in the original Flash client (`client/scripts`). The
browser port (`client-web`) reproduces the original behaviour exactly, so every
one of them is **still present** in the converted TypeScript. They are listed
here so they can be fixed deliberately, in both code bases or after cutover.

Line numbers refer to the AS3 sources; the converted TypeScript keeps the same
file names under `client-web/src/game/`.

Severity: **High** can change gameplay or cause wrong results; **Medium**
causes wasted resources or broken edge cases; **Low** is cosmetic or dead code.

---

## 1. Simulation loses time when frames are slow (High)

`GLOBAL.as:364, 1234`: `_loopsBanked` is declared `int`. Each frame it banks
`2 / 25 * elapsedMs` simulation ticks (0.08 per millisecond), and the int
assignment truncates the fraction:

```as3
public static var _loopsBanked:int = 0;
...
_loopsBanked += 2 / 25 * (_loc3_ - lastTime);
```

At exactly 25 ms per frame the game banks exactly 2 ticks. A 30 ms frame banks
2.4 ticks, which truncates to 2, so 0.4 ticks are lost. Whenever frames arrive
later than every 25 ms (slow machines, busy frames, background tabs) the game
simulation runs slower than real time: build timers, monster movement and
resource production drift behind the clock. The error is systematic, not
random.

It also means the client depends on Flash's 40 fps frame pacing: a
display-refresh-driven loop would run at 75% speed at 60 Hz. The browser
player paces frames like Flash (never early) so the original behaviour is kept.

*Fix:* keep the fractional part (`Number`), or carry the remainder.

## 2. Unbounded memory growth in `URLLoaderApi` (Medium)

`URLLoaderApi.as:113`: every request appends its parameters to the static
string `_data`, which is never read or cleared:

```as3
_data += keyValuePairs[currentIndex][0] + "=" + keyValuePairs[currentIndex][1] + "&";
```

Base saves send the whole base on every save, so over a long session this
string grows without bound. It also retains the email and password sent at login.

*Fix:* remove `_data`.

## 3. Wild monster "tower" attacks on bases without towers never start (Medium)

`com/monsters/ai/PROCESS3.as:37, 56`: the tower-hunting attack planner computes
a path to the nearest tower and only continues from the path callback. With no
standing tower (`if (_loc5_.length > 0)` fails) the callback never runs, the
attack is never queued and `_inProgress` stays `true`. A tribe of this type
therefore never attacks a base without towers, silently. Found by forcing
`WMATTACK.Trigger(true)` on a fresh base.

## 4. A condition that can never be true in attack bookkeeping (Medium)

`ATTACK.as:933` and `ATTACK.as:1104`:

```as3
if (_loc7_._class != "wall" && (_loc7_._class == "trap" && _loc7_._class == "enemy" && _loc7_._fired) === false && ...)
```

`_class` cannot equal both `"trap"` and `"enemy"`, so the parenthesised term
is always `false` and the `=== false` test always passes. The intent was
probably `||` (skip fired traps/enemies), so fired traps are counted where
they were meant to be excluded.

## 5. Negated type test is always false (Medium)

`com/monsters/baseplanner/PlannerDesignView.as:381`:

```as3
if (!param1.target is BuildingItem) {
```

This parses as `(!param1.target) is BuildingItem`: a Boolean is never a
`BuildingItem`, so the guard never triggers. Intended: `!(param1.target is BuildingItem)`.

## 6. Duplicate `case` in reward handling (Low)

`com/monsters/rewarding/RewardHandler.as:162, 170`: `case k_UPDATE_VALUE:` appears
twice in the same `switch`; the second is unreachable. The bodies are identical,
so there is no behavioural effect today, but edits to the second copy would be ignored.

## 7. Redundant Town Hall check (Low)

`BFOUNDATION.as:1072`: inside `if (this._type == 14)` the code tests
`this._type != 17 && this._type != 18`, which is always true there. The smoke
effect is therefore always shown; if it was meant to be skipped for types 17/18,
the check is in the wrong block.

## 8. Password placeholder shown as asterisks (Low)

`com/auth/AuthForm.as:417-450`: the password field sets `displayAsPassword = true`
and then puts the placeholder text "Password" into the same field, so the
placeholder renders as `********`.

## 9. Save checksum sent unhashed (Low)

`BFOUNDATION.as:469-471`: the building save data was meant to carry an MD5 of
`hashString`, but the call is commented out ("This gives an out-of-range index
error. The md5.as class is malformed") and the raw string is sent instead:

```as3
// saveData[2] = md5(hashString);
saveData[2] = hashString;
```

Whatever the server expects in `saveData[2]`, it receives the unhashed value.
The reported problem in `md5.as` itself was not investigated.

## 10. Unreachable browser code path (Low)

`LOGIN.as:88`: a branch marked `// ToDo: Implement if we are running in a browser.`
is unreachable because the client always runs as a standalone projector
(`GLOBAL._local = !ExternalInterface.available`, always `true`).

## 11. Duplicate keys in object literals (Low)

`MAPROOM_DESCENT.as` (key `"Log"`) and `CREATURELOCKER.as` (key `"blocked"`)
define the same key twice in one object literal. The last value wins (same in
AS3 and JavaScript), so this is harmless but confusing.

---

## Missing assets (server / CDN, not client code)

The client requests files that are not in the server repository's
`public/assets`. The Flash client gets the same 404s.

| Requested by | File |
|---|---|
| `CHAMPIONCAGEPOPUP.as:124` | `assets/koth/Krallen_200x200.flv` |
| `KOTHStartMessage.as:18` | `assets/popups/front_page/fp_event_kothstart.flv` |
| `MonsterMadnessPopupInfo.as:19-23` | three `mc_promo_*.flv` videos |
| quest list (`UI_MISSIONMENU`) | `assets/missionicon/icon_fantastic.png`, `icon_tribe_legonnaire.png`, `icon_hatchery.png`, `icon_mushroomsoup.png`, `icon_nextlevel.png` |

These may exist on the production CDN; if not, the quest icons show empty
frames and the video popups report "stream not found".
