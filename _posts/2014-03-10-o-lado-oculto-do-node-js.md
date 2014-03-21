---
layout: post
title: 'O lado oculto do Node.js'
description: 'Mesmo o Node sendo aclamado por muitos programadores, ele possui defeitos assim como a maioria das ferramentas.'
link: 'http://raphamorim.github.io/o-lado-oculto-do-node-js/'
language: 'pt-br'
---

###<img src="/assets/images/posts/why-node-js.jpg" alt="NodeJs">
O Node.js é realmente a sensação do momento, por n motivos ele acaba ficando em evidência,
chamando a atenção de desenvolvedores, fatores tais como: facilidade e velocidade em desenvolvimento de aplicações
REST ou até mesmo pelo próprio JavaScript "exercendo" o papel de back-end. Tornando o Node.js
cada vez mais popular.

<!-- more -->

Antes de começar, entenda que aqui irá apenas ser mostrado os lados negativos do Node.js e de ferramentas ligadas a ele,
logo se você não concorda com o que foi exposto aqui: comente e apresente a sua opinião :)

Mesmo o Node sendo aclamado por muitos programadores, ele possui defeitos (ou possuía,
depende da data que você está lendo esta postagem) assim como a maioria das ferramentas.
<br><br>

**Object-relational mapping VS SQL**

Uma coisa é fato sobre o Node, ele naturalmente lida melhor com bancos não relacionais (NoSQL), algo
que não se encaixa em todo projeto. Para o Node trabalhar com bancos relacionais com facilidade é
necessário um conjunto de bons módulos, tais como o Driver e o Query Generator.

Porém este incomodo não chega a ser uma completa dor de cabeça, é obstáculo razoavelmente fácil de
superar, mas existem situações como migração de projetos com bancos relacionais para NodeJs, e isso
pode gerar um desconforto dependendo das circunstancias.
<br><br>

**Debug**

Prepare-se para entrar em um mundo onde praticamente não há um bom debug, e isso na maioria
das vezes se torna algo extremamente cansativo, pois o desenvolvedor deve ir "desbravando" o código
para caçar o problema.

Ou seja aprenda a debuggar, embora a isso perca um bocado de importância com a adoção
adequada de testes. Atualmente existe um módulo chamado
<a href="https://github.com/node-inspector/node-inspector" class="link">Node Inspector</a>
que permite um debug gráfico através de um navegador baseado em WebKit.
<br><br>

**Onde fica o Windows?**

Se você usa Windows pode parar de ler este post e fazer o favor de comprar um Mac ou
colocar Linux em sua maquina. Mas se você é "ousado" e quer continuar usando Windows, saiba que
configurar ambiente de desenvolvimento em node leva mais processos que o normal e
é sujeito a ocasionar mais conflitos e erros.
<br><br>

**Apenas 1GB de processamento no server**

O node não deixa permite e nem consegue colocar um buffer maior que um gb por default,
não chega a ser um problema, é uma limitação da própria linguagem. Por ser single thread e não ser bloqueante
, ele pode acabar "estourando" tudo. Então o desenvolvedor se vê obrigado a optar por
estruturas alternativas para o sistema, como processamento orientado de forma circular ou usar alguns
módulos para tratar casos específicos.
<br><br>

**Mongoose, WHAT?**

Quem usa o Mongoose conhece bem as suas deficiências, uma delas é o método Update, que não realiza as validações
definidas no Schema e o desenvolvedor se vê obrigado a procurar outros meios para resolver isso, seja por meio de validações
realizadas por meio de middleware ou usando o método Save para sobrescrever o objeto encontrado.
<br><br>

Não curtiu? Discorda? Acha que falta alguma coisa?
Comente e exponha sua opinião, se puder ajude a compartilhar a palavra ;)
