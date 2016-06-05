---
layout: post
title: "Framework || Library"
description: 'Frequentemente vejo muitos outros desenvolvedores levantarem a mesma questão: Quais seriam as definições técnicas que permitem distinguir o que é Framework e Library?. A primeira vez que alguém me perguntou isso foi meses atrás, eu havia palestrado sobre React e uma das perguntas feitas foi: "por quais motivos React é uma library e não um framework?'
link: 'http://raphamorim.github.io/framework-ou-library'
language: 'pt-br'
image: 'assets/images/posts/question.jpg'
---

Frequentemente vejo muitos outros desenvolvedores levantarem a mesma questão: "Quais seriam as definições técnicas que permitem distinguir o que é Framework e Library?". A primeira vez que alguém me perguntou isso foi meses atrás, eu havia palestrado sobre React e uma das perguntas feitas foi: "por quais motivos React é uma library e não um framework?"...

<!-- more -->

## First Things First

1 - React é uma Library.

2 - Este assunto não é recente. Na verdade, é um assunto polêmico para muitos desenvolvedores ([leia-se mamilos](https://www.youtube.com/watch?v=PORknrd-cv8)). Um bom exemplo disso tudo é até algum tempo atrás, no próprio site oficial, o jQuery se definia como um framework, e atualmente deixam bastante explícito que é uma biblioteca.

## Vamos definir essa parada

Martin Fowler discute a diferença entre Library e Framework no artigo [" Inversion of Control "](http://martinfowler.com/bliki/InversionOfControl.html). No mesmo artigo ele define Library como conjunto de funções (que sim, podem estar organizadas em classes ou outro lugar) que podem ser chamadas e cada call dessas funções realiza alguma tarefa e **devolve o controle ao cliente**.

Já um Framework incorpora um comportamento mais abstrato. Para usar um Framework você precisa inserir seu comportamento/lógica em vários lugares seja por subclasses ou conectando com suas próprias classes e ele é chamado por meios como estes. Logo o próprio Framework quem **dita o fluxo de controle** da aplicação, chamado de Inversion of Control.

Em termos mais acadêmicos, as melhores definições seriam:

**Library**

Na ciência da computação, biblioteca é uma coleção de subprogramas utilizados no desenvolvimento de software. Bibliotecas contém código e dados auxiliares, que provém serviços a programas independentes, o que permite o compartilhamento e a alteração de código e dados de forma modular.

**Framework**

Um framework, em desenvolvimento de software, é uma abstração que une códigos comuns entre vários projetos de software provendo uma funcionalidade genérica. Um framework pode atingir uma funcionalidade específica, por configuração, durante a programação de uma aplicação. Ao contrário das bibliotecas, é o framework quem dita o fluxo de controle da aplicação, chamado de Inversão de Controle.

## Resumindo

" Your code calls a library but a framework calls your code. "

