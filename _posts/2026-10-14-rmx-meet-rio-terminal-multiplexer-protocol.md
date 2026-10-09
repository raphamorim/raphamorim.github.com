---
layout: post
title: "RMX: Meet Rio Terminal Multiplexer Protocol"
language: 'en'
description: "Rio introduces a new protocol that lets an application open real terminal buffers over one connection, so the terminal renders panes natively instead of a multiplexer parsing every byte twice and dropping whatever it cannot model."
draft: true
---

No AI was used to write this article, therefore might have some English mistakes.

As most of developers knows, a terminal emulators are heavily based on text and a lot happens under the hood. If you have interest in a deep dive on the subject btw: I did a conference talk about terminals a while ago called ["Terminals are just text? Think again"](https://www.youtube.com/watch?v=ntnJ83v2DrU) a while ago (there's a lot of "like" repetition in my oratory, sorry I was nervous).

When you run `ls`, your shell writes some bytes to a thing called a **pseudoterminal** (pty for short). Think of a pty as a pipe with two ends: your application (often a shell) writes into one end, and your terminal reads out of the other 🤝.

Most of those bytes are plain text. But some of them are instructions, and those instructions are where all the interesting behavior lives. The instructions are called **escape sequences**, and they look like this when you print them raw:

```
\033[1;32mtests passed\033[0m
```

`\033` is the escape character, it actually expect an operating system command (there's other kinds of escape sequences also). The terminal reads that and understands:

1. switch to bold green
2. print "tests passed"
3. then reset to normal

This is of course a simple overview of how it works. That's basically how colors work, how cursor moves, how the screen clears, how images get displayed, etc. Everything the app wants the terminal to do is part of the stream of bytes as the text.

Then you have terminal multiplexers (like [tmux](https://github.com/tmux/tmux)), that follow the same principle.

If you see anyone using tmux, it's likely that you will see someone using two or even more shells side by side in one window. Your terminal is basically drawing one grid of text, so how does tmux give you two?

All popular the terminal multiplexers sits in the middle.

- To your shell, tmux pretends to be a terminal: it hands the shell a pty, reads the bytes, and interprets all those escape sequences itself, keeping its own in-memory grid of characters for each pane.
- To your real terminal, tmux pretends to be an ordinary app: it takes its internal grids, composes them into one big picture (with the divider lines and the status bar), and re-emits *new* escape sequences describing that combined picture.

Here is the sequence, concretely, for a single colored word inside a pane:

1. Your program writes `\033[1;32mtests passed\033[0m` to its pty.
2. tmux parses it and records: "row 3, columns 0-7, text 'tests passed', bold, green" in its own grid.
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
