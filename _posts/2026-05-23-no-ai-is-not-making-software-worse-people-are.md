---
layout: post
title: "No, AI is not making software worse, people are"
language: 'en'
description: "AI is just a tool. The problem is much deeper, and it started long before AI ever entered the picture. We have been accepting bad quality software for years."
draft: true
---

A quick note before anything else: this article isn't linked on my home page. AI is such a dramatic and sensitive topic right now that I'd rather avoid the noise around it. I just wanted to put my thoughts into words, so I can share them with friends if they ever ask how I feel about it. And, I am also concerned that people think I like AI slop code, since in this world it's either good or bad, there's no mid term.

Every other day I see the same headline in a slightly different costume: "AI is making software worse." And every time, I think the same thing. No, it isn't. People are. AI is just the latest tool we've handed to people who were already comfortable shipping bad software.

Let me be clear from the start: I'm not an AI enthusiast. Well, I do like the technology behind it. I've already built my own models, done fine-tuning, and I often spend time reading papers. However, I'm not a fan of giving AI the pilot seat. This is not an article against AI, neither in favor of it.

That being said, blaming AI is the easiest way to avoid looking at the much deeper problem, and the deeper problem has been with us for a long time. We were building bad software long before any model could autocomplete a function for us.

Think about it honestly. How did we get here? We got here because, year after year, we kept lowering the bar and calling it progress. We normalized software that wastes resources like it costs nothing, because for the person shipping it, it doesn't. The cost is paid by the user's machine, the user's battery, the user's RAM, never by the person who decided "good enough" was good enough.

The clearest example is right in front of most developers every single day: the editor. A lot of people write code in a browser pretending to be a desktop app. VS Code is wonderful in many ways, I won't pretend otherwise, but it is a browser-based editor that can happily consume well over 10GB to let you edit a handful of text files. Editing text. That's the task. We somehow decided that editing text is worth ten gigabytes of memory, and almost nobody blinks.

I never used Electron apps. That's a principle, not a coincidence. I'm not willing to accept defeat for low quality software just because it's convenient for the people who make it. And I know how that sounds: stubborn, maybe a little old-fashioned. I'm fine with that.

Because I remember when constraints were real. I remember when 64kb actually meant something, when people built entire experiences inside limits that would make today's developers laugh in disbelief. Those constraints didn't make software worse. They made people *think*. They forced craftsmanship. Every byte had to earn its place.

And now? Now we have literally no constraints. None. So instead of using that freedom to build something beautiful, the collective response has been: "Sure, let's burn 30GB of my RAM." It's almost a celebration of waste. We have more power than we've ever had, and we use it to be lazier than we've ever been.

It goes deeper than editors. Look at the languages themselves. We now have bloated languages being pushed for *systems programming*, the one domain where every byte and every cycle is supposed to matter, and people shrug and say it's fiiiine. It is not fine. Choosing a heavy, garbage-collected, runtime-on-top-of-runtime stack to do the work that demands precision, and then defending it, is exactly the attitude I'm talking about. The constraints that used to define systems programming got quietly thrown away, and we called it pragmatism.

And then there's the part that genuinely makes me laugh: installing binaries from a completely different language through npm, wrapping the whole thing in IPC calls, and shipping it as if that's a reasonable architecture. You pull a native binary written in another language, spawn it as a subprocess, talk to it over a pipe, and call it a "package." Layers on layers, each one paying a tax in memory and complexity, all so nobody has to leave their comfort zone. It works, sure. But "it works" was never the bar for good engineering. It was the bare minimum we somehow turned into the goal.

This is the part nobody wants to say out loud: AI didn't lower the bar. The bar was already on the floor. AI just lets us reach the floor faster.

If a developer doesn't care about resource usage, doesn't care about ownership, doesn't care about understanding what they ship, AI doesn't make them worse. They were already there. AI just removes the last bit of friction that used to slow them down. The slop was always coming. AI just gave it a faster delivery truck.

And let's be honest about where slop code actually comes from. It exists because people lost the sense of good engineering, or, more likely, they simply don't care. The whole thing has become about delivering rather than crafting, about time rather than the work itself. Ship it, close the ticket, move on. When the only question anyone asks is "is it done yet?" and never "is it good?", slop isn't an accident. It's the predictable output of a system that rewards speed and ignores craft. AI didn't invent that incentive. It just feeds it beautifully.

So when people point at AI-generated code and say "look, software is getting worse," I want to ask: worse compared to what? Compared to the 10GB text editor? Compared to the chat app that needs a gigabyte of memory to show you messages? Compared to the desktop apps that are just websites wearing a window? We accepted all of that. We applauded a lot of it. Let's not suddenly grow a conscience the moment a model writes the bad code instead of a person.

That would be hypocrisy, plain and simple.

The honest position is harder. The honest position is to admit that quality has been optional for years, that we traded craftsmanship for convenience long ago, and that AI is simply the mirror showing us what we already valued. If you give a tool to a culture that doesn't care about quality, you get more of what that culture already produces, just faster.

So no, AI is not making software worse.

We are. We always have been. And the day we admit that is the day we can actually start building better.
