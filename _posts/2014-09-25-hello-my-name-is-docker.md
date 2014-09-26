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

### Installing Docker

Before proceeding, you must have installed the docker. Follow the docs on [installation guide](http://docs.docker.com/installation/)

### Starting with docker

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

In this guide the used client version is 1.2.0 and used client API is version: 1.14.
