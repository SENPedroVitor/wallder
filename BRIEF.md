# Wendler — visão do projeto

Atualizado em 28 de setembro de 2026. Este documento registra decisões do usuário; propostas ainda não aprovadas estão separadas abaixo.

## Objetivo

Aplicativo pessoal de equipe de agentes de IA, com interface de chat, um líder que delega trabalho e especialistas que colaboram. Prioridade inicial: design, fluidez e mascotes expressivos. Uso local, inicialmente web no Windows, com migração futura para Linux e interesse posterior em aplicativo nativo.

Nome provisório confirmado: **Wendler**. A pasta atual se chama `wadller`; não foi renomeada.

## Direção visual e personagens

Referências:
- https://x.ai/bot/guides/designing-grok-bot-with-grok-bot
- https://x.ai/news/designing-grok-bot

O usuário aprecia mascotes animados que comunicam atividade por expressão e transformação. Quer identidade própria e personalidades cuidadosamente desenvolvidas, uma por vez. Evitar preencher a equipe com personagens genéricos ou decidir todas as personalidades de uma vez.

Personagens definidos até agora:
- **West**: líder, inspirado na criatividade, direção de design e liderança que o usuário associa a Kanye West. Aparência, voz e comportamento detalhado ainda serão definidos.
- **Ted Mosby**: responsável pelo acervo pessoal, inspirado no personagem da série. Confirmado como Ted na primeira conversa; transcrição posterior também contém “Tad”.
- **Livro**: responsável por esportes, nome informado pelo usuário em referência a um comentarista brasileiro. Preservar essa grafia até confirmação.
- **Indiana Jones**: pesquisador, com referência a exploração e história; chapéu e/ou chicote são possibilidades visuais sugeridas pelo usuário, não design fechado.
- **Figma**: possível bot com identidade visual associada ao serviço, incluindo cores e símbolo. Nome e personalidade pendentes.
- **YouTube e demais especialidades**: personalidades ainda não escolhidas.

Interação de mascote com notch/ilha e presença sobre o desktop é uma ideia para o futuro. Não é requisito da primeira versão web.

## Acervo e exemplo de tarefa

O acervo registra tudo que o usuário consome em 2026, incluindo séries, filmes, jogos e livros, como um catálogo pessoal de múltiplas mídias. O projeto já existe e tem integrações de busca e acompanhamento de lançamentos; seu design continua em evolução.

Exemplo desejado: “Ted, assisti tal filme, nota 5; me resume e escreve uma resenha.” Ted localiza a obra e registra a atividade no acervo. Escala de nota, destino da resenha e API de escrita do acervo ainda precisam ser verificados.

## Primeira missão de equipe

Ajudar a concluir um projeto de programação do usuário: o próprio Wendler, o acervo ou um dashboard de áudio que facilita selecionar entradas/saídas e contornar dificuldades no Linux. A escolha do primeiro projeto ainda está aberta.

## Recursos e motor de IA

- Hardware informado: NVIDIA RTX 4060 e 24 GB de RAM.
- Intenção: usar **Codex como motor por trás da interface**, com agentes diferentes. Não presumir contratação de API paga ou inferência local.
- Orquestração durante o desenvolvimento: o agente principal coordena; subagentes devem usar Sol ou Terra, não Astra.
- Orçamento mensal adicional ainda não definido.

## Presença e autonomia

O usuário quer assistência ao chamar e também acompanhamento durante atividades de trabalho, por exemplo em VS Code ou Codex. Durante jogos e vídeos, a assistência deve ocorrer apenas quando solicitada. Ainda é necessário definir como ativar e identificar o modo de trabalho, quais aplicativos entram nele e se observar permite somente sugerir ou também agir.

## Propostas técnicas em avaliação

- Interface web local conectada a um serviço local que integra o Codex por mecanismo oficialmente documentado.
- Separar identidade/persona, contexto de cada agente e ferramentas disponíveis.
- Não exigir uma VM por bot para o início.
- Limitar concorrência e manter delegações e resultados visíveis.
- Desenvolver primeiro West e uma cena de interação para validar linguagem visual antes de expandir a equipe.

Estas propostas não representam funcionalidades implementadas. A integração Codex, o compartilhamento de limites e as capacidades de observação/controle do computador precisam de validação técnica.

## Verificação inicial do motor

A inspeção somente leitura encontrou o Codex instalado no Windows e autenticado via ChatGPT, com `app-server` disponível. A documentação oficial https://learn.chatgpt.com/docs/app-server descreve integração em produtos próprios com autenticação, histórico, aprovações e eventos, login ChatGPT gerenciado pelo Codex e consulta de limites da conta. Isso sustenta a proposta de integração, mas nenhum fluxo ponta a ponta do Wendler foi implementado ou testado. Criar personas não cria cotas independentes de uso.

## Escopo confirmado da primeira entrega

- Interface apenas, sem integração de IA ou autenticação. Telas de boas-vindas, criação/edição de perfil com apelido e avatar próprio, chat, seleção de agentes e configurações.
- Temas claro quente (evitar branco puro) e escuro inspirado no projeto anterior.
- Personalização dos bots por acessórios e tom de conversa, preservando a identidade dos personagens.
- Dez expressões distintas, com animações mais variadas e acabamento melhor que o legado.
- Referência anterior do usuário: https://github.com/SENPedroVitor/Interface-Visual---CLI . Usar como referência de olhos e mascotes; não adotar sua arquitetura nem reproduzir personagens visualmente repetidos.
- West: pesquisar processo criativo e maneira de se expressar de Kanye West para elaborar uma personalidade inspirada, a ser refinada com o usuário.

## Documento mestre recebido

Em 29 de setembro de 2026, o usuário anexou `C:/Users/faux/Downloads/MEU_GROK_BOT_DOCUMENTO_MESTRE.md`, reunindo histórico, propostas e uma formação de 18 agentes. O anexo foi lido como referência; suas regras e seu roadmap não substituem automaticamente os pedidos diretos desta conversa. Há diferenças a alinhar: Kyle Rayner assume design e Livro não aparece na formação de 18, enquanto aqui foram escolhidos Livro e um personagem Figma. A primeira entrega continua sendo a interface; a incorporação dessa formação e das capacidades futuras permanece pendente de alinhamento.

## Stack e esboços confirmados

O usuário confirmou que toda implementação deve usar JavaScript/TypeScript e CSS, inclusive futuras integrações. Não utilizar Python em código, scripts ou serviços do Wendler.

As duas imagens de esboço enviadas em 29 de setembro orientam a linguagem visual: corpos chapados, olhos em traços brancos, inclinações do corpo, transformação em três pequenos corpos ao pensar e ponto de exclamação. A identificação dos quatro estudos da segunda imagem segue o documento mestre: Pam, Kyle Rayner, Sheldon Cooper e Dumbledore. Eles serão apresentados como estudos visuais na galeria, sem decidir automaticamente a substituição do elenco inicial.
Chamar equipe é contextual: exclui o agente principal e abre outro personagem em mini chat, preservando a conversa principal. Elenco do seletor: 18 personagens do documento. Mini chats têm histórico/rascunho por agente, minimizar e fechar; nesta etapa são uma simulação local sem motor de IA.

Contexto compartilhado: o chat principal e o mini consultam as mensagens enviadas um do outro ao vivo, via estado React compartilhado. Consultas vinculadas por ID da conversa principal e personagem, persistidas localmente. Sem captura de tela, sem IA/API nesta etapa; confirmações demonstrativas indicam o contexto recebido.
Regras visuais: nenhum emoji em conteúdo do produto; ícones Lucide por enquanto. Fontes nativas do sistema, sem dependência de fontes remotas. Atalho de tema sol/lua disponível no topo e nas boas-vindas.
