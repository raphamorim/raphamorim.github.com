---
layout: post
title: "Creating Games to PSP using C"
description: 'By the time I turned on my PSP, I realized that most of the games I never was not bought. Do not get me wrong, but for a kid in school it was like a dream.'
language: 'en'
image: 'assets/images/posts/psp.jpg'
---

I am not sure why he was lying in my bed thinking of good games I played. Then I remembered several video games that I had, then came to my head: "Raphael your PSP is in the box. Let's play a game!"

<!-- more -->

By the time I turned on my PSP, I realized that most of my games I never  bought any them. Do not get me wrong, but when you're a kid in school it's a kind of a dream. Then I wondered if I could create something, since the PSP firmware lost the war.

## Requirements

You also need to have acquired some knowledge of general programming in the 'C' language and a have PSP.

Install tools to develop it in: [PSP Toolchain](https://github.com/pspdev/psptoolchain).

## Developing

Create a folder named “common”. This folder will contain several files which will often be used in our programs.

### callback.h

Create a new file with the name "callback.h". This header file will declare some info needed.

<div class="code">
<code>#ifndef COMMON_CALLBACK_H</code>
<code>#define COMMON_CALLBACK_H</code>
<code> </code>
<code>int isRunning();</code>
<code>int setupExitCallback();</code>
<code> </code>
<code>#endif</code>
</div>

### callback.c

Create a new file with the name "callback.c". Include the file "pspkernel.h" which gives us access to several kernel methods.

<div class="code">
<code>#include < pspkernel.h ></code>
</div>

Next we create a boolean. Executing the method "isRunning()" will tell us whether a request to exit the application was created by the user. We will use this function in our program so that we can clean up any leftover memory, and exit gracefully.

<div class="code">
    <code>static int exitRequest  = 0;</code>
    <code> </code>
    <code>int isRunning() {</code>
    <code>&nbsp;&nbsp;return !exitRequest;</code>
    <code>}</code>
</div>

Create a new thread, which will create an exit callback. The callback will then make "exitRequest" equal to true if the user presses the "home" or "exit" button on the PSP.

<div class="code">
<code>#include < pspkernel.h ></code>
<code> </code>
<code>static int exitRequest  = 0;</code>
<code> </code>
<code>int isRunning() {</code>
<code>&nbsp;&nbsp;return !exitRequest;</code>
<code>}</code>
<code>int exitCallback(int arg1, int arg2, void *common) {</code>
<code>&nbsp;&nbsp;exitRequest = 1;</code>
<code>&nbsp;&nbsp;return 0;</code>
<code>}</code>
<code></code>
<code>int isRunning() {</code>
<code>&nbsp;&nbsp;return !exitRequest;</code>
<code>}</code>
<code></code>
<code>int callbackThread(SceSize args, void *argp) {</code>
<code>&nbsp;&nbsp;int callbackID;</code>
<code></code>
<code>&nbsp;&nbsp;callbackID = sceKernelCreateCallback("Exit Callback", exitCallback, NULL);</code>
<code>&nbsp;&nbsp;sceKernelRegisterExitCallback(callbackID);</code>
<code>&nbsp;&nbsp;sceKernelSleepThreadCB();</code>
<code></code>
<code>&nbsp;&nbsp;return 0;</code>
<code>}</code>
<code></code>
<code>int setupExitCallback() {</code>
<code>&nbsp;&nbsp;int threadID = 0;</code>
<code></code>
<code>&nbsp;&nbsp;threadID = sceKernelCreateThread("Callback Update Thread", </code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;callbackThread, 0x11, 0xFA0, THREAD_ATTR_USER, 0);</code>
<code></code>
<code>&nbsp;&nbsp;if(threadID >= 0) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;sceKernelStartThread(threadID, 0, 0);</code>
<code>&nbsp;&nbsp;}</code>
<code>&nbsp;&nbsp;return threadID;</code>
<code>}</code>
</div>

## Hello World!

Let's create a simple "Hello World!" program.

### main.c

Include “pspkernel.h” which will allow us to exit the application, "pspdebug.h" so that we can get a simple debug screen started, "pspdisplay.h" for "sceDisplayWaitVblankStart" function, and "callback.h".

<div class="code">
    <code>#include < pspkernel.h ></code>
    <code>#include < pspdebug.h ></code>
    <code>#include < pspdisplay.h ></code>
    <code></code>
    <code>#include "../common/callback.h"</code>
</div>

We will tell the PSP a little about our program. In "PSP_MODULE_INFO" we will tell it the name of our program, any attributes, and its major and minor version. Define "pspDebugScreenPrintf" as "printf" which will allow us to type text on the screen.

<div class="code">
<code>#define VERS    1 //Talk about this</code>
<code>#define REVS    0</code>
<code></code>
<code>PSP_MODULE_INFO("Hello World", PSP_MODULE_USER, VERS, REVS);</code>
<code>PSP_MAIN_THREAD_ATTR(PSP_THREAD_ATTR_USER);</code>
<code>PSP_HEAP_SIZE_MAX();</code>
<code></code>
<code>#define printf pspDebugScreenPrintf</code>
</div>

So, first we will initialize the debug screen, and setup our callbacks. Then inside a loop we place the position to write to at (0,0). Once the user quits and the loop is broken (remember we are using the "isRunning()" method), we do a last call to "sceKernelExitGame()" which will exit our application.

<div class="code">
<code>int main() {</code>
<code>&nbsp;&nbsp;pspDebugScreenInit();</code>
<code>&nbsp;&nbsp;setupExitCallback();</code>
<code></code>
<code>&nbsp;&nbsp;while(isRunning()) {</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;pspDebugScreenSetXY(0, 0);</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;printf("Hello World!");</code>
<code>&nbsp;&nbsp;&nbsp;&nbsp;sceDisplayWaitVblankStart();</code>
<code>&nbsp;&nbsp;}</code>
<code>&nbsp;&nbsp;</code>
<code>&nbsp;&nbsp;sceKernelExitGame();</code>
<code>&nbsp;&nbsp;return 0;</code>
<code>}</code>
</div>

Now if you are using an IDE that can also compile your PSP programs and get the "EBOOT.PBP". If chose do it manually, then we will have to create the Makefile before compiling.

## Makefile

Create a "Makefile" in your project directory.

<div class="code">
<code>TARGET      = hello_world</code>
<code>OBJS        = main.o ../common/callback.o</code>
<code></code>
<code>INCDIR      =</code>
<code>CFLAGS      = -G0 -Wall -O2</code>
<code>CXXFLAGS    = $(CFLAGS) -fno-exceptions -fno-rtti</code>
<code>ASFLAGS = $(CFLAGS)</code>
<code></code>
<code>LIBDIR      = </code>
<code>LDFLAGS = </code>
<code>LIBS        = -lm</code>
<code></code>
<code>BUILD_PRX = 1 </code>
<code></code>
<code>EXTRA_TARGETS   = EBOOT.PBP</code>
<code>PSP_EBOOT_TITLE= Hello World</code>
<code></code>
<code>PSPSDK  = $(shell psp-config --pspsdk-path)</code>
<code>include $(PSPSDK)/lib/build.mak</code>
</div>

Run “make”, place the eboot.pbp in a folder on your PSP (no other files needed) and run it.