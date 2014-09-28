---
layout: post
title: 'Hello, my name is Docker'
description: 'Docker is an open platform for developers and sysadmins to build, ship, and run distributed applications. This means
it can automates the deployment of applications inside software containers, by providing an additional layer of
abstraction and automation of operating system–level virtualization on Linux.'
link: 'http://raphamorim.github.io/hello-my-name-is-docker/'
language: 'en'
image: 'assets/images/posts/docker.jpg'
---

####<img src="/assets/images/posts/docker.jpg" alt="Docker" />

Let's start to build together a simple application using [docker](http://docker.io). This posts is actually a short guide for beginners about how to use this technology.

<!-- more -->

### What's Docker?

Docker is an open platform for developers and sysadmins to build, ship, and run distributed applications. This means
it can automates the deployment of applications inside software containers, by providing an additional layer of
abstraction and automation of operating system–level virtualization on Linux. Docker uses resource isolation
features of the Linux kernel such as cgroups and kernel namespaces to allow independent "containers" to
run within a single Linux instance, avoiding the overhead of starting virtual machines.

With Docker, developers can build any app in any language using any toolchain and sysadmins use it to provide standardized environments for their development.
Docker can be integrated into various infrastructure tools, including Ansible, CFEngine, Chef, Jenkins, OpenStack Nova, OpenSVC,Puppet, Salt and Vagrant.

Any aditional question about how docker works, you can find here: [what is docker?](https://www.docker.com/whatisdocker/)

### Docker Containers

Docker containers are basically directories which can be packed like any other, then shared and run across various different machines and platforms.

### Docker Images

Snapshots of containers or base OS (example: Ubuntu) images. Similar to default operating-system disk images which are used to run applications on desktop computers.

### Dockerfiles

Dockerfiles are scripts containing a series of instructions and commands which are to be executed to form a new docker image. They basically replace the process of doing everything manually and repeatedly.
When a Dockerfile is finished executing, you end up having formed an image, which then you use to create a new container.

Any aditional question about how dockerfiles works, you can find here: [Dockerfiles usage](https://docs.docker.com/reference/builder/)

### Installing Docker

Before proceeding, you must have installed the docker. Follow the docs on [installation guide](http://docs.docker.com/installation/)

### So now you've got docker!

Once you have docker installed. You have to know the docker CLI consists of passing it a chain of params, you can get a help typing the following command:

<div class="code">

<code>docker</code>

</div>

Or check docker information and version:

<div class="code">

<code># Check docker system-wide information</code>

<code>sudo docker info</code>

<br>

<code># Check docker version</code>

<code>sudo docker version</code>

</div>

In this guide the used client version is 1.2.0 and used client API version is 1.14.

### OS X cases

If you use OS X, read this first: For OS X cases, you need a helper application called Boot2Docker that installs a virtual machine (using VirtualBox) that's all set up to run the Docker daemon. You initialize Boot2Docker from the following commands:

<div class="code">

<code>$ boot2docker init</code>

<code>$ boot2docker start</code>

<code>$ export DOCKER_HOST=tcp://192.168.59.103:2375</code>

</div>

### Starting with Docker

In this guide I've publish a project in [github](https://github.com/raphamorim/docker-guide). In this project have a Dockerfile to build docker image, using nodejs.

Hint: You can check other Dockerfiles examples [here](http://dockerfile.github.io).

We'll use this project as base to this guide. Clone or fork the project to continue. So open the project folder and run to build an image:

<div class="code">
<code>$ docker build -t="docknode" .</code>
</div>

Okay, so now you've got a docker image called "docknode" and you can run that image, using this:

<div class="code">
<code>$ docker run -i -t docknode</code>
</div>

Or to run it in the background

<div class="code">
<code>$ docker run -d docknode</code>
</div>

After this, you'll should receive this:

<div class="code">
<code>Server running at http://127.0.0.1:8080/</code>
</div>

...And you've built your first application running with docker, fast and easy :)

### Understanding how Code works

Dockerfile: This scripts builds a Docker image. It's use ubuntu OS, install nodejs via apt-get and run app.js file using node.

<div class="code">
<code>FROM ubuntu:13.10</code>
<code>MAINTAINER Raphael Amorim</code>
<br>
<code>RUN apt-get update</code>
<code>RUN apt-get install -y nodejs</code>
<code>RUN mkdir /var/www</code>
<br>
<code>ADD app.js /var/www/app.js</code>
<br>
<code>CMD ["nodejs", "/var/www/app.js"]</code>
</div>

App.js: Build a simple nodejs server.

<div class="code">
<code>var http = require('http'),</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;port = process.env.PORT || 8080;</code>
<br>
<code>var server = http.createServer(function (request, response) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;response.writeHead(200, {"Content-Type": "text/plain"});</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;text = "Running Node.js:" + process.versions.node</code>
<br>
<code>&nbsp;&nbsp;&nbsp;&nbsp;response.end(text);</code>
<code>});</code>
<br>
<code>server.listen(port, function(){</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;console.log("Server running at http://127.0.0.1:" + port + "/");</code>
<code>});</code>
</div>

### This is Docker!

Do you like or have any suggestion? I would love to receive your feedback about this post or Docker.
