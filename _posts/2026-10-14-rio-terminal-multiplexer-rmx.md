---
layout: post
title: "Introducing rmx: Terminal Multiplexing at the Protocol Level"
language: 'en'
description: "A protocol that lets an application open real terminal buffers over one connection, so the terminal renders panes natively instead of a multiplexer parsing every byte twice and dropping whatever it cannot model."
draft: true
---

If you have ever watched someone's screen fill with little terminal panes and thought "I should learn tmux one day," this post is for you. I want to explain what a multiplexer really does under the hood, because once you see it, you also see why some things in your terminal are mysteriously broken. Then I will show you the protocol I am building to fix it.

No prior knowledge assumed. If you know what a terminal is and you have typed `ls`, you are qualified.

## First: what is a terminal, really?

A terminal emulator is a program that draws text. That's it. Rio, iTerm2, Ghostty, GNOME Terminal: they all do the same core job.

When you run `ls`, your shell writes some bytes to a thing called a **pseudoterminal** (pty for short). Think of a pty as a pipe with two ends: your shell writes into one end, and your terminal reads out of the other. Most of those bytes are plain text. But some of them are instructions, and those instructions are where all the interesting behavior lives.

The instructions are called **escape sequences**, and they look like garbage when you print them raw:

```
\033[1;32mbuild ok\033[0m
```

`\033` is the escape character. The terminal reads that and understands: *switch to bold green, print "build ok", then reset to normal.* That is how colors work. It is how your cursor moves, how the screen clears, how images get displayed. There is no separate control channel, no API. Everything the app wants the terminal to do is smuggled inside the same stream of bytes as the text.

Hold on to that idea, because it explains everything that follows.

## Now: what does tmux do?

You want two shells side by side in one window. Your terminal draws one grid of text. So how does tmux give you two?

It lies to everybody.

tmux sits in the middle. To your shell, tmux pretends to be a terminal: it hands the shell a pty, reads the bytes, and interprets all those escape sequences itself, keeping its own in-memory grid of characters for each pane. To your real terminal, tmux pretends to be an ordinary app: it takes its internal grids, composes them into one big picture (with the divider lines and the status bar), and re-emits *new* escape sequences describing that combined picture.

Here is the sequence, concretely, for a single colored word inside a pane:

1. Your program writes `\033[1;32mbuild ok\033[0m` to its pty.
2. tmux parses it and records: "row 3, columns 0-7, text 'build ok', bold, green" in its own grid.
3. tmux decides what your real screen should look like, and writes fresh escape sequences: move cursor here, set bold green, print these characters.
4. Your terminal parses *those* and finally draws pixels.

<figure class="post-figure">
<svg viewBox="0 0 700 300" role="img" aria-label="With tmux, one colored word is parsed into tmux's grid and re-emitted as new escape sequences before the terminal parses it again; with rmx the same bytes are parsed once, by the terminal." style="max-width: 100%; height: auto; color: currentColor;">
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
    <marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#d94f2b"/>
    </marker>
  </defs>

  <text x="0" y="14" font-size="12" font-weight="700" fill="currentColor">with tmux</text>

  <rect x="0" y="30" width="96" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="48" y="47" font-size="11" text-anchor="middle" fill="currentColor">your app</text>
  <text x="48" y="61" font-size="11" text-anchor="middle" fill="currentColor">writes bytes</text>

  <line x1="96" y1="50" x2="188" y2="50" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
  <text x="142" y="43" font-size="10" text-anchor="middle" fill="currentColor">1 parse</text>

  <rect x="190" y="30" width="120" height="40" rx="5" fill="none" stroke="#d94f2b" stroke-width="1.5"/>
  <text x="250" y="47" font-size="11" text-anchor="middle" fill="#d94f2b">tmux grid</text>
  <text x="250" y="61" font-size="11" text-anchor="middle" fill="#d94f2b">copy #1</text>

  <line x1="310" y1="50" x2="402" y2="50" stroke="#d94f2b" stroke-width="1.5" marker-end="url(#ar2)"/>
  <text x="356" y="43" font-size="10" text-anchor="middle" fill="#d94f2b">re-emits</text>
  <text x="356" y="66" font-size="10" text-anchor="middle" fill="#d94f2b">new escapes</text>

  <rect x="404" y="30" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="464" y="47" font-size="11" text-anchor="middle" fill="currentColor">terminal grid</text>
  <text x="464" y="61" font-size="11" text-anchor="middle" fill="currentColor">copy #2</text>

  <line x1="524" y1="50" x2="616" y2="50" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
  <text x="570" y="43" font-size="10" text-anchor="middle" fill="#d94f2b">2nd parse</text>

  <rect x="618" y="30" width="82" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="659" y="54" font-size="11" text-anchor="middle" fill="currentColor">pixels</text>

  <text x="0" y="122" font-size="11" fill="#d94f2b">anything tmux cannot model is dropped here</text>
  <line x1="250" y1="112" x2="250" y2="78" stroke="#d94f2b" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#ar2)"/>

  <line x1="0" y1="160" x2="700" y2="160" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>

  <text x="0" y="192" font-size="12" font-weight="700" fill="currentColor">with rmx</text>

  <rect x="0" y="208" width="96" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="48" y="225" font-size="11" text-anchor="middle" fill="currentColor">your app</text>
  <text x="48" y="239" font-size="11" text-anchor="middle" fill="currentColor">writes bytes</text>

  <line x1="96" y1="228" x2="402" y2="228" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
  <text x="249" y="221" font-size="10" text-anchor="middle" fill="currentColor">same bytes, tagged with a buffer name</text>
  <text x="249" y="244" font-size="10" text-anchor="middle" fill="currentColor">nothing parses them on the way</text>

  <rect x="404" y="208" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="464" y="225" font-size="11" text-anchor="middle" fill="currentColor">terminal grid</text>
  <text x="464" y="239" font-size="11" text-anchor="middle" fill="currentColor">only copy</text>

  <line x1="524" y1="228" x2="616" y2="228" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
  <text x="570" y="221" font-size="10" text-anchor="middle" fill="currentColor">1 parse</text>

  <rect x="618" y="208" width="82" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="659" y="232" font-size="11" text-anchor="middle" fill="currentColor">pixels</text>

  <text x="0" y="285" font-size="11" fill="currentColor">the pane is a real terminal, so images and new protocols survive</text>
</svg>
<figcaption>The same colored word, both ways. tmux parses it into its own grid and re-emits fresh escape sequences, so the terminal parses it a second time and anything tmux does not model is lost in between. With rmx the bytes are tagged with a buffer name and parsed once, by the terminal that draws them.</figcaption>
</figure>

It works. Millions of people use it every day. But look at that list again: **the same information got parsed twice, and stored twice.** tmux is a terminal emulator pretending to be attached to a terminal emulator.

## Why that costs you something real

This is the part I care about, because it is not just architectural purity. Three consequences fall out of that design, and you have probably hit all three without knowing why.

**Features go to tmux to die.** Suppose your terminal supports something new: displaying real images, or a better keyboard protocol that can finally tell apart `Ctrl+I` from Tab. For that feature to work inside tmux, *tmux itself* has to learn it. If tmux doesn't understand a sequence, it usually drops it, because it can't put something in its grid that its grid can't represent. This is why displaying an image inside tmux was broken for years, and why "does it work in tmux?" is a separate line item in every terminal feature discussion. Your fancy terminal gets reduced to whatever tmux knows about.

**It halves your throughput.** Every byte gets parsed twice and copied into a second grid. When you `cat` a huge log file, that overhead is not theoretical. (I have been optimizing this exact kind of work in Rio's engine lately, and the difference between one pass and two is enormous.)

**Copy and paste gets weird.** Those divider lines between panes? They are *characters in the grid*, as far as your terminal knows. Your terminal has no idea a "pane" exists. So when you select text with the mouse across the screen, you can end up selecting bits of two panes and a divider, because you are selecting from one flat grid of text that merely *looks* like separate windows.

That last one is the clearest tell that something is off. The panes are a picture of panes, not actual panes.

## The idea: tell the terminal about the panes

So here is the flip. What if the app could just *say*, in-band, in the same byte stream it already has: **"open a second buffer, and put this text in it"**, and the terminal created a real native pane for it?

Then there is no second grid. No double parsing. The terminal draws that pane with the same code it uses for everything else, which means images work, the keyboard protocol works, native scrollback works, mouse selection works, because the pane *is* a real terminal, not a drawing of one.

That is the protocol I am building. It is called **rmx** (Rio Multiplex Protocol), and the spec lives in the Rio repository.

## What it looks like

Remember that escape sequences are just bytes with a special introducer. rmx defines its own. Here is the whole idea in three lines you could type in a shell:

```sh
# Ask the terminal: do you speak rmx?
printf '\033_rmx;s\033\\'
# It answers with its version and capabilities:
#   \033_rmx;s;v=1;cap=core,raw;max=16;credit=262144\033\

# Open a buffer called "logs", split downward
printf '\033_rmx;o;k=logs;dir=down\033\\'

# Write into it (content is base64 encoded so it can't break the framing)
printf '\033_rmx;w;k=logs;%s\033\\' "$(printf 'hello from a real pane\r\n' | base64)"
```

Run those in a terminal that supports rmx, and a genuine second pane appears with your text in it. I have this working in Rio today. Colors, cursor movement, everything: because whatever you write into that buffer goes through a full terminal engine, exactly like your shell's output does.

Here is the whole protocol as one moving picture. Watch the bytes:

<figure class="post-figure rmxhero">
<svg viewBox="0 0 720 220" role="img" aria-label="One application writes a single pty byte stream; the terminal demultiplexes it into two rmx buffers rendered as native panes plus the primary stream, and input events travel back on the same pty.">
  <defs>
    <marker id="rmx-ha" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#2a33d4"/></marker>
    <marker id="rmx-ht" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#d94f2b"/></marker>
  </defs>

  <rect x="16" y="84" width="96" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="64" y="114" text-anchor="middle" font-size="13" fill="currentColor">app</text>

  <line x1="112" y1="110" x2="326" y2="110" stroke="#2a33d4" stroke-width="1.5" marker-end="url(#rmx-ha)"/>
  <line x1="326" y1="122" x2="118" y2="122" stroke="#d94f2b" stroke-width="1.5" marker-end="url(#rmx-ht)"/>
  <text x="222" y="96" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.6">one pty byte stream</text>
  <text x="222" y="140" text-anchor="middle" font-size="10" fill="#d94f2b">i events · a grants</text>

  <circle cx="336" cy="112" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>

  <line x1="342" y1="108" x2="386" y2="84" stroke="#2a33d4" stroke-width="1.2" opacity="0.55"/>
  <line x1="342" y1="110" x2="538" y2="84" stroke="#2a33d4" stroke-width="1.2" opacity="0.35"/>
  <line x1="342" y1="116" x2="386" y2="166" stroke="currentColor" stroke-width="1.2" opacity="0.35"/>

  <rect x="380" y="16" width="324" height="192" rx="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <line x1="380" y1="40" x2="704" y2="40" stroke="currentColor" opacity="0.4"/>
  <circle cx="396" cy="28" r="3.5" fill="currentColor" opacity="0.4"/>
  <circle cx="408" cy="28" r="3.5" fill="currentColor" opacity="0.4"/>
  <text x="694" y="32" text-anchor="end" font-size="10" fill="currentColor" opacity="0.55">Rio</text>

  <rect x="388" y="48" width="146" height="86" rx="5" fill="rgba(42,51,212,0.06)" stroke="#2a33d4" stroke-opacity="0.6"/>
  <text x="396" y="64" font-size="10.5" fill="#2a33d4">k=logs</text>
  <text x="396" y="80" font-size="9.5" fill="currentColor" opacity="0.55">full terminal</text>

  <rect x="540" y="48" width="156" height="86" rx="5" fill="rgba(42,51,212,0.06)" stroke="#2a33d4" stroke-opacity="0.35"/>
  <text x="548" y="64" font-size="10.5" fill="#2a33d4" opacity="0.8">k=repl</text>
  <text x="548" y="80" font-size="9.5" fill="currentColor" opacity="0.55">full terminal</text>

  <rect x="388" y="142" width="308" height="58" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="396" y="160" font-size="10.5" fill="currentColor" opacity="0.6">main: the primary stream</text>
  <text x="396" y="176" font-size="9.5" fill="currentColor" opacity="0.4">$ ▂</text>

  <circle class="dot" r="4" fill="#2a33d4" style="animation-name: rmx-to-logs; animation-duration: 3.4s;"/>
  <circle class="dot" r="4" fill="#2a33d4" opacity="0.75" style="animation-name: rmx-to-repl; animation-duration: 3.4s; animation-delay: 1.1s;"/>
  <circle class="dot" r="4" fill="#9a9a96" style="animation-name: rmx-to-main; animation-duration: 3.4s; animation-delay: 2.2s;"/>
  <circle class="dot" r="3.5" fill="#d94f2b" style="animation-name: rmx-to-app; animation-duration: 2.8s; animation-delay: 0.6s;"/>
  <circle class="dot" r="3.5" fill="#d94f2b" opacity="0.7" style="animation-name: rmx-to-app; animation-duration: 2.8s; animation-delay: 2.0s;"/>
</svg>
<figcaption>The whole protocol in one picture. rmx frames (blue) ride the ordinary pty stream; the terminal peels them off into per-buffer terminal instances, and everything outside a frame (grey) falls through to <code>main</code>. Input, replies and credit grants travel back on the same pty as <code>i</code> and <code>a</code> frames (rust). One pipe, no middleman.</figcaption>
</figure>
<style>
  .rmxhero svg { display: block; max-width: 640px; height: auto; margin: 0 auto; color: currentColor; }
  .rmxhero svg text { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .rmxhero .dot { animation-timing-function: linear; animation-iteration-count: infinite; animation-fill-mode: backwards; }
  @keyframes rmx-to-logs {
    0%   { transform: translate(112px, 110px); opacity: 0; }
    6%   { opacity: 1; }
    55%  { transform: translate(330px, 110px); }
    92%  { transform: translate(392px, 84px); opacity: 1; }
    100% { transform: translate(392px, 84px); opacity: 0; }
  }
  @keyframes rmx-to-repl {
    0%   { transform: translate(112px, 110px); opacity: 0; }
    6%   { opacity: 1; }
    55%  { transform: translate(330px, 110px); }
    92%  { transform: translate(544px, 84px); opacity: 1; }
    100% { transform: translate(544px, 84px); opacity: 0; }
  }
  @keyframes rmx-to-main {
    0%   { transform: translate(112px, 110px); opacity: 0; }
    6%   { opacity: 1; }
    55%  { transform: translate(330px, 110px); }
    92%  { transform: translate(392px, 166px); opacity: 1; }
    100% { transform: translate(392px, 166px); opacity: 0; }
  }
  @keyframes rmx-to-app {
    0%   { transform: translate(330px, 122px); opacity: 0; }
    8%   { opacity: 1; }
    92%  { transform: translate(112px, 122px); opacity: 1; }
    100% { transform: translate(112px, 122px); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rmxhero .dot { animation: none !important; display: none; }
  }
</style>

The `k=logs` part is the buffer's name, chosen by the app. That detail matters more than it looks, and I will come back to it.

## Walking through the protocol, piece by piece

Three lines of `printf` is the demo. The spec is longer, and I want to go through it in order, because almost every rule in it exists to prevent one specific failure. Rules are hard to remember; failures are easy. So for each piece: what it is, and what it is protecting you from.

Before the pieces, the whole: here is one buffer's life, start to finish. Every arrow below gets its own subsection.

<figure class="post-figure rmxseq">
<svg viewBox="0 0 720 566" role="img" aria-label="Sequence diagram of an rmx session: capability negotiation, opening a buffer, streaming writes and bursts, receiving a credit grant and input events, then closing with disposition scrollback.">
  <defs>
    <marker id="rmx-sa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#2a33d4"/></marker>
    <marker id="rmx-st" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#d94f2b"/></marker>
  </defs>

  <rect x="54" y="12" width="112" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="110" y="32" text-anchor="middle" font-size="12" fill="currentColor">application</text>
  <rect x="554" y="12" width="112" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="610" y="32" text-anchor="middle" font-size="12" fill="currentColor">terminal</text>
  <line x1="110" y1="42" x2="110" y2="554" stroke="currentColor" opacity="0.22" stroke-dasharray="3 4"/>
  <line x1="610" y1="42" x2="610" y2="554" stroke="currentColor" opacity="0.22" stroke-dasharray="3 4"/>

  <text x="14" y="80" font-size="9.5" fill="currentColor" opacity="0.45" letter-spacing="2">NEGOTIATE</text>
  <line x1="110" y1="102" x2="602" y2="102" stroke="#2a33d4" stroke-width="1.3" marker-end="url(#rmx-sa)"/>
  <text x="360" y="94" text-anchor="middle" font-size="11" fill="#2a33d4">s</text>
  <line x1="610" y1="134" x2="118" y2="134" stroke="#d94f2b" stroke-width="1.3" marker-end="url(#rmx-st)"/>
  <text x="360" y="126" text-anchor="middle" font-size="11" fill="#d94f2b">s v=1 cap=core,raw,layout,nest,scrollback max=16 credit=262144</text>

  <text x="14" y="176" font-size="9.5" fill="currentColor" opacity="0.45" letter-spacing="2">OPEN</text>
  <line x1="110" y1="198" x2="602" y2="198" stroke="#2a33d4" stroke-width="1.3" marker-end="url(#rmx-sa)"/>
  <text x="360" y="190" text-anchor="middle" font-size="11" fill="#2a33d4">o k=logs at=main dir=right weight=40</text>
  <line x1="610" y1="230" x2="118" y2="230" stroke="#d94f2b" stroke-width="1.3" marker-end="url(#rmx-st)"/>
  <text x="360" y="222" text-anchor="middle" font-size="11" fill="#d94f2b">o k=logs status=0 credit=262144</text>
  <line x1="610" y1="262" x2="118" y2="262" stroke="#d94f2b" stroke-width="1.3" marker-end="url(#rmx-st)"/>
  <text x="360" y="254" text-anchor="middle" font-size="11" fill="#d94f2b">i k=logs ev=resize cols=80 rows=12</text>

  <text x="14" y="304" font-size="9.5" fill="currentColor" opacity="0.45" letter-spacing="2">STREAM</text>
  <line x1="110" y1="326" x2="602" y2="326" stroke="#2a33d4" stroke-width="1.3" marker-end="url(#rmx-sa)"/>
  <text x="360" y="318" text-anchor="middle" font-size="11" fill="#2a33d4">w k=logs ‹base64 payload›</text>
  <line x1="110" y1="358" x2="602" y2="358" stroke="#2a33d4" stroke-width="1.3" marker-end="url(#rmx-sa)"/>
  <text x="360" y="350" text-anchor="middle" font-size="11" fill="#2a33d4">t k=logs n=4096 + 4096 raw bytes</text>
  <line x1="610" y1="390" x2="118" y2="390" stroke="#d94f2b" stroke-width="1.3" marker-end="url(#rmx-st)"/>
  <text x="360" y="382" text-anchor="middle" font-size="11" fill="#d94f2b">a k=logs n=65536</text>

  <text x="14" y="432" font-size="9.5" fill="currentColor" opacity="0.45" letter-spacing="2">INTERACT</text>
  <line x1="610" y1="454" x2="118" y2="454" stroke="#d94f2b" stroke-width="1.3" marker-end="url(#rmx-st)"/>
  <text x="360" y="446" text-anchor="middle" font-size="11" fill="#d94f2b">i k=logs ev=in ‹key bytes›</text>

  <text x="14" y="496" font-size="9.5" fill="currentColor" opacity="0.45" letter-spacing="2">CLOSE</text>
  <line x1="110" y1="518" x2="602" y2="518" stroke="#2a33d4" stroke-width="1.3" marker-end="url(#rmx-sa)"/>
  <text x="360" y="510" text-anchor="middle" font-size="11" fill="#2a33d4">c k=logs disp=scrollback</text>
  <line x1="610" y1="550" x2="118" y2="550" stroke="#d94f2b" stroke-width="1.3" marker-end="url(#rmx-st)"/>
  <text x="360" y="542" text-anchor="middle" font-size="11" fill="#d94f2b">i k=logs ev=closed reason=app</text>
</svg>
<figcaption>A session in motion: negotiate, open, stream, interact, close. Blue arrows go application to terminal; rust arrows come back. The <code>resize</code> event is the authoritative size, <code>a</code> is a credit grant as the terminal renders, and <code>ev=in</code> carries keys in that buffer's own encoding. The numbers are Rio's real answers: 16 buffers, 262144 bytes of starting credit, grants batched at 65536.</figcaption>
</figure>
<style>
  .rmxseq svg { display: block; max-width: 620px; height: auto; margin: 0 auto; color: currentColor; }
  .rmxseq svg text { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>

### Why APC, and why every message starts with `rmx`

There are several kinds of escape sequence. CSI is the common one (`\033[1;32m` up there is CSI). rmx uses a different one called **APC**, Application Program Command, which looks like this:

```
ESC _  ...anything...  ESC \
```

In printf terms, `\033_` to open and `\033\\` to close. I picked APC for one reason: the standard says a terminal that does not implement a given APC command must **ignore it entirely**, up to the terminator. That single sentence is what makes rmx safe to just start emitting. On a terminal that has never heard of it, your message is not garbage on the screen and not a broken cursor; it is nothing.

But "ignore what you don't recognize" only works if the terminal can tell whose message it is. So every rmx frame begins with the literal string `rmx`, and the whole frame is:

```
ESC _ rmx ; <verb> [ ; key=value ]* [ ; payload ] ESC \
```

A verb, then named parameters, then an optional payload. Unknown parameter keys must be ignored, which is how I can add things later without breaking today's apps. Frames cap at 4096 bytes; bigger content gets chunked or uses the bulk path below.

One rule in there looks fussy and is not: **the payload is always the last field, and parsers must take it by position, never by "the field with no `=` in it."** Here is why. Base64 pads with `=`. So a payload of `hi` encodes as `aGk=`, and a parser looking for key/value pairs happily reads that as the key `aGk` with an empty value. Given a frame like `rmx;i;k=p1;ev=in;aGk=;serial=7`, a name-based parser and a position-based parser disagree about what the payload even is. Two implementations that disagree about where the data starts is the kind of bug you chase for a week, so the spec removes the ambiguity by fiat: payload last, nothing after it.

### Buffer keys, and why the alphabet is so small

Every buffer has a key, chosen by the app: `k=logs`, `k=build`, `k=agent-3`. The allowed characters are `[a-z0-9-]`, up to 16 of them. Anything else must be rejected with `reason=bad_key`.

That looks like arbitrary tidiness. It is the single most security-relevant line in the spec, and here is the reasoning. The key is the **only** app-chosen string the terminal ever sends back. Titles are write-only. Every other field in a reply is a fixed word from a list I control (`status`, `quota`, `teardown`) or an integer. So the key is the only place an attacker could try to smuggle bytes into something the terminal *speaks*, and getting a terminal to speak on your behalf is a whole family of real CVEs: you make the terminal answer something, the answer arrives on the pty read side, and your shell processes it as if you had typed it. Restrict the alphabet to letters, digits and a hyphen, and there is nothing left to smuggle. No escape character, no semicolon, no newline.

Note the shape of the fix. Not "sanitize keys carefully everywhere" (which means every future code path has to remember). Instead: make the dangerous input unrepresentable at the door.

### `main`: the buffer you already have

The primary stream, meaning every byte outside an rmx frame, is itself a buffer. It has a reserved key: `main`. It cannot be closed, and it is exempt from the credit accounting below.

This sounds like bookkeeping and is actually the keystone. Because `main` is a buffer, an app that never speaks rmx is not a special case, it is the trivial case of the protocol: one buffer, `main`, behaving exactly like a pty always has. Degradation is not a fallback path I have to maintain; it is what happens when nothing else opens. It is also what makes nesting describable at all: an rmx-speaking app running *inside* a buffer sees a normal terminal, because a buffer *is* a normal terminal, and its `main` is that buffer. (Nesting is designed, behind a `nest` capability, and not shipped yet.)

(`main` is not writable, and that is now settled rather than pending: only your own stdout puts bytes there, so `w`, `t` and `c` reject `k=main`. The other half of that rule is that opening buffers **may shrink** `main`: the terminal has to tell you through the ordinary window-size mechanism, because programs draw their own status bars there and need to reflow.)

### `s`: ask before you speak

```sh
printf '\033_rmx;s\033\\'
```

The reply carries a version, a capability list, a buffer limit and the starting credit:

```
\033_rmx;s;v=1;cap=core,raw;max=16;credit=262144\033\
```

Two things to notice. First, the failure mode is silence: no answer inside the timeout means "this terminal does not do rmx," and the app falls back. The recommended timeout is 500 ms *after* a DA1 round-trip, because DA1 is a query every terminal answers, so it tells you the connection is alive before you conclude anything from silence. Waiting 500 ms and blaming the terminal, when really the ssh link was just slow, would be an ugly bug.

Second, `cap` is a list of **names**, never a bitfield. I have made the bitfield mistake before in another protocol of mine and it goes like this: you allocate bit 3 for a feature, someone else's implementation allocates bit 3 for a different feature, and now the wire format has two meanings and no way to tell them apart. Names cannot collide by accident, they are readable in a packet dump, and a client that sees a name it does not know just ignores it. An empty `cap=` is legal too: it means "I know what rmx is but I currently offer nothing," and apps must treat it as fall-back rather than an error.

### `o`: open, or adopt

```sh
printf '\033_rmx;o;k=logs;dir=down\033\\'
```

The important word is **idempotent**. Opening a key that already exists does not create a second buffer and is not an error: you adopt the existing one, and any other parameters you passed update it.

That is not politeness, it is the reconnect story. If your ssh connection drops and you come back, your app needs to get from "I have no idea what exists" to "I own these four buffers again" without duplicating anything. With idempotent open, recovery is just replaying the opens you would have done anyway. Duplicate-on-reopen would mean the app must ask what exists first and branch, which is exactly the round-trip storm I read about in a decade of iTerm2 issues.

The rest of `o` is small and mostly about who is in charge. `cols`/`rows` are a **proposal**; the terminal decides the real size and tells you. `title` is base64, and never echoed back. `at`/`dir`/`weight` are placement hints, honored only if the terminal advertised `cap=layout`. `weight` is the new buffer's percentage of the anchor's extent along the split axis, and a terminal that cannot solve a hint (an axis too small for two panes) places the buffer anyway rather than failing your open: a hint can never wedge the layout. `u` is one integer of urgency, 0 to 7, because I read what happened to HTTP/2's priority trees and decided one number was plenty. `focus=1` requests focus **at creation only** and the terminal may ignore it. The reply to `o` is always sent, whatever reply mode you asked for, because it carries your starting credit and the next rule makes writing without knowing it unsafe.

The reply reflects the key, a status, and integers:

```
\033_rmx;o;k=logs;status=0;cols=80;rows=12;credit=262144\033\
```

Failures are `bad_key`, `quota`, `unsupported`. And one rule I want to point at: when you are at the buffer limit, the open **fails**. The terminal must not evict some other buffer to make room. A protocol that silently destroys state to satisfy a request is a protocol where a bug in one app deletes another's work.

### `w` and `t`: two ways to move bytes

`w` is the normal path. Content is base64:

```
ESC _ rmx ; w ; k=<key> [; m=1] ; <base64 payload> ESC \
```

Whatever you write is handed to that buffer's terminal instance exactly as if it had arrived on a pty of its own, escape sequences included. That is the whole promise of the design: colors, cursor moves, images, all of it works, because there is a real terminal on the other side and I am not reinterpreting anything. `m=1` marks "more chunks coming" for one logical write, which is how you get past the 4096-byte frame limit.

Two `w` rules worth naming. Writing to a key that does not exist is dropped and reported with `reason=no_such_buffer`; it must **not** auto-open a buffer, because auto-open means a typo in a key name silently creates panes. And a write bigger than your remaining credit gets truncated at the credit boundary and reported with `reason=no_credit`: you were supposed to be counting. Credit is charged per frame, not per logical chunked write, and because truncation can slice an escape sequence in half the terminal has to reset that buffer's parser afterwards. Otherwise a half-parsed sequence sits there swallowing whatever arrives next, and the pane quietly goes wrong ten seconds later.

`t` is the bulk path, and it is the one I find prettiest:

```
ESC _ rmx ; t ; k=<key> ; n=<bytes> ESC \
<exactly n raw bytes>
```

No base64, so no 33% size tax, which matters when you are pumping a build log. You declare a length up front, the terminal takes exactly that many bytes for that buffer, and then the stream reverts to `main`. This is the only frame that leaves the stream in a state; everything else is self-contained, and that exception is worth knowing about if you ever write a parser for this.

The length prefix is not an optimization, it is the **anti-forgery mechanism**. Because `n` is known in advance, the terminal never scans the content looking for a terminator. There is no byte sequence you can put inside a burst that ends the burst early, so content can never escape into being control. Compare the alternative: if bursts ended at some magic marker, then any file containing that marker breaks out, and now `cat` on an untrusted file is an exploit. DEC solved this in 1987 with byte stuffing (escaping the magic bytes as they go past); a length prefix gets the same guarantee with no escaping at all.

Bursts cap at 65536 bytes and spend credit like writes. An over-credit burst is clamped and reported exactly like `w`, not treated as a fatal error. I originally specified it as fatal, on the theory that `raw` is for apps that count properly. That was wrong, and writing a second client is what showed me: grants arrive asynchronously, so you can never know the terminal's balance at the instant your burst lands. Killing a buffer for losing that race would make the bulk path unusable.

### `c`: closing, and what to do with the corpse

```
ESC _ rmx ; c ; k=<key> [; disp=discard|scrollback] ESC \
```

`disp=discard` is the default: the buffer and its state are gone. `disp=scrollback` is the interesting one. Instead of vanishing, the buffer's final screen is rendered into `main`'s scrollback as plain annotated lines, so a finished build log leaves a record you can scroll up to instead of a pane that blinks out of existence. It needs `cap=scrollback`, which Rio now advertises. The exact annotation is still implementation-defined; Rio wraps the dump in `--- rmx buffer <key> ---` markers and strips control characters on the way in, so a dying buffer cannot smuggle escape sequences into the pane that outlives it.

### `q`: how you find out what is real

```
ESC _ rmx ; q ESC \
```

The terminal answers with one frame per buffer plus a terminator:

```
\033_rmx;q;k=logs;cols=80;rows=12;u=3;more=1\033\
\033_rmx;q;more=0\033\
```

This is the recovery primitive. If your app restarts, or reconnects over a new pty, the sequence is: `s` to confirm rmx is there, `q` to learn what exists (an empty answer means a fresh terminal), re-`o` your keys idempotently, then re-seed content with `w`/`t`. That is it, and it works precisely because keys are app-chosen and open is idempotent. If the terminal handed out the IDs, you could not do this, because the names you need to re-open would be names only the old, dead connection ever knew.

Each row also carries that buffer's remaining `credit`, because it is the one number you cannot reconstruct from your own records after a reconnect. Notice what `q` does *not* return: no buffer contents, no titles. The app is the source of truth for its own output, so restoring content is the app's job, using the same `w` and `t` it always used. There is no special restore verb, which means there is no special restore path to keep working.

### `a`: credit, and why control frames are free

```
ESC _ rmx ; a ; k=<key> ; n=<bytes> ESC \
```

Each buffer starts with the negotiated credit, spends it on `w` and `t` bytes, and gets more as the terminal renders what it already has. I go into why flow control matters at all in the next section; the detail I want here is the exemption.

**Control frames never spend credit,** and neither does `main`. That is a rule I took straight from SSH: signaling has to survive data backpressure. Think about what happens without it. A buffer floods, runs out of credit, and now the app cannot send the `c` that closes it, or the `s` it needs to renegotiate, because the control messages are queued behind the flood it is trying to stop. The system deadlocks at exactly the moment you need it to respond. So the data plane can stall and the control plane cannot. `main` is uncredited for the same reason plus a simpler one: its backpressure is the pty itself, which already works.

Grant policy is left to the terminal, with two hints: make grants big enough that an interactive buffer never stutters, and feel free to starve an invisible, low-urgency buffer for as long as you like. Nobody is watching it.

### `i`: the way back

Everything so far goes app to terminal. Input and events come the other way, all inside one frame type:

```
ESC _ rmx ; i ; k=<key> ; ev=<name> [; key=value]* [; <base64>] ESC \
```

There are five events in v1, and each of them is answering a question that only exists because the buffer is virtual.

**`ev=in`** carries input: exactly the bytes the terminal would have written to a dedicated pty for those keypresses, honoring *that buffer's* modes. Keyboard protocol state, bracketed paste and mouse encoding are per-buffer, so if one pane negotiated the kitty keyboard protocol and another did not, each gets the encoding it asked for. Input is delivered only when a buffer is subscribed, focused, and visible. "Subscribed" just means open: an `o` succeeded and nothing has closed it. There is no separate subscribe verb, which is deliberate: one fewer state to get out of sync.

**`ev=reply`** is the one that surprised me, and it is the answer to "what happens when a program inside a buffer asks the terminal a question?" Programs do this constantly: DA1 to ask what the terminal is, DSR to ask where the cursor is, DECRQM to ask whether a mode is on. Normally the answer travels back up the pty and lands in the program's stdin. But here there is one pty shared by every buffer, so three programs can be waiting on three answers at once, and unlabelled answers arriving on one channel are indistinguishable. Whoever guesses wrong gets the other one's answer, or gets nothing and **hangs**, because a program that queried the terminal is usually sitting in a blocking read. So replies are tagged with the buffer that produced them, and the app routes each one home. Without this frame, half of curses-style programs would simply freeze in a pane.

**`ev=resize`** carries `cols=` and `rows=`, at open and on every geometry change. It exists because a virtual buffer has no `SIGWINCH`. Signals travel with real ptys, and a buffer does not have one; the terminal, not the app, decides how big a pane really is. So this event is the buffer's configure event, and it is why the spec says an app must never assume its own size. Get this wrong and you get the classic wrapped-garbage screen, where the program is drawing an 80-column layout into a 62-column pane.

**`ev=focus`** reports `state=in|out` when focus crosses into or out of a buffer, and it fires only from a user gesture. An application can never ask for focus at runtime, because "let me take focus" is the shape of a keylogger.

**`ev=closed`** reports the end of a buffer with a reason: `user` (you closed it), `app` (the owner sent `c`), `quota`, `no_credit`, `teardown`. Apps have to handle every one of those without wedging, which is a slightly annoying requirement and a completely non-negotiable one.

### Lifecycle: how things end

The spec has a table of endings, because "what happens when this dies" is where protocols usually rot. The short version:

When the pty hits EOF or the owning process exits, every buffer is reaped with `reason=teardown` and discarded. I originally wrote that teardown should honor "the buffer's last disposition hint", which turned out to be unimplementable: `disp` only exists as a parameter on `c`, so a buffer nobody ever closed has no hint to honor. Two people implementing the spec found that paragraph independently, which is a good sign it deserved deleting rather than defending. **The terminal must never be left wedged**: no orphan panes you cannot close, no state that outlives its owner. `RIS` (a full terminal reset) on `main` discards all buffers; `RIS` *inside* a buffer resets only that buffer. Clearing the screen on `main` does nothing to buffers, because they are not grid content of `main`. And buffer state is session-scoped: it does not survive a terminal restart and does not leak between tabs, windows or panes.

Then the rule I care most about:

> Terminals MUST provide a user gesture that unconditionally closes any or all rmx buffers, regardless of application state.

The **user veto**. Whatever the app wants, you can always kill the panes. Every other safety property in this protocol is bounded by quotas and alphabets and credit, and those are all reasoning about what a well-behaved-or-not app can do. The veto is the one guarantee that does not depend on that reasoning being complete. If I got something else wrong, you can still get your terminal back.

### The posture all of that adds up to

Three properties fall out of the pieces above rather than being bolted on: input only ever flows terminal to app, focus moves only when *you* move it, and the terminal only ever says fixed words, integers and restricted-alphabet keys back. The next section is about why each of those is shaped that way, so I will not spend them here.

Two smaller ones that do not get their own verb. **Isolation:** each buffer owns its whole emulation state, its modes, palettes, keyboard state, graphics store, and no verb reads or writes another buffer's state, so a compromised program in one pane cannot reach into a sibling. **No execution and no filesystem:** rmx is declarative. No frame names a file, and no frame causes the terminal to run anything. The most a message can ask for is "draw these bytes in this box." That is a deliberately boring maximum.

## The parts that are actually hard

If you are junior, this is the most useful section in the post, because "have an idea" is the easy part. A protocol is mostly a list of ways things can go wrong.

**What if the terminal doesn't support it?** Old terminals must not break. rmx rides on a sequence type (APC) that terminals are *required by spec* to ignore when they don't recognize it. So on an unaware terminal, your rmx messages vanish silently, and the app finds out by asking first (`rmx;s`) and getting no answer within a timeout. No answer means: fall back to the old way. Every successful terminal feature works like this. Every one that required a flag day died.

**What if one pane floods?** Say a pane runs `cat /dev/urandom`. If it can shove unlimited bytes down the shared connection, every other pane freezes and your Ctrl-C never arrives. The fix is old and proven: **credit**. Each buffer starts with an allowance of bytes (you can see `credit=262144` in the reply above). Writing spends it; the terminal grants more as it catches up. When you are out, you wait. SSH does this per channel. DEC terminals did it in 1987. tmux did *not* have it for its first eight years, and the result was users getting disconnected mid-`cat`.

**What if the bytes are hostile?** This one is my favorite, because it is where security lives. Imagine you `cat` a file that some stranger wrote, and it happens to contain rmx sequences. Can it open panes? Steal your keystrokes? Draw a fake password prompt?

The protocol has to make those things *structurally* impossible, not merely discouraged:

- Input only ever flows from the terminal to the app. There is no message an app can send that means "pretend the user typed this." The dangerous direction simply does not exist.
- Focus changes only when *you* click or press keys. An app cannot grab focus, because that is the shape of a keylogger.
- Buffer names are restricted to `[a-z0-9-]`, precisely because the terminal echoes those names back in its replies, and anything the terminal echoes is a place to hide an attack. (This is a real, recurring class of terminal bug: making a terminal *answer* something, aimed so the answer lands in your shell as if you had typed it.)
- Content is base64-encoded, or sent with an explicit length up front, so payload bytes can never be mistaken for the end of a message.

Notice the pattern: every rule exists because someone got burned. Which brings me to how I actually designed this.

## I did not invent this

I want to be honest about the process, because "brilliant idea appears" is not how it goes.

Before writing a line of the spec, I went looking for prior art, and found that **DEC solved this in 1987.** Their VT330 and VT420 terminals ran two host sessions over one serial cable, with the terminal drawing both in a split screen. The protocol was called TD/SMP. It had session open and close, a *warm reattach* verb, per-session byte credit, and byte stuffing so payload could not forge control messages. It died because it was patented and deliberately undocumented, not because it was wrong.

I am also not the only person who thinks the terminal is being wasted. I know Mitchell Hashimoto, and we have talked about terminals enough that I know we see the same thing: this is a surface that could do so much more than it does, and that matters more now than it did five years ago. Agents live in the terminal. They spawn parallel tasks, stream logs, ask for approval, run long jobs you want to watch without babysitting. That is *exactly* the workload a single flat grid of text handles worst. So when he started a company whose first product is a terminal multiplexer built on his own embeddable terminal engine, my reaction was not surprise. It was recognition. We are attacking the same problem from adjacent angles, and honestly the terminal ecosystem is better off with several people trying.

I also studied what exists now: tmux's control mode (a decade of iTerm2 issues is a free list of mistakes to avoid), how WezTerm syncs state, why kitty's author argues multiplexers should not exist at all, and mosh's beautiful insight that you should sync the *screen* rather than replay every byte, so you can skip stale frames when the network hiccups.

Nearly every rule in my spec traces to one of those. Credit accounting? SSH and DEC. Ask-before-using? kitty's negotiation style. Restricted-alphabet names? A published taxonomy of terminal CVEs. Buffer names chosen by the *app* instead of assigned by the terminal? That one comes from my own earlier protocol: if the terminal hands out the IDs, you cannot replay a recorded session, because the app's own messages depend on answers it can only get at runtime.

If you take one thing from this post: **research is not a formality you do before the real work. It is most of the real work.** A day of reading a 1987 patent and someone else's bug tracker saved me from shipping several bad decisions.

## Where it stands

Rio advertises `cap=core,raw,layout,nest,scrollback` today: negotiate, open buffers as native splits with placement hints honored, write into them with colors and cursor control, stream bulk output efficiently, route keys and mouse and paste back to whoever owns the buffer, nest rmx inside a buffer two levels deep, fold a dying buffer into scrollback, and tear everything down cleanly when the owning shell exits.

Two other clients exist now, and they are what made the protocol real. My multiplexer (oj) speaks it, and so does a fork of tmux itself, which was the more interesting test: it renders its panes as native terminal panes when it can, and composes them the old way when it cannot, with no change in behavior for anyone on a terminal that has never heard of rmx.

Writing those two clients is also what fixed the spec. A protocol you have only implemented once is a protocol you have only guessed at. Between them they found a dozen places where I had been ambiguous or simply wrong (a credit rule that made bulk writes stall, a framing rule where two parsers could legitimately disagree, a teardown clause that could not be implemented at all), and every one of those is now decided in the text rather than left to whoever writes the third client.

Plenty is still unfinished. Session persistence (detach, walk away, reattach later) lives in a separate layer, because that needs a process that outlives your terminal window. Predictive echo for slow links is designed and unbuilt, and there is no way yet to ask a terminal for scrollback history rather than just the visible screen.

But the core bet is simple, and I think it is right: your terminal is already good at drawing terminals. Instead of a middleman that reimplements it, badly, and holds every new feature hostage, let the app just *ask*.

---

If you are learning this stuff and want a concrete exercise: open a terminal and run `printf '\033[1;32mhello\033[0m\n'`. That is you, speaking the protocol directly, with no library in between. Everything else in this post is that same trick, with more rules.
