---
layout: post
title: "Uma arquitetura orientada a serviços e filas de mensagens"
description: "Boas arquiteturas possuem princípios sólidos para alcançar desempenho e escalabilidade em aplicações. Porém quando é demandado um fluxo bastante intenso de dados. É necessário, voltar atrás e pensar em uma arquitetura que atenda essas demandas."
language: 'en'
image: 'assets/images/posts/filas.jpg'
---

Boas arquiteturas possuem princípios sólidos para alcançar desempenho e escalabilidade em aplicações. Porém quando é demandado um fluxo bastante intenso de dados, é necessário então, voltar atrás e pensar em uma arquitetura que atenda essas demandas.

<!-- more -->

## Princípios básicos a serem alcançados por uma boa arquitetura

O **desempenho** está relacionado ao quão rápido uma tarefa computacional pode ser executada. E isso nem sempre está ligado às configurações da maquina, mas muitas vezes ao custo de execução de determinado algoritmo.

A **escalabilidade** está sempre relacionada ao aumento da quantidade de processamento disponível. Mesmo quando são atingidos os limites físicos da maquina.

## Blocking IO vs non-blocking IO

Boa parte das linguagens atualmente tem a caracteristica de bloqueio de I/O. Entretanto o Node.js (plataforma que utiliza o V8 e javascript com linguagem), usa um modelo de I/O direcionado a evento não bloqueante que o torna leve e eficiente, ideal para aplicações em tempo real com troca intensa de dados através de dispositivos distribuídos.

Porém é **um mito dizer que o Nodejs provê aplicações escaláveis naturalmente** ([veja isso](https://speakerdeck.com/felixge/the-nodejs-scalability-myth) e [mais isso](http://www.quora.com/Is-Node-js-scalable)).

Usar linguagens com característica bloqueante tem suas vantagens, uma delas é a programação-linear, que provê mais facilidade para codificar (já que segue um raciocínio linear), já o nodejs se baseia em uma programação paralela, que é mais difícil para codificar.

Agora que você conhece essa característica do **nodejs** podemos prosseguir para o que realmente interessa. Já que neste artigo usaremos uma arquitetura pensada para esta ferramenta tentando tomar vantagem em suas propriedades e características.

## Fila de Mensagens (Message Queue)

Fila de mensagens é um componente da engenharia de software usado para a comunicação entre processos ou threads de mesmo processo. Provê um protocolo de comunicação assíncrona, de forma que o remetente e o destinatário da mensagem não precisam interagir ao mesmo tempo. As mensagens são enfileiradas e armazenadas até que o destinatário as processe.

Atualmente existem alguns **Message Broker** (programa intermediário que lê e traduz mensagens pelo protocolo de mensagens) que podem ser utilizados para a tarefa. No caso do Nodejs, você precisará de um cliente para integrar com este tipo de programa (no meu trabalho, nós desenvolvemos um próprio. Existem inúmeras opções para realizar tal tarefa).

## Serviços (Services)

[Service-Oriented Architecture (SOA)](https://en.wikipedia.org/wiki/Service-oriented_architecture), ou em português: Arquitetura Orientada a Serviços é um estilo de arquitetura de software cujo princípio fundamental prega que as funcionalidades implementadas pelas aplicações devem ser disponibilizadas na forma de serviços.

Um Serviço é uma função independente, sem estado (stateless) que aceita uma ou mais chamadas (call) e devolve uma ou mais respostas. Serviços não devem depender do estado de outras funções ou processos. A tecnologia utilizada para prover o serviço, tal como uma linguagem de programação, não pode fazer parte da definição do serviço.

Ou seja, uma arquitetura orientada a serviços é uma arquitetura que pode ser naturalmente implementada para linguagens de programação funcional (enfatiza a aplicação de funções, em contraste da programação imperativa, que enfatiza mudanças no estado do programa) ou que possuem características similares (diga-se de passagem JavaScript).

[JavaScript não é uma linguagem funcional](http://stackoverflow.com/questions/3962604/is-javascript-a-functional-programming-language), porém permite a criação de funções independentes e sem estado algum.

## O que acontece na prática?

Cada serviço vira um assinante de uma queue ou tópico. Logo assim que uma fila for acionada para adição de mensagens. A mensagem entra na fila e fica em espera, até chegar a sua vez.

Quando ela é acionada pelo Serviço que assinou aquela fila, os dados transportados são lidos pelo próprio serviço (ou worker) e o serviço processa aquela mensagem.

**Uma vantagem que é notável com esse tipo de arquitetura** é quando o serviço é acionado e por algum motivo ele quebra no processamento da mensagem (por algum erro interno ou outro motivo). As informações sobre essa falha podem ser salvas naturalmente, e **todos** os dados que foram enviados para aquele serviço e a mensagem de erro são guardados em algum lugar.

Além disso é permissível configurar um tempo e um limite para cada mensagem da fila ser processada por vez. O que é **extremamente** vantajoso para um sistema que quer limitar o número de processos que podem ser abertos.

Você pode aprender mais sobre isso procurando por [Message Queuing Service](https://en.wikipedia.org/wiki/Message_queuing_service).