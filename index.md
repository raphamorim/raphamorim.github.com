---
layout: about
class: about
title: 'Raphael Amorim'
language: 'en'
description: "I am Raphael Amorim. Software Developer Engineer. I love Japanese culture (親日), 70s/80s songs and a lot of 8bit art."
---

## Olá • Hello • Hej •

My name is Raphael Amorim.

Currently, I am working at [Charm](https://charm.sh/) to make the command line glamorous. I am also developing a code editor called [Boo](https://raphamorim.io/why-am-i-creating-a-new-code-editor) and maintaining the [Rio](https://github.com/raphamorim/rio) terminal emulator.

Previously, I worked at companies like Viaplay, Spotify, GoDaddy, and Globo.com. I have been a speaker at a few conferences.

I was responsible for Viaplay's adoption of the Rust language. I built the starter infrastructure, released the first service for production, and actively worked on developing a Rust culture, which led to the language's adoption in the upcoming years, along with many other feats. [See when it all started](https://www.linkedin.com/posts/hugoraphael_i-dont-post-very-often-in-the-linkedin-but-activity-6975346956734738432-Csqi).

I wrote [a book about WebAssembly in Portuguese](https://www.casadocodigo.com.br/products/livro-webassembly).

## Articles

<div class="sections">
  {% assign posts = site.posts %}
  {% for post in posts %}
    {% unless post.draft %}
      <div class="section">
    	<div class="date">{{ post.date | date:"%b %Y" }}</div>
		<div class="title"><a href="{{ post.url }}">{{ post.title }}</a></div>
      </div>
    {% endunless %}
  {% endfor %}
</div>

## Talks

<div class="sections">
	<div class="section">
		<div class="date">Nov 2023</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=wvccOkvpbY0">Bring Gameboy alive in the Web with Rust and WebAssembly</a> - RustLab Italy</div>
	</div>
	<div class="section">
		<div class="date">Nov 2018</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=Hz_WTWb3sV4">Writing Your Own React Renderer</a> - React Day Berlin</div>
	</div>
	<div class="section">
		<div class="date">Aug 2015</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=toCdZ2e9Dh4">500 Days of Open Source</a> - BrazilJs</div>
	</div>
</div>
