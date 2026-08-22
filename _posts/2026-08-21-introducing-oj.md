---
layout: post
title: "Introducing oj: a Rust build tool that speaks Vite"
language: 'en'
date: 2026-08-21
draft: true
description: "oj is a from-scratch, npm-free dev server and bundler written in Rust. It reads your existing vite.config, runs your existing Vite plugins, and reimplements React and TanStack Start natively, so you point it at a real app and it just runs, faster."
---

Most of the time you don't think about your dev server. You run `npm run dev`, you wait, you get a URL. The waiting is the part I kept thinking about.

For the last few months I've been building **oj**: a dev server and bundler written in Rust that you can point at an existing Vite + React project and it just runs: the same `vite.config.ts`, the same plugins, no rewrite. It's now good enough that I point it at real production apps, and I want to explain what it is, why it exists, and show you the numbers.

> **oj is experimental.** It already runs real production apps unchanged (I test it against large ones), but it is not finished. There are gaps: Svelte support, for one, is something I am actively working on, and you will hit rough edges on apps that lean on parts of the ecosystem I haven't covered yet. Treat it as a fast-moving project you can try today, not a drop-in replacement you should ship on tomorrow.

## The two things I wanted

There are already fast bundlers. What I wanted was a specific combination that didn't exist yet:

1. **Speak Vite, not webpack.** The apps I care about are Vite apps. They have a `vite.config.ts`, they use `@vitejs/plugin-react`, `vite-plugin-svgr`, MDX, and a pile of project-specific plugins. A tool is only a drop-in if it runs *those*, unchanged. So oj reads your real Vite config and runs your real Vite plugins through a compatibility bridge. It also reimplements React Fast Refresh and TanStack Start natively, because those are the frameworks I build on.

2. **No Node, no `node_modules`, one binary.** oj is a single Rust binary. It does not need a JavaScript runtime to drive it and it does not install a toolchain into your project. That matters most where I run it: ephemeral sandboxes, where a slimmer image and a faster cold start compound across thousands of previews.

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

oj boots it in under a second whether the cache is cold or warm, on about an eighth of the memory.

One honest caveat, and oj prints it on boot: it **skips `vite-plugin-checker`**, the plugin that runs `tsc` in a background worker and overlays type errors in the browser. oj cannot host that one (it wants a full Vite dev server that oj does not provide), so it logs `skipping unsupported plugin "vite-plugin-checker"` and carries on. The app it serves is the same either way; you just do not get the in-browser type overlay, and Vite's numbers above include the worker that oj never starts.

Then I pointed it at something much bigger: [Twenty](https://github.com/twentyhq/twenty), an open-source CRM whose front-end is around 15,000 modules and leans on the *whole* hard surface at once, zero-runtime CSS-in-JS via `@wyw-in-js`, a Linaria/SWC macro pipeline, `vite-plugin-svgr`, and a pile of CommonJS and UMD dependencies. Getting it to boot and render took another stack of compatibility fixes (CommonJS named-export interop, `browser`-field stubs, the wyw resolver), and it does run now. But here the numbers flip, and it is worth being honest about why:

| | cold start | warm start | memory |
|---|---|---|---|
| **oj** | ~16.6s | ~16.0s | **1.4 GB** |
| Vite | **~11.5s** | **~10.3s** | 4.9 GB |

oj is about 1.4x slower to first paint here, on roughly a third of the memory. The cause isn't compilation speed: Twenty's first screen pulls close to its entire graph, around 15,000 module requests, and about 9,800 of those are individual files from dependencies that Vite pre-bundles into a handful of files and oj currently serves one by one. It's a request-count gap.

Closing it is what oj's (experimental, flag-gated) partial bundling does: it collapses a dependency's files into a single request. On a clean React app (router, `date-fns`, `lodash-es`) that turns **962 dependency requests into 18**, with the app rendering identically. That's nearly free on localhost but decisive over a network, where every request pays a round-trip, exactly the shape of a remote or sandboxed dev server. Same app, time-to-first-render through a latency proxy:

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

![The oj repository on GitHub](/assets/images/posts/oj-github-repo.png)

*(That screenshot is already out of date. The repo has picked up real contributors since)*

So who knows what lies ahead.

## The cache, and the one place it fought back

The biggest of those wins is the persistent cache. oj compiles every module to its final served form, keys that output by a hash of the source, and writes it to a small on-disk store. A warm restart then re-serves compiled modules straight from disk instead of recompiling them, which is most of the difference between a cold boot and a warm one. Vite, for comparison, keeps no cross-restart cache for your app's own source: it re-transforms every module, lazily, on each start. Persisting that work is where a lot of oj's warm-start speed comes from. It is on by default and you can turn it off with `oj dev --no-cache` (or `OJ_NO_CACHE=1`) when you want every start to recompile from scratch.

Persisting it also turned out to be where correctness gets subtle, and a real app taught me the lesson. Some Vite plugins do not just transform a file, they also stash state in memory as a side effect. The clearest case is zero-runtime CSS-in-JS: [wyw-in-js](https://wyw-in-js.dev/) (the engine behind Linaria) reads each component's `styled` blocks, extracts the CSS, keeps it in an in-memory map, and appends an `import` of a virtual `.wyw-in-js.css` file that its own `load` hook serves back out of that map. Cache the transformed code and nothing else, and a warm restart is a trap: the code still imports the virtual stylesheet, but the plugin's map is empty because the transform never re-ran, so every one of those imports 404s and the app quietly fails to mount.

The fix is to notice exactly those modules and no others. On a warm hit, oj checks whether the cached module imports a path that no longer exists on disk, which is the signature of a plugin-served virtual, and if so it re-runs that module's transform to repopulate the plugin's state before serving. Everything else, the vast majority, still comes straight from the cache. It is the smallest correct thing: keep the fast path wherever the cached output is self-contained, and pay for a re-transform only where a plugin's memory is part of the answer.

## Try it

oj is [open source](https://github.com/raphamorim/oj) and MIT licensed, on crates.io now.

```
cargo install oj --locked
cd your-vite-app
oj dev
```

If it doesn't run your app unchanged, that's a bug I want to hear about: open an issue with your `vite.config.ts` and I'll chase it. That's the whole promise.
