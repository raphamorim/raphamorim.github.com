---
layout: post
title: "Introducing oj: a Rust build tool that speaks Vite"
language: 'en'
date: 2026-08-24
draft: true
description: "oj is a from-scratch, npm-free dev server and bundler written in Rust. It reads your existing vite.config, runs your existing Vite plugins, and reimplements React and TanStack Start natively, so you point it at a real app and it just runs, faster."
---

> Draft: v0.1.0 announcement. Numbers below come from oj's own benchmark suite; the "real apps" section still has a couple of TODOs to confirm before publishing.

Most of the time you don't think about your dev server. You run `npm run dev`, you wait, you get a URL. The waiting is the part I kept thinking about.

For the last few months I've been building **oj**: a dev server and bundler written in Rust that you can point at an existing Vite + React project and it just runs: the same `vite.config.ts`, the same plugins, no rewrite. Today it hits **0.1.0**, and I want to explain what it is, why it exists, and show you the numbers.

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

A benchmark on a toy app proves nothing. The bar I set for 0.1.0 was: take a real, popular open-source Vite app that I did not write, don't touch its config, and run it.

That is a genuinely hard bar, because real apps lean on the whole surface of Vite: regex `resolve.alias` for monorepo packages, source files outside the app root, TypeScript enums, `import.meta.env`, plugin virtual modules. Every one of those is a place a "Vite-compatible" tool can quietly fall short, and getting there is most of what the last stretch of work has been.

<!-- TODO(rapha): confirm + drop in the final result before publishing.
     Candidates being tested unmodified: Excalidraw (React SPA, ~130k stars) and
     a production TanStack Start app. State exactly what runs and the measured
     cold/warm numbers on that repo, or pull this section if it's not solid yet. -->

The point of oj was never "another bundler." It was: keep the ecosystem you already have (your config, your plugins, your framework) and make the loop underneath it disappear.

## How it got here

oj started as a project to fix my own problems. I was working on another repository and watching agents run `vite build` over and over, each build process carrying gigabytes of memory, and I got tired enough to try building the thing I wished I had. That's the whole origin: frustration, and free time.

At some point it started showing up in my day job at [Lovable](https://lovable.dev), quietly, behind a flag. People got excited. They started using it, filing issues, and sending patches. It's still an experimental research project (the README still says *use at your own risk*, and it means it), but it's no longer just mine.

The app it runs there is not a toy: a production TanStack Start build with a client graph around 18,000 modules and a `vite.config` that loads more than fifty plugins. That turned out to be the best stress test oj ever had. Getting it to boot that app in a couple of seconds instead of tens, on a fraction of the memory, didn't come from one clever trick; it came from a stack of small, individually-measured changes: persistent caches for the codegen, the client bundle, and the SSR loader; a single plugin host instead of two; loader hooks moved in-thread. Each is a modest win on its own, and they compound. All of it lives in the public repo.

![The oj repository on GitHub](/assets/images/posts/oj-github-repo.png)

*(That screenshot is already out of date. The repo has picked up real contributors since, like [William Rudenmalm](https://github.com/williamhogman) and [André Eriksson](https://github.com/aeriksson-lovable), whose recent work is a good chunk of the numbers above.)*

So who knows what lies ahead.

## Try it

oj is [open source](https://github.com/raphamorim/oj) and MIT licensed. 0.1.0 is out now.

```
cargo install oj --locked
cd your-vite-app
oj dev
```

If it doesn't run your app unchanged, that's a bug I want to hear about: open an issue with your `vite.config.ts` and I'll chase it. That's the whole promise.
