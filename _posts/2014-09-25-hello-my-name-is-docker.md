---
layout: post
title: 'Hello, my name is Docker'
description: ''
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

### Starting with docker

For this guide I'll use a simple application using nodejs, you can check the source code on [github](http://github.com/raphamorim).
