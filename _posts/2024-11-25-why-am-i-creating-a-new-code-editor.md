---
layout: post
title: "Why am I creating a new code editor?"
archived: false
language: 'en'
---

First and foremost, I would like to thank for all the financial investment that I have already received on this project. Even though it is not yet ready for the public, I truly appreciate the trust and support that many of you have placed in me.

Secondly, a lot of what you will read in this article is my personal view. You are free (and encouraged) to disagree; there is no universal truth or words written in stone.

With all that being said, let's have a chat.

Have you ever thought that a lot of code editors lately have become too much of everything and less of code editing?

Most of the existant code editors are a great piece of software: fast, configurable, AI support, plugins, themes, contain built-in terminals, file tree views and etecetera. I cannot complain about they can do, they basically do everything you would ever need!

They also tend to look the same:

![Average editor](/assets/images/posts/average-editor.png)

Which got me thinking, why do I feel that's lacking something whenever I use any of them? It's because they are "too much of everything and less of code editing".

The editor that I working on is my personal attempt to get back to the foundation of what a code editor should do well: edit code, and to achieve in the current state of editors, is required to seek innovation.

### What's innovation?

That's actually a very good question. You can google it and you would still find different kind of answers. If you also search on tech forums, you would find that everyone have they own perception of innovation.

For example, let's jump into browsers universe: Many people would consider [Arc browser](https://arc.net/) as an innovative user experience on browsers, but some wouldn't. Then you could find people that would consider a [Firefox](https://www.mozilla.org/en-US/firefox/) performance improvement based on a new architecture as an innovation example, but also would have people that would disagree.

In the editors universe you can actually create a long (seriously, would be very long) discussion about what and which features are innovative on Elvis, VI, Emacs, LSE, DreamWeaver, Atom, Sublime Text, Notepad, Brackets, Kile and so many others.

In my humble opinion, I would say innovation is quite personal and it depends a lot of which kind of background, personality and taste that you have. There is a lot of stuff that is built on popular or commom taste but would not necessarily be innovative.

So if the percetion of innovation is personal, I can tell some of my goals on text editor that I working on.

• Reivent mouse free editors, a text editor should be capable to deliver as much without require a long learning curve, in fact it should fit from a programmer to a non-programmer without having few days to catch up.

• Keyboard based movement should not feel like you are playing an instrument but actually be short and effective.

• A editor that can actually adjust to your way of typing and self adjust for people to increase typing speed. I have been working lately with researchers on this and it is still a lot to sort out.

• Plug and play UI, you should be capable to not only configure an editor to look yours but actually make it yours. This feature is a bit complex to explain in a single bullet point and I definitely got carried about over adding this (lol).

There's more goals and features but I think is ok to not mention everything, I don't want to write in store anything since a LOT of work and ideas are still in development.

Lately, my work has been interview and sit with different programmers and non-programmers personas and collect ideas and feedbacks. So yeah, still have a lot going on.

### Tech Stack (so far)

This text editor already exist and the prototype it is cross-platform.

• Written in Rust

• GPU based.

• OpenGL/Vulkan on Linux, OpenGL/DX12/DX11 on Windows, Metal on macOS.

I'm not going to talk about the "why" for any of this. I'm just laying out the tech stack as-is for people who are interested. Take it as you will.

### When it will be released?

No idea!

This year has been quite busy for me as a new parent and the few time that I had was to work on [Rio terminal](https://github.com/raphamorim/rio) and create the editor prototype. As mentioned before, the current step has been iterate on personas and keep stabilizing the editor.

I hope you that you found this chat interesting. Given its our first time talking, there were so many more things I could've covered but I'll save them for future.

_

If you want to keep up to date, follow me on [Twitter](https://x.com/raphamorims), [Bsky](https://bsky.app/profile/mustache.bsky.social) or [Mastodon](https://mas.to/@mustache).