---
layout: post
title: "When AST has saved my Project"
description: ""
link: 'http://raphamorim.github.io/when-AST-save-my-project'
language: 'en'
image: 'assets/images/posts/code-ast.jpg'
---

For people who don't now. I've created [ranza](http://github/raphamorim/ranza) for check unusable dependencies. Why? To avoid accumulation of dependencies that are not being used....

<!-- more -->

The Ranza initially was using **fs** module to read files and apply an regex in all data to catch all requires in that file. Working only for Nodejs projects.

Well, in that time I don't realized wich using that technique for get all requires in the file/project was a problem.

### Why?

I've made a good regex. It've work for regular (most) cases. But regex  is dump. This technicle only will work for cases who I know. So with time I realized other cases, other ways to require a dependency. And  EVERY TIME I update and improve the regex (Dear Lord, it was so much boring).

**I can't trust in my own logic, even with tests**, cause every week a discover new things, new ways to apply a require. This things made ranza unstable.

The time has passed and I realized: "Well, this project will never work for ES6". That's sucks, cause my idea for futures releases is ranza work to client-side dependencies too (like an uncss for JS).

So, a friend of mine tell me for use [Abstract Syntax Three (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) to get the requires callers. The idea is amazing, it's solve all my problems and I can remove the regex.

So, I made an AST file using Reflect node module, but this module only works for ES3. This could become a problem if the source file doesn't have colons or slashes for instance. And it won't work for newer versions like ES4 or ES5. Aww, man!

Also, I wanted Ranza to be able to work for ES6, which uses import instead of require. So, I took a look in the babel-core compiler (ES6 compiler), and I came up with a solution. I could transform ES6 in ES5, then later on, I would fix issues with ES3 syntax.

But I found a pot of gold.

In babel-core exists a **parser** method. Which convert ES6, ES5 code syntax in AST. So I decided reuse this method in ranza and now my project is stable. I've no fear for using this module.

From now, the changes in ranza is only for improvements and bugs fixes (I guess te-hehehe) <3




