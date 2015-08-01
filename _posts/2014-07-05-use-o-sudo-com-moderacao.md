---
layout: post
title: 'Use o sudo com moderação'
description: 'Você com certeza já se encontrou numa situação de acabar usando o sudo na execução de algum comando para realizar alguma tarefa ou iniciar/fechar uma aplicação por meio do bash.'
link: 'http://raphamorim.com/use-o-sudo-com-moderacao/'
language: 'pt-br'
image: 'assets/images/posts/sudo.jpg'
---

Você com certeza já se encontrou numa situação de acabar usando o sudo na execução de algum comando para realizar alguma tarefa ou iniciar/fechar uma aplicação por meio do bash.

<!-- more -->

Rodar um comando como root(raiz) não é nenhum pecado, desde que não seja do nível de um "rm -rf / ".
O problema em si está em rodar comandos com tamanha permissão como se fosse printar algo no console, sem no mínimo pensar mais de uma vez no que você vai estar executando.

Frequentemente desenvolvedores utilizam o sudo como ferramenta para rodar o comando
quando há qualquer tipo de erro ou falha dentro de sua execução, quando na verdade
deveria ser a última bala do revólver.

Este post é resultado de uma experiência recente, onde eu estava desenvolvendo um módulo global do node que era inicializado em CLI e devido a sua arquitetura precisava várias vezes ser executado como root. Resultado: Acabei limpando a pasta de módulos globais sem querer.

Antes de executar qualquer comando como root, lembre-se sempre: "Com grandes poderes, vem grandes responsabilidades."


