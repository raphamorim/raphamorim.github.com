---
layout: home
class: home
title: 'Raphael Amorim'
language: 'en'
description: "I am Raphael Amorim. Software Developer Engineer. I love Japanese culture (親日), 70s/80s songs and a lot of 8bit art."
---

## About

My name is Raphael, and I am software artisan.

Previously, I worked at companies like Viaplay, Spotify, GoDaddy, and Globo.com. I have been a speaker at a few [conferences](#talks). I am an enthusiast about compilers, WebAssembly, and Rust.

I was responsible for Viaplay's adoption of the Rust language. I built the starter infrastructure, released the first service for production, and actively worked on developing a Rust culture, which led to the language's adoption in the upcoming years, along with many other feats. [See when it all started](https://www.linkedin.com/posts/hugoraphael_i-dont-post-very-often-in-the-linkedin-but-activity-6975346956734738432-Csqi).

Currently, I am having fun building a terminal application written in Rust, called [Rio](https://github.com/raphamorim/rio).

I also like to create music. If you want to listen, check out [Apple Music](https://music.apple.com/se/artist/raphael-amorim/1547161397?l=en) or [Spotify](https://open.spotify.com/artist/6Ij2Lu765q7pjWuXHOUF0s).

## Books

<div class="sections">
	<div class="section">
		<div class="date">Aug 2023</div>
		<div class="title">Desmitificando WebAssembly (English title: Demystifying WebAssembly)</div>
	</div>
</div>

## Talks

<div class="sections">
	<div class="section">
		<div class="date">Jul 2019</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=0--wKsxl-i4">UI Engineering with WebAssembly and React</a> - Front In Sampa</div>
	</div>
	<div class="section">
		<div class="date">Nov 2018</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=Hz_WTWb3sV4">Writing Your Own React Renderer</a> - React Day Berlin</div>
	</div>
	<div class="section">
		<div class="date">Oct 2018</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=Hz_WTWb3sV4">Writing Your Own React Renderer</a> - React Conf Brazil</div>
	</div>
	<div class="section">
		<div class="date">Sep 2017</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=QYHL7xxwGCM">Understanding Memory Behavior on NodeJS</a> - The Conf</div>
	</div>
	<div class="section">
		<div class="date">Nov 2016</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=BuSP89XOTro">Using Canvas Components</a> - Graphical Web UK</div>
	</div>
	<div class="section">
		<div class="date">Oct 2016</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=1Mr1hgUsTTA">500 Days of Open Source</a> - Python Brazil</div>
	</div>
	<div class="section">
		<div class="date">Jul 2016</div>
		<div class="title">The Mighty WebGL - Free Software International Forum</div>
	</div>
	<div class="section">
		<div class="date">Aug 2015</div>
		<div class="title"><a href="https://www.youtube.com/watch?v=toCdZ2e9Dh4">500 Days of Open Source</a> - BrazilJs</div>
	</div>
</div>

## Projects

Escapades in research and development, ranging from serious research projects to one-off diversions.

<div class="sections">
	<div class="section">
		<div class="project">Rio</div>
		<div class="project-info">I wrote a terminal called Rio, which is built over WebGPU, WebAssembly and Rust. The WebGPU API makes it suitable for general purpose graphics and compute on the GPU.<br/><br/>
		Rio terminal is largely used by many developers nowadays, having featured multiple times into Github's trending projects.<br/><br/>
		Github: <a href="https://github.com/raphamorim/rio">https://github.com/raphamorim/rio</a><br/>
		Webiste: <a href="https://raphamorim.io/rio/">https://raphamorim.io/rio</a><br/>
		Hacker News: <a href="https://news.ycombinator.com/item?id=36057687">https://news.ycombinator.com/item?id=36057687</a><br/>
		Product Hunt: <a href="https://www.producthunt.com/posts/rio-terminal">https://www.producthunt.com/posts/rio-terminal</a><br/>
		<br/>
	</div>
	</div>
	<div class="section">
		<div class="project">React TV</div>
		<div class="project-info">React TV is an ecosystem for TV based React applications (from the renderer to CLI for pack/build applications).<br/><br/>
		The development of React TV has stopped and the project is not longer maintained however has been responsible for few hundreds of applications releases for TVs. React TV has also featured on Github trending worldwide project list.<br/><br/>
		Github: <a href="https://github.com/raphamorim/react-tv">https://github.com/raphamorim/react-tv</a><br/>
		Medium: <a href="https://medium.com/@raphamorim/developing-for-tvs-with-react-tv-b5b5204964ef">https://medium.com/@raphamorim/developing-for-tvs-with-react-tv-b5b5204964ef</a><br/>
	</div>
	</div>
	<br/>
	<div class="section">
		<div class="project">React Ape</div>
		<div class="project-info">React Ape tries to solve same problem that React TV target to fix but uses a different approach. React Ape does not use <i>Document Object Model</i> for rendering, instead uses <i>HTML5 Canvas</i> and WebGL.<br/><br/>
		The reason behind React Ape choices is that craft a high-performance TV user interface based on <i>DOM</i> is a real challenge, because of limited graphics acceleration, single core <i>CPUs</i> and high memory usage for a common TV App. These restrictions make any user experience targetting 60 <i>frames per second</i> quite tricky on the development side. The strategy is step in the renderer based on a hardware-accelerated canvas.<br/><br/>
		Github: <a href="https://github.com/raphamorim/react-ape">https://github.com/raphamorim/react-ape</a><br/>
		Hacker News: <a href="https://news.ycombinator.com/item?id=31492028">https://news.ycombinator.com/item?id=31492028</a>
		</div>
	</div>
</div>

<!-- ## Employment

<div class="sections">
	<div class="section">
		<div class="date">Nov 2022 – Present</div>
		<div class="project-info">
			<strong>Viaplay</strong>, <i>Senior Software Engineer</i><br/>
			Currently working on creating tooling and infrastructure ready for Rust in Viaplay, teaching the language in internal workshops and creating the first Rust microservices in the company. Also doing daily tasks that consists in developing on backend and on the frontend with Reactjs.</p><br/><br/></div>
	</div>
</div> -->

## Volunteering

<div class="sections">
	<div class="section">
		<div class="project">Teacher</div>
		<div class="project-info">
			Django Girls (2015-2017)
			<p>Django Girls is a non-profit organization that empowers and helps women to organize free, one-day programming workshops by providing tools, resources and support.</p><br/><br/></div>
	</div>
	<div class="section">
		<div class="project">Teacher</div>
		<div class="project-info">
			Mozilla (2015-2016)
			<p>The Rio Mozilla Club was a social project that seeks to transform Lan Centers in multidisciplinary areas of informal learning and exchange of experience in digital culture. We want to make web users in content producers and not just consumers of media.</p>
			<p>We believe digital skills are essential for participation in the 21 century and everyone can take more advantage about the knowledge in the many areas of Internet, Web and content creation.<br/><br/></p>
		</div>
	</div>
</div>