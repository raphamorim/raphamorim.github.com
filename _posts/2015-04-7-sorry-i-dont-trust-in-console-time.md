---
layout: post
title: "Sorry bro, I simply don't trust in Console.Time or neither similar"
description: "It's normal for measure time. Many developers choose the console.time or in some cases use Date.getTime(). But, don't trust 100% in any of these."
link: 'http://raphamorim.github.io/sorry-i-dont-trust-in-console-time'
language: 'en'
image: 'assets/images/posts/trustless.jpg'
---

It's normal for measure time. Many developers choose the console.time or in some cases use Date.getTime(). 

<!-- more -->

I give you a simple example:

## The Code

<div class="code">
<code>console.time('execution time: ');</code>
<br>
<code>var total = 0;</code>
<br>
<code>for (var i = 0; i <= 1e2; i++) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;total += i;</code>
<code>}</code>
<br>
<code>console.log(total);</code>
<br>
<code>console.timeEnd('execution time: ');</code>
</div>

## Results

**Chrome (version 41.0)**

<img style="max-width: 500px; border: 2px solid #f8f8f8;" src="/assets/images/posts/accuracy-time/chrome.jpg"/>

**Firefox (version 37.0.1)**

<img style="max-width: 500px; border: 2px solid #f8f8f8;" src="/assets/images/posts/accuracy-time/firefox.jpg"/>

## But, don't trust 100% in any of these.

**Why I'm saying that?**

If you need to measure time precisely, neither console.time() or using Date.getTime() will ,get you far. Using Date.getTime() you got something like this:

<div class="code">
<code>var start = (new Date).getTime();</code>
<code>/* Run a test. */</code>
<code>var diff = (new Date).getTime() - start;</code>
</div>

Even if you repeat the same code, same syntax and the same logic. It can get quite different results when run.

You can see what I say using the [Dromaeo](http://dromaeo.com/) (a Mozilla JavaScript performance test suite) or you browser console. So you realize the time in the implementation of JavaScript isn't something that you can be measuring with full certainty.

**The truth is:** JavaScript execution time can be quite affected by so many things, like the engine used by the browser or the user machine.

You can check out John Resig's blog post about the [accuracy of JavaScript time](http://ejohn.org/blog/accuracy-of-javascript-time/) to learn more about that.

