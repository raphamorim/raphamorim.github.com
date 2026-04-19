---
layout: post
title: "Introducing Glyph Protocol for Terminals"
language: 'en'
description: "A protocol for terminals that allows applications to register custom vector glyphs and query whether a codepoint is renderable on the system — so you no longer need to install a 10MB font just to render a single icon."
---

There's one thing about terminals that has always bothered me: to get your favorite editor, prompt, or TUI to render nicely, you are almost always forced to install a patched font.

You know the drill. You open a fresh terminal, pull up your editor, and half of the UI is replaced by little rectangles — the infamous [tofu](https://fonts.google.com/knowledge/glossary/tofu). The fix is to go download a Nerd Font, or Powerline, or some other patched set, and switch your terminal font to it. A font that is often well above 10MB in size[^nerdfont-size]. All of that — just so you can render one icon, or maybe a handful of them.

<figure class="post-figure">
  <img src="/assets/images/posts/glyph-protocol-tofu.png" alt="A terminal prompt with several codepoints rendered as empty rectangles" />
  <figcaption>Examples of tofu — codepoints the system font has no glyph for.</figcaption>
</figure>

This is messed up. The bundle is huge, the workflow is clunky, and the application author has no way to ship the glyph they actually want. They can only hope the user has installed the right font, with the right version, mapping the right codepoints.

So I decided to do something about it.

### Glyph Protocol

Glyph Protocol is a terminal protocol that lets applications do two things:

1. **Register custom glyphs** with the terminal directly, at runtime. The application picks a codepoint in the Unicode Private Use Area (where Nerd Fonts, Powerline, and every other icon convention already live), ships the vector outline, and emits the codepoint when it wants the glyph rendered.
2. **Query the terminal** to ask whether a given codepoint is covered by a system font, by a registration in this session, by both, or by neither.

Instead of requiring every user to install a patched font so your TUI looks right, your application ships the glyph and re-uses a Nerd Font codepoint — or any PUA codepoint you like — to render it. If the user already has Nerd Fonts installed, a query lets you skip shipping your own glyph entirely; if they don't, you ship the outline and the icon shows up anyway.

<figure class="post-figure">
  <img src="/assets/images/posts/glyph-protocol-after.png" alt="The same terminal prompt rendering proper icons after the application registers glyphs via Glyph Protocol" />
  <figcaption>The terminal after loading the icons through Glyph Protocol — no font install required.</figcaption>
</figure>

### Why this matters

Fonts are a distribution problem disguised as a rendering problem.

The Nerd Font model works, but at a cost: users carry megabytes of glyphs they will never see, application authors are locked into a fixed set of codepoints in the Private Use Area, and any icon that is not in the font is simply not renderable. If you want to ship a new icon, you need the whole ecosystem to update.

Glyph Protocol flips this. The application ships the glyph. The terminal renders it. The user installs nothing.

It also means TUIs can be honest about what they need. Right now, an editor that uses a Nerd Font icon for "git branch" has no way of knowing if the user actually has a Nerd Font installed — it just draws the codepoint and hopes. With a query, the application can ask first and fall back gracefully when the answer is no.

### The shape of the protocol

**Transport.** The protocol uses [APC](https://en.wikipedia.org/wiki/C0_and_C1_control_codes#C1_controls) (Application Program Command) rather than OSC. APC is designed for exactly this case: application-defined commands that terminals which don't implement the protocol can safely ignore, without fighting over OSC's shared numeric namespace[^apc-vs-osc].

**Identifier.** Every Glyph Protocol message is prefixed with the codepoint `25a1` (U+25A1, [WHITE SQUARE](https://www.unicode.org/charts/PDF/U25A0.pdf)) — the character a terminal draws when it has no glyph for something, the canonical symbol of tofu. Terminals that don't recognize this prefix drop the message.

The framing looks like:

```
ESC _ 25a1 ; <verb> [ ; key=value ]* [ ; <payload> ] ESC \
```

Four verbs to start: `s` for support, `q` for query, `r` for register, and `c` for clear.

#### Support: what does the terminal implement?

Before registering anything, an application needs to know what the terminal supports — which payload formats it can rasterize, which protocol version it speaks. This is also the canonical way to detect Glyph Protocol at all: the verb takes no parameters and costs one round-trip.

Client sends:

```
ESC _ 25a1 ; s ESC \
```

Terminal replies:

```
ESC _ 25a1 ; s ; fmt=1 ESC \
```

`fmt` is a bitfield where each bit marks one supported payload format. The set grows over time; clients treat unknown bits as reserved and ignore them.

| Value | Format | Meaning |
|-------|--------|---------|
| `1`   | `glyf` | TrueType simple glyphs. Required in v1. |
| `2`   | `colr` | Reserved for layered colored outlines. Future. |
| ...   | ...    | Further bits reserved for future formats. |

Any reply at all confirms the terminal implements Glyph Protocol; if nothing arrives within a short timeout, it does not. A reply of `fmt=0` means the terminal speaks the protocol but advertises no formats — defined for completeness, not expected in practice. Clients that need `glyf` (v1's only defined payload) check that bit 0 is set before sending any `r` requests.

#### Query: who can render this codepoint?

An application wants to know if the current font — whether a system-installed font or a registration in this session — can render `U+E0A0` (a Powerline branch icon).

Client sends:

```
ESC _ 25a1 ; q ; cp=E0A0 ESC \
```

Terminal replies:

```
ESC _ 25a1 ; q ; cp=E0A0 ; status=1 ESC \
```

`status` is a decimal `u8` encoding a two-bit field — bit 0 means "a system font covers it," bit 1 means "a glossary registration covers it":

| Value | State | Meaning |
|-------|-------|---------|
| `0`   | `free`     | Nothing renders this codepoint. The cell will show tofu. |
| `1`   | `system`   | A system font covers it. |
| `2`   | `glossary` | A glossary registration in this session covers it. |
| `3`   | `both`     | Both cover it; the registration shadows the system font at render time. |

With this, a TUI can ask first and fall back gracefully — skip registering its own branch icon when the system already has one, register and emit a custom codepoint when it doesn't. Protocol detection itself is handled by the `s` verb above.

#### Register: ship your own glyph

An application wants to ship its own branch icon. It picks a PUA codepoint — here `U+E0A0`, the Powerline convention — and sends the `glyf` outline [(the same TrueType vector format fonts have used for forty years)](https://learn.microsoft.com/en-us/typography/opentype/spec/glyf) base64-encoded:

```
ESC _ 25a1 ; r ; cp=E0A0 ; upm=1000 ; <base64-glyf> ESC \
```

Parameters:

- `cp` — the target codepoint in hex. **Must be in one of the three Unicode Private Use Area ranges** (`U+E000`–`U+F8FF`, `U+F0000`–`U+FFFFD`, or `U+100000`–`U+10FFFD`). Anything else is rejected with `reason=out_of_namespace`. See "Why the terminal restricts to PUA" below.
- `fmt` — payload format. Optional; `glyf` is the only value defined in v1 and is the default, so most registrations can omit it entirely.
- `upm` — units per em, the coordinate space the outline is authored in. Optional; default `1000`.
- payload — base64-encoded `glyf` simple-glyph record.

The terminal acks:

```
ESC _ 25a1 ; r ; cp=E0A0 ; status=0 ESC \
```

From this point on, whenever the application emits `U+E0A0` its registered glyph renders at that cell. A second `r` on the same `cp` overwrites the first. On error (non-PUA codepoint, malformed payload, composite glyph, etc.) the reply carries `status=<nonzero>; reason=<code>`.

Why vector? Because a glyph is not a photograph. It has no fixed size: the same icon needs to render at 12px in a dense TUI and at 24px on a HiDPI display, and anything that bakes in a resolution is making that decision wrong on at least one of them. A raster glyph at 128px that looked crisp on your laptop will be blurry on the external monitor, and illegible at 9px in a status bar.

And why `glyf` specifically? Because every terminal that renders text already has a `glyf` rasterizer linked. [FreeType](https://freetype.org), [swash](https://github.com/dfrg/swash), [ttf-parser](https://github.com/RazrFalcon/ttf-parser), [fontdue](https://github.com/mooman219/fontdue), [allsorts](https://github.com/yeslogic/allsorts) — the renderer is already there, in every language terminals are written in. Adopting Glyph Protocol adds zero new dependencies on the terminal side. By contrast, adopting SVG would mean pulling in `resvg` or writing a new XML+path parser.

`glyf` is also small on the wire. A typical icon is 150–400 bytes of `glyf` data — 2–3× smaller than the equivalent SVG, base64 overhead included. For an application that registers fifty icons at startup, that is the difference between a 13KB and a 35KB burst of APC traffic. On a saturated tmux pipe or a mobile SSH link, you feel that.

**A quick primer on `glyf`.** If you have never opened the TrueType spec, here is the thirty-second version.

A `glyf` record stores a glyph as a set of closed contours. Each contour is a sequence of points, and every point carries a single bit of metadata: *on-curve* or *off-curve*. The rules for walking a contour are straightforward:

- Two on-curve points in a row → straight line between them.
- An off-curve point sitting between two on-curve points → quadratic Bézier, with the off-curve point as the control point.
- Two off-curve points in a row → there is an *implied* on-curve point at their midpoint. This is a compression trick: a chain of off-curve points encodes a smooth curve using roughly half the vertices of the explicit form.

Coordinates are integer grid positions in the EM square. At `upm=1000`, a point at `(500, 900)` sits at half-width, ninety percent of the way up. The wire format packs points tightly: a flag byte per point (with a repeat bit that compresses runs of identical flags), followed by delta-encoded x and y coordinates stored short (1 byte) when they fit in a signed byte and long (2 bytes) when they don't. A closed triangle fits in about thirty bytes. A thirty-point icon fits in about two hundred.

That is the entire format. The authoritative references are the [OpenType `glyf` spec (Microsoft)](https://learn.microsoft.com/en-us/typography/opentype/spec/glyf) and the [Apple TrueType Reference Manual, Chapter 6](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html) — both readable in an afternoon, both implemented correctly a hundred times over in existing libraries.

**The subset.** Glyph Protocol does not require terminals to implement the full `glyf` table. The spec defines a constrained subset:

- **Simple glyphs only.** No composite glyphs, no references to other glyphs, no font-level context.
- **Standard flag encoding** as defined by the OpenType spec (on-curve, off-curve, x-short, y-short, repeat).
- **No hinting instructions.** Everything interesting about hinting assumes a font-wide set of control values that does not apply here.
- **Coordinate space** defined by `upm` — defaults to 1000, can be overridden per registration. The terminal maps this space onto its cell at render time.

Simple glyphs are the subset of `glyf` that any `ttf-parser`-style library already reads in about three hundred lines. Composite glyphs and hinting are where TrueType gets thorny; both are excluded.

**Color behavior.** `glyf` outlines have no color. The terminal renders them in the current foreground color — which *is* the Nerd Font inheritance case, the primary use case for this protocol. Colored glyphs (status badges, multi-color logos) are deferred to v2, likely via a `fmt=colr` extension that layers multiple `glyf` outlines with per-layer colors, following the [COLRv0](https://learn.microsoft.com/en-us/typography/opentype/spec/colr) precedent.

**Scaling and cell metrics.** The `upm` value defines the glyph's coordinate space; the terminal maps that space onto its cell at render time. An icon authored at `upm=1000` will scale cleanly to an 8×16 cell and to a 32×64 cell. The application does not need to know the terminal's cell size, and never has to re-register on font size change.

**Authoring.** Most application authors will not hand-write `glyf` bytes. They will start from SVG (what their designer hands them, what every icon library ships) and convert it at build time. [`fonttools`](https://fonttools.readthedocs.io/) already does this via its `ttx`/`pens` interface, and I will ship a small `svg2glyf` helper alongside Rio's reference implementation so the conversion is a one-liner. Runtime registration is then as simple as loading the bytes and sending them.

**Lifetime and capacity.** Each terminal session carries a *glossary* of at most 256 simultaneous registrations, keyed by codepoint anywhere in the three PUA ranges. Registrations live for the duration of the session. If an application registers a 257th glyph, the terminal evicts the oldest registration in FIFO order — there is no "glossary full" error to handle. Applications that cannot tolerate silent eviction should query their codepoint before emitting.

#### A worked example: an icon in empty PUA

To make this concrete, here is the full pipeline for registering a stylised outline and rendering it. The codepoint in the example is `U+100000` — the first codepoint of Supplementary PUA-B, which no known font covers. That makes the demo unambiguous: what you see is the outline you shipped, nothing else.

We'll use [`fontTools`](https://fonttools.readthedocs.io/) as the SVG-to-`glyf` converter — the *de facto* Python toolkit for OpenType work.

```python
# register_icon.py
import base64, sys
from fontTools.pens.ttGlyphPen import TTGlyphPen

# Draw the outline in glyf coordinate space (upm=1000, Y-up).
pen = TTGlyphPen(None)
# ... pen commands ...
pen.closePath()

payload = base64.b64encode(pen.glyph().compile(None)).decode("ascii")

# Register at U+100000 — empty PUA, no system font claims it.
sys.stdout.write(f"\x1b_25a1;r;cp=100000;upm=1000;{payload}\x1b\\")
sys.stdout.flush()

# Emit the codepoint. The word "icon: " passes through unchanged;
# the final cell renders our outline.
sys.stdout.write(f"icon: {chr(0x100000)}\n")
```

The application doesn't need to read the reply before printing — it chose the codepoint, so it already knows what to emit. The `glyf` payload for a typical 20-point icon lands around 150 bytes; base64-encoded and wrapped in an APC, under 250 bytes on the wire.

For application authors who already have SVG assets, a helper like `svg2glyf` (shipping alongside Rio's reference implementation) collapses the whole thing to two lines:

```python
from glyph_protocol import register_from_svg
register_from_svg(cp=0x100000, svg_path="icon.svg")
print(f"icon: {chr(0x100000)}")
```

#### Clear: free a slot

Sometimes you want to undo a registration — when an editor exits and wants to return the terminal to its defaults, when a TUI swaps themes, or when you are debugging. The `c` verb handles this.

Clear a single slot:

```
ESC _ 25a1 ; c ; cp=E0A0 ESC \
```

Clear the entire glossary:

```
ESC _ 25a1 ; c ESC \
```

The terminal acks with `status=0` whether the slot was occupied or not — clearing an empty slot is not an error, it is a no-op. The `cp` parameter must be in one of the three PUA ranges; anything else returns `reason=out_of_namespace`.

#### What is intentionally not in v1

- **No non-PUA codepoints.** Registration is restricted to the three Unicode Private Use Area ranges — see "Why the terminal restricts to PUA" below.
- **No ligatures.** Registration applies to a single codepoint. Sequence-keyed substitution is out of scope for v1; programming ligatures like `->` → `⟶` are already handled by OpenType fonts and don't need to become an attack surface here.
- **No persistence across sessions.** Glyphs are shipped fresh on each run. This avoids turning the terminal into a font cache with eviction policies and upgrade paths.
- **No cross-application sharing.** Each terminal session owns its glossary. No IPC, no daemon.
- **No colored glyphs.** `glyf` outlines render in the current foreground color. Colored and multi-layer glyphs are deferred to a future `fmt=colr` extension.

Each of these can be added later if it turns out to be needed. None of them can be easily removed once added.

### Why the terminal restricts to PUA

The PUA restriction is not an API aesthetic. It is the property that makes the protocol safe to turn on by default.

Consider the alternative, where registration accepts any codepoint. A program could write to the terminal:

> Register this `o`-shaped glyph at codepoint `U+0061` (`a`).

Now every `a` the user sees on screen looks like `o`. `bad.com` reads as `bod.com`. The cell buffer still contains `bad.com` — so when the user copies and pastes, the bytes are honest — but what they *read* is a lie. Every program that writes to a terminal suddenly has a phishing primitive, and the effect persists across whatever runs next in that session. Running `cat sketchy.txt` from your shell could change how `git status` looks five minutes later.

Constraining `cp` to the three Unicode Private Use Areas — `U+E000`–`U+F8FF` (basic), `U+F0000`–`U+FFFFD` (supplementary A), `U+100000`–`U+10FFFD` (supplementary B) — makes the whole class of attack mechanically impossible. Users never type PUA codepoints. Existing text — filenames, URLs, commands, variable names, log lines — doesn't contain them. A program that registers a glyph can only affect how PUA codepoints render, and PUA codepoints only appear in text the same application (or another one opting into the same convention) has deliberately emitted. The user's `a` stays an `a`. Their URLs, paths, and shell output render exactly as their bytes say they should.

This is essentially the same trust model Nerd Fonts established by convention — custom glyphs live in a reserved range, never over real text. Glyph Protocol takes that convention and makes it load-bearing.

Two smaller properties round this out:

- **The cell buffer is authoritative.** Selection, copy, search, hyperlink detection, shell history, and anything else that extracts text MUST return the codepoint the application emitted, never the rendered glyph. An application cannot use this protocol to create a "what you see is not what you copy" trap.
- **Sessions are isolated.** Two tabs can independently register `U+E0A0` for different branch icons. One tab's registrations cannot affect another's rendering.

### Landing in Rio

Glyph Protocol is already available on [Rio terminal](https://github.com/raphamorim/rio)'s main branch and will ship in v0.3.12 — the first implementation. The full spec is published alongside the release, along with example code for registering glyphs and querying the terminal from your own applications.

For working examples, see [raphamorim/glyph-protocol-examples](https://github.com/raphamorim/glyph-protocol-examples) — it contains sample integrations for [Bubble Tea](https://github.com/charmbracelet/bubbletea), [Ratatui](https://github.com/ratatui/ratatui), and [Ink](https://github.com/vadimdemedes/ink).

That said, the protocol is still likely to see updates. Expect the shape of messages, the query responses, and some of the edge cases to change as more applications start using it and as other terminals weigh in. If you build against it now, treat it as a moving target and pin the version you are implementing.

My hope is that other terminal emulators will adopt it. The win for the ecosystem is big, and the implementation surface is intentionally small.

More soon.

--

We spend enormous effort making terminal applications feel good to use, and then gate the entire experience behind a font installation step that is effectively invisible documentation. A beautiful TUI with broken glyphs is not a beautiful TUI.

A terminal is supposed to be a canvas. If the canvas cannot render what the application asks it to, the canvas is incomplete.

[^nerdfont-size]: The Nerd Fonts v3.2.1 release ships most families at 6–12 MB per weight — JetBrainsMono Nerd Font Regular is around 7.8 MB, FiraCode Nerd Font Regular around 10.4 MB, and the "complete" symbol-only archive is roughly 60 MB across all variants.

[^apc-vs-osc]: OSC carries a single decimal integer as its command identifier, shared across every terminal on the planet. OSC 52 is xterm's clipboard extension; OSC 133 is shell-integration marks; OSC 1337 is iTerm2's extension surface; OSC 8 is hyperlinks. Adding a new protocol over OSC means reserving a free number in that global space and hoping no other terminal picks it for something else. APC has no such namespace — each application-defined command is self-identifying, and terminals that don't recognise the prefix drop the sequence cleanly.