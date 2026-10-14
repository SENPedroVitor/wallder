# Verificação da primeira interface

29 de setembro de 2026.

- Compilação TypeScript e build Vite: passaram.
- Navegador: boas-vindas, criação de perfil, chat e histórico renderizam.
- Envio de mensagem: gera conversa demonstrativa, sem chamada de modelo.
- Conversa de equipe: mostra West, Indiana e Figma com uma conclusão ilustrativa.
- Perfil: edição de apelido e upload de imagem de exemplo funcionaram.
- Persistência: perfil, tema escuro, humor e acessório permaneceram após recarregar.
- Expressões: dez estados presentes; olhos minimalistas e animações conferidos visualmente.
- Responsividade: chat, menu e equipe conferidos em 390 × 844; sem transbordamento horizontal no fluxo observado.
- Console: nenhum erro registrado na conferência final.

Esta verificação não cobre conexão com Codex, execução de ferramentas, integração com acervo ou controle de computador: são etapas futuras. A falha de quota de armazenamento tem tratamento no código, mas não foi provocada neste teste manual.

## Revisão dos esboços

- Galeria com Pam, Kyle, Sheldon e Dumbledore adicionada como estudos visuais.
- Seleção de cada estudo verificada: dez estados renderizados com o personagem correto.
- Tema claro quente e tema escuro conferidos com a linguagem de corpos chapados e olhos brancos em traços.
- Corpo em três formas para pensar e exclamação para surpresa.
- Nova galeria conferida em 1280 × 900 e 390 × 844, sem transbordamento horizontal.
- Nenhum novo erro de console observado após recarregar a versão concluída.
- Implementação exclusivamente em TypeScript/JavaScript e CSS; referências históricas do projeto antigo não fazem parte da aplicação.

## Movimento e elenco — 29/09/2026

- Olhar global acompanha o cursor, com inclinação limitada do corpo e camadas independentes das expressões.
- Após 8 segundos sem atividade, o mascote procura o cursor; a aba oculta pausa as animações. Nenhuma captura de tela ou monitoramento de outros aplicativos.
- Piscar dessincronizado entre personagens, respiração, movimentos de pesquisa/escrita/revisão e reação de conclusão.
- Pensamento: três formas em sequência suave, ciclo de 3,6 segundos e intervalos de 0,3 segundo.
- 18 personagens do documento disponíveis como estudos, mais Livro/Figma. Os 11 novos selecionados no navegador, todos com 10 estados.
- Ted: estudo de trompa azul, ainda sujeito à avaliação visual do usuário.
- Verificação no navegador: seguir cursor com gaze/turn distintos, procura após inatividade, cores do elenco, seleção de personagens, viewport 390 px sem transbordamento horizontal. Preferência de movimento reduzido respeitada por CSS e rastreamento.

- Correções sem boca: compilação aprovada; navegador confirmou 18 botões no elenco, cabelos pretos do Homer, marcas vermelhas do Ultron e Batman apenas com corpo/olhos. Revisão visual da galeria realizada.
Revisão de Hal/Reed/Rorschach: build aprovado e galeria conferida no navegador em tema escuro; ausência do traço lateral do Hal, emblema interno do Reed e 10 estados da nova máscara confirmados.
Efeito do componente enviado: painel Chamar equipe com vidro/desfoque, entrada suave e cartões; West com morph de 9 s e piscada de 6,5 s. Escolha de Ted, Escape com retorno de foco e largura do painel em 390 px verificadas. Movimento reduzido respeitado. Componente adaptado em TS/CSS sem links a provedores externos.
Consultas paralelas: build aprovado; Ted ocultado no seletor (17 de 18), 18 opções fora do chat, Indiana aberto em mini chat sem navegação ou alteração do rascunho principal. Envio, minimizar/expandir, fechar/reabrir e histórico/rascunho por agente verificados. Viewport 390 px sem overflow. Respostas explicitamente demonstrativas; histórico dos mini chats em armazenamento local separado.

Contexto bidirecional: Livro/Songbird testados com envio no principal e no mini; as duas listas de contexto atualizam sem recarga. Respostas demonstrativas confirmam recebimento do contexto. Troca para Ted isola o histórico; retorno ao Livro restaura a consulta. Primeiro envio do principal preserva o vínculo criado antes dele. Recarregar e reabrir Songbird preservou o histórico associado. Somente mensagens enviadas são compartilhadas.
Limpeza do painel: atalho sol/lua no topo, alternância claro/escuro e persistência após reload verificadas. Fontes nativas via system-ui, zero links de fontes Google. Código do produto examinado sem emojis. Viewport 390 px sem overflow; botão com 32 px. Lucide mantido conforme escolha do usuário.

Sidebar e abas: referência adaptada em TS/CSS, com lateral recolhível e preferência persistida. Abas de seções verificadas: criar, alternar, reordenar por teclado, fechar e menu de fechamento em lote; restauração após recarregar. Menu móvel em 390 × 844 sem transbordamento horizontal. Mini chat aberto no novo layout. Perfil e Ajustes permanecem visíveis no rodapé em 1280 × 720; conteúdo da lateral tem rolagem própria. Abas organizam seções, sem sessões de conversa independentes por aba.

Histórico por agente: removidos Rec entes e busca global da lateral. Histórico no próprio chat, filtrado por agente; clique no elenco retoma a última conversa salva. Nova conversa e Ctrl K abrem seletor com os 18 personagens mais Livro/Figma; pesquisa por nome/função. Grupo Minha equipe recolhível com todo o elenco. Build aprovado; conversa de Songbird enviada e restaurada após reload, histórico antigo do Livro preservado, recolhimento/expansão e fluxo móvel de escolha verificados. Armazenamento continua local, sem backup remoto ou memória de IA.

Referência OpenMausBot: código da sidebar e tipos Bot/Group examinados. Fluxo básico adaptado sem importar estilos: contatos individuais com lista expansível de conversas e botão de nova conversa; grupos de trabalho em Minha equipe com participantes e histórico separado. Verificados Stark individual, retomada da conversa salva após recarga, nova conversa sem perder a anterior, grupos recolhidos sem ocultar contatos, migração dos grupos ilustrativos existentes e largura móvel 390 px sem overflow. Build aprovado. Formulário extra de criação de equipe removido; prévia continua sem IA.

Chat permanente por agente: todos os 20 contatos (18 personagens mais Livro/Figma) disponíveis diretamente. Subconversas e controles de novo chat individual removidos. Migração consolida mensagens por agente em ordem cronológica, mantém grupos isolados e reúne consultas paralelas associadas. Teste Node de consolidação, identidade, idempotência e grupos passou. No navegador, os dois históricos antigos de Tony Stark aparecem em um só chat com quatro mensagens; seletor retoma esse mesmo chat e DOM confirma 20 contatos e zero subconversas. Build aprovado.

Atalhos individuais: seção recolhível verificada no navegador, somente Ash fixo inicialmente. Abrir Indiana pelo seletor mantém a contagem em um; o primeiro envio individual adiciona o contato persistido, sem duplicar nem fixar por mensagens de grupo. Regra de fixação testada em Node. Históricos existentes preservados. Líder exibido como Ash, mantendo o identificador interno anterior para conservar dados. Build aprovado.
