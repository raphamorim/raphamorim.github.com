---
layout: post
title: "Adding color glyphs to Glyph Protocol"
language: 'en'
description: "Glyph Protocol shipped with a single payload format — monochrome OpenType `glyf` outlines rendered in the current foreground colour. This post covers adding two more: `colrv0` for layered flat-colour icons, and `colrv1` for full paint graphs with gradients — both by reusing OpenType COLR directly as the wire format."
image: assets/images/posts/glyph-protocol-color-banner.png
---

A few days after [introducing Glyph Protocol](/introducing-glyph-protocol-for-terminals/), the first serious feature request landed: colour.

The initial protocol only had one payload format, `fmt=glyf` — a single OpenType simple-glyph outline, rendered in the current foreground colour. Good enough for Nerd-Font-style monochrome icons, fine for a `` or a ``. But the whole class of modern iconography — a red heart, a green status dot, a multi-color brand logo — was out of reach. Applications that wanted colour would either have to ship a raster bitmap (killing the resolution-independence property that made vector attractive in the first place) or wait for a v2.

So this is v2.

### Two formats, not one

Colour glyphs exist in a well-travelled design space. OpenType already has it, in two flavours:

- **COLR v0** is the simple one: a base glyph references a list of layer glyphs and per-layer palette indices. Each layer is a flat colour. Layers composite front-to-back. No transforms, no gradients, no blend modes. Powers most Windows 10 emoji and is about ten years old at this point.
- **COLR v1** is the ambitious one: a full paint graph. Nodes are linear, radial, and sweep gradients; affine transforms; composite modes; layer groups; references to other glyphs. Powers the [Google Noto emoji](https://fonts.google.com/noto/specimen/Noto+Color+Emoji+SVG) and Chrome's [COLRv1 implementation](https://developer.chrome.com/blog/colrv1-fonts).

<figure class="post-figure">
  <img src="/assets/images/posts/glyph-protocol-color-formats.png" alt="Rio terminal running the same Glyph Protocol example three times: first via a Rust ratatui binary, then a Go bubbletea program, then a Node ink CLI. Each prints identical colrv1 titles, fruit emoji, colrv0 titles, face/animal emoji, and monochrome glyf icons — demonstrating consistent rendering across the three TUI frameworks." />
  <figcaption>The same payload rendered three times — from <a href="https://ratatui.rs/">ratatui</a> (Rust), <a href="https://github.com/charmbracelet/bubbletea">bubbletea</a> (Go), and <a href="https://github.com/vadimdemedes/ink">ink</a> (Node). The protocol is language- and framework-agnostic; once the terminal accepts the registration, every TUI on top of it renders the same glyph.</figcaption>
</figure>

The natural question: should Glyph Protocol add both, or just one?

Both. They don't compete — they're tiered. A terminal that only implements the simple case gets a useful subset of colour. A terminal that goes all-in gets Apple-quality emoji. Applications advertise the format they're shipping and the terminal advertises what it supports via the `s` verb's `fmt` bitfield; the two negotiate without a round-trip per glyph.

### Reuse, don't reinvent

The obvious failure mode here would be to design a custom "Glyph Protocol colour format" — a bespoke TLV stream with layer records, gradient stops, and so on. I started writing one and stopped about a screen in.

The observation is the same one that motivated using `glyf` for monochrome in the first place: every terminal that renders OpenType already has a parser for this. [`ttf-parser`](https://github.com/RazrFalcon/ttf-parser)'s `colr::Table::parse(cpal, colr)` accepts a standalone COLR + CPAL blob with no surrounding font context required. [`skrifa`](https://github.com/googlefonts/fontations) (the parser behind Chrome's COLRv1 renderer) does the same. Both walk v0 and v1 through a shared `Painter`/`ColorPainter` callback trait. Adopting OpenType binary means the protocol gets a paint-graph parser and walker for free, in every mainstream language.

The only thing OpenType `COLR` can't do on its own is *stand alone*. A COLR table references glyph outlines by `GlyphId` in the font's `glyf` table — but our protocol ships one glyph at a time, not a full font. So Glyph Protocol wraps the COLR + CPAL tables in a tiny container that also carries the outlines each layer references:

```
u16     n_glyphs              # 1..=1024
repeat n_glyphs:
  u16   glyf_len
  glyf_len bytes              # simple-glyph, same subset as fmt=glyf
u16     colr_len              # OpenType COLR table (v0 or v1)
colr_len bytes
u16     cpal_len              # OpenType CPAL table (may be 0 for v1)
cpal_len bytes
```

`GlyphId` values in the COLR table index into the outline array. `paletteIndex` values in layer records index into the CPAL colour records. `paletteIndex = 0xFFFF` means "use the current foreground colour", per the OpenType spec. That's the whole contract — the rest is COLR's job.

The container adds roughly 250 bytes of overhead for the length fields. For a five-layer coloured icon that's a negligible fraction of the payload.

### Negotiating support

Remember the `s` (support) verb from the earlier post:

```
ESC _ 25a1 ; s ESC \
```

The terminal replies with a bitfield saying which payload formats it accepts:

| Value | Format | Meaning |
|-------|--------|---------|
| `1`   | `glyf` | Monochrome simple-glyph. Required in every conformant implementation. |
| `2`   | `colrv0` | Layered flat-colour (OpenType COLR v0). |
| `4`   | `colrv1` | Full paint graph (OpenType COLR v1). |

A terminal reporting `fmt=7` supports all three. A terminal reporting `fmt=3` accepts monochrome and layered flat-colour but will reject a `colrv1` registration — so the client either packages a `colrv0` alternative or falls back to a monochrome outline. A terminal reporting `fmt=1` is the monochrome-only baseline. No negotiation round trip per glyph; one `s` at startup tells the application everything it needs to know.

### Registering a colour glyph

Same `r` verb as before, but the `fmt` parameter selects the payload format:

```
ESC _ 25a1 ; r ; cp=E0A0 ; fmt=colrv0 ; upm=1000 ; <base64-container> ESC \
```

Everything else — the PUA restriction, the 1024-slot glossary, the FIFO eviction rule, the per-session isolation — is unchanged. One codepoint consumes one slot regardless of payload: a `fmt=colrv1` registration carrying 500 inner outlines still eats exactly one of the 1024 glossary slots. Colour glyphs are just another payload, not a second protocol.

### What's intentionally left out

- **No sfbx/sbix/CBDT bitmap tables.** Those are raster. Terminal cell sizes vary wildly (12 px in tmux on a laptop, 32 px on a HiDPI desktop) and a bitmap optimised for one size is wrong at the other. Every format Glyph Protocol accepts is vector.
- **No `SVG ` table.** COLRv1 covers the same expressiveness as SVG's paint primitives without pulling a second XML parser into every terminal. The one thing SVG-in-OpenType has that COLRv1 doesn't — raw SVG clipping masks — is a feature I'm willing to give up for a parser budget of zero additional bytes.
- **No animated glyphs.** A pulsing cursor is a fine idea; making it part of the terminal's font stack is not.

### Authoring colour payloads

Most applications will not hand-craft COLR tables. Two tools make the pipeline straightforward:

- **[`nanoemoji`](https://github.com/googlefonts/nanoemoji)** — Google's SVG → COLRv1 compiler, originally built for Noto emoji. Feed it a directory of SVGs, get a `.ttf` back. Slice the `COLR`, `CPAL`, and referenced `glyf` outlines out of that TTF with `fontTools`, pack them into Glyph Protocol's container, and register. A five-layer icon lands around 600–900 bytes on the wire, base64 overhead included.
- **[`fontTools`](https://fonttools.readthedocs.io/)** — for pulling COLR data out of existing colour fonts (Noto Color Emoji, Fluent Emoji, Twemoji-via-COLR). Useful for "I want Twemoji's red heart at U+F004 for the duration of this TUI session."

Rio's reference implementation ships `svg2colr`, a tiny wrapper around `nanoemoji` + `fontTools` that collapses the whole flow to `svg2colr icon.svg > payload.b64`.

### Status

The wire format, parser, registry storage, and support-bitfield advertisement are live on Rio's main branch and will ship in v0.3.12. The rasteriser's colour compositing path is the last piece — until it lands, colour registrations on Rio render as the first carried outline in the current foreground colour, which is ugly but honest. The protocol layer is fully in place, so applications writing against `fmt=colrv0` / `fmt=colrv1` today will see full colour output the moment the renderer catches up.

And if you're implementing Glyph Protocol in a different terminal, adding colour support now is mostly linker work: pull `ttf-parser` or `skrifa` in, implement a `Painter`/`ColorPainter` that composites into your existing glyph atlas, flip bits 1 and 2 of your `s` reply. The hard design work — wire format, security model, capacity bounds — is done.

--

The more general principle: a terminal protocol doesn't have to invent a new binary format to ship new features. Colour glyphs, emoji, icons — the graphics community worked through the hard questions a decade ago. We just ride the bus.
