## Write in [raphamorim.com](http://raphamorim.com)

Create a file in `_posts` with the article date + title (lowcase) as filename. Like:

Filename: `2016-05-22-creating-with-webgl-part-1.md`

```markdown

---
layout: post
title: "Creating with WebGL • Part 1"
description: 'Some Amazing Description'
link: 'http://raphamorim.github.io/creating-with-webgl-part-1'
language: 'en'
image: 'assets/images/posts/webgl-1.jpg'

author: ['Raphael Amorim', 'raphamundi']
---

Lorem ipsum dolor sit amet, consectetur adipisicing elit. Incidunt corporis amet cum quidem qui excepturi porro modi saepe animi, sequi dolores, quo beatae libero optio, illum dolorem, voluptatem reiciendis. Magni?

<!-- more -->

Continues here...

```

## How it works?

I use [Jekyll](http://jekyllrb.com/), a static generator in Ruby, to create this blog.

## First steps

1. Install [Git](http://git-scm.com/downloads) and [Ruby](http://www.ruby-lang.org/pt/downloads/), in case you don't have them yet.

2. Once installed these dependencies, open up the terminal and install [Jekyll](http://jekyllrb.com/) with the following command:

  ```sh
  $ gem install jekyll
  ```

3. Now clone the project:

  ```sh
  $ git clone git@github.com:raphamorim/raphamorim.github.com.git
  ```

4. Navigate to the project folder:

  ```sh
  $ cd raphamorim.github.com
  ```

5. And finally run:

  ```sh
  $ jekyll
  ```

You'll have access to the website at `http://0.0.0.0:4000/` :D

## Tips

Run `grunt` for every little or bigger change on css/js files:

  ```sh
  $ grunt
  ```

## About

Credits: Inspired by Andy Taylor and [Zeno Rocha](http://github.com/zenorocha).

License: **MIT** License © [Raphael Amorim](http://github.com/raphamorim).
