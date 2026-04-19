---
layout: post
title: "Adding color glyphs to Glyph Protocol"
language: 'en'
description: "Glyph Protocol shipped with a single payload format: monochrome OpenType `glyf` outlines rendered in the current foreground colour. This post covers adding two more: `colrv0` for layered flat-colour icons, and `colrv1` for full paint graphs with gradients, both by reusing OpenType COLR directly as the wire format."
image: assets/images/posts/glyph-protocol-color-banner.png
---

A few days after [introducing Glyph Protocol](/introducing-glyph-protocol-for-terminals/), the first serious feature landed: colour.

The initial protocol only had one payload format, `fmt=glyf`: a single OpenType simple-glyph outline, rendered in the current foreground colour. Good enough for Nerd-Font-style monochrome icons (e.g: `U+E0A0` git branch, `U+F015` home) or even symbols. But the whole class of modern iconography (a red heart, a green status dot, a multi-color brand logo) was out of reach.

### Two formats, not one

Colour glyphs exist in a well-travelled design space. OpenType already has it, in two ways:

- **`colrv0`** is the simple one: a base glyph references a list of layer glyphs and per-layer palette indices. Each layer is a flat colour. Layers composite front-to-back. No transforms, no gradients, no blend modes. Powers most Windows 10 emoji and is about ten years old at this point.
- **`colrv1`** is the ambitious one: a full paint graph. Nodes are linear, radial, and sweep gradients; affine transforms; composite modes; layer groups; references to other glyphs. Powers the [Google Noto emoji](https://fonts.google.com/noto/specimen/Noto+Color+Emoji+SVG) and Chrome's [`colrv1` implementation](https://developer.chrome.com/blog/colrv1-fonts).

<figure class="post-figure">
  <img src="/assets/images/posts/glyph-protocol-color-formats.png" alt="Rio terminal running the same Glyph Protocol example three times: first via a Rust ratatui binary, then a Go bubbletea program, then a Node ink CLI. Each prints identical colrv1 titles, fruit emoji, colrv0 titles, face/animal emoji, and monochrome glyf icons, demonstrating consistent rendering across the three TUI frameworks." />
  <figcaption>The same payload rendered three times: from <a href="https://ratatui.rs/">ratatui</a> (Rust), <a href="https://github.com/charmbracelet/bubbletea">bubbletea</a> (Go), and <a href="https://github.com/vadimdemedes/ink">ink</a> (Node). Once the terminal accepts the registration, every TUI on top of it renders the same glyph.</figcaption>
</figure>

The natural question: should Glyph Protocol add both, or just one?

Both. They don't compete; they're tiered. A terminal that only implements the simple case gets a useful subset of colour. A terminal that goes all-in gets Apple-quality emoji. Applications advertise the format they're shipping and the terminal advertises what it supports; the two negotiate without a round-trip per glyph.

### Reuse, don't reinvent

The observation is the same one that motivated using `glyf` for monochrome in the first place: every terminal that renders OpenType already has a parser for this.

For example: [`ttf-parser`](https://github.com/RazrFalcon/ttf-parser)'s `colr::Table::parse(cpal, colr)` accepts a standalone COLR + CPAL blob with no surrounding font context required. [`skrifa`](https://github.com/googlefonts/fontations) (the parser behind Chrome's `colrv1` renderer) does the same. Both walk `colrv0` and `colrv1` through a shared `Painter`/`ColorPainter` callback trait. Outside Rust the same job is one library call away: [HarfBuzz](https://harfbuzz.github.io/) walks `colrv0` and `colrv1` through `hb_paint_funcs_t` and is already linked into every Pango/GTK-based terminal; [FreeType](https://freetype.org/) handles both in C and is the default text-shaping dependency on basically every Linux distribution; [Skia](https://skia.org/) ships the `colrv1` renderer Chrome itself uses; [fontTools](https://fonttools.readthedocs.io/) covers Python; and Apple's [CoreText](https://developer.apple.com/documentation/coretext) and Microsoft's [DirectWrite](https://learn.microsoft.com/en-us/windows/win32/directwrite/direct-write-portal) handle it natively at the OS level. Adopting OpenType binary means the protocol gets a paint-graph parser and walker for free, in every mainstream language.

The catch: a COLR table is useless on its own. It only contains layer and colour references. The actual glyph outlines live in the font's `glyf` table, addressed by `GlyphId`. Our protocol ships one glyph at a time, not a full font, so Glyph Protocol wraps the COLR + CPAL tables in a tiny container that also carries the outlines each layer references:

```
u16     n_glyphs
repeat n_glyphs:
  u16   glyf_len
  glyf_len bytes              # simple-glyph, same subset as fmt=glyf
u16     colr_len              # OpenType COLR table (colrv0 or colrv1)
colr_len bytes
u16     cpal_len              # OpenType CPAL table (may be 0 for colrv1)
cpal_len bytes
```

`GlyphId` values in the COLR table index into the outline array. `paletteIndex` values in layer records index into the CPAL colour records. `paletteIndex = 0xFFFF` means "use the current foreground colour", per the OpenType spec. That's the whole contract. The rest is COLR's job.

The container adds 16 bytes of length-field overhead for a five-layer icon, plus ~70 bytes of fixed COLR + CPAL headers. Negligible compared to the outline data itself.

### Registering a colour glyph

Same `r` verb as before, but the `fmt` parameter selects the payload format:

```
ESC _ 25a1 ; r ; cp=E0A0 ; fmt=colrv0 ; upm=1000 ; <base64-container> ESC \
```

Everything else is unchanged. One codepoint consumes one slot regardless of payload: a `fmt=colrv1` registration carrying 500 inner outlines still eats exactly one slot.

### What's intentionally left out

- **No sfbx/sbix/CBDT bitmap tables.** Those are raster. Terminal cell sizes vary wildly (12 px in tmux on a laptop, 32 px on a HiDPI desktop) and a bitmap optimised for one size is wrong at the other. Every format Glyph Protocol accepts is vector.

### Future work

- **Finer-grained registration scope.** Optional flags to share a glyph across all PTYs at once (so a system-wide icon registry survives tmux splits and reattaches), or pin one as un-evictable for the life of the session. Both go beyond the current per-session, FIFO-eviction defaults.
- **Shared colour palettes.** Every `colrv0`/`colrv1` registration currently ships its own CPAL inline. A way to upload a palette once and let subsequent glyph registrations reference it by ID would save thousands of redundant bytes for emoji families (Twemoji, Noto, Fluent) where every glyph reuses the same ~50-entry palette.
- **Animation.** I'd like to explore [Lottie](https://lottiefiles.com/) as a future payload format for motion.

### Authoring colour payloads

Most applications will not hand-craft COLR tables. Two tools make the pipeline straightforward:

- **[`nanoemoji`](https://github.com/googlefonts/nanoemoji)**: Google's SVG → `colrv1` compiler, originally built for Noto emoji. Feed it a directory of SVGs, get a `.ttf` back. Slice the `COLR`, `CPAL`, and referenced `glyf` outlines out of that TTF with `fontTools`, pack them into Glyph Protocol's container, and register.
- **[`fontTools`](https://fonttools.readthedocs.io/)**: for pulling COLR data out of existing colour fonts (Noto Color Emoji, Fluent Emoji, Twemoji-via-COLR).

Other pipelines work too. Anything that can emit a COLR + CPAL pair and the underlying outlines can produce a valid payload.

### Status

The wire format, parser, registry storage, and support-bitfield advertisement will ship in v0.3.12.

And if you're implementing Glyph Protocol in a different terminal, adding colour support now is mostly linker work: pull `ttf-parser`, `skrifa`, or any COLR parser. Feel free to reach out if you are.

--

The more general principle: a terminal protocol doesn't have to invent a new binary format to ship new features. Colour glyphs, emoji, icons: the graphics community worked through the hard questions a decade ago. We just ride the bus.
