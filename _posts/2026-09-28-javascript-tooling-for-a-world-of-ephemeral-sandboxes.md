---
layout: post
title: "JavaScript tooling for a world of ephemeral sandboxes"
language: 'en'
draft: true
date: 2026-09-28
description: "Every worktree, CI job and sandbox rebuilds work that is content-identical to a build that already happened somewhere else. This is my vision for fixing that: a Nix-style content-addressed store, rebuilt at module granularity, beside the bundler instead of around it."
---

I think the JavaScript ecosystem is about to hit a wall that has nothing to do with how fast our compilers are. We made transforms fast (Rust everywhere, thanks peeps). What we didn't make is *shareable*: every worktree, every CI job, every ephemeral sandbox re-does the same work on another machine.

- Self note: It has been 6y ago that I left JavaScript to Rust, and somehow ended up working with it again because of sandboxes for web applications. I think it's safe to assume you can't run away from it ha!

This post is the design of something I wanted to exist: Nix's ideas, rebuilt at module granularity, living next to the bundler instead of wrapping it. It's where [oj](/introducing-oj/) is heading.

Originally I wrote oj because of agents running `vite build` over and over across git worktrees, each build carrying gigabytes, my machine flying because of memory swapping <img src="/assets/images/posts/gritito.gif" alt="aaaah" style="display:inline; width:22px; height:22px; padding:0; margin:0; vertical-align:text-bottom;" /> (I think I can't stress enough how annoyed I got when I saw it was accumlating more than 20gb).

It fixed the memory and the cold start. But there was a second thing in that scene that kept bothering me long after, and it took me a while to say it plainly: **The worktrees were building the same thing.** <img src="/assets/images/posts/gritito.gif" alt="aaaah" style="display:inline; width:22px; height:22px; padding:0; margin:0; vertical-align:text-bottom;" />

In case you never did agentic work (which is totally fair, I barely did until this year) you probably never used a worktree. Think of a worktree as a physical copy of your repository that shares the same git history, so you can work in it without juggling branches or stashing changes.

An agent opens worktree B to try a change. **Worktree B is 99% identical to worktree A, which finished building two minutes ago. Every module the agent didn't touch, which is nearly all of them, gets parsed, transformed, and linked again from zero**.

Multiply that by every worktree on my machine, then by every CI job on a branch, then by every preview sandbox my day job at [Lovable](https://lovable.dev) spins up, thousands of them, mostly from the same scaffold, and you get an absurd number: the fleet spends almost all of its build compute producing bytes that already exist.

The only input that changed between those builds is the absolute path.

## Nix already solved this. And can't help us.

There is a tool whose entire reason to exist is "build once, substitute everywhere": Nix. Hash all the inputs, build in a sandbox, put the result in an immutable store, and let anyone who shares your cache download instead of build. It's the right dream. I went deep on why it doesn't work for bundlers, and the reasons are mechanical, not cultural[^nix]:

- A derivation reruns *whole* when any input changes. One edited file rebuilds the app; there's no early cutoff even for byte-identical output.
- Nix wants the complete dependency graph before the build starts. A bundler *discovers* its graph during the build, import by import, plugin virtual by plugin virtual. The Nix feature that would fix this (dynamic derivations, RFC 92) has been experimental for years, and depends on the content-addressed derivation machinery that Lix just deleted from its codebase as unmaintainable.
- Per-derivation sandbox overhead is fine at 200 packages and fatal at 100,000 modules.
- `/nix/store` absolute paths are hostile to everything JavaScript resolution believes in.

The whole Nix-JavaScript ecosystem (node2nix, dream2nix, Canva's js2nix, `buildNpmPackage`) spends its entire innovation budget making `node_modules` reproducible, this is a common pattern I have seen in many projects with same philosophy. 

er-module caching of the *bundle step* has never even been attempted. The closest things that exist are in other languages: Obsidian's [sandstone](https://github.com/obsidiansystems/sandstone) does per-module GHC builds shared through a binary cache, and [nix-ninja](https://github.com/pdtpartners/nix-ninja) does per-compilation-unit C++. Both land on the same conclusion I did: let the language tool stay the planner, and give it a store.

So the answer isn't "put the bundler inside Nix." It's steal what Nix got right (the immutable content-addressed store, substituters anyone can serve and clients verify, keys computed from *resolved* inputs) and implement it beside the bundler, at the granularity bundlers actually work at: the module.

## What Evan Wallace knew

Here is where it gets interesting, because the best argument *against* this design was written by someone I respect a lot. esbuild's README says "extreme speed without needing a cache," and when people asked for a persistent cache, Evan Wallace explained why it will not happen under esbuild's current API[^evan]:

> "Plugins are also something that esbuild doesn't have enough information to cache correctly in a persistent fashion … all esbuild's API gets is a JavaScript function object. There is also the problem of any dependency being able to open any file at any time and include it in the build. One way for esbuild to automatically implement caching correctly would be for esbuild to be the JavaScript runtime that plugins run in … so it can intercept all file system operations (including the loading of code), as well as all other sources of non-determinism. But that would be a very different, invasive API change."

He's right. Plugins are opaque effectful functions. A cache that doesn't see what they touch is a cache that lies to you eventually. Vite closed three transform-cache PRs on exactly this rock[^vite-prs], and every webpack-family filesystem cache pushes the problem onto the user as `buildDependencies` config you will get wrong once and remember forever.

But read the quote again, slowly. *"For esbuild to be the JavaScript runtime that plugins run in… so it can intercept all file system operations."* That invasive change esbuild can't make?

**oj already is that runtime.** Since [0.2.0](https://x.com/raphamorims/status/2100970250460114994), Vite plugins don't even get their own process: JavaScript workloads run in-process on [Deno](https://deno.land) isolates oj embeds, no more JS sidecars (on one internal app that took 6 processes down to 2 and 4.1 GB down to 1.5). V8 lives inside oj's binary, executing code oj resolves and loads, and every filesystem call a plugin makes crosses an ops boundary oj compiles. "Intercept all file system operations" stops being an invasive API change and becomes bookkeeping: record every file a `load` or `transform` hook reads into the entry's trace. And because oj owns the compiler too, it can make cached artifacts path-free at the source instead of scrubbing them after.

That asymmetry is the whole reason I believe this design belongs in oj and not in a wrapper around any existing tool.

## The proof it can work is ten years old

Meta has been running a content-addressed, machine-shared, per-module transform cache in production for years. It's called Metro, and its caching doc describes the exact deployment I want for sandboxes: CI populates an HTTP store, thousands of engineers read from it, and the store itself is dumb: `GET`/`PUT` of compressed blobs by hash[^metro].

Metro gets away with it because of choices that sound boring and are everything: keys are content hashes (never mtimes) over project-*relative* POSIX paths (never absolute), the options are serialized in, and, my favorite, the hash includes *the transformer's own source code*, so upgrading the toolchain invalidates everything it should. Nothing machine-specific ever enters a key, so worktree A and worktree B produce the same key by construction. And when something misses, one module re-transforms. Not a graph. Not a `rm -rf .parcel-cache`.

Metro caches one hop (the transform). The vision below is Metro's discipline applied to the whole pipeline, plus the piece Metro punts on (plugins declare their own cache keys, which is how you get silently poisoned) replaced with tracing.

## The design: a store, a key, a trace

I'm calling the whole thing what it is: **the oj store**. Same naming convention as the Nix store and pnpm's store, and the word is doing work: a *cache* is an evictable accelerator you can lose; a *store* is the durable place builds are restored from. Three pieces, all content-addressed, all boring on purpose[^theory]:

**1. A CAS.** Immutable blobs keyed by blake3. Transformed modules, sourcemaps, chunks, prebundled deps. Two worktrees, or two thousand sandboxes, holding the same file store it once.

**2. An action cache.** `key → outputs`, write-once. The key for transforming one module is a hash over: oj's version, the mode, the env defines, *the plugin chain* (package versions from the lockfile plus canonicalized options: Metro's trick, done for the plugin instead of trusting it), the resolver config, the lockfile epoch, the module's root-relative path, and its content hash. Nothing else. Notice what's absent: any absolute path, any timestamp, any machine identity.

**3. A trace.** For work whose inputs are discovered mid-flight, which is any work touching plugins or `import.meta.glob`, the entry also records what was *actually read*, with digests: files the plugin opened (seen by the fs interposition), resolutions used, glob listings. On a hit, oj re-verifies the trace against the local worktree (re-hash a handful of files, no JavaScript executed) before serving. This is ccache's "direct mode" manifest, generalized, and it's the principled version of the surgical virtual-module check I described in the oj post.

One invariant rules all of it, and it's Evan's, enforced structurally instead of hoped for: **a cache entry may depend on nothing that is not in its key or its trace.** Plugins that break it (read the network, inject `Date.now()`) get detected by sampled re-execution and demoted to uncached. One impure plugin should cost you *its* modules, not the cache.

And one rule with no exceptions, because it's the single most common way every bundler cache before this one died[^paths]: **no absolute path may appear in any key, trace, or cached artifact.** Files get canonical relative identities: `ws:src/App.tsx` inside the root, `pkg:react@19.1.0/index.js` for dependencies (which is what lets two *different apps* on the same React share cache entries), content hashes for everything else.

Here's what that buys a worktree, concretely. This is a warm boot of worktree B, which has never built anything, against a store populated by worktree A:

<div class="ojwt" aria-label="A grid of app modules booting in a fresh worktree. Today every module recompiles from scratch; with a shared content-addressed store only the edited modules re-transform and the rest materialize from cache.">
  <div class="ojwt__meta">
    <span class="ojwt__title">Worktree B's first boot</span>
    <span class="ojwt__sub">336 modules · store populated by worktree A</span>
  </div>
  <canvas class="ojwt__canvas" height="204" aria-hidden="true"></canvas>
  <div class="ojwt__legend">
    <span><i class="ojwt__kg"></i>compiled from scratch</span>
    <span><i class="ojwt__kc"></i>materialized from store</span>
    <span><i class="ojwt__kr"></i>re-transformed (edited)</span>
  </div>
  <div class="ojwt__ctl">
    <button class="ojwt__seg" data-m="today" type="button">today · rebuild everything</button>
    <button class="ojwt__seg ojwt__on" data-m="store" type="button">shared store · verify &amp; materialize</button>
    <label for="ojwt-k">edited files</label>
    <input id="ojwt-k" class="ojwt__k" type="range" min="0" max="40" value="3" step="1" />
    <output class="ojwt__ko">3</output>
  </div>
  <div class="ojwt__read">
    <span><b class="ojwt__t ojwt__vwarn">—</b><em>transforms run</em></span>
    <span><b class="ojwt__c ojwt__vacc">—</b><em>from store</em></span>
    <span><b class="ojwt__s ojwt__vwin">—</b><em>work skipped</em></span>
  </div>
  <noscript><p class="ojwt__fallback">Today a fresh worktree re-transforms all 336 modules. With a shared content-addressed store it re-transforms only the edited files (say 3) and materializes the other 333 after a cheap trace verification, skipping over 99% of the transform work.</p></noscript>
</div>
<style>
  .ojwt {
    --acc: #2a33d4; --warn: #c26a1b; --cmp: #b6b4ae; --ink: #1c1c1c; --mut: #6b6a66;
    --line: #e6e5e2; --bg: #ffffff; --win: #17876b;
    border: 1px solid var(--line); border-radius: 10px; background: var(--bg);
    padding: 16px 16px 12px; margin: 28px 0;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ojwt__meta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 10px; }
  .ojwt__title { font-weight: 600; font-size: 13.5px; color: var(--ink); }
  .ojwt__sub { font-size: 11px; color: var(--mut); }
  .ojwt__canvas { display: block; width: 100%; height: 204px; }
  .ojwt__legend { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 11px; color: var(--mut); margin-top: 8px; }
  .ojwt__legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: baseline; }
  .ojwt__kg { background: var(--cmp); } .ojwt__kc { background: var(--acc); } .ojwt__kr { background: var(--warn); }
  .ojwt__ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--line); font-size: 12px; }
  .ojwt__seg { font: inherit; font-size: 11.5px; cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--mut); padding: 4px 9px; border-radius: 7px; }
  .ojwt__seg:hover { border-color: var(--acc); color: var(--ink); }
  .ojwt__seg:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
  .ojwt__on { background: var(--acc); border-color: var(--acc); color: #fff; }
  .ojwt__on:hover { color: #fff; }
  .ojwt__ctl label { color: var(--mut); margin-left: auto; }
  .ojwt__k { flex: 0 1 130px; min-width: 80px; accent-color: var(--acc); }
  .ojwt__ko { color: var(--ink); font-weight: 500; min-width: 2em; }
  .ojwt__read { display: flex; flex-wrap: wrap; gap: 14px 26px; margin-top: 12px; }
  .ojwt__read span { display: flex; flex-direction: column-reverse; }
  .ojwt__read b { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .ojwt__read em { font-style: normal; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
  .ojwt__vacc { color: var(--acc); } .ojwt__vwarn { color: var(--warn); } .ojwt__vwin { color: var(--win); }
  .ojwt__fallback { font-size: 12px; color: var(--mut); }
</style>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    while (root && !(root.classList && root.classList.contains("ojwt"))) root = root.previousElementSibling;
    if (!root) return;
    var cv = root.querySelector(".ojwt__canvas");
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var kEl = root.querySelector(".ojwt__k"), kO = root.querySelector(".ojwt__ko");
    var tV = root.querySelector(".ojwt__t"), cV = root.querySelector(".ojwt__c"), sV = root.querySelector(".ojwt__s");

    var COLS = 24, ROWS = 14, N = COLS * ROWS;
    // stable pseudo-random order of module indices; the first K count as "edited"
    var order = (function () {
      var a = [], i, j, t, s = 1337;
      for (i = 0; i < N; i++) a[i] = i;
      for (i = N - 1; i > 0; i--) {
        s = (s * 48271) % 2147483647;
        j = s % (i + 1); t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    })();
    var mode = "store", sweep = 0, raf = 0, start = 0;

    function tone(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
    function editedSet() {
      var k = +kEl.value, s = new Set();
      for (var i = 0; i < k; i++) s.add(order[i]);
      return s;
    }
    var edited = editedSet();

    var w = 0, h = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width || 600; h = 204;
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = tone("--mut");
      var head = mode === "today"
        ? "fresh worktree — every module transformed again, from zero"
        : "fresh worktree — verify traces, materialize from store, transform only edits";
      ctx.fillText(head, 0, 12);
      var top = 22, pad = 2;
      var cell = Math.min((w - (COLS - 1) * pad) / COLS, (h - top - (ROWS - 1) * pad) / ROWS);
      var gx = (w - (COLS * cell + (COLS - 1) * pad)) / 2;
      for (var i = 0; i < N; i++) {
        var c = i % COLS, r = Math.floor(i / COLS);
        var revealed = sweep >= c;
        var col;
        if (!revealed) col = tone("--line");
        else if (mode === "today") col = tone("--cmp");
        else col = edited.has(i) ? tone("--warn") : tone("--acc");
        var x = gx + c * (cell + pad), y = top + r * (cell + pad);
        ctx.fillStyle = col;
        ctx.globalAlpha = revealed && mode === "store" && !edited.has(i) ? 0.9 : revealed ? 1 : 0.5;
        roundRect(x, y, cell, cell, Math.min(2.5, cell / 4));
      }
      ctx.globalAlpha = 1;
    }
    function readout() {
      var k = mode === "today" ? N : edited.size;
      var fromStore = mode === "today" ? 0 : N - edited.size;
      tV.textContent = k;
      cV.textContent = fromStore;
      sV.textContent = mode === "today" ? "0%" : Math.round((fromStore / N) * 100) + "%";
    }
    function anim(now) {
      var t = now - start;
      // the sweep speed is the metaphor: a full rebuild crawls, materializing flies
      var total = mode === "today" ? 2600 : 620;
      sweep = reduce ? COLS : Math.min(COLS, (t / total) * COLS);
      draw();
      if (sweep < COLS) raf = requestAnimationFrame(anim); else raf = 0;
    }
    function run() {
      edited = editedSet();
      readout();
      if (raf) cancelAnimationFrame(raf);
      start = performance.now(); sweep = 0; raf = requestAnimationFrame(anim);
    }
    function setMode(m) {
      mode = m;
      root.querySelectorAll(".ojwt__seg").forEach(function (b) { b.classList.toggle("ojwt__on", b.getAttribute("data-m") === m); });
      run();
    }
    root.querySelectorAll(".ojwt__seg").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-m")); });
    });
    kEl.addEventListener("input", function () { kO.textContent = kEl.value; run(); });
    window.addEventListener("resize", function () { size(); draw(); });
    size(); kO.textContent = kEl.value; readout(); sweep = COLS; draw();
  })();
</script>

The sweep speed in that graphic is the point: worktree B doesn't *build*, it *checks*. Re-hash the files a trace names, confirm the digests, write the outputs into place. No JavaScript runs for the 333 modules you didn't touch. And there's a bonus the diagram undersells: because the key for a chunk is computed over its members' *output* digests, editing a comment re-transforms one module, produces the identical output digest, and everything downstream stays green. Nix never gave you that cutoff; content addressing gives it for free.

On one machine, that's the whole worktree problem dissolved by a global store directory: no server, no network, nothing to deploy.

I wanted to feel that, not just design it, so I tried the silly version: fifty worktrees, fifty dev servers, one laptop. The arithmetic below uses numbers I've already published, so you can check me. Under Vite, an Excalidraw-class app holds about 2.4 GB of memory per dev server; fifty of those wants ~120 GB, which is not a fleet, it's the machine-flying swap storm from the top of this post multiplied by fifty. The same app under oj holds ~288 MB, so fifty servers is ~14 GB: silly, but it runs.

Memory is the part oj already fixed per-process, though. What the store changes is everything that used to be *per worktree*. Fifty worktrees used to mean fifty compiles of the same graph and fifty copies of the cache; with the store, worktree one compiles and the other forty-nine verify and materialize, zero transforms (that is literally the receipt oj's cross-worktree test prints, not a projection). And the cache is one directory instead of fifty: oj's own docs site carries a 22 MB build cache per checkout, so fifty worktrees share 22 MB instead of copying 1.1 GB. The shape of it: memory scales with the servers you actually run, compute scales with the edits you actually make, and the cache doesn't scale at all.

## Who decides the granularity?

A colleague asked me the right hard question about this: in Bazel, granularity is a choice you make. You can be lazy and have one top-level BUILD file, and every edit rebuilds everything; or you write BUILD files per package and Bazel can be precise. Nothing here is declarative, so who picks the units?

The answer is that the granularity isn't decided, it's inherited. Bazel needs BUILD files because to Bazel every action is an opaque subprocess, so a human has to partition the graph and declare each partition's inputs, and humans pick that partition badly all the time. A bundler doesn't have that freedom or that burden: ESM already partitioned the app. The module is the unit the language gives you. It's the unit the resolver discovers, the unit HMR invalidates, the unit a transform is a pure function of. oj doesn't pick a granularity per app; it inherits the one the import graph defines.

The actual rule underneath is about observability, not size: **cache at the largest step whose inputs you can enumerate soundly.** Because oj is the runtime, a module transform's inputs are observable (source hash, config digests, every file a plugin hook reads, traced at the fs layer), so app code caches at module grain. Where oj can't see inside a step, which today means rolldown running as native code, the unit grows until its inputs become enumerable again: the whole input closure, keyed like a Bazel action with everything declared. Fine grain where we can trace, coarse grain where the step is opaque. Dependency prebundles sit in between, keyed per lockfile subtree, because that's their real invalidation boundary (and it's what lets two different apps share them).

And the grains compose instead of competing, because the coarse keys are computed over the fine units' *output* digests, not over sources. The chunk and closure layers are merkle nodes over the module layer. That's why the one-top-level-BUILD-file failure mode can't happen here: the coarse units were never independently declared, so an edit that doesn't change a module's output can't invalidate anything above it.

There's a second reason Bazel-style fine grain never worked for JavaScript, and it isn't the opacity: per-unit overhead. A Bazel action costs a process spawn and sandbox setup, which is why per-file targets die at scale, and it's the same reason per-module Nix derivations die. In-process, the per-unit cost is a hash lookup. Owning the runtime doesn't just make inputs observable; it pushes the overhead floor down to where the language's natural unit becomes affordable.

So: not declarative, but not oj guessing either. Observed where we can trace, declared-and-verified where native code makes us blind (rolldown's own module graph output is its declaration, and we digest-check it at use time), and never trusted without a way to catch the lie. Nix and Bazel are declare-then-trust. This is observe-then-verify.

## But how far does a single BUILD file get you?

The same conversation had a second question worth answering in public: if the big win is incrementality, how far do you get with the dumb version, one generated BUILD file at the top of each project and a remote cache?

Genuinely far, for exactly one case. If the input closure is byte-identical (thousands of sandboxes booting the same scaffold, CI re-running an unchanged app), a coarse closure key hits and you skip the entire build. That's real, it's the cheapest layer to ship, and I'm not pretending otherwise: the design's coarse layer *is* that, a merkle key over the whole input closure mapping to a whole-output manifest. It ships first.

Where the dumb version stops:

1. **Coarse caching is a step function; fine caching degrades gracefully.** The coarse hit rate is the probability the closure is *exactly* identical, which drops to zero on the first edit, and every sandbox I care about exists to be edited. One changed file out of 18,000 pays the full build. With module grain, cost scales with the diff: 3 edits means 3 transforms and a relink. That's the precise statement of the advantage, and it's stronger than "incremental rebuild": **cost proportional to edit distance instead of app size.** A fleet where everyone edits 0.1% of their app gets roughly nothing from the coarse cache and roughly everything from the fine one.
2. **The dev loop has no artifact to cache.** A BUILD target caches a build's output tarball. A dev server isn't a tarball; it's a lazy, on-demand transform stream feeding HMR. There is nothing for a task-level cache to restore that makes `oj dev` boot warm. The module store is the only cache shape that *serves* dev, and dev is where sandbox time actually goes.
3. **No sharing across apps.** A closure key is all-or-nothing per project. Module and prebundle grain share across *different* apps: every scaffold on the same react version hits the same `pkg:` entries. For a fleet of near-identical-but-not-identical apps, that's most of the bytes.
4. **You still owe the hard work anyway.** For the coarse tarball to be correct you must enumerate the closure (source, the config's import graph, the lockfile, env: hermeticity by declaration, the thing JavaScript tooling is worst at), and for it to be usable it must be relocatable, or you're back to restoring another worktree's absolute paths. So the single-BUILD-file plan still requires the path-independence and input-fingerprinting work. At that point you've built everything except the one layer that helps after the first edit.
5. **And if the wrapper is literally Bazel**, every ephemeral sandbox now carries the Bazel server, its memory and its analysis phase just to compute a hash and ask a cache. Analysis can cost more than the build it's trying to skip. A closure hash and one HEAD request do the same job with none of the machinery.

So the honest scorecard: the coarse layer captures the "nothing changed" case and should exist. The fine layer is what makes the other 100% of sessions, the ones where someone actually works, cost what they changed instead of what they own.

## The distributed part

But the reason I call this a vision for *distributed* systems is what happens when the store grows a wire. The protocol I want is deliberately tiny. Six endpoints, shaped like Metro's store and Nix's substituters had a child:

```
GET  /v1/cas/{blake3}          → bytes (zstd, immutable, cache-forever)
HEAD /v1/cas/{blake3}
PUT  /v1/cas/{blake3}          → 201, or 409 if it exists
POST /v1/cas/missing           → which of these digests should I upload?
GET  /v1/ac/{namespace}/{key}  → outputs + trace, or 404
PUT  /v1/ac/{namespace}/{key}  → 201, or 409 (entries are write-once)
```

The boring shape is load-bearing. Write-once action-cache entries and separate read/write tokens aren't nice-to-haves: Nx published a 9.4-severity CVE this year (CREEP) showing that any shared build cache with first-write-wins and a single credential can be poisoned by anyone who can open a PR[^creep]. So: sandboxes and PR builds get read-only tokens, trusted builders write, entries are signed (Nix's model), and a poisoned or impure entry costs you one module, never the graph.

Now the fleet math. A sandbox platform bakes its scaffold once (one trusted builder runs the template and populates the store) and every sandbox spawned from it cold-starts by verifying and materializing. Dependencies are even better: their cache key is the lockfile subtree, not the app, so *every* app on the same React version shares one prebundle entry. Here's what that does to total transform compute as a fleet scales (projected from oj's current numbers, not a benchmark; the point is the shape, not the digits):

<div class="ojfl" aria-label="Total transform compute across a fleet of sandboxes: rebuilding in every sandbox versus baking a template once into a shared store and having each sandbox verify and materialize.">
  <div class="ojfl__meta">
    <span class="ojfl__title">Transform compute across the fleet</span>
    <span class="ojfl__sub">projected · scaffold app, ~18k modules · not a benchmark</span>
  </div>
  <canvas class="ojfl__canvas" height="150" aria-hidden="true"></canvas>
  <div class="ojfl__ctl">
    <label for="ojfl-n">sandboxes</label>
    <input id="ojfl-n" class="ojfl__n" type="range" min="1" max="2000" value="500" step="1" />
    <output class="ojfl__no">500</output>
  </div>
  <div class="ojfl__read">
    <span><b class="ojfl__a ojfl__vcmp">—</b><em>rebuild each</em></span>
    <span><b class="ojfl__b ojfl__vacc">—</b><em>bake once + verify</em></span>
    <span><b class="ojfl__x ojfl__vwin">—</b><em>compute saved</em></span>
  </div>
  <noscript><p class="ojfl__fallback">Per sandbox, transforming an 18k-module scaffold costs ~9s of CPU; verifying traces and materializing costs ~0.8s. Across 500 sandboxes: ~75 CPU-minutes of rebuilding versus ~9s of baking plus ~7 minutes of verification: roughly 10× less compute, and the gap grows linearly with the fleet.</p></noscript>
</div>
<style>
  .ojfl {
    --acc: #2a33d4; --cmp: #b6b4ae; --ink: #1c1c1c; --mut: #6b6a66;
    --line: #e6e5e2; --bg: #ffffff; --win: #17876b;
    border: 1px solid var(--line); border-radius: 10px; background: var(--bg);
    padding: 16px 16px 12px; margin: 28px 0;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ojfl__meta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 10px; }
  .ojfl__title { font-weight: 600; font-size: 13.5px; color: var(--ink); }
  .ojfl__sub { font-size: 11px; color: var(--mut); }
  .ojfl__canvas { display: block; width: 100%; height: 150px; }
  .ojfl__ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--line); font-size: 12.5px; }
  .ojfl__ctl label { color: var(--mut); }
  .ojfl__ctl input[type="range"] { flex: 1 1 45%; min-width: 0; accent-color: var(--acc); }
  .ojfl__no { color: var(--ink); font-weight: 500; min-width: 3.4em; }
  .ojfl__read { display: flex; flex-wrap: wrap; gap: 14px 26px; margin-top: 12px; }
  .ojfl__read span { display: flex; flex-direction: column-reverse; }
  .ojfl__read b { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .ojfl__read em { font-style: normal; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
  .ojfl__vacc { color: var(--acc); } .ojfl__vcmp { color: var(--cmp); } .ojfl__vwin { color: var(--win); }
  .ojfl__fallback { font-size: 12px; color: var(--mut); }
</style>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    while (root && !(root.classList && root.classList.contains("ojfl"))) root = root.previousElementSibling;
    if (!root) return;
    var cv = root.querySelector(".ojfl__canvas");
    var nEl = root.querySelector(".ojfl__n"), nO = root.querySelector(".ojfl__no");
    var aV = root.querySelector(".ojfl__a"), bV = root.querySelector(".ojfl__b"), xV = root.querySelector(".ojfl__x");
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- projected per-sandbox constants — edit to taste ---
    var BUILD_S = 9;      // CPU-seconds to transform the ~18k-module scaffold once
    var VERIFY_S = 0.8;   // CPU-seconds to verify traces + materialize from the store
    // -------------------------------------------------------

    function tone(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
    function dur(s) {
      if (s >= 3600) return (s / 3600).toFixed(1) + " CPU-h";
      if (s >= 60) return (s / 60).toFixed(s >= 600 ? 0 : 1) + " CPU-min";
      return s.toFixed(1) + " CPU-s";
    }

    var w = 0, h = 0, dpr = 1, shownN = 0, raf = 0;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width || 600; h = 150;
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function bar(y, label, sec, color, refSec) {
      var labelW = 62, x0 = labelW, maxW = w - labelW - 4;
      var frac = Math.min(1, sec / refSec);
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "middle";
      ctx.fillStyle = tone("--mut"); ctx.textAlign = "left"; ctx.fillText(label, 0, y + 11);
      ctx.fillStyle = tone("--line"); ctx.globalAlpha = 0.5; ctx.fillRect(x0, y, maxW, 22); ctx.globalAlpha = 1;
      ctx.fillStyle = color; ctx.fillRect(x0, y, Math.max(2, maxW * frac), 22);
      var t = dur(sec);
      ctx.font = "700 12px 'JetBrains Mono', monospace";
      var tw = ctx.measureText(t).width;
      var inside = maxW * frac > tw + 16;
      ctx.fillStyle = inside ? "#fff" : tone("--ink");
      ctx.fillText(t, inside ? x0 + maxW * frac - tw - 8 : x0 + maxW * frac + 8, y + 12);
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var refSec = 2000 * BUILD_S; // full scale = max fleet rebuilding
      var rebuild = shownN * BUILD_S;
      var baked = BUILD_S + shownN * VERIFY_S;
      ctx.font = "500 11px 'JetBrains Mono', monospace"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = tone("--mut"); ctx.textAlign = "left";
      ctx.fillText("total transform CPU across the fleet", 0, 12);
      bar(34, "rebuild", rebuild, tone("--cmp"), refSec);
      bar(70, "store", baked, tone("--acc"), refSec);
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
      var rebuild = n * BUILD_S, baked = BUILD_S + n * VERIFY_S;
      aV.textContent = dur(rebuild); bV.textContent = dur(baked);
      xV.textContent = (rebuild / baked).toFixed(1) + "×";
      if (!raf) raf = requestAnimationFrame(tick);
    }
    nEl.addEventListener("input", refresh);
    window.addEventListener("resize", function () { size(); draw(); });
    size(); shownN = +nEl.value; refresh(); draw();
  })();
</script>

The line I keep coming back to when I look at that chart: today, fleet build compute scales with the number of sandboxes. With a store, it scales with the number of *edits*. Those are different asymptotics, and everything else (the cost, the cold-start latency, the energy, honestly) follows from which one you're on.

And here's where I actually want to take this at Lovable: host the immutable hashes. Not per worktree, not per clone of a repo, not even per project: a platform-level store of content-addressed build outputs that every app reads from. Because dependency entries are keyed by `pkg:name@version` plus config, they aren't yours or mine, they're just *facts*: there is exactly one correct prebundle of react 18 under a given config, and once anyone has produced it, no app anywhere in the fleet should ever produce it again. For the kind of apps a platform like Lovable hosts, that's easily more than 80% of the bundled code coming for free, forever. A new project that uses react 18 doesn't bundle react; it looks up a hash and links against an artifact that has existed for months. That step goes from seconds to under a millisecond, and it never comes back.

## Why every previous attempt broke (and the rule that falls out)

I read a lot of postmortems for this. webpack's filesystem cache: "we store absolute paths in cache, so moving/copied doesn't work" (a maintainer, verbatim). Parcel 1 died on absolute paths too; Parcel 2 fixed the paths and then its monolithic request graph meant one wrong invalidation edge corrupted everything, which is why `rm -rf .parcel-cache` is folklore. Turborepo restores `next build` outputs verbatim, with another worktree's absolute path inside them. Turbopack has the most sophisticated incremental engine of all of them and its persisted cache is still a same-directory, restore-in-place artifact[^paths].

Every one of these is the same lesson wearing different clothes: caches designed as "the same directory, evolving over time" meet a worktree, which is a *discontinuous history at a different path*, and produce either misses or lies. Content-addressed lookup doesn't have a notion of history to violate. That's not an optimization; it's the property that makes the whole thing correct.

## Where this starts

I'm not announcing a product, I'm showing you where oj is pointed. The honest status: oj ships no persistent module cache today. The experimental one I wrote about in the oj post is gone; studying it is where most of this design came from. Its keys were per-app-directory, its artifacts had absolute paths baked in (sourcemaps, dev JSX filenames, rewritten import URLs), and its key didn't fingerprint the plugin chain, and hardening a design you already know is wrong is how you end up maintaining webpack's cache. The oj store described here is the replacement, and the build order is roughly: one global store with relative keys first (that alone makes worktrees on one machine share almost everything), then path-free artifacts and the strengthened key, then traces with the fs interposition in the plugin isolates, then the wire protocol. The surface I'm aiming for is one flag: `oj dev --store` while it hardens, on by default once it has earned it, `--no-store` forever.

If some of it sounds ambitious: it is, and I said the same about running Excalidraw and a 15k-module CRM unchanged. It's a stack of small, measurable changes, same as last time. And if you've operated a build cache at fleet scale and have scars to share, or you think a step here is wrong: [open an issue](https://github.com/raphamorim/oj/issues). Being told precisely why I'm wrong is the fastest way I learn.

The JavaScript ecosystem spent five years making single builds fast. I think the next five are about never doing the same build twice.

[^nix]: The mechanics: input-addressed derivations rerun whole on any input change ([jade's "The postmodern build system"](https://jade.fyi/blog/the-postmodern-build-system/) is the best writeup, including Lix removing CA derivations); [garnix on incremental CI](https://garnix.io/blog/incremental-builds/) on the granularity and sandbox-overhead problems; [RFC 92, dynamic derivations](https://github.com/NixOS/rfcs/blob/master/rfcs/0092-plan-dynamism.md) for why the static build plan is the core mismatch, and [fzakaria's early look](https://fzakaria.com/2025/03/10/an-early-look-at-nix-dynamic-derivations) for their current state.

[^evan]: Evan Wallace in [esbuild#3063, "Rebuild for CI / persistent cache"](https://github.com/evanw/esbuild/issues/3063#issuecomment-1509954737). The same comment makes a subtler point I'm not dodging: intercepting the filesystem isn't the whole job; a correct runtime must catch "all other sources of non-determinism" (his example: a plugin injecting the current date). That's what the sampled re-execution check is for: run a small percentage of cache hits anyway, compare digests, and demote any plugin that diverges to uncached.

[^vite-prs]: Vite's transform-cache attempts: [#1309](https://github.com/vitejs/vite/issues/1309) (closed not-planned), [#4120](https://github.com/vitejs/vite/pull/4120) and [#10671](https://github.com/vitejs/vite/pull/10671) (closed over invalidation-correctness doubts; the team was, reasonably, "unsure of the current caching invalidation logic being correct for all cases").

[^metro]: [Metro's Caching.md](https://github.com/facebook/metro/blob/main/docs/Caching.md) describes the store chain and the CI-populates/developers-read deployment: "This is how we use Metro to build React Native apps at Meta." The key composition is in [`getTransformCacheKey`](https://github.com/facebook/metro/blob/main/packages/metro/src/DeltaBundler/getTransformCacheKey.js) and [`Transformer.js`](https://github.com/facebook/metro/blob/main/packages/metro/src/DeltaBundler/Transformer.js); note `normalizePathSeparatorsToPosix(projectRelativePath)` and the content hashes of the transformer's own implementation files.

[^theory]: For the theory-inclined: in [Build Systems à la Carte](https://ndmitchell.com/downloads/paper-build_systems_a_la_carte_theory_and_practice-21_apr_2020.pdf) terms, a bundler is a suspending scheduler with monadic (discovered-during-build) dependencies, and the paper's named optimum for cloud-caching that combination is "Cloud Shake": suspending scheduler + constructive traces. The trace-verification scheme here is ccache's [direct mode](https://ccache.dev/manual/latest.html) manifest, generalized beyond `#include`.

[^creep]: [CVE-2025-36852 (CREEP)](https://nx.dev/blog/cve-2025-36852-critical-cache-poisoning-vulnerability-creep), which pushed Nx's self-hosted cache spec to mandate write-once entries (409 on conflict) and led them to deprecate their own shared-bucket plugins. Gradle's docs have quietly said "only CI pushes, developers pull" for years for the same reason.

[^paths]: webpack: [maintainers on why the cache can't move machines](https://github.com/orgs/webpack/discussions/13999) and [absolute paths in node_modules records](https://github.com/webpack/webpack/issues/13139). Parcel 1's path-keyed cache: [#2664](https://github.com/parcel-bundler/parcel/issues/2664); Parcel 2 made relocatability an explicit goal ([RC post](https://parceljs.org/blog/rc0/)) and the graph-fragility folklore lives in [#8502](https://github.com/parcel-bundler/parcel/discussions/8502). Turborepo restoring another worktree's absolute paths: [#3185](https://github.com/vercel/turborepo/issues/3185). Turbopack's persisted-cache staleness across restored builds: [next.js#87283](https://github.com/vercel/next.js/discussions/87283). Rspack is the first webpack-family bundler to ship an explicit [`portable: true`](https://rspack.rs/config/cache) cache option, which tells you how new this awareness is.
