---
layout: post
title: 'Optimizing the critical rendering path'
description: "This guide will not bring you a magic formula to optimize critical render path. When the subject is web performance: there's no magic formula. Analyze performance is careful and meticulous process, and it can bring different results based on various existing variables."
language: 'en'
image: 'assets/images/posts/webperf-1.jpg'
---

Lately I have been studying a lot about this subject. So I decided to share things I've learned about. However I tried to put everything in this article, but the result was too big. Then if necessary I'll write a second part later.

Delivering a fast web experience requires a lot of work by the browser layer. Analyze performance topics is a careful and meticulous process, and it can bring different results based on various existing variables. So this guide will not bring you a magic formula to solve performance problems. **When the subject is web performance: there's no magic formula.**

"Optimizing for performance is all about understanding what happens in these intermediate steps between receiving the HTML, CSS, and JavaScript bytes and the required processing to turn them into rendered pixels" - that’s the **critical rendering path.**


<br>
![Cost of Render](/assets/images/posts/critical-render-1.png)

The goal of optimizing the critical rendering path is to allow the browser to paint the page as quickly as possible. Optimizing which resources are loaded and in which order we can minimize the blank screen time.

To help understand this process, let's dive in a simple first request for a website. Considering a use of regular 3G, the the network roundtrip (propagation latency) to the server will cost 100ms - 750kb/s ~ 250kb/s.

<p>
<script src="https://gist.github.com/raphamorim/e1f9b99061227c763d78fc58a0233807.js"></script></p>

We’ll start with a basic HTML markup, a simple CSS, some JS files and a single image as resource. Let's see the Network timeline in Chrome DevTools and verify the resulting resource waterfall:

![Results of Render](/assets/images/posts/critical-render-2.jpg)

The HTML file took ~111ms to download. In the example, the HTML download is very tiny (<4K), so all we need is a single roundtrip to fetch the full file.
Once the HTML content becomes available, the browser has to parse the bytes, convert them into tokens, and build the DOM tree. After the DOMContentLoaded trigger, the browser starts to build the DOM tree (in the case: few milliseconds). Also, it's necessary to fetch and parse the CSS file to construct the CSSOM  (we need both the DOM and CSSOM to build the render tree).

Note: **JavaScript wait til CSS files are downloaded and parsed**. Why? JavaScript may query the CSSOM. **Even with inline scripts?** Hmmm, well... When you write some inline script, you can force browsers to intends to know what that script does. However it blocks the CSS parse, blocking the CSSOM deliver.

So inline scripts blocks more than external scripts? No. You'll remove X requests. But doesn’t matter if JavaScript is inlined or external, because as soon as the browser hits the script tag it will block and wait until the CSSOM is constructed. BTW: JS and CSS are downloaded in the same time, so inlining JavaScript doesn't make much difference.

... And the image resource? Make a test: Remove JS and CSS load and you’ll see a "polemic photo" doesn't block the domContentLoaded event. Why it happens? Images don't block the initial render of the page. Then when we talk about the critical rendering path we are typically talking about the HTML markup, CSS, and JavaScript.

Looking back to JS and CSS in the page, we can adopt different strategies.

One of the different possible strategies is to use the “async” keyword to unblock the parser. When present, it specifies that the script will be executed asynchronously as soon as it is available. The async attribute is only for external scripts. Then the script is executed asynchronously with the rest of the page (the script will be executed while the page continues the parsing).

<p><script src="https://gist.github.com/raphamorim/ddcf1f850112c88a172a9f10870ed7ac.js"></script></p>

Parser-blocking (external) JavaScript:

![Parser-blocking](/assets/images/posts/critical-render-3.jpg)

Async (external) JavaScript:

![Async](/assets/images/posts/critical-render-4.jpg)

Oh my goddess! So much better! But what if we try a different approach? Using inline CSS and JavaScript:

<p><script src="https://gist.github.com/raphamorim/6372076aa79f6c2350e6b31e81287091.js"></script></p>

CSS and JavaScript Inline:

![Inline CSS and JavaScript](/assets/images/posts/critical-render-5.jpg)

More faster than external without async case, however more slower than using async. Why? This strategy made our HTML page much larger, in our case jQuery dramatically increase HTML weight. Just imagine: You have to load all HTML to start the parse job, it's a bad approach for pages with many resources.

But in this approach the domContentLoaded time is "only" affected by the page weight. So if we have a weightless page using inline resources it'll loader much faster. And this rule can be applied to the reverse case as well.

Each page is different - There's no one predefined solution, you’ll have to make different analyses, study your case and create your own optimal strategy.

