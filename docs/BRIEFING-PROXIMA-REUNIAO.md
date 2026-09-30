# Wendler — briefing para a próxima reunião

Data: 29 de setembro de 2026. Este é o estado atual da entrega; os documentos mais antigos registram a evolução do projeto e podem conter propostas já substituídas.

## Onde paramos

A interface web local está funcional como protótipo. O usuário pediu para manter o projeto neste estado por enquanto e registrar um commit exclusivamente local, sem publicar no GitHub ou em nuvem. Nenhuma nova funcionalidade deve ser iniciada automaticamente a partir deste briefing.

O objetivo continua sendo uma equipe pessoal de agentes, com o Codex como possível motor futuro. A prioridade desta etapa foi a interface, os mascotes e a organização das conversas. A aplicação ainda não chama IA, não executa ferramentas externas, não controla o computador e não possui uma VM.

## O que está pronto

### Interface e identidade

- Boas-vindas simples; perfil com nome, apelido e avatar próprio; configurações de aparência e personagens.
- Tema claro quente e tema escuro, com botão sol/lua acessível no topo.
- Sidebar com Individuais e Minha equipe recolhíveis, além de abas de navegação no espaço de trabalho.
- Vinte agentes disponíveis: os dezoito estudos do documento mestre, mais Livro e Figma. O líder aparece como **Ash**; seu identificador interno ainda é `west`.
- Mascotes com silhuetas distintas, olhos em traços, dez estados visuais e movimentos de acompanhamento do cursor, piscar e procurar o cursor durante inatividade. As personalidades e o acabamento de cada personagem continuam sendo estudos a refinar individualmente.
- Animações limitadas: contatos da sidebar, seletor Chamar equipe enquanto aberto e avatar da última resposta no chat. Avatares de mensagens antigas não se repetem.
- Ícones Lucide e fontes nativas do sistema. O catálogo de plugins usa logos dos aplicativos quando disponíveis.

### Conversas e colaboração

- Cada agente tem um único chat individual permanente. Começar a conversar fixa seu contato na sidebar; não cria históricos separados em subchats. Ash permanece como contato inicial.
- Equipes são grupos por projeto, separados das conversas individuais. É possível criar, renomear, mudar participantes, arquivar e restaurar mantendo o mesmo histórico.
- Chamar equipe abre um mini chat em paralelo, sem sair da conversa principal; o seletor exclui o agente principal e oferece os demais agentes.
- Chat principal e mini chat podem compartilhar o histórico enviado. O vínculo pode ser pausado e retomado nos dois lados; quando pausado, o contexto externo não entra em novos pedidos. Retomar disponibiliza novamente o histórico completo. Contextos já registrados em tarefas anteriores permanecem no histórico.
- Mensagens consecutivas do mesmo agente são agrupadas; relatórios longos têm Mostrar mais/menos.
- Busca dentro do chat por mensagens, anexos, tarefas e rascunhos. Selecionar um resultado leva à mensagem ou à tarefa; mensagens encontradas recebem destaque.
- Anexos locais e menções com `@`, incluindo seleção pelo teclado.

### Tarefas, rotinas e plugins

- Criar tarefa pelo botão do compositor ou por uma menção a agente.
- Registro expansível do contexto compartilhado e recebido pela tarefa.
- Cards com os estados Pensando, Em execução, Aguardando você, Bloqueada e Concluída, abrindo os detalhes à direita.
- Painel Tarefa / Arquivos / Computador, com pedido, responsável, contexto, histórico e rascunho demonstrativo em Markdown.
- Os estados são simulados manualmente. Concluir uma tarefa prepara um rascunho local; não significa que uma IA executou o pedido.
- Rotinas configuráveis por chat, com frequência, horário, pausa e testes demonstrativos. Alguns pedidos em linguagem natural criam a configuração; não há agendador real executando os briefings.
- Catálogo de plugins com busca, filtros e marcação local de adicionados. Isso não conecta contas nem instala integrações reais.

### Dados locais

- Persistência das conversas, perfil, preferências, mini chats, tarefas, rotinas e plugins no navegador.
- Exportação e importação de backup JSON nos Ajustes. O backup inclui anexos locais e configurações; a importação valida o arquivo e mostra uma prévia antes da restauração.
- A restauração guarda uma cópia recuperável do conteúdo anterior. Falhas de escrita disparam reversão dos dados.
- Sincronização dos dados entre abas do mesmo navegador e origem. Gravações leem o estado mais recente dentro de um Web Lock para preservar alterações simultâneas.

## O que foi verificado

- Compilação TypeScript e build Vite aprovados.
- Vinte e cinco testes de backup, incluindo dados inválidos, duplicações, restauração e reversão após falha de armazenamento.
- Testes de chats permanentes, menções, estados das tarefas e interpretação de horários de rotinas aprovados.
- Navegador: duas mensagens enviadas simultaneamente em duas abas apareceram em ambas sem perda; busca por arquivo e destaque da mensagem; equipe criada, renomeada, alterada, arquivada e restaurada preservando o histórico.
- Pausa de contexto conferida nos dois sentidos. Uma tarefa criada com o vínculo pausado recebeu somente o contexto do chat principal.
- Backup real exportado, importado, validado e restaurado; opção de recuperar conteúdo anterior confirmada.
- Diálogos e controles conferidos em tela grande e em 390 px. Nenhum erro de console na conferência final.

## Limites que precisamos lembrar

- A integração real com o Codex foi adiada por decisão do usuário. Não foi incluída nas últimas cinco melhorias.
- Sincronização é local ao mesmo navegador/origem, não entre dispositivos. A proteção de gravações simultâneas depende de suporte a Web Locks; sem esse recurso, os eventos atualizam as abas, mas não garantem exclusão mútua.
- O histórico está no armazenamento do navegador. Limpar esses dados remove o conteúdo local; o backup exportado é o meio de levá-lo para outro ambiente.
- Anexos e avatar têm limite individual de 2 MB. A capacidade total depende da cota do navegador; a cópia de recuperação também ocupa espaço.
- O commit versiona o código e os documentos, não as conversas do navegador. Backups, prints e referências locais estão em pastas ignoradas pelo Git.
- A sidebar não ganhou subchats individuais: continua valendo um chat por agente, para sempre.

## Pauta sugerida para a próxima reunião

1. Avaliar a interface atual e anotar os ajustes visuais que ainda incomodam, especialmente mascotes e expressões.
2. Confirmar o comportamento de equipes, mini chats, contexto compartilhado e busca após uso real.
3. Decidir se a próxima etapa será refino visual ou a primeira integração real do Ash com o Codex. Esta integração exige validar o mecanismo disponível, os eventos, as aprovações e o consumo de uso antes de implementar.
4. Escolher um projeto pequeno para a primeira tarefa real da equipe, quando o motor estiver conectado.

## Retomar o projeto

Pasta: `C:/Users/faux/Documents/wadller`.

```sh
pnpm install
pnpm dev --host 127.0.0.1
```

Prévia usada nesta entrega: `http://127.0.0.1:5173/`. O servidor é um processo temporário; pode precisar ser iniciado novamente em outra sessão.

```sh
pnpm build
node --experimental-strip-types --test tests/backup.test.mjs
node tests/chat-work.test.mjs
node tests/permanent-chats.test.mjs
node tests/routines.test.mjs
```

Regras para continuar: somente JavaScript/TypeScript e CSS, sem Python; nenhum emoji no produto; mascotes sem boca, sorriso, bigode ou ornamento que pareça boca; acessórios mínimos; Songbird é a personagem de Cyberpunk 2077; usar Sol/Terra nos subagentes e validar alterações de interface no navegador.
