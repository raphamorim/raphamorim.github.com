---
layout: post
title: "Understanding React Fiber"
language: 'en'
---

In March 2013 (4 years ago) the react.js appeared, bringing with it ideas and features important to the current scenario - especially virtualdom use - by abruptly changing the frontend world.

The idea of creating web components enjoying [virtual-dom's diff algorithm](https://github.com/Matt-Esch/virtual-dom#motivation), [isomorphic applications](https://medium.com/airbnb-engineering/isomorphic-javascript-the-future-of-web-apps-10882b7a2ebc#.4nyzv6jea) using SSR, [rise of react-native](https://facebook.github.io/react-native/), permission for several approaches like: [containers and presenters](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0), [stateless functional components](https://hackernoon.com/react-stateless-functional-components-nine-wins-you-might-have-overlooked-997b0d933dbc)[...] and others killer features ended up winning and shining eyes from various developers.

Currently we are close to another big change: React Fiber.

What's it? React Fiber is an **reimplementation of React's core** algorithm.
React render has always been precarious for areas focused on animation. Because render process didn't work the way Browser renders.

React is suited well for rendering data structures (for example, rendering the structure of a DOM tree or the structure of a WebGL scene graph) but not for animating things in that structure at 60fps (less than 60fps in the case of a 20ms tick that isn't using requestAnimationFrame).

In a resume: Animate a rotate effect in a component using ONLY React's life cycle (where not modify the virtual nested structure) will suffer performance cost of React's inner workings every frame. So for get high levels of animation performance you've to synchronizate the DOM (tween stack across the entirety of the animation chain in order to minimize layout thrashing) and skipping style updating when updates would be visually imperceptible.

React Fiber takes charge of solving problems like it. Bringing a feature named "incremental rendering" which split rendering work into chunks and spread it out over multiple frames. The new rendering logic allows a better approximation of the principles of an animation.

However Fiber introduces several concepts and new features beyond.

React provides a declarative API so that you don't have to worry about exactly what changes on every update. This makes writing applications a lot easier, but it might not be obvious how this is implemented within React.

Usually after a change of react app data (probably setState usage) results in a re-render. This process is based on [reconciliation](https://facebook.github.io/react/docs/reconciliation.html) (also knowed as "virtual DOM"), react's algorithm which check diff tree to determine what part will be changed. In the end the entire app will re-render, however with optmizations. When a app is updated, is created a new tree. So reconciliation checks the lastest mounted tree with the new one, computing which operations are needed to update.

Fiber is a rewrite focused on this algorithm.

React Fiber Architecture brings a lot of new concepts, [and you can know more about it here](https://github.com/acdlite/react-fiber-architecture). Also Lin Clark talked about Fiber in React Conf 2017, worth to see:

<p><iframe width="100%" height="360" src="https://www.youtube.com/embed/ZCuYPiUIONs" frameborder="0" allowfullscreen></iframe></p>