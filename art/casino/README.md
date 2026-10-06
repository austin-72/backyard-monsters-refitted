# The Brimstone Pit: casino art (milestones 1 to 5)

Everything in `server/public/assets/casino/`:

| File | What |
|---|---|
| `lobby/lobby_bg.jpg` (728 x 518) | the lobby's cavern: a lava river and lava fall, gaming tables on the banks |
| `lobby/tile_<game>.png` (152 x 142) | one tile a game (magmadrop, scratch, roulette, bonepile, slots, ascent, derby), its monster in front; the game shows the name over the dark bottom and greys a locked one |
| `magmadrop/board_bg.jpg` (474 x 394) | basalt wall, lava cracks, glow from below |
| `magmadrop/peg.png` (18), `cup.png` (34 x 30) | obsidian stud with a hot rim; a crucible of lava |
| `magmadrop/spurtz_ball.png` (40) | Spurtz, the ball |
| `scratch/card_<bone,obsidian,magma>.png` (300) | the cards: a 24 px edge, nine 84 px cells |
| `scratch/coating_<tier>.png` (252) | the ash rubbed off: a pressed 3 x 3 grid and a skull a cell |
| `scratch/symbol_<crown,balthazar,spurtz,magma,sulfur,coal,bone>.png` (70) | the prizes |
| `monsters/<spurtz,zagnoid,valgos,malphus,balthazar,grokus,sabnox,wormzer>.png` (120) | the monsters' heads, their white backgrounds taken out (Roulette's table, Slots' reels) |
| `roulette/wheel.png` (240) | the wheel from above: segment i centred i x 360/29 degrees clockwise from the top (0 King Wormzer, then Lava odd, Ash even), the heads at 0.84 of the radius; the game turns it |
| `roulette/wheel_rim.png` (260) | the rim and the pointer at the top (does not turn) |
| `slots/cabinet.png` (480 x 400) | Moloch's idol: the reels' window (x 94-386, y 120-312) is a hole, the game draws the reels behind it; the plaque on the brow (y 62-110) is where the game writes the pool |
| `slots/lever.png` (36 x 140) | the lever, its pivot at the bottom middle (drawn at 456, 262 of the cabinet) |
| `bonepile/grid_bg.jpg` (474 x 394) | a cave floor with ash drifts, under the 25 piles |
| `bonepile/pile.png` (72) | a heap of bones with a skull |
| `bonepile/crystal.png` (52) | the magma crystal under a safe pile (a Sabnox is `monsters/sabnox.png`) |
| `ascent/sky.jpg` (960 x 300) | a lava sea and rock spires under a hazy cavern sky (the game scrolls it, joined to a mirrored copy) |
| `ascent/tower.png` (70 x 120) | the Magma Tower that shoots Balthazar down |
| `derby/track.jpg` (960 x 226) | the Derby's track: a canyon wall with bone torches, a basalt floor for the six lanes (the game repeats it mirrored and draws the lanes) |
| `derby/finish.png` (60 x 208) | the finish: a bone arch with a skull and a flag |

No text in any picture. Sparks, splashes, the win glow and the stamp are drawn in code.

## Making it again

```
pip install bpy        # Blender 5, as for art/brimstonepit
for w in lobby board peg cup wheel rim cabinet lever grid_bg pile crystal sky tower track finish card_bone card_obsidian card_magma sym_crown sym_magma sym_sulfur sym_coal sym_bone \
         tile_magmadrop tile_scratch tile_roulette tile_bonepile tile_slots tile_ascent tile_derby; do
  SAMPLES=48 python3 casino.py $w out/$w.png
done
python3 assemble.py out ../../server/public/assets
```

`assemble.py` scales the renders down, keys the monsters' portraits (`popups/IC*-150.png`, drawn on white)
out of their backgrounds for the ball, the Balthazar and Spurtz symbols and the tiles, and draws the
coatings. The lobby takes about 20 minutes on two cores; the rest seconds each.
