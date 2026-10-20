# Conversas: lateral consistente e prévia por conversa

Correções dos quatro problemas apontados na interface:

- A navegação usa uma única estrutura em chats vazios, com histórico e com widgets. A lista de agentes ocupa a altura disponível, sem o limite anterior de 200 px. O scroll só aparece quando os agentes excedem esse espaço.
- O menu da conta tem seis entradas iniciais. Espaço, conexões e configurações abrem grupos menores; continuam disponíveis todas as rotas anteriores. Escape, setas, foco e clique externo funcionam.
- O campo de mensagem tem texto de 15 px, placeholder legível, contorno e estado de foco. Cresce até 160 px ao digitar várias linhas, preservando o envio por Enter e a transcrição de áudio.
- O painel de computador abre sob pedido e pertence à conversa selecionada. Em janelas menores, sobrepõe o lado direito para preservar a largura da conversa. O botão de fechar continua no próprio painel.

O cliente consulta `/api/browser/monitor?conversationId=...`. O servidor associa a prévia à conversa durante o uso do navegador e mantém essa associação quando a execução libera o controle. O navegador genérico e a Steam compartilham uma sequência de uso: uma nova tarefa ou navegação manual invalida a prévia anterior. Conversas sem associação recebem apenas `active:false`, sem captura ou URL. Mudanças durante a captura também descartam a resposta. O cliente aborta a consulta e desmonta o painel ao trocar de conversa, rejeitando respostas com outro ID.

A associação da prévia é transitória: após reiniciar o serviço, uma nova ação do agente no navegador estabelece a conversa de origem. Os controles globais do navegador permanecem em Conexões.

Verificação:

```sh
npm run build
# Aponte para um Chromium/Chrome instalado na máquina de testes.
WENDLER_TEST_CHROME=/caminho/para/chrome node --test \
  tests/chat-shell.test.mjs tests/voice-ui.test.mjs \
  tests/runtime-integration.test.mjs server/browser-monitor.test.mjs \
  server/browser.test.mjs server/steam-web.test.mjs \
  tests/desktop-canvas.test.mjs tests/workspace-mutation.test.mjs
```

43 testes passaram. O teste visual usa dados isolados e uma API interceptada, sem enviar mensagens reais. Cobre 810 × 626 e 1366 × 768, temas claro/escuro, chat vazio/histórico/widget, menu com teclado e clique externo, expansão do campo, áudio e captura atrasada após trocar de agente. Capturas locais ficam em `.artifacts/chat-*.png`.
