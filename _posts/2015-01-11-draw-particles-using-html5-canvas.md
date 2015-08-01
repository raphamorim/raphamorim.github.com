---
layout: post
title: 'Draw particles using HTML5 Canvas'
description: 'Canvas for me has been the most fun technology in HTML5. The
amount of cool things that can create only drawing geometric figures is very broad.'
link: 'http://raphamorim.github.io/draw-particles-using-html5-canvas'
language: 'en'
image: 'assets/images/experiments/particles.jpg'
---

Originally published in the medium, [read
here](https://medium.com/@raphamorim/draw-particles-using-html5-canvas-6151ab214f7a).
You can read on portuguese too,
[here](http://imasters.com.br/front-end/web-standards/desenhando-particulas-usando-html5-canvas/)

<!-- more -->

Canvas for me has been the most fun technology in HTML5. The amount of cool
things that can create only drawing geometric figures is very broad.

But many people think it’s too hard to learn. **And it’s not**.

Of course, know and have a good base geometry is very important. But if you do
not know much, you can create simple things.

###Let’s start coding!

In your HyperText Markup Langu… I mean: HTML file. Create a simple structure and
add a canvas tag with a random class, in this example it shall be called
"particles". And before the closing body tag, make the call the javascript file
that will create called “particles.js”

<div class="code">
        <code>&lt;canvas class="particles"&gt;&lt;/canvas&gt; </code>
        <code></code>
        <code>&lt;script src="particles.js"&gt;&lt;/script&gt;</code>
        <code>&lt;/body&gt;</code>

</div>

Now in particles.js, let’s start the magic : )

I’ll explain some parts of the code. To get better understanding. This code is
on GitHub (this link).

In the first part, a function was created to define the body and canvas,
   stylizing the basics. Note that I did not create any CSS file, I just
   applying the process startup.

<div class="code">
   <code>window.onload = function() {</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;var body = document.querySelector(‘body’);</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;body.style.background = ‘#2C2C44';</code>
   <code></code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;canvas = document.getElementById(‘particles’),</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ctx = canvas.getContext(‘2d’);</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;body.style.margin = ‘0px’;</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;canvas.style.margin = ‘0px’;</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;canvas.style.padding = ‘0px’;</code>
   <code></code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;canvas.width = canvas_width;</code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;canvas.height = canvas_height;</code>
   <code></code>
   <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;draw = setInterval(update, speed);</code>
   <code>}</code>
</div>

I define some variables, such as speed of events and canvas size. Of course it’s
not cool to be creating global variables, but I thought it would be more
didactic.

In this project I am not using requestAnimationFrame but recommend taking a good
look.

Why use requestAnimationFrame? "The browser can optimize concurrent animations
together into a single reflow and repaint cycle, leading to higher fidelity
animation. For example, JS-based animations synchronized with CSS transitions or
SVG SMIL. Plus, if you’re running the animation loop in a tab that’s not
visible, the browser will not keep it running, Which means less CPU, GPU, and
memory usage, leading to much longer battery life".

Source of study for requestAnimationFrame: (this link)


<div class="code">
<code>// Settings</code>
<code>var speed = 35,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;canvas_width = window.innerWidth,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;canvas_height = window.innerHeight;</code>
</div>

After that I created other global variables (never do that on your real project,
        is just to get better teaching) to set canvas instance, times that
particles have been created, limit for particles, draw global function, array
list of particles have been created and the colors used for generate randomic
items.

<div class="code">
<code>var canvas,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;times = 0,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;limit = 100,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;draw,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;particles = [],</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;colors = [‘#F0FD36', ‘#F49FF1', ‘#F53EAC’, ‘#76FBFA’];</code>
</div>

If we are creating something that needs randomness in position, size and color
of the particle. Why not use a function to deliver it. Not the best solution,
   but it is practical and easy to understand.

<div class="code">
<code>var getRand = function(type) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;if (type === ‘size’)</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return
(Math.floor(Math.random() * 8) * 10)</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;if (type === ‘color’)</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return
Math.floor(Math.random() * colors.length)</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;if (type === ‘pos’)</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return [</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Math.floor(Math.random()
            * 200) * 10),</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Math.floor(Math.random()
            * 80) * 10)</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;return false</code>
<code></code>
<code>};</code>
</div>

Okay, now let’s create a generic function to create particles from arguments.
Pretty simple right?

<div class="code">
<code>var drawParticle = function(x, y, size, color, opacity){</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.beginPath();</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.globalAlpha = opacity;</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.arc(x, y, size, 0, 2 * Math.PI);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.fillStyle = color;</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.fill();</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.strokeStyle = color;</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.stroke();</code>
<code>}</code>
</div>

Remember the update function? It is was put to run on setInterval within the
function loaded on window.onload. It is the magic of drawing the particles and
controlling the limit.

Realize that every particle designed, it also saves the particle list an object
with information about it.

<div class="code">
<code>function update(args) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;var color = colors[getRand(‘color’)],</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;pos =
getRand(‘pos’),</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;size =
getRand(‘size’),</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;opacity = 1;</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;drawParticle(pos[0], pos[1], size, color,
        opacity);</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;times++;</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;particles.push([pos[0], pos[1], color, opacity,
        size]);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;if (times >= limit) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;clearInterval(draw);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;draw = setInterval(clean,
        speed);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;}</code>
<code>}</code>
</div>

So far she only plays the particles on the screen, but still does not erase or
start all over again.

To take care of this there is the clean function, which is executed when the
particle limit is reached. This function reads each particle and updates its
opacity, giving a visual effect of fadeOut.

<div class="code">
<code>function clean() {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;ctx.clearRect(0, 0, canvas_width,
        canvas_height);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;particles.forEach(function(p) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/*</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p[0] = x,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p[1] = y,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p[2] = color</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p[3]
= globalAlpha,</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p[4]
= size</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*/</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p[3] = p[3] — 0.06;</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;drawParticle(p[0], p[1],
    p[4], p[2], p[3])</code>
<code></code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (p[p.length — 1] &&
    p[3] <= 0.0) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ctx.clearRect(0,
    0, canvas_width, canvas_height);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;clearInterval(draw);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;times
= 0;</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;particles
= []</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;draw
= setInterval(update, speed);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;});</code>
<code>}</code>
</div>

Now if you run in your browser, you’ll see a nice canvas (you can see here too).
This code needs refactoring, if you want you can send a PR on github. The idea
was to show how simple it is to create canvas.

Have an different idea? give her a chance.
