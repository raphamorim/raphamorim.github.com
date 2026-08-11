---
layout: post
title: "Closing Canario Terminal source code"
language: 'en'
description: "Why Canario terminal is closed source: time, maintainer burnout, and building something just for myself."
---

Disclaimer: No AI was used to write this.

Also, writing this blog post for myself, so I can reason with myself again in the future ha.

I have been doing Open Source since I was 17y old. My first pull request was fixing some broken links in Brad Frost's [This is responsive](https://github.com/bradfrost/this-is-responsive/pull/77) project.

I spoke in free software conferences when I was 18y, got engaged, my dream job for many and many years was work at Mozilla. Most of the companies I've worked for, I helped to kick start open sourcing internal projects.

However I decided to close source Canario terminal.

The reason is that Canario is something I built for myself, and I simply don't have the time to maintain it as an open source project. Rio and other stuff already drains everything I have. It's the same reason I never open sourced boo. Which is a shame, because boo introduces a first class replacement for the LSP system.

People underestimate what open source costs from the maintainer side. It's not just writing code. It's issues, pull requests, discussions, people demanding things from you for free. I got spammed like crazy. And now with AI, spamming a maintainer is so easy: low effort issues, generated pull requests, and every single one of them takes a bit of your time and energy.

Three things I want to make clear:

1. Canario doesn't have telemetry. The only request it does is to check for updates.
2. If closed source is a big deal for you, I am sorry, but there's many other wonderful options in the world.
3. The Canario source code is still there in the older versions of Rio. People can fork that if they want to. All good from my side.

Also want to explain why I built Canario in the first place. I was watching my friends at work using so many half-baked solutions and I thought: I don't want to use any of that. So I built it for myself. No VC money, no expectations of getting rich. Just a terminal I wanted to use for agentic code.

If you look at every project I did that got popular (react-tv, react-ape, Rio, etc), all of them were me fixing my own problems. Boo and Canario are the same thing, but this time I don't have the same energy and time I had before.

To be clear: I will continue maintaining Rio, that's a project I love. But Canario will be developed on its own pace. No drop-in requests, no AI spam issues or PRs. Just me building the thing I want to use.

Best,

Raphael.