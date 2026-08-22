---
layout: post
title: "Introducing oj: a Rust build tool that speaks Vite"
language: 'en'
date: 2026-08-24
description: "oj is a from-scratch, npm-free dev server and bundler written in Rust. It reads your existing vite.config, runs your existing Vite plugins, and reimplements React and TanStack Start natively, so you point it at a real app and it just runs, faster."
---

Most of the time you don't think about your dev server. You run `npm run dev`, you wait, you get a URL. The waiting is the part I kept thinking about.

For the last few months I've been building **oj**: a dev server and bundler written in Rust that you can point at an existing [Vite](https://vite.dev) + React project and it just runs: the same `vite.config.ts`, the same plugins, no rewrite. It's now good enough that I point it at real production apps, and I want to explain what it is, why it exists, and show you the numbers.

> **oj is experimental.** It already runs real production apps unchanged (I test it against large ones), but it is not finished. There are gaps: Svelte support, for one, is something I am actively working on, and you will hit rough edges on apps that lean on parts of the ecosystem I haven't covered yet. Treat it as a fast-moving project you can try today, not a drop-in replacement you should ship on tomorrow.

## The two things I wanted

There are already fast bundlers. What I wanted was a specific combination that didn't exist yet:

1. **Speak Vite, not webpack.** The apps I care about are Vite apps. They have a `vite.config.ts`, they use [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react), [`vite-plugin-svgr`](https://github.com/pd4d10/vite-plugin-svgr), [MDX](https://mdxjs.com), and a pile of project-specific plugins. A tool is only a drop-in if it runs *those*, unchanged. So oj reads your real Vite config and runs your real Vite plugins through a compatibility bridge. It also reimplements [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh) and [TanStack Start](https://tanstack.com/start) natively, because those are the frameworks I build on.

2. **No Node, no `node_modules`, one binary.** oj is a single Rust binary. It does not need a JavaScript runtime to drive it and it does not install a toolchain into your project. That matters most where I run it: ephemeral sandboxes, where a slimmer image and a faster cold start compound across thousands of previews.

<div class="ojbin" aria-label="Install footprint and cold start of a Node dev server versus a single oj binary, multiplied across a fleet of ephemeral sandboxes.">
  <div class="ojbin__meta">
    <span class="ojbin__title">What every sandbox has to carry</span>
    <span class="ojbin__sub">approx · per preview environment</span>
  </div>
  <canvas class="ojbin__canvas" height="150" aria-hidden="true"></canvas>
  <div class="ojbin__ctl">
    <label for="ojbin-n">sandboxes</label>
    <input id="ojbin-n" class="ojbin__n" type="range" min="1" max="2000" value="500" step="1" />
    <output class="ojbin__no">500</output>
  </div>
  <div class="ojbin__read">
    <span><b class="ojbin__nd ojbin__vcmp">—</b><em>Node: disk</em></span>
    <span><b class="ojbin__od ojbin__vacc">—</b><em>oj: disk</em></span>
    <span><b class="ojbin__cold ojbin__vwin">—</b><em>cold start</em></span>
  </div>
  <noscript><p class="ojbin__fallback">Per sandbox: a Node dev server carries ~295 MB (runtime + node_modules) and boots cold in ~18s; oj is one ~28 MB binary that boots in under a second. Across 500 sandboxes that is ~144 GB vs ~14 GB.</p></noscript>
</div>
<style>
  .ojbin {
    --acc: #2a33d4; --cmp: #b6b4ae; --ink: #1c1c1c; --mut: #6b6a66;
    --line: #e6e5e2; --bg: #ffffff; --win: #17876b;
    border: 1px solid var(--line); border-radius: 10px; background: var(--bg);
    padding: 16px 16px 12px; margin: 28px 0;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ojbin__meta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 10px; }
  .ojbin__title { font-weight: 600; font-size: 13.5px; color: var(--ink); }
  .ojbin__sub { font-size: 11px; color: var(--mut); }
  .ojbin__canvas { display: block; width: 100%; height: 150px; }
  .ojbin__ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--line); font-size: 12.5px; }
  .ojbin__ctl label { color: var(--mut); }
  .ojbin__ctl input[type="range"] { flex: 1 1 45%; min-width: 0; accent-color: var(--acc); }
  .ojbin__no { color: var(--ink); font-weight: 500; min-width: 3.4em; }
  .ojbin__read { display: flex; gap: 26px; margin-top: 12px; flex-wrap: wrap; }
  .ojbin__read span { display: flex; flex-direction: column-reverse; }
  .ojbin__read b { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .ojbin__read em { font-style: normal; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
  .ojbin__vacc { color: var(--acc); } .ojbin__vcmp { color: var(--cmp); } .ojbin__vwin { color: var(--win); }
  .ojbin__fallback { font-size: 12px; color: var(--mut); }
</style>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    while (root && !(root.classList && root.classList.contains("ojbin"))) root = root.previousElementSibling;
    if (!root) return;
    var cv = root.querySelector(".ojbin__canvas");
    var nEl = root.querySelector(".ojbin__n"), nO = root.querySelector(".ojbin__no");
    var ndV = root.querySelector(".ojbin__nd"), odV = root.querySelector(".ojbin__od"), coldV = root.querySelector(".ojbin__cold");
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- approximate per-sandbox constants — edit to taste ---
    var NODE_MB = 295;   // node runtime (~45MB) + a real app's node_modules (~250MB)
    var OJ_MB = 28;      // one static oj binary, nothing else to install
    var NODE_COLD = 18;  // seconds: install + first dev boot
    var OJ_COLD = 0.4;   // seconds: launch the binary
    // ---------------------------------------------------------

    function tone(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
    function gb(mb) { return mb >= 1024 ? (mb / 1024).toFixed(mb >= 10240 ? 0 : 1) + " GB" : Math.round(mb) + " MB"; }
    function dur(s) { if (s >= 3600) return (s / 3600).toFixed(1) + " h"; if (s >= 60) return (s / 60).toFixed(s >= 600 ? 0 : 1) + " min"; return s.toFixed(1) + "s"; }

    var w = 0, h = 0, dpr = 1, shownN = 0, raf = 0;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width || 600; h = 150;
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function bar(y, label, mb, color, refMb) {
      var labelW = 44, x0 = labelW, maxW = w - labelW - 4;
      var frac = Math.min(1, mb / refMb);
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "middle";
      ctx.fillStyle = tone("--mut"); ctx.textAlign = "left"; ctx.fillText(label, 0, y + 11);
      ctx.fillStyle = tone("--line"); ctx.globalAlpha = 0.5; ctx.fillRect(x0, y, maxW, 22); ctx.globalAlpha = 1;
      ctx.fillStyle = color; ctx.fillRect(x0, y, Math.max(2, maxW * frac), 22);
      ctx.fillStyle = tone("--ink"); ctx.font = "700 12px 'JetBrains Mono', monospace";
      var t = gb(mb), tw = ctx.measureText(t).width;
      var inside = maxW * frac > tw + 16;
      ctx.fillStyle = inside ? "#fff" : tone("--ink");
      ctx.fillText(t, inside ? x0 + maxW * frac - tw - 8 : x0 + maxW * frac + 8, y + 12);
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var refMb = 2000 * NODE_MB; // full-scale = max sandboxes of Node
      var nodeMb = shownN * NODE_MB, ojMb = shownN * OJ_MB;
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = tone("--mut"); ctx.textAlign = "left";
      ctx.fillText("total install footprint across the fleet", 0, 12);
      bar(34, "Node", nodeMb, tone("--cmp"), refMb);
      bar(70, "oj", ojMb, tone("--acc"), refMb);
    }
    function tick() {
      var target = +nEl.value;
      if (reduce) { shownN = target; draw(); raf = 0; return; }
      shownN += (target - shownN) * 0.2;
      if (Math.abs(target - shownN) < 0.5) { shownN = target; draw(); raf = 0; return; }
      draw(); raf = requestAnimationFrame(tick);
    }
    function refresh() {
      var n = +nEl.value; nO.textContent = n;
      ndV.textContent = gb(n * NODE_MB); odV.textContent = gb(n * OJ_MB);
      coldV.textContent = dur(NODE_COLD) + " → " + dur(OJ_COLD);
      if (!raf) raf = requestAnimationFrame(tick);
    }
    nEl.addEventListener("input", refresh);
    window.addEventListener("resize", function () { size(); draw(); });
    size(); shownN = +nEl.value; refresh(); draw();
  })();
</script>


Under the hood it's built on [rolldown](https://rolldown.rs) and [oxc](https://oxc.rs) (the same Rust foundations the Vite team is moving toward), with an on-demand, unbundled dev server in front, and lazy compilation so opening one route doesn't pay for the whole app.

## The numbers

Here is `oj dev --bundle` against Vite's default dev on the same 10,000-component project: cold start, warm start, and a full page reload. Watch it fill:

<div class="ojbench" aria-label="Benchmark comparing oj and Vite on a 10,000-component app: cold start, warm start, and a full page reload. oj is roughly four times faster on start and nearly eight times faster on reload.">
  <div class="ojbench__meta">
    <span class="ojbench__metric">Cold start</span>
    <span class="ojbench__ratio">4.3× faster</span>
    <span class="ojbench__ms">oj <b>1315ms</b> · Vite <b>5693ms</b></span>
  </div>
  <canvas class="ojbench__canvas" height="150" aria-hidden="true"></canvas>
  <noscript><p class="ojbench__fallback">oj vs Vite on 10,000 components. Cold start: 1315ms vs 5693ms · warm start: 1129ms vs 5304ms · reload: 232ms vs 1781ms.</p></noscript>
</div>

<style>
.ojbench{border:1px solid #e6e5e2;border-radius:10px;padding:18px 18px 12px;margin:28px 0;background:#ffffff}
.ojbench__meta{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:14px;margin-bottom:12px}
.ojbench__metric{font-weight:600;color:#1c1c1c}
.ojbench__ratio{color:#2a33d4;font-weight:600}
.ojbench__ms{color:rgba(0,0,0,.55);margin-left:auto}
.ojbench__ms b{color:#1c1c1c;font-weight:600}
.ojbench__canvas{display:block;width:100%;height:150px}
.ojbench__fallback{font-family:var(--font-mono,monospace);font-size:14px;color:#333}
</style>

<script>
(function () {
  var root = document.currentScript.previousElementSibling;
  while (root && !(root.classList && root.classList.contains("ojbench"))) root = root.previousElementSibling;
  if (!root) return;
  var canvas = root.querySelector(".ojbench__canvas");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return;

  var METRICS = [
    { label: "Cold start", oj: 1315, vite: 5693 },
    { label: "Warm start", oj: 1129, vite: 5304 },
    { label: "Reload",     oj: 232,  vite: 1781 }
  ];
  var OJ_MS = 900, HOLD = 1100, CELL = 12;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ink = "rgba(20,20,20,0.85)";
  var bg = "#ffffff";
  var line = "#e6e5e2";
  var accent = "#2a33d4", vite = "#b6b4ae", faint = "rgba(0,0,0,0.4)";

  var metricEl = root.querySelector(".ojbench__metric");
  var ratioEl = root.querySelector(".ojbench__ratio");
  var msEl = root.querySelector(".ojbench__ms");
  var dpr = 1, w = 0, h = 0, raf = 0, metric = 0, runStart = performance.now(), shown = -1;

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height || 150;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
  }
  function lane(x, y, width, rows, p, color) {
    var cols = Math.floor(width / CELL), front = p * cols, s = Math.ceil(CELL * dpr) - dpr;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var lit = c <= front, edge = front - c;
      if (lit && edge < 2.2 && ((c * 7 + r * 13 + ((front | 0) * 5)) % 5 === 0)) continue;
      ctx.fillStyle = lit ? color : line;
      ctx.globalAlpha = lit ? (edge < 1.5 ? 1 : 0.92) : 0.5;
      ctx.fillRect(Math.floor((x + c * CELL) * dpr), Math.floor((y + r * CELL) * dpr), s, s);
    }
    ctx.globalAlpha = 1;
  }
  function meta(m) {
    if (shown === metric) return; shown = metric;
    if (metricEl) metricEl.textContent = m.label;
    if (ratioEl) ratioEl.textContent = (m.vite / m.oj).toFixed(1) + "× faster";
    if (msEl) msEl.innerHTML = "oj <b>" + m.oj + "ms</b> · Vite <b>" + m.vite + "ms</b>";
  }
  function draw(now) {
    var m = METRICS[metric], viteMs = OJ_MS * (m.vite / m.oj), t = now - runStart;
    var ojP = reduce ? 1 : Math.min(1, t / OJ_MS), viteP = reduce ? 1 : Math.min(1, t / viteMs);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    var padX = 14, labelW = 66, rows = 3, laneH = rows * CELL, gap = 30;
    var trackX = padX + labelW, trackW = w - trackX - padX - 8, topY = (h - (laneH * 2 + gap)) / 2;
    ctx.textBaseline = "middle";
    ctx.font = "600 " + (13 * dpr) + "px ui-monospace,Menlo,monospace";
    ctx.fillStyle = ink; ctx.fillText("oj", padX * dpr, (topY + laneH / 2) * dpr);
    ctx.fillStyle = faint; ctx.fillText("VITE", padX * dpr, (topY + laneH + gap + laneH / 2) * dpr);
    lane(trackX, topY, trackW, rows, ojP, accent);
    lane(trackX, topY + laneH + gap, trackW, rows, viteP, vite);
    meta(m);
    if (!reduce && t > viteMs + HOLD) { metric = (metric + 1) % METRICS.length; runStart = now; }
  }
  function frame(now) { draw(now); raf = requestAnimationFrame(frame); }
  resize();
  if (reduce) draw(performance.now()); else raf = requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
})();
</script>

A few things worth saying about those numbers. The start figures are the headline, and they hold as the app grows: on the 10,000-component tree oj cold-starts in about a quarter of Vite's time, and the reload loop you pay dozens of times an hour is where that lead compounds. oj's default `oj dev` is an on-demand, unbundled server; the chart shows `oj dev --bundle`, which pre-bundles the client for the fastest loop.

Two honest caveats. A single hot edit (HMR) is now a wash: both oj and a well-tuned Vite land around 60ms, and I'm not going to pretend otherwise. And a *well-tuned* Vite is faster than a default one; I'm not interested in beating a strawman, so these runs are Vite configured sensibly, on the same machine, same app. The suite is `bench/run.mjs` in the repo, so you can reproduce it: `node bench/run.mjs 10000`.

The number that doesn't narrow is memory. On that same app oj holds around 115MB where Vite sits above 1.5GB, a 13x gap that widens with app size. That is the difference that matters where I run oj most: thousands of ephemeral preview sandboxes, where every megabyte and every second of cold start is multiplied.

## Running a real app

A benchmark on a toy app proves nothing. The bar I set for myself was: take a real, popular open-source Vite app that I did not write, don't touch its config, and run it.

That is a genuinely hard bar, because real apps lean on the whole surface of Vite: regex `resolve.alias` for monorepo packages, source files outside the app root, TypeScript enums, `import.meta.env`, plugin virtual modules. Every one of those is a place a "Vite-compatible" tool can quietly fall short, and getting there is most of what the last stretch of work has been.

I picked [Excalidraw](https://github.com/excalidraw/excalidraw), one of the most-starred open-source React apps on GitHub, and pointed oj at its `excalidraw-app` without changing a line of config. It runs. Getting there was exactly the list above: its monorepo packages wire through regex `resolve.alias`, its stylesheets use the `.module.scss` convention (which oj's Sass engine now resolves the way dart-sass does), it imports TypeScript source from outside the app root, and it uses `import.meta.env` inside JSX. Every one of those was a place oj used to fall short, and each is now a fixed bug with a test.

The loop on that app, same machine, from `oj dev` (or `vite`) to the first canvas painting:

| | cold start | warm start | memory |
|---|---|---|---|
| **oj** | **~0.8s** | **~0.8s** | **288 MB** |
| Vite | ~2.3s | ~1.1s | 2.4 GB |

oj boots it in under a second cold or warm, on about an eighth of the memory.

One honest caveat, and oj prints it on boot: it **skips [`vite-plugin-checker`](https://github.com/fi3ework/vite-plugin-checker)**, the plugin that runs `tsc` in a background worker and overlays type errors in the browser. oj cannot host that one (it wants a full Vite dev server that oj does not provide), so it logs `skipping unsupported plugin "vite-plugin-checker"` and carries on. The app it serves is the same either way; you just do not get the in-browser type overlay, and Vite's numbers above include the worker that oj never starts.

Then I pointed it at something much bigger: [Twenty](https://github.com/twentyhq/twenty), an open-source CRM whose front-end is around 15,000 modules and leans on the *whole* hard surface at once, zero-runtime CSS-in-JS via `@wyw-in-js`, a Linaria/SWC macro pipeline, `vite-plugin-svgr`, and a pile of CommonJS and UMD dependencies. Getting it to boot and render took another stack of compatibility fixes (CommonJS named-export interop, `browser`-field stubs, the wyw resolver), and it runs, and it stays ahead:

| | cold start | warm start | memory |
|---|---|---|---|
| **oj** | **~10.2s** | **~9.2s** | **1.5 GB** |
| Vite | ~11.3s | ~10.2s | 4.9 GB |

oj is faster to first paint on cold and warm, on roughly a third of the memory, and it does that on the harder side of the comparison. This is `oj dev` with dependencies served unbundled against Vite with its dependency pre-bundling on, which it always is in dev: Twenty's first screen pulls close to its entire graph, around 15,000 module requests, and about 9,800 of those are individual dependency files that Vite collapses into a handful up front[^vite-prebundle] while oj serves one by one. So oj is doing roughly twenty times the requests and still comes out ahead, because on localhost those requests are cheap.

Over a network they aren't, and that is what oj's (experimental, flag-gated) partial bundling is for: it collapses a dependency's files into a single request. On a clean React app (router, `date-fns`, `lodash-es`) that turns **962 dependency requests into 18**, with the app rendering identically, nearly free on localhost but decisive where every request pays a round-trip, exactly the shape of a remote or sandboxed dev server. Same app, time-to-first-render through a latency proxy:

<div class="ojlat" aria-label="Dependency requests filling under network latency: 962 unbundled versus 18 with partial bundling. Measured on a React app.">
  <div class="ojlat__meta">
    <span class="ojlat__title">Dependency requests, filling under network latency</span>
    <span class="ojlat__sub">pbench-app · HTTP/1.1, ~6 connections</span>
  </div>
  <canvas class="ojlat__canvas" height="196" aria-hidden="true"></canvas>
  <div class="ojlat__legend">
    <span><i class="ojlat__k1"></i>unbundled · 962 requests</span>
    <span><i class="ojlat__k2"></i>partial bundling · 18</span>
  </div>
  <div class="ojlat__ctl">
    <label for="ojlat-lat">network round-trip</label>
    <input id="ojlat-lat" class="ojlat__lat" type="range" min="0" max="50" value="25" step="1" />
    <output class="ojlat__lato">25 ms</output>
    <button class="ojlat__run" type="button">↻ replay</button>
  </div>
  <div class="ojlat__read">
    <span><b class="ojlat__un ojlat__vcmp">—</b><em>unbundled</em></span>
    <span><b class="ojlat__bu ojlat__vacc">—</b><em>partial bundling</em></span>
    <span><b class="ojlat__sp ojlat__vwin">—</b><em>time-to-render</em></span>
  </div>
  <noscript><p class="ojlat__fallback">Time-to-first-render on pbench-app: at 0ms RTT, 448ms unbundled vs 65ms bundled (6.9×); at 50ms, 8.8s vs 0.33s (27×).</p></noscript>
</div>
<style>
  .ojlat {
    --acc: #2a33d4; --cmp: #b6b4ae; --ink: #1c1c1c; --mut: #6b6a66;
    --line: #e6e5e2; --bg: #ffffff; --win: #17876b;
    border: 1px solid var(--line); border-radius: 10px; background: var(--bg);
    padding: 16px 16px 12px; margin: 28px 0;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ojlat__meta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 10px; }
  .ojlat__title { font-weight: 600; font-size: 13.5px; color: var(--ink); }
  .ojlat__sub { font-size: 11px; color: var(--mut); }
  .ojlat__canvas { display: block; width: 100%; height: 196px; }
  .ojlat__legend { display: flex; gap: 18px; font-size: 11px; color: var(--mut); margin-top: 6px; }
  .ojlat__legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; }
  .ojlat__k1 { background: var(--cmp); } .ojlat__k2 { background: var(--acc); }
  .ojlat__ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--line); font-size: 12.5px; }
  .ojlat__ctl label { color: var(--mut); }
  .ojlat__ctl input[type="range"] { flex: 1 1 45%; min-width: 0; accent-color: var(--acc); }
  .ojlat__lato { color: var(--ink); font-weight: 500; min-width: 4.4em; }
  .ojlat__run { font: inherit; font-size: 12px; cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--mut); padding: 4px 9px; border-radius: 6px; }
  .ojlat__run:hover { border-color: var(--acc); color: var(--ink); }
  .ojlat__run:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
  .ojlat__read { display: flex; flex-wrap: wrap; gap: 14px 26px; margin-top: 12px; }
  .ojlat__read span { display: flex; flex-direction: column-reverse; }
  .ojlat__read b { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .ojlat__read em { font-style: normal; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
  .ojlat__vacc { color: var(--acc); } .ojlat__vcmp { color: var(--cmp); } .ojlat__vwin { color: var(--win); }
  .ojlat__fallback { font-size: 12px; color: var(--mut); }
</style>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    while (root && !(root.classList && root.classList.contains("ojlat"))) root = root.previousElementSibling;
    if (!root) return;
    var cv = root.querySelector(".ojlat__canvas");
    var latEl = root.querySelector(".ojlat__lat"), latO = root.querySelector(".ojlat__lato");
    var unV = root.querySelector(".ojlat__un"), buV = root.querySelector(".ojlat__bu"), spV = root.querySelector(".ojlat__sp");
    var runBtn = root.querySelector(".ojlat__run");
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Measured on pbench-app (React + router + date-fns + lodash-es), time-to-first-render:
    // [ round-trip ms, unbundled ms, partial-bundling ms ]
    var DATA = [[0, 448, 65], [10, 2222, 106], [25, 4692, 195], [50, 8836, 328]];
    var N_UN = 962, N_BU = 18, CONN = 6, UN_MAX = DATA[DATA.length - 1][1];

    function tone(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
    function interp(lat) {
      for (var i = 1; i < DATA.length; i++) {
        if (lat <= DATA[i][0]) {
          var a = DATA[i - 1], b = DATA[i], t = (lat - a[0]) / (b[0] - a[0]);
          return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        }
      }
      return [DATA[DATA.length - 1][1], DATA[DATA.length - 1][2]];
    }
    function fmt(ms) { return ms >= 1000 ? (ms / 1000).toFixed(ms >= 10000 ? 0 : 1) + "s" : Math.round(ms) + "ms"; }

    var w = 0, h = 0, dpr = 1, raf = 0, start = 0, cur = interp(25);
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width || 600; h = 196;
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function lane(x, cw, N, cols, filled, color, title) {
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = tone("--mut"); ctx.fillText(title, x, 11);
      var pad = 1, rows = Math.ceil(N / cols);
      var cell = Math.max(2, Math.min((cw) / cols - pad, (h - 22) / rows - pad));
      for (var i = 0; i < N; i++) {
        var r = Math.floor(i / cols), c = i % cols;
        var cx = x + c * (cell + pad), cy = 18 + r * (cell + pad);
        var lit = i < filled;
        ctx.fillStyle = lit ? color : tone("--line");
        ctx.globalAlpha = lit ? 1 : 0.5;
        ctx.fillRect(cx, cy, cell, cell);
      }
      ctx.globalAlpha = 1;
    }
    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      var scale = 2200 / UN_MAX; // compress so slowest run ~2.2s on screen
      var elapsed = reduce ? 1e9 : (now - start);
      function filled(loadMs, N) {
        if (loadMs <= 0) return N;
        var prog = Math.min(1, elapsed / (loadMs * scale));
        var waves = Math.ceil(N / CONN);
        return Math.min(N, Math.floor(prog * waves) * CONN + (prog >= 1 ? CONN : 0));
      }
      var gap = 22, colW = (w - gap) / 2;
      lane(0, colW, N_UN, 46, filled(cur[0], N_UN), tone("--cmp"), "unbundled · 962");
      lane(colW + gap, colW, N_BU, 6, filled(cur[1], N_BU), tone("--acc"), "bundled · 18");
      var done = filled(cur[0], N_UN) >= N_UN && filled(cur[1], N_BU) >= N_BU;
      if (!reduce && !done) raf = requestAnimationFrame(draw); else raf = 0;
    }
    function refresh() {
      var lat = +latEl.value; cur = interp(lat);
      latO.textContent = lat + " ms";
      unV.textContent = fmt(cur[0]); buV.textContent = fmt(cur[1]);
      spV.textContent = (cur[0] / cur[1]).toFixed(1) + "×";
    }
    function run() { refresh(); if (raf) cancelAnimationFrame(raf); start = performance.now(); raf = requestAnimationFrame(draw); }
    latEl.addEventListener("input", run);
    runBtn.addEventListener("click", run);
    window.addEventListener("resize", function () { size(); if (!raf) draw(performance.now()); });
    size(); run();
  })();
</script>


| round-trip latency | before | after | speedup |
|---|---|---|---|
| 0ms (local) | 448ms | 65ms | 6.9× |
| 10ms | 2.2s | 106ms | 21× |
| 25ms | 4.7s | 195ms | 24× |
| 50ms (remote) | 8.8s | 0.33s | **27×** |

The point of oj was never "another bundler." It was: keep the ecosystem you already have (your config, your plugins, your framework) and make the loop underneath it disappear.

## How it got here

oj started as a project to fix my own problems. I was working on another repository and watching agents run `vite build` over and over, each build process carrying gigabytes of memory, and I got tired enough to try building the thing I wished I had. That's the whole origin: frustration, and free time.

At some point it started showing up in my day job at [Lovable](https://lovable.dev), quietly, behind a flag. People got excited. They started using it, filing issues, and sending patches. It's still an experimental research project (the README still says *use at your own risk*, and it means it).

The app it runs there is not a toy: a production TanStack Start build with a client graph around 18,000 modules and a `vite.config` that loads more than fifty plugins. That turned out to be the best stress test oj ever had. Getting it to boot that app in a couple of seconds instead of tens, on a fraction of the memory, didn't come from one clever trick; it came from a stack of small, individually-measured changes: persistent caches for the codegen, the client bundle, and the SSR loader; a single plugin host instead of two; loader hooks moved in-thread. Each is a modest win on its own, and they compound. All of it lives in the public repo.

<img src="/assets/images/posts/oj-github-repo.png" alt="The oj repository on GitHub" style="width: 100%; max-width: 100%; height: auto; border: 1px solid #e6e5e2; border-radius: 10px;" />

*(That screenshot is already out of date. The repo has picked up real contributors since)*

So who knows what lies ahead.

## Future work: experimental cache

The most promising of those, and still experimental, is the persistent cache. oj compiles every module to its final served form, keys that output by a hash of the source, and writes it to a small on-disk store. A warm restart then re-serves compiled modules straight from disk instead of recompiling them, which is most of the difference between a cold boot and a warm one. Vite, for comparison, keeps no cross-restart cache for your app's own source[^vite-cache]: it re-transforms every module, lazily, on each start. Persisting that work is where warm-start speed could come from, but it is off by default for now while I harden it; opt in with `oj dev --enable-cache` (or `OJ_ENABLE_CACHE=1`) when you want warm starts to skip recompilation. The reason it is not on yet is the next paragraph.

Persisting it also turned out to be where correctness gets subtle, and a real app taught me the lesson. Some Vite plugins do not just transform a file, they also stash state in memory as a side effect. The clearest case is zero-runtime CSS-in-JS: [wyw-in-js](https://wyw-in-js.dev/) (the engine behind [Linaria](https://github.com/callstack/linaria)) reads each component's `styled` blocks, extracts the CSS, keeps it in an in-memory map, and appends an `import` of a virtual `.wyw-in-js.css` file that its own `load` hook serves back out of that map. Cache the transformed code and nothing else, and a warm restart is a trap: the code still imports the virtual stylesheet, but the plugin's map is empty because the transform never re-ran, so every one of those imports 404s and the app quietly fails to mount.

The fix is to notice exactly those modules and no others. On a warm hit, oj checks whether the cached module imports a path that no longer exists on disk, which is the signature of a plugin-served virtual, and if so it re-runs that module's transform to repopulate the plugin's state before serving. Everything else, the vast majority, still comes straight from the cache. It is the smallest correct thing: keep the fast path wherever the cached output is self-contained, and pay for a re-transform only where a plugin's memory is part of the answer.

<!-- ==================== BLOCK: warm-cache-surgical — copy from here ==================== -->
<div class="ojcache" aria-label="A grid of app modules on a warm restart. Naive caching lets plugin-stateful modules 404; oj re-transforms only those and serves the rest from cache.">
  <div class="ojcache__meta">
    <span class="ojcache__title">A warm restart: what actually re-runs</span>
    <span class="ojcache__sub">336 modules · 9 backed by plugin state</span>
  </div>
  <canvas class="ojcache__canvas" height="204" aria-hidden="true"></canvas>
  <div class="ojcache__legend">
    <span><i class="ojcache__kc"></i>served from cache</span>
    <span><i class="ojcache__kr"></i>re-transformed</span>
    <span><i class="ojcache__kb"></i>404 · broke the app</span>
  </div>
  <div class="ojcache__ctl">
    <span class="ojcache__lbl">restart</span>
    <button class="ojcache__seg" data-m="cold" type="button">cold boot</button>
    <button class="ojcache__seg" data-m="naive" type="button">warm · cache everything</button>
    <button class="ojcache__seg ojcache__on" data-m="oj" type="button">warm · oj surgical</button>
  </div>
  <div class="ojcache__read">
    <span><b class="ojcache__c ojcache__vacc">—</b><em>from cache</em></span>
    <span><b class="ojcache__r ojcache__vwarn">—</b><em>re-transformed</em></span>
    <span><b class="ojcache__b ojcache__vbad">—</b><em>404s</em></span>
    <span><b class="ojcache__mount ojcache__vmount">—</b><em>result</em></span>
  </div>
  <noscript><p class="ojcache__fallback">On a warm restart, caching every module but re-running none leaves plugin-served virtual files (e.g. wyw-in-js CSS) 404ing, so the app fails to mount. oj re-transforms only those few modules and serves the rest from cache.</p></noscript>
</div>
<style>
  .ojcache {
    --acc: #2a33d4; --warn: #c26a1b; --bad: #c0392b; --ink: #1c1c1c; --mut: #6b6a66;
    --line: #e6e5e2; --bg: #ffffff; --cell: #dfe0f4; --win: #17876b;
    border: 1px solid var(--line); border-radius: 10px; background: var(--bg);
    padding: 16px 16px 12px; margin: 28px 0;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ojcache__meta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 10px; }
  .ojcache__title { font-weight: 600; font-size: 13.5px; color: var(--ink); }
  .ojcache__sub { font-size: 11px; color: var(--mut); }
  .ojcache__canvas { display: block; width: 100%; height: 204px; }
  .ojcache__legend { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 11px; color: var(--mut); margin-top: 8px; }
  .ojcache__legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: baseline; }
  .ojcache__kc { background: var(--acc); } .ojcache__kr { background: var(--warn); } .ojcache__kb { background: var(--bad); }
  .ojcache__ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--line); font-size: 12px; }
  .ojcache__lbl { color: var(--mut); margin-right: 2px; }
  .ojcache__seg { font: inherit; font-size: 11.5px; cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--mut); padding: 4px 9px; border-radius: 7px; }
  .ojcache__seg:hover { border-color: var(--acc); color: var(--ink); }
  .ojcache__seg:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
  .ojcache__on { background: var(--acc); border-color: var(--acc); color: #fff; }
  .ojcache__on:hover { color: #fff; }
  .ojcache__read { display: flex; flex-wrap: wrap; gap: 14px 26px; margin-top: 12px; }
  .ojcache__read span { display: flex; flex-direction: column-reverse; }
  .ojcache__read b { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .ojcache__read em { font-style: normal; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
  .ojcache__vacc { color: var(--acc); } .ojcache__vwarn { color: var(--warn); } .ojcache__vbad { color: var(--bad); }
  .ojcache__vmount { color: var(--win); } .ojcache__vmount.is-fail { color: var(--bad); }
  .ojcache__fallback { font-size: 12px; color: var(--mut); }
</style>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    while (root && !(root.classList && root.classList.contains("ojcache"))) root = root.previousElementSibling;
    if (!root) return;
    var cv = root.querySelector(".ojcache__canvas");
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cV = root.querySelector(".ojcache__c"), rV = root.querySelector(".ojcache__r"),
        bV = root.querySelector(".ojcache__b"), mV = root.querySelector(".ojcache__mount");

    var COLS = 24, ROWS = 14, N = COLS * ROWS;
    // modules whose transform stashes state a warm cache can't restore (e.g. a
    // plugin's in-memory map that serves a virtual stylesheet)
    var STATEFUL = new Set([37, 66, 91, 130, 155, 199, 241, 288, 300]);
    var mode = "oj", sweep = 0, raf = 0, start = 0;

    function tone(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
    // state of cell i under a mode: 0 cache, 1 retransform, 2 broken
    function stateOf(i, m) {
      if (m === "cold") return 0;
      if (STATEFUL.has(i)) return m === "naive" ? 2 : 1;
      return 0;
    }
    function color(s) { return s === 2 ? tone("--bad") : s === 1 ? tone("--warn") : (mode === "cold" ? tone("--acc") : tone("--cell")); }

    var w = 0, h = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width || 600; h = 204;
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = tone("--mut");
      var head = mode === "cold" ? "cold boot — every module compiled, cache written"
        : mode === "naive" ? "warm — cache the output, re-run nothing"
        : "warm — cache the output, re-run only what carries plugin state";
      ctx.fillText(head, 0, 12);
      var top = 22, pad = 2;
      var cell = Math.min((w - (COLS - 1) * pad) / COLS, (h - top - (ROWS - 1) * pad) / ROWS);
      var gx = (w - (COLS * cell + (COLS - 1) * pad)) / 2;
      for (var i = 0; i < N; i++) {
        var c = i % COLS, r = Math.floor(i / COLS);
        var revealed = sweep >= c; // left-to-right sweep on mode change
        var s = revealed ? stateOf(i, mode) : 0;
        var col = revealed ? color(s) : tone("--cell");
        if (!revealed) col = tone("--line");
        var x = gx + c * (cell + pad), y = top + r * (cell + pad);
        ctx.fillStyle = col;
        ctx.globalAlpha = (s === 0 && mode !== "cold") ? 0.85 : 1;
        roundRect(x, y, cell, cell, Math.min(2.5, cell / 4));
      }
      ctx.globalAlpha = 1;
    }
    function roundRect(x, y, wd, ht, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + wd, y, x + wd, y + ht, r);
      ctx.arcTo(x + wd, y + ht, x, y + ht, r);
      ctx.arcTo(x, y + ht, x, y, r);
      ctx.arcTo(x, y, x + wd, y, r);
      ctx.fill();
    }
    function readout() {
      var broken = mode === "naive" ? STATEFUL.size : 0;
      var retr = mode === "oj" ? STATEFUL.size : 0;
      var cache = mode === "cold" ? 0 : N - STATEFUL.size;
      cV.textContent = mode === "cold" ? "0" : cache;
      rV.textContent = mode === "cold" ? N : retr; // cold: all compiled
      rV.nextElementSibling.textContent = mode === "cold" ? "compiled" : "re-transformed";
      bV.textContent = broken;
      var ok = broken === 0;
      mV.textContent = ok ? "✓ mounts" : "✗ blank";
      mV.classList.toggle("is-fail", !ok);
    }
    function anim(now) {
      var t = now - start;
      sweep = reduce ? COLS : Math.min(COLS, (t / 460) * COLS);
      draw();
      if (sweep < COLS) raf = requestAnimationFrame(anim); else raf = 0;
    }
    function setMode(m) {
      mode = m;
      root.querySelectorAll(".ojcache__seg").forEach(function (b) { b.classList.toggle("ojcache__on", b.getAttribute("data-m") === m); });
      readout();
      if (raf) cancelAnimationFrame(raf);
      start = performance.now(); sweep = 0; raf = requestAnimationFrame(anim);
    }
    root.querySelectorAll(".ojcache__seg").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-m")); });
    });
    window.addEventListener("resize", function () { size(); draw(); });
    size(); readout(); sweep = COLS; draw();
  })();
</script>
<!-- ==================== END BLOCK: warm-cache-surgical ==================== -->


## Try it

oj is [open source](https://github.com/raphamorim/oj) and MIT licensed, on [crates.io](https://crates.io/crates/oj) now.

```
cargo install oj --locked
cd your-vite-app
oj dev
```

If it doesn't run your app unchanged, that's a bug I want to hear about: open an issue with your `vite.config.ts` and I'll chase it. That's the whole promise.

[^vite-prebundle]: In dev, [Vite](https://vite.dev) pre-bundles dependencies up front with esbuild (Rolldown as of Vite 8), collapsing the many files inside a package into a few requests. See [Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling). oj's equivalent is its experimental, flag-gated partial bundling.

[^vite-cache]: Vite transforms each app module lazily on request and does not persist that work across restarts, so a warm start re-transforms your source. Vite 8 / rolldown-vite is adding module-level persistent caching, so this gap is narrowing.
