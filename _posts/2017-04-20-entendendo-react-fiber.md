---
layout: post
title: "React Fiber - O que muda agora?"
language: 'pt-br'
---

Read in [english](http://raphamorim.io/understanding-react-fiber-incremental-rendering-feature/).

Em março de 2013 (há 4 anos atrás), o React.js apareceu trazendo consigo novas ideias e features para o cenário atual - destaque ao uso do virtual-dom - onde eventualmente foram se tornando realidade no mundo frontend.

A ideia de criar componentes onde se beneficiassem do uso do [algoritmo de diff do virtual-dom](https://github.com/Matt-Esch/virtual-dom#motivation), [aplicações isomórficas](https://medium.com/airbnb-engineering/isomorphic-javascript-the-future-of-web-apps-10882b7a2ebc#.4nyzv6jea) usando SSR, [surgimento do react-native](https://facebook.github.io/react-native/), diversidade na abordagem de desenvolvimento como [containers e presenters](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0), [stateless functional components](https://hackernoon.com/react-stateless-functional-components-nine-wins-you-might-have-overlooked-997b0d933dbc)[...] e tantas outras features foram enchendo os olhos de diversos desenvolvedores.

Atualmente estamos caminhando para outra grande mudança: React Fiber.

Mas o que exatamente é isso? React Fiber **é uma reescrita do algoritmo core do React**. O processo de render do React sempre foi muito precário para diversas áreas baseadas em animação, pois o mesmo não funciona do jeito que o [browser renderiza](http://raphamorim.io/optimizing-the-critical-rendering-path/).

O React se encaixa muito bem para renderizar estruturas de dados (por exemplo; renderizar uma DOM structure ou um WebGL scene graph) mas não para animar qualquer coisa em 60fps (menos de 60fps no caso de um tick de 20ms que não está usando requestAnimationFrame).

É bem simples chegar a essas conclusões: tente animar um simples efeito de rotação em um componente apenas usando o lifecycle do React (onde não irá modificar a estrutura virtual), visivelmente você verá que o React irá cobrar um custo de perfomance por cada frame rodado. Sabemos para obter níveis mais altos de perfomance para animação, temos que sincronizar o DOM (imitando a pilha através da totalidade da cadeia de animação, a fim de minimizar o thrashing layout) e pular updates de estilos (layout render process) quando for algo que visualmente seja imperceptível.

React Fiber promete resolver problemas como esse. Trazendo consigo uma feature conhecida como "incremental rendering", ela divide o trabalho de renderização em pequenos pedaços e distribui entre múltiplos frames. Essa nova lógica de renderição permite uma melhor aproximação dos [princípios de uma animação](https://en.wikipedia.org/wiki/12_basic_principles_of_animation).

Na maneira tradicional; React usa uma pilha (stack) de processos de renderização onde se comportam de maneira síncrona e recursiva. Isso impossibilita dividir esses processos em pedaços, além de possuir um contexto pesado para reproduzir e [outros problemas](https://github.com/facebook/react/issues/7942). Fiber implementa o reconciliation de forma assíncrona (irei explicar mais a respeito sobre isso), determinando a prioridade de diferentes tipos de processos. Além de permitir pausar e parar processos.

A parte interna do Fiber usa requestAnimationFrame e as APIs de requestIdleCallback. É iterativa, não recursiva. Logo não irá "dropar" frames, já que faz jus aos processos de Layout e Paint do browser.

## Exemplo com Pilha (stack)

![Stack Sample](/assets/images/posts/stack-example.gif)

## Exemplo com Fiber

![Fiber Sample](/assets/images/posts/fiber-example.gif)

Entretanto Fiber introduz uma série de novos conceitos e features além.

Sabemos que o React provê uma API declarativa onde você não precisa se preocupar em exato como o que irá mudar em cada update. Isso permite escrever a aplicação de forma simples, mas não é tão "óbvio" entender a maneira que tudo isso é implementado no React.

Normalmente depois de cada mudança de dados no react app (provalvemente um uso de setState) irá resulta em renderizar o que já foi renderizado. Este processo se baseia em um algoritmo conhecido como [reconciliation](https://facebook.github.io/react/docs/reconciliation.html) (ou popularmente conhecido como "virtual DOM"), onde executa checagens de diff tree para determinar qual parte que foi alterada. Em um grosso modo: a aplicação por inteira é renderizada, porém com otimizações. Quando uma app é atualizada, é criado uma nova árvore de dados. Então o reconciliation verifica a última árvore montada e compara com a mais recente, onde assim irá computar que tipo de operações serão executadas no processo de renderização.

Fiber é uma reescrita totalmente baseada neste algoritmo/comportamento.

Esta arquitetura trás diversos conceitos novos e [você poder aprender mais sobre eles no resumo do @acdlite](https://github.com/acdlite/react-fiber-architecture). Neste ReactConf, a Lin Clark falou a respeito sobre o Fiber, vale bastante ver a palestra para entender melhor:

<p><iframe width="100%" height="360" src="https://www.youtube.com/embed/ZCuYPiUIONs" frameborder="0" allowfullscreen></iframe></p>

Tudo isso é resultado de mais de 2 anos de trabalho do core team do React, entretanto o Fiber ainda não está disponível, [você pode acompanhar seu desenvolvimento aqui](http://isfiberreadyyet.com/).
