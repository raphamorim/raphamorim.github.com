---
layout: post
title: 'Setup Clojure in OS X'
description: "Setting up Clojure as CLI, including REPL support. The following instructions are for installing Clojure on Mac OS X 10.11 (El Captain). Although they should work for any *nix based system."
language: 'en'
---

The following instructions are for installing Clojure on Mac OS X 10.11 (El Captain). Although they should work for any *nix based system.

## Dependencies

Considering you already have Java and [Brew](http://brew.sh/index.html) installed (Java 1.5 or greater is require for running Clojure. This already comes pre-installed on OS X). 

## Set the PATH

The PATH variable tells the Terminal where to find the programs that are about to be installed.

Go ahead and open the **~/.profile** and make sure that the PATH variable is set and includes **/usr/local/bin** and **/usr/local/sbin**. You should have a line in the file that looks similar to the following, if not add it to the end of the file.

<div class="code">
<code>export PATH="/usr/local/bin:/usr/local/sbin:$PATH"</code>
</div>

After save file, run the following command:

<div class="code">
<code>source ~/.profile</code>
</div>

## Scripting

Donwload and unzip Clojure:

<div class="code">
<code>curl -O -J -L http://repo1.maven.org/maven2/org/clojure/clojure/1.7.0/clojure-1.7.0.zip</code>
</div>

After unzip open clojure folder and test the build:

<div class="code">
<code>java -cp clojure-1.7.0.jar clojure.main</code>
<code>Clojure 1.7.0</code>
<code>user=> (+ 1 1)</code>
<code>2</code>
<code>user=> (System/exit 0)</code>
</div>

Let's move jar file:

<div class="code">
<code>mkdir /usr/local/lib/clojure && cp clojure-1.7.0.jar /usr/local/lib/clojure/clojure.jar</code>
</div>

rlwrap will make interacting with the Clojure REPL much more friendly. It is not necessary but I recommend it. With rlwrap you will have tab completion, parenthesis matching, and much more.

<div class="code">
<code>brew install rlwrap</code>
</div>

Create clj script:

<div class="code">
<code>vim /usr/local/bin/clj</code>
</div>

Copy the following text into the file:

<p><script src="https://gist.github.com/raphamorim/fd8285d3f7750c274e3e9b54febc49f1.js"></script></p>

Make the script executable:

<div class="code">
<code>sudo chmod +x /usr/local/bin/clj</code>
</div>

Now you should be able to run Clojure from the command line:

<div class="code">
<code>clj</code>
</div>

**clj REPL**

<div class="code">
<code>user=> (+ 3 5)</code>
<code>8</code>
<code>user=> (def A [[0 1 2] [3 4 5] [6 7 8]])</code>
<code>#'user/A</code>
<code>user=> (let [[x y z] (first A)] (println (+ x y z)))</code>
<code>3</code>
<code>nil</code>
<code>user=> (println "Hello, World!")</code>
<code>Hello, World!</code>
<code>nil</code>
</div>

**clj run scripts**

<div class="code">
<code>clj clojure_script.clj</code>
</div>

And that's it!! :) 