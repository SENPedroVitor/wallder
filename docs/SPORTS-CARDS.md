# Jogos e tabelas no chat

Consultas `wendler_sports action=scores` geram automaticamente o card `sports-list`, com escudos da ESPN, horários em Brasília, status da consulta, placar quando disponível, fonte e atualização manual. Partidas agendadas não recebem placar fictício. O acompanhamento individual continua usando o card `sports` e também inclui escudos.

Mensagens antigas com uma tabela de duas colunas Horário/Jogo passam a ser apresentadas em cards sem regravar seu conteúdo. Nomes e horários continuam os da mensagem. Uma consulta da data de envio busca somente os escudos: os dois adversários precisam corresponder de forma inequívoca aos nomes/aliases da fonte. Não se substituem resultados ou horários históricos por dados atuais. Sem correspondência, sem rede ou com imagem ausente, usa-se um ícone neutro de escudo. A lista antiga começa com seis partidas, com botão para revelar as demais.

URLs de escudos aceitas são HTTPS em `espncdn.com`, no caminho de teamlogos. Não se deduz endereço de imagem a partir do nome de um clube. Tabelas Markdown gerais usam cabeçalhos/células semânticos, alinhamento e scroll horizontal local. Código, links e texto escapado continuam sendo tratados como conteúdo.

Verificação:

```sh
npm run build
WENDLER_TEST_CHROME=/caminho/para/chrome node --test \
  tests/sports-presentation.test.mjs tests/sports-ui.test.mjs \
  server/sports.test.mjs tests/chat-shell.test.mjs \
  tests/runtime-integration.test.mjs
```

O teste visual cobre mensagem antiga, aliases e ordem dos adversários, fallback de imagem, falha na atualização preservando a consulta, expansão de lista, Markdown seguro e largura de 390 px. A consulta HTTP é isolada e os dados de teste não são enviados ao histórico real.
