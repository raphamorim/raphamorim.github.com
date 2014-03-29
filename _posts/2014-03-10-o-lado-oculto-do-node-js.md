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
REST ou até mesmo pelo próprio JavaScript exercendo o papel de back-end. Tornando o Node.js
cada vez mais popular.

<!-- more -->

Mesmo o Node sendo aclamado por muitos programadores, ele possui defeitos (ou possuía,
dependendo da data que você está lendo esta postagem) assim como a maioria das ferramentas.
<br><br>

**Object-relational mapping VS SQL**

---*"É mais fácil usar NoSQL no Node"*

É provável que você tenha escutado algo assim ou parecido. Mas
isso é uma verdade em relação a ferramenta?

Sim, isto é um fato sobre o Node, ele tem por natureza facilidade em lidar com bancos não relacionais (NoSQL), algo
que não se encaixa em todo projeto. Para o Node trabalhar com bancos relacionais (MySql e compania) com facilidade é
necessário um conjunto de bons módulos (tais como o Driver e o Query Generator) ou técnicas.

Porém este incomodo não chega a ser uma completa dor de cabeça, é obstáculo razoavelmente fácil de
superar, mas existem situações como migração de projetos que usam SQL para Node, e isto
pode gerar um desconforto dependendo das circunstâncias.
<br><br>

**Debug**

Prepare-se para entrar em um mundo onde praticamente não há um bom debug, e isso na maioria
das vezes se torna algo extremamente cansativo, pois o desenvolvedor deve ir "desbravando" o código
para caçar um ou mais problemas.

Aprender a debuggar é algo muito importante, embora perca bastante relevância com a adoção
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

**Mongoose, WHAT?**

Quem usa o Mongoose conhece bem as suas deficiências, uma delas é o método Update, que não realiza as validações
definidas no Schema e o desenvolvedor se vê obrigado a procurar outros meios para resolver isso, seja por meio de validações
realizadas através de middleware ou usando o método Save para sobrescrever o objeto encontrado.

Um dos mantenedores do Mongoose, Aaron Heckmann comenta sobre essa deficiência do módulo:
<a href="https://github.com/LearnBoost/mongoose/issues/892" class="link">primeira referência</a>,
<a href="https://groups.google.com/forum/?fromgroups=#!topic/mongoose-orm/8AV6aoJzdiQ" class="link">segunda referência</a>.
<br><br>

Não curtiu? Discorda? Acha que falta alguma coisa?
Comente e exponha sua opinião, se puder ajude a compartilhar a palavra ;)
