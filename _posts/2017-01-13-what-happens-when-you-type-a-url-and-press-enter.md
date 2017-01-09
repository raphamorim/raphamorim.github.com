---
layout: post
title: 'What happens when you type a url and press enter?'
language: 'en'
---

I know, I know... Everyone is tired of hearing about this question. Recently a friend of mine ([@gpantuza](https://twitter.com/gpantuza)) asked the same question, but I did not know how to respond. In fact I did not know the steps before arriving in the browser.

However, I accepted the challenge. I started to study about it and I did a short version answering that question.

First of all; Browser checks cache, then if requested object is in cache and is fresh, browser start to decodes response. Otherwise, browser will ask OS for server's IP address, so OS makes a DNS lookup and replies the IP address to the browser.

Browser opens a TCP connection to server (let's consider a simple HTTP request, more complex with HTTPS), then it sends a HTTP request through TCP connection. After it, start to receiving HTTP response and may close the TCP connection, or reuse it for another request.

Then checks if response is a redirect or a conditional response (3xx result status codes), authorization request (401), error (4xx and 5xx), etc. These are handled differently from normal responses (2xx).

If cacheable, response is stored in cache and it starts to decode response (e.g. if it's gzipped). Browser determines what to do with response (e.g. it's a HTML page, it's an image [...]). Then it renders response, or offers a download dialog for unrecognized types.

I hope it helps :D