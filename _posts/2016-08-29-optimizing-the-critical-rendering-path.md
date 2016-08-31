---
layout: post
title: 'Optimizing the critical rendering path'
description: "This guide will not bring you a magic formula to optimize critical render path. When the subject is web performance: there's no magic formula. Analyze performance is careful and meticulous process, and it can bring different results based on various existing variables."
language: 'en'
image: 'assets/images/posts/webperf-1.jpg'
---

Lately I have been studying a lot about this subject. So I decided to share things I've learned about. However I tried to put everything in this article, but the result was too big. Then if necessary I'll write a second part later.

Delivering a fast web experience requires a lot of work by the browser. Analyze performance topics is careful and meticulous process, and it can bring different results based on various existing variables. So this guide will not bring you a magic formula to solve performance problems. **When the subject is web performance: there's no magic formula.**

"Optimizing for performance is all about understanding what happens in these intermediate steps between receiving the HTML, CSS, and JavaScript bytes and the required processing to turn them into rendered pixels" - that’s the **critical rendering path.**


<br>
![Cost of Render](/assets/images/posts/critical-render-1.png)

<br>

The goal of optimizing the critical rendering path is to allow the browser to paint the page as quickly as possible. Optimizing which resources are loaded and in which order can minize the blank screen time.

To help understand this process, let's dive in a simple first request for a website. Considering a use of regular 3G, the the network roundtrip (propagation latency) to the server will cost 300ms~700ms.

<script src="https://gist.github.com/raphamorim/e1f9b99061227c763d78fc58a0233807.js"></script>

