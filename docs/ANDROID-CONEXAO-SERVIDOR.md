# Android conectado ao servidor

O APK usa HTTPS na rede privada Tailscale e o runtime já existente. Não há modelo local, nova conta de IA nem credenciais de provedor no aplicativo.

## Uso

1. Instale o APK atualizado em um Android 8 ou superior.
2. Conecte o Tailscale desse aparelho à rede do servidor.
3. Escolha o mascote e toque no botão de teclado.
4. Envie uma mensagem. O histórico e a resposta são compartilhados com a conversa individual do agente no painel web.

A voz foi adiada pelo usuário. Nesta etapa não há gravação, transcrição nem resposta falada. Os widgets são salvos no histórico web, não renderizados nativamente no painel de texto.

## Contrato

- `GET /api/status`: disponibilidade real do executor.
- `GET /api/mobile/agents`: identidades oficiais dos agentes.
- `GET /api/mobile/conversation?agent=pam`: histórico recente da conversa individual, execução em andamento e autorização pendente.
- `POST /api/mobile/chat`: mensagem com `requestId`, `agentId`, `message` e `conversationId` opcional; resposta NDJSON compatível com os eventos do runtime.
- `POST /api/approvals`: decisão explícita sobre uma autorização real.

O servidor resolve identidade, contexto, permissões e memória; o cliente não escolhe suas próprias permissões. As alterações do Android passam pela mesma fila e revisão do armazenamento da web, preservando alterações concorrentes. O desligamento da conexão móvel não reexecuta nem abandona automaticamente uma tarefa iniciada. A resposta final e os widgets são gravados antes do evento final. A mesma identificação de mensagem não executa a tarefa novamente. Operações interrompidas ou incertas não são retomadas automaticamente após reinício.

Histórico desativado é respeitado: a conexão móvel pede que o usuário use o modo privado da web. A integração com armazenamento externo via site bridge ainda não é compatível com o Android. O servidor tem limite de seis minutos para este transporte; o limite específico de compras continua sendo três minutos.

## Verificação em 14/10/2026

APK compilado. Testes do contrato de armazenamento, isolamento de conversas, repetição de pedido, falha, autorização pendente e queda de conexão foram executados. Uma mensagem de teste chegou à Pam real no servidor; ela respondeu e a resposta apareceu no painel web, sem erro de console. A repetição do identificador retornou a resposta salva sem duplicação. O teste de toque e envio dentro do APK em aparelho físico ainda depende de um dispositivo conectado; o emulador deste Windows estava offline.
