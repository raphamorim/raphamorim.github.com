---
layout: default
title: 'Raphael Amorim'
language: 'en'
description: "I am Raphael Amorim. Software Developer Engineer."
---

## Welcome to my tiny place on the internet

Hey there, my name is Raphael.

I work at [Lovable](https://lovable.dev/). I created [Rio](https://github.com/raphamorim/rio) terminal emulator and the [Jam](https://jamlang.org/) programming language.

Previously, I worked at companies like Spotify, Charm, Viaplay, GoDaddy, and Globo.com. I have been a speaker at a few conferences.

At Lovable, I brought [OJ](https://oj-slides.rapha850.workers.dev/#1) (a Rust-based dev server I originally built in my spare time) into the organization and its preview infrastructure, making previews 2.2x faster while reducing dev-server memory drastically (up to 6.5x times less). I also helped establish the performance working group and improve preview stability, alongside broader engineering contributions.

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
		<div class="date">Nov 2025</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=ntnJ83v2DrU">Terminals are just text? Think again</a></div>
	</div>
	<div class="section">
		<div class="date">Nov 2023</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=wvccOkvpbY0">Bring Gameboy alive in the Web with Rust and WebAssembly</a></div>
	</div>
	<div class="section">
		<div class="date">Nov 2018</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=Hz_WTWb3sV4">Writing Your Own React Renderer</a></div>
	</div>
	<div class="section">
		<div class="date">Aug 2015</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=toCdZ2e9Dh4">500 Days of Open Source</a></div>
	</div>
</div>
