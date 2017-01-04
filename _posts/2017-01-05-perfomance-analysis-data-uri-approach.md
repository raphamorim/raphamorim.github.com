---
layout: post
title: 'Perfomance Analysis #1: Data URIs'
description: 'The idea of this article is to demystify some concepts about Data URIs related to perfomance. The data URI is a uniform resource identifier (URI) scheme that provides a way to include data in-line in web pages...'
language: 'en'
---

tl;dr: The idea of this article is to demystify some concepts about Data URIs related to perfomance.

**What's Data URI?**

The data URI is a uniform resource identifier (URI) scheme that provides a way to include data in-line in web pages. 

It's a form of file literal or [here document](https://en.wikipedia.org/wiki/Here_document). This technique allows normally separate elements such as images and style sheets to be fetched in a single HTTP request, instead use multiple HTTP requests.

In Resume: It's a base64 encoded data (e.g. images) resulting in bites. It can be used to improve performance (or in some cases decrease perfomance).

**About Cache**

Data URIs have cache limitations. Why? It's part of the file that include. A good approach is to use in CSS files, because you can work around in a custom/specified cache. In scenarios where use inline approach, will be cached only the part of the HTML cache control header. Then if the HTML isn't cached yet, the entire content of markup will be re-downloaded every time (including data URIs content-length).

This is bad.

HTML can have no cache or a very very limited cache. So just imagine a case where a page have ten tag img (let's assume each one image have 9kb) which use a source based on Data URI, it'll agreggate **~108kb** uncacheable data (~12kb for each one) on your HTML file.

Note: Base64 encoding incurs transfer size overhead of [1.37 times the original data, with another 814 bytes of header data](https://en.wikipedia.org/wiki/Base64#MIME).

**Data URIs are slower in mobile**

Data URI vs. Binary Image Materialization is a old topic on web and you  probably be tired of hearing about it again and again. However it's cool to demystify some myths/beliefs.

I maded some tests against Data URI materialization using Binary materialization and I get unexpected results that I've no idea.

**Data URI**

- Android 2.2: 1702ms
- Android 4.2: 167ms
- iPhone iOS 5: 491ms
- iPhone iOS 7: 201ms

**Binary Image**

- Android 2.2: 142ms
- Android 4.2: 44ms
- iPhone iOS 5: 51ms
- iPhone iOS 7: 32ms

**But why it happens?**

The data URI content must be decoded back into it's original form by the browser. This operation consumes CPU & battery on mobile devices (browser must decode the image each time a page renders).

Binary images, on the other hand, require no extra decoding step and are fast for browsers to materialize. The downside of binary images is the connection overhead required to download them.

Note: Recent browsers use optimizations to improve networking performance, in particular connection keep-alive and pipelining, as well as establishing multiple server connections. If you’ve done a good job optimizing your pages, chances are the image is being downloaded from a warm, established connection, reducing TTFB and increasing throughput.

**Browser Support**

(In case of doubt; worth mention)

- • Chrome (all versions)
- • Safari (all versions)
- • Edge (all versions)
- • Firefox 2+
- • Opera 7.2+ (not longer than 4100 characters)
- • Internet Explorer 8+ (data URIs must be smaller than 32KB)

## Further Readings and References

Good to know/read: 

- • [Nicholas Zakas’ great post (Data URIs explained)](https://www.nczonline.net/blog/2009/10/27/data-uris-explained/)
- • [On Mobile, Data URIs are 6x Slower than Source Linking](http://dev.mobify.com/blog/data-uris-are-slow-on-mobile/)
- • [Performance check: CBC’s logo as pure CSS, Data URI and simple PNG on the scale](http://www.bbinto.me/aspnet/performance-check-the-weight-of-cbcs-logo-as-pure-css-data-uri-and-simple-png/)
- • [High Performance Web Apps. Use Data URIs. Theory](http://ovaraksin.blogspot.com.br/2012/04/high-performance-webapps-use-data-uris.html)
- • [High Performance Web Apps. Use Data URIs. Practice](http://ovaraksin.blogspot.com.br/2012/04/high-performance-webapps-use-data-uris_15.html)
