// Watches the partial redraw while a test plays (import it; see partial-redraw-hunt.mjs):
//  - the yard: after every frame the yard renderer (com/monsters/rendering/Renderer.as) draws in parts, the
//    same frame is drawn whole over it and the part in view compared, pixel for pixel. A difference is
//    something the partial redraw left behind or missed; what is drawn there is recorded with it.
//  - the screen: every other frame, the screen is compared with a full repaint of it
//    (__player.verifyRedraw), and what is on screen there is recorded.
// Drawing the yard whole after each frame puts right what the partial redraw got wrong, so each difference
// is counted on the frame it happens (a trail shows as one difference a frame, not one that grows).

/** Installs the watch in the page (again after each page load). Yard renderers are hooked as they appear. */
export async function installWatch(page) {
  await page.evaluate(() => {
    if (window.__rw) return;
    const rw = window.__rw = { yard: [], screen: [], yardChecks: 0, screenChecks: 0, errors: [], label: "", paused: false };
    const name = (o) => {
      if (!o) return "null";
      const c = o.constructor && o.constructor.name;
      return c || typeof o;
    };
    const hits = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    /** The yard's entries drawn over box (canvas pixels). */
    const yardAt = (box) => {
      const RD = window.__classByName("com.monsters.rendering::RasterData");
      const out = [];
      for (const list of [RD.s_unsortedData, RD.s_visibleData]) {
        for (const e of list) {
          if (!e || e._cleared || !e._pt || !e._rsHas) continue;
          const b = [e._rsX, e._rsY, e._rsX + e._rsW, e._rsY + e._rsH];
          if (!hits(b, box) || e._rsW * e._rsH > 4e6) continue;
          const d = e._data;
          out.push({
            data: name(d), w: Math.round(e._rsW), h: Math.round(e._rsH), depth: Math.round(e._depth),
            filter: e._filter ? name(e._filter) : undefined,
            dataFilters: d && d.$filters && d.$filters.length ? d.$filters.map(name).join(",") : undefined,
            alpha: e._alpha !== 4278190080 ? (e._alpha >>> 24) : undefined, blend: e._blendMode || undefined,
          });
          if (out.length >= 10) return out;
        }
      }
      return out;
    };
    const check = (ren, fullBefore) => {
      const Ren = ren.constructor;
      if (Ren.ioStats.full !== fullBefore || rw.paused) return; // a whole frame: nothing to compare
      const M = window.__game.MAP, inst = M._instance || M.instance;
      const bd = ren._canvas, ctx = bd.$ctx, v = inst.viewRect; // (the view, in the canvas's own pixels)
      if (!ctx || !v) return;
      const x = Math.max(0, Math.floor(v.x)), y = Math.max(0, Math.floor(v.y));
      const w = Math.min(bd.$w - x, Math.ceil(v.width)), h = Math.min(bd.$h - y, Math.ceil(v.height));
      if (w <= 0 || h <= 0) return;
      const a = ctx.getImageData(x, y, w, h).data;
      const RD = window.__classByName("com.monsters.rendering::RasterData");
      bd.lock(); ren.rasterize(RD.s_unsortedData); ren.rasterize(RD.s_visibleData); bd.unlock();
      const b = ctx.getImageData(x, y, w, h).data;
      rw.yardChecks++;
      let diff = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i] - b[i]) > 2 || Math.abs(a[i + 1] - b[i + 1]) > 2 || Math.abs(a[i + 2] - b[i + 2]) > 2) {
          diff++; const p = i >> 2, px = p % w, py = (p / w) | 0;
          if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
      }
      if (!diff) return;
      const box = [x + x0, y + y0, x + x1 + 1, y + y1 + 1];
      if (rw.yard.length < 400) rw.yard.push({ label: rw.label, check: rw.yardChecks, diff, box, at: yardAt(box) });
    };
    const hook = () => {
      try {
        const M = window.__game && window.__game.MAP, inst = M && (M._instance || M.instance), ren = inst && inst._renderer;
        if (!ren || ren.__rw) return;
        ren.__rw = true;
        const orig = ren.render;
        ren.render = function () {
          const fullBefore = this.constructor.ioStats.full;
          orig.call(this);
          try { check(this, fullBefore); } catch (e) { if (rw.errors.length < 5) rw.errors.push(String(e && e.stack || e)); }
        };
      } catch (e) { if (rw.errors.length < 5) rw.errors.push(String(e)); }
    };
    setInterval(hook, 250);
    hook();
    /** What is on screen over box (canvas pixels): the innermost objects, with their parents' classes. */
    const screenAt = (box) => {
      const out = [];
      const walk = (o, path) => {
        if (out.length >= 10 || !o.$visible) return;
        const rd = o.$rd;
        if (!rd || !rd.box || !hits(rd.box, box)) return;
        const kids = o.$children;
        const p = path.concat(name(o));
        if (!kids || !kids.length) { out.push({ what: p.slice(-4).join(" > "), box: rd.box.map(Math.round), filters: o.$filters && o.$filters.length ? o.$filters.map(name).join(",") : undefined }); return; }
        for (const k of kids) walk(k, p);
      };
      walk(window.__player.stage, []);
      return out;
    };
    let tick = 0;
    const screenLoop = () => {
      requestAnimationFrame(screenLoop);
      if (rw.paused || (++tick & 1)) return;
      try {
        const r = window.__player.verifyRedraw();
        rw.screenChecks++;
        if (r.diff > 4 && rw.screen.length < 400) rw.screen.push({ label: rw.label, check: rw.screenChecks, diff: r.diff, box: r.box, at: screenAt(r.box) });
      } catch (e) { if (rw.errors.length < 5) rw.errors.push(String(e)); }
    };
    requestAnimationFrame(screenLoop);
  });
}

/** Names what the test does now: differences found from here on carry it. */
export const watchLabel = (page, label) => page.evaluate((l) => { if (window.__rw) window.__rw.label = l; }, label);

/** Everything found so far (and clears it). */
export const watchTake = (page) => page.evaluate(() => {
  const rw = window.__rw; if (!rw) return null;
  const out = { yard: rw.yard, screen: rw.screen, yardChecks: rw.yardChecks, screenChecks: rw.screenChecks, errors: rw.errors };
  rw.yard = []; rw.screen = []; rw.errors = [];
  return out;
});

/**
 * One line per step: how many frames differed, on the yard and on screen, and for the first few what was
 * drawn there. Differences on screen seen on only one check (something that changed between the frame and
 * the check) are counted apart as "passing".
 */
export function summarize(label, found, detail = 3) {
  const lines = [];
  const bySame = (list) => {
    // a difference on the screen that holds for 2+ checks in a row, in the same place, is real
    let real = 0, passing = 0;
    for (let i = 0; i < list.length; i++) {
      const a = list[i], b = list[i + 1] || list[i - 1];
      const near = b && Math.abs(b.check - a.check) === 1 && Math.abs(b.box[0] - a.box[0]) < 40 && Math.abs(b.box[1] - a.box[1]) < 40;
      if (near) real++; else passing++;
    }
    return { real, passing };
  };
  const s = bySame(found.screen);
  lines.push(`${label}: yard ${found.yard.length} frame(s) differ (of ${found.yardChecks} checked so far), screen ${s.real} lasting + ${s.passing} passing (of ${found.screenChecks})`);
  for (const f of found.yard.slice(0, detail)) lines.push(`   yard [${f.label}] ${f.diff} px at ${f.box.join(",")}: ${JSON.stringify(f.at)}`);
  for (const f of found.screen.slice(0, detail)) lines.push(`   screen [${f.label}] ${f.diff} px at ${f.box.join(",")}: ${JSON.stringify(f.at)}`);
  if (found.errors.length) lines.push(`   watch errors: ${found.errors.join(" | ")}`);
  return lines.join("\n");
}
