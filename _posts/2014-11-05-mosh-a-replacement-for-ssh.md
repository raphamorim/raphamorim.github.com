---
layout: post
title: 'Mosh, a replacement for SSH'
description: 'The mosh is a tool used to connect from a client computer to a server over the Internet to perform a remote terminal.'
link: 'http://raphamorim.github.io/mosh-a-replacement-for-ssh/'
language: 'en'
image: 'assets/images/posts/mosh-and-lucario.jpg'
---

####<img src="/assets/images/posts/mosh-and-lucario.jpg" alt="Mosh and Lucario <3" />

Read in portuguese on [iMasters](http://imasters.com.br/desenvolvimento/mosh-um-substituto-para-o-ssh/).

<!-- more -->

If you use SSH constantly, probably some time you may have been annoyed when their connection was slow. Be in delay of command responses sent or even typing something.

To solve these and other problems, Mosh (mobile shell) was created. The mosh is a tool used to connect from a client computer to a server over the Internet to perform a remote terminal.

Mosh is similar to SSH (read as applying to the command line and not as a protocol) with additional features to improve usability. More robust and agile, especially for Wi-Fi and celulares.Você can use it in xterm, gnome-terminal, urxvt, Terminal.app, iTerm, emacs, screen, tmux and others.

You can start an SSH connection from home on your laptop, go to work and come back as if nothing had happened. There is no session connection, you can put your laptop in sleep mode and when to return the connection is intact.

If you get no internet access, Mosh will alert you. And with the return of the internet, the connection will work fine and the point where you stopped.

Excellent for slow connections, also as quick. Perhaps the biggest advantage is the Mosh avoid and escape the lag. We know that the SSH server waits for a response before showing what you typed.

Mosh is different: it gives an instant response typing, deleting, and editing. He does so in an adaptive manner, working quietly in programs that use full screen as a resource (eg: vim and emacs). In a bad connection, pending keystrokes are highlighted, so you will not be deceived.

Another advantage is the famous Ctrl-C work perfectly.

Unlike SSH, Mosh is a protocol based on UDP, so it handles very well with packet loss and sets the frame rate based on network conditions.

Yes, Mosh is amazing and you probably should be asking, "How do I start using the mosh" Simply access the [official website of Mosh](https://mosh.mit.edu). There have all documentation.

Best of all: Mosh is free software available for GNU / Linux, FreeBSD, Solaris, Mac OS X, and Android.

