# The Yard Planner {#planner}

Build the Yard Planner (press P in your yard) to plan a layout, save it and put it into the yard in one go. Each yard has its own layouts, and outposts can save and load plans too.

## Tools {#planner-tools}

- **Undo and Redo** (100 steps), **Move**, **Store** (just what you selected), **Select**, **Clear**, **Walls** (drag a wall line at any angle), **Flip** left-right and top-bottom, **Rotate** and **Expand yard**.
- **Walls tool:** a wall under the pointer shows where a line will start (green if it fits, red if it's blocked). Shift-drag puts walls back in storage, Alt-drag lays a box, and the tool shows how many walls you have left.
- **Grid and nudging:** a grid that also snaps buildings to their neighbours' edges; the arrow keys move the selection one cell at a time. A **ruler** measures distances in cells.
- **Range circles** for every tower: ground, air and trap ranges each have their own colour and a legend, and hovering a building shows its own range.
- **Coverage:** shades the ground by how many towers reach it and outlines the buildings no tower covers.
- **Paths** (Tower path, Loot path, Any path): click anywhere on the plan, inside the yard or out, to put down a ground monster that goes for defences first, for loot first (harvesters, Resource Pods, the Under Hall), or for whatever is nearest. Its route is drawn the way the game's monsters work it out: each building it destroys is numbered in order and each wall it breaks is crossed out in red, for up to 12 stops. Click again to move it; Shift-click removes it. The routes update as you change the plan. They're estimates: defending monsters, traps, and flying or burrowing monsters aren't counted.

## Saving and loading {#planner-slots}

- **10 slots**, each showing when it was last saved. Slots can be renamed (up to 30 characters) and deleted; empty slots are greyed out in Load. Save and Load rows count each layout's buildings and how many aren't in this yard.
- **Current yard** (in Load) resets your plan to the yard as it is now. Loading another plan while this one has unsaved changes asks first.
- **Earlier versions kept:** a slot saved over or deleted keeps its earlier version for 7 days, with Restore.

## Applying a plan {#planner-apply}

- **Apply** says how many buildings will move and how many stay, and marks the movers on the plan while it asks. **Apply selection** moves only the buildings you selected. Afterwards a line says how many moved, with **Undo** for a minute.
- Applying an older plan that doesn't place every building names them, and offers to keep them where they stand.
- The planner checks your whole yard first, so a building can never end up on top of something the plan doesn't move, and wall lines place every wall exactly once.

## Sharing layouts {#planner-share}

- **Export** copies your layout as a code to give to someone, or shares it in chat: its pill opens the planner with it.
- **Import** puts your buildings where a code says, each on the nearest matching spot, so buildings already in place stay put. Buildings the code has no place for stay where they are. A code that would put buildings outside your yard, or on top of each other, is refused, and nothing changes. Import can also take any of your saved slots, your outposts' slots, kits, copied layouts or earlier versions.
- **Copy layout** on a yard you visit puts its buildings in Import.
- **Compare** shows another plan over yours with the differences marked. **Plan ahead** puts buildings you haven't built yet on the plan; when you build one, loading the plan puts it on its spot.
