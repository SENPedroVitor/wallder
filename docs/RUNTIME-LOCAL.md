# Runtime local

Para o navegador próprio dos agentes, níveis de automação por sessão, compras com revisão e movimento dos mascotes, veja [Navegador e automação](NAVEGADOR-E-AUTOMACAO.md).

O Wendler usa um serviço Node.js local para enviar mensagens ao Codex CLI. A interface continua acessível quando o serviço ou o Codex não estão disponíveis; nesse caso, ela informa a indisponibilidade e não apresenta uma resposta simulada como se tivesse vindo do modelo.

## Iniciar

Requer Node.js, as dependências do projeto instaladas e o executável `codex` disponível com login ChatGPT neste computador. A partir da raiz do projeto:

```sh
pnpm start
```

Também é possível iniciar diretamente com `node scripts/start.mjs`, sem depender de um gerenciador de pacotes no PATH.

Abra o endereço mostrado pelo Vite. O comando inicia a interface e o serviço local. O serviço escuta somente em `127.0.0.1:5174`; o Vite encaminha as chamadas `/api` para ele. `GET /api/status` informa se o serviço encontrou uma sessão utilizável do Codex. A interface mostra esse estado antes de iniciar uma conversa.

Para usar outro executável, defina `WENDLER_CODEX_BIN` no ambiente do serviço. `WENDLER_DATA_DIR` muda o diretório de dados, cujo padrão é `.wendler/` na raiz do projeto. `WENDLER_PORT` muda a porta do serviço e o proxy do Vite; `WENDLER_UI_PORT` muda a porta da interface. Use o mesmo ambiente para os dois processos. Os arquivos de `.wendler/` são locais e não devem ser publicados no Git.

## O que fica salvo

O serviço guarda os identificadores das conversas do Codex, o histórico de execuções, as rotinas agendadas e seus resultados em arquivos JSON dentro de `.wendler/`. Os arquivos produzidos pelos agentes ficam em `.wendler/workspace/`. Conversas, preferências, perfil, tarefas e mini-chats usam armazenamento com controle de versão: no Site privado quando o computador estiver pareado, ou em `.wendler/frontend.json` sem pareamento. O navegador conserva uma cópia para exibição e backup. Não há banco Supabase conectado. Exportar o backup da interface cobre os dados exibidos por ela; faça uma cópia separada de `.wendler/` para preservar também sessões e arquivos do serviço.

## Escopo desta versão

As respostas do Codex são reais quando o serviço está pronto. O botão de cancelamento interrompe o pedido em andamento. Cada personagem mantém uma conversa própria com o Codex no chat correspondente. Os chats comuns usam os conectores habilitados na configuração do Codex e nas conexões locais; ferramentas de arquivos dependem da permissão Arquivos do espaço. O modo de tarefa pode trabalhar nos arquivos da pasta `.wendler/workspace`, com pedidos de autorização exibidos na interface. O painel no Sites exige login na conta ChatGPT proprietária e compartilha o histórico entre dispositivos. Consulte [Acesso remoto](ACESSO-REMOTO.md) para inicialização automática e uso no celular.

O painel **Computador local** usa o MCP `node_repl` e o pacote Computer Use já configurados no Codex deste Windows, por uma conexão separada da conversa comum. É preciso que o Codex desktop e o serviço nativo estejam disponíveis. A pessoa escolhe uma janela, vê capturas reais atualizadas aproximadamente a cada dois segundos e pode parar a sessão. Quando a janela está selecionada, o agente recebe somente as ferramentas delimitadas de observação e ação no modo de tarefa; cada ação proposta pelo agente exige autorização na interface. Janelas de terminal, Explorer, autenticação e segurança são recusadas. O teste da Calculadora e o fluxo visual devem ser verificados nesta máquina; a presença do painel por si só não confirma que o serviço nativo respondeu. Não há VM nesta integração.

Rotinas salvas no serviço executam no horário configurado enquanto `pnpm start` estiver ligado. O agendador usa o fuso `America/Sao_Paulo` e registra o resultado no chat correspondente. Rotinas que já estavam salvas apenas no navegador precisam ser abertas e salvas novamente para entrar no agendador. Ao reiniciar, o serviço verifica o horário do dia atual; não executa separadamente cada dia perdido enquanto esteve desligado.

O serviço atende somente endereços de loopback neste computador. Não exponha sua porta na rede. Mensagens enviadas ao Codex seguem a configuração e a autenticação do Codex CLI instalado neste computador.

## Verificar

`pnpm test` cobre o contrato HTTP local, limites de entrada, cancelamento, aprovação e regras isoladas do Computer Use com um app-server simulado. `pnpm build` verifica TypeScript e Vite. Para testar uma conversa real e a retomada do mesmo thread após reiniciar o serviço, use no PowerShell:

```powershell
$env:WENDLER_LIVE_TEST='1'
node tests/runtime-live.test.mjs
```

Esse último teste chama o Codex e precisa de uma sessão ChatGPT utilizável. Ele usa uma pasta temporária, separada dos dados normais do Wendler.

## Validação da primeira entrega funcional

Em 3 de outubro de 2026, os 39 testes automatizados e a compilação passaram. No navegador, Ash respondeu pelo Codex, criou `teste-wendler.js` na pasta de trabalho e o arquivo apareceu no painel. Uma rotina pausada foi executada manualmente pelo Codex e sua resposta entrou no chat. Indiana identificou esse arquivo no mini chat usando o contexto compartilhado do Ash. O teste de retomada de thread após reiniciar o serviço também passou com Codex real.

## Próximas conexões

O painel de plugins salva configurações MCP reais, descobre suas ferramentas e permite habilitar ou desabilitar cada conexão. Os conectores herdados da configuração local do Codex podem pedir autorização no chat; a presença de um nome no catálogo não confirma autenticação em um serviço externo. Trabalhar fora da pasta controlada exige configurar as pastas autorizadas dos projetos. A equipe responde em sequência com contexto compartilhado; o líder ainda não escolhe e delega participantes autonomamente. VMs e Supabase não fazem parte desta entrega.

## Widgets oficiais — 11 de outubro de 2026

As novas conversas recebem `wendler_widget`. Foco tem temporizador persistente, pausa, retomada e ajuste de duração; bolsa consulta o endpoint público de gráficos do Yahoo Finance pelo serviço e pelo MCP local `wendler-market` (endpoint não oficial, sujeito a indisponibilidade); tarefas vêm do projeto/conversa; clima vem de Open-Meteo. Gastos usam os registros locais.

O catálogo local identifica 72 variações dos cards originais exportados do Pencil. A ferramenta consulta os campos de cada card e envia respostas com todos os textos preenchidos, links, pedidos ao agente e alterações locais persistentes. Não executa HTML fornecido pelo modelo. Campos multilinha são incluídos e textos de protótipo sem preenchimento são removidos. Flashcards, enquetes, quizzes e hábitos podem usar ações locais; ações locais não representam compras, pagamentos ou execução de ferramentas externas. Paletas usam os códigos preenchidos e permitem copiar; matemática calcula raízes e gráfico no serviço e recalcula ao alterar os coeficientes.

`kind=records` lê categorias de registros locais solicitadas pelo usuário; projetos são limitados à conversa/projeto atual. Agenda, aniversários e finanças usam dados cadastrados. Contas, assinaturas, parcelas, metas, despesas compartilhadas, recebíveis, entregas, ingressos, passagens e hábitos podem ser cadastrados em Meus registros. Notícias, esportes, lugares, ofertas e rastreamento externo precisam de consultas reais pelos conectores/navegador disponíveis; um card não implica conexão automática a bancos, transportadoras ou lojas.

Estados de cards comuns ficam em `.wendler/widgets.json`; conversas privadas usam memória temporária. Preserve também este arquivo e `.wendler/focus.json` no backup do serviço. O navegador integrado do Pencil foi validado em uma página pública. Sessões do Chrome não são compartilhadas automaticamente com ele; login autenticado no Twitter/Figma e edição por UI ainda precisam de validação específica. O MCP dedicado do Figma é uma alternativa para edição estruturada.

O instalador WSL 3.0.1 x64 oficial foi baixado em `.artifacts/setup/` e sua assinatura Microsoft foi validada. Após nova autorização, WSL 3.0.1.0 foi instalado e os componentes Windows foram habilitados. WSL 2 e Ubuntu permanecem pendentes de reinicialização e ativação da virtualização na BIOS/UEFI. `node scripts/install-wsl.mjs` usa o MSI verificado, pede elevação e depois instala Ubuntu sem abrir a distribuição ou reiniciar o computador automaticamente. Windows pode exigir reinicialização; o primeiro início do Ubuntu solicita a criação do usuário Linux. Isso não cria uma VM de agente conectada ao aplicativo.

## Validação do Computer Use

Em 3 de outubro de 2026, o botão **Testar conexão** do Wendler acionou o MCP real, executou `2 + 2` na Calculadora do Windows e confirmou `4` pelo visor e pela acessibilidade. A captura foi exibida no painel e na visualização ampliada. O botão **Parar** removeu a captura e encerrou o acesso à janela. Depois, uma tarefa enviada a Ash chamou `computer_observe` com sucesso e respondeu que o visor mostrava `4`; a chamada foi confirmada no registro do Codex. A compilação e 46 testes automatizados passaram.

Uma segunda tarefa pediu somente a tecla `KP_2`. Ash observou a janela, propôs `computer_action`, aguardou autorização no chat, executou a ação aprovada e confirmou o visor `2`. As chamadas de observação e ação constam como concluídas com sucesso no registro do Codex. A captura atualizou após a resposta, e Parar encerrou a sessão novamente. A integração foi verificada na Calculadora; isso não valida automaticamente todos os outros aplicativos.

Durante a configuração, o serviço nativo ficou temporariamente ocupado com outra solicitação; a conexão se recuperou. O painel informa falhas reais e limita as novas tentativas após erro. A disponibilidade continua dependendo do serviço nativo do Codex aberto neste Windows. Ao selecionar outra janela ou parar, as autorizações daquela seleção são descartadas.

