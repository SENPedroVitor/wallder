# Análise do open-grokbot para o Wendler

Data: 13/10/2026. Referência: [repositório indicado pelo usuário](https://anonymous.4open.science/r/open-grokbot/README.md).

## Conclusão

O projeto fornece ideias úteis para tornar a execução mais confiável: prazos por operação, cancelamento, acompanhamento de janelas, detecção de travamentos, permissões persistentes e entrega controlada de credenciais. **Não encontrei, no código que consegui revisar, uma implementação comprovada que gere Pix da Steam ou realize pagamentos bancários autonomamente.** Ele pode ajudar a corrigir nossa arquitetura de execução; não é uma integração de pagamento pronta para instalar.

Para a Pam, a prioridade é implementar um executor específico de checkout, verificar cada transição e entregar o QR no chat. Continuar deixando o modelo descobrir novamente cada campo e botão custa tempo e torna o resultado instável.

## Escopo e confiança da análise

Analisei o README, o package.json, 76 arquivos de código baixados e 12 documentos de evidência, com foco nos módulos de confiabilidade, navegador, VNC, IPC, credenciais e provisionamento. O inventário contém 1.262 arquivos; isso não significa que li todos eles.

O projeto descreve uma reconstrução do aplicativo instalado **Grok Bot 0.66.0**, com Electron e arquivos portados de um pacote existente. É diferente dos projetos de mesmo nome encontrados no GitHub. Os testes e relatórios documentam reconstruções e comparações, muitas com dependências simuladas. Um teste que carrega a interface não comprova compras, autenticação ou serviços externos funcionando.

O servidor do repositório passou a responder HTTP 429 durante a coleta. Não consegui revisar os grandes bundles portados do aplicativo principal, daemon de execução e coordenador. Portanto, a ausência de uma função no conjunto revisado não prova sua ausência em todo o produto. Não executei o código baixado nem instalei suas dependências.

O material de pesquisa está em `.artifacts/open-grokbot-review/`. Não encontrei uma licença na raiz do inventário consultado. A procedência de arquivos recuperados de um aplicativo também exige atenção antes de copiar código. A recomendação é implementar as ideias independentemente no nosso projeto, sem importar o runtime recuperado.

## O que vale adaptar

| Mecanismo encontrado | Evidência | Aplicação no Wendler | Prioridade |
| --- | --- | --- | --- |
| Prazo por operação, AbortController e limpeza de timers/listeners | [reliability.ts](https://anonymous.4open.science/r/open-grokbot/src/auxiliary-preloads/reliability.ts) | Cada ação do checkout recebe um prazo menor que o orçamento restante; o cancelamento precisa chegar à ação do navegador. | Alta |
| Loop periódico que espera a conclusão anterior e para quando falha | Mesmo módulo de confiabilidade | Evitar verificações sobrepostas e polling infinito. Registrar falha e encerrar a etapa. | Alta |
| Resultado indeterminado bloqueia uma nova mutação até reconciliação | [onepassword-provisioning.ts](https://anonymous.4open.science/r/open-grokbot/src/reconstructed-workers/onepassword-provisioning.ts) | Se a geração de Pix perder a resposta, verificar o pedido existente antes de tentar novamente. O exemplo original trata credenciais, não pagamentos. | Alta |
| Eventos de fechamento e retorno de popup; prazo para passkeys | [browser-preload.ts](https://anonymous.4open.science/r/open-grokbot/src/auxiliary-preloads/browser-preload.ts) | Identificar a janela real do processador, reconhecer seu fechamento e avisar quando login/interação humana bloquear o fluxo. | Alta |
| Permissão persistente por ação, destinatário e máquina | [contracts.ts](https://anonymous.4open.science/r/open-grokbot/src/electron-preload/contracts.ts) | Reutilizar autorização dentro de um escopo definido, sem pedir a mesma coisa em cada campo. Contratos declarados não comprovam o backend completo. | Média |
| Credencial vinculada a agente, conexão, revisão e site | Mesmo arquivo de contratos | Entregar dados protegidos diretamente ao checkout autorizado; o modelo recebe apenas o resultado da operação. | Alta |
| Viewer VNC, reconexão e detecção de entradas sem atualização de tela | [preload-vnc.ts](https://anonymous.4open.science/r/open-grokbot/src/auxiliary-preloads/preload-vnc.ts) | Acompanhar e intervir no desktop remoto. O detector usa uma janela de 10 segundos com entradas sem desenho/dados; não identifica sozinho erros de formulário. | Média |
| Contratos RPC tipados, validação e ciclo de vida de handlers | [evidência RPC](https://anonymous.4open.science/r/open-grokbot/rea/evidence/rpc-server-reconstruction.md) | Padronizar erros como sessão expirada, prazo excedido, formulário inválido e resultado desconhecido. | Média |

Há declarações `getFinanceOverview`, `startFinanceLink` e `deleteFinanceConnection` nos contratos. Elas indicam uma interface de conexão financeira, **não demonstram um executor de Pix ou transferência**. Também não se deve interpretar `setCursorSpendLimit` como limite de compras: o contexto revisado é de gasto do aplicativo/IA.

## O que não devemos transportar

- O preload substitui `confirm()` por uma resposta sempre verdadeira e silencia outros diálogos. Isso pode aceitar uma ação inesperada e não resolve autorização de banco.
- Importação de cookies do Chrome e integração com 1Password aparecem em código e testes, mas dependem de serviços, plataforma e consumidores externos. Não são prova de sessão autenticada funcionando no nosso Firefox Linux.
- Copiar o aplicativo Electron/macOS inteiro adicionaria dependências sem resolver o checkout específico. Nosso backend e navegador já rodam no servidor Linux.
- Um VNC funcional melhora acompanhamento e intervenção, mas não substitui identificação de campos, validação e captura do QR.

## Diagnóstico do nosso Pix

Os problemas observados no Wendler foram concretos, não simplesmente falta de autonomia:

1. Seleção de frames/janelas do navegador e restrições de execução em contextos incorretos.
2. A Steam usa ações JavaScript específicas para carrinho e abertura do processador, não apenas links comuns.
3. O fluxo mudou de Nuvei para PagSeguro; tratar os dois como uma mesma página falha.
4. O valor aparecia como `BRL 29,78`, enquanto parte da validação esperava outra representação.
5. O preenchimento do e-mail travou; o preenchimento foi alterado e os dados agora podem ser enviados em grupo.
6. Muitas rodadas do modelo para ações previsíveis aumentaram o tempo.

Esses pontos receberam correções específicas, mas **o checkout real ainda não foi validado até um QR entregue no chat**. O pedido anterior está preservado como pendente. Não houve pagamento e esta análise não iniciou outra compra.

O limite global de três minutos já foi implementado. Isso não prova que a compra termina dentro desse prazo: ele interrompe uma execução que o excede. Os testes de captura de QR usam fixtures; não substituem o teste no PagSeguro real.

## Implementação recomendada para chegar ao QR

Criar uma operação `prepare_qr` com etapas explícitas:

`localizar pedido existente → confirmar processador e valor → preencher perfil protegido → verificar campos → solicitar QR uma vez → aguardar resultado → capturar QR → publicar widget`

Cada etapa deve retornar estado estruturado, duração e motivo da falha, sem CPF, cookies ou tokens nos logs. O modelo coordena e explica o resultado; o executor realiza a sequência conhecida.

| Controle | Comportamento proposto |
| --- | --- |
| Orçamento global | Manter três minutos desde o pedido inicial, incluindo delegação e esperas. |
| Prazo de etapa | Usar prazos curtos dentro do orçamento restante. Cinco segundos para preencher/verificar campos e 15–20 segundos para aguardar QR são valores iniciais propostos, a medir. |
| Validação | Conferir origem do processador vinculada ao pedido, moeda, valor e leitura dos campos após preencher. |
| Solicitação de QR | Registrar a tentativa antes do clique, incluindo o botão `Finalizar compra`, para impedir repetição indevida. |
| Resposta incerta | Marcar como resultado desconhecido e reconciliar o mesmo pedido. Não iniciar outra compra automaticamente. |
| Captura | Verificar imagem/canvas/SVG visível, código Pix disponível e estado real da página; enviar o widget somente depois de confirmar. |
| Retomada | Reabrir o processador vinculado ao pedido pendente, em vez de começar pela página inicial ou repetir o carrinho. |
| Cancelamento | Interromper ações locais e informar o estado. Encerrar o executor não significa cancelar um pedido já criado na loja. |

Esse executor, a correção do registro do botão e a retomada direta ainda precisam ser implementados e testados. Não são funcionalidades entregues por este relatório. A comunicação entre agentes já foi implementada e testada no Wendler; não precisa ser reconstruída a partir deste projeto.

## Pagamentos em geral

**Gerar o QR de uma loja e debitar dinheiro de uma conta são operações diferentes.** O primeiro depende do checkout da loja. O segundo exige integração com uma instituição/provedor e autorização apropriada.

A documentação do PagSeguro descreve uma API em que o **lojista** cria seu checkout e recebe uma URL para o comprador. Isso não fornece, por si só, acesso para a Pam criar pedidos internos da Steam como compradora. [Documentação Create a Checkout](https://developers.international.pagseguro.com/docs/create-a-checkout).

No Open Finance, iniciação de pagamento envolve instituições habilitadas e consentimento/autenticação do cliente. Uma automação de navegador ou um MCP criado por nós não substitui esses requisitos. O caminho para pagamentos bancários seria escolher um provedor compatível, implementar a integração e verificar o fluxo de autorização específico. [Banco Central — Open Finance](https://bcb.gov.br/meubc/faqs/s/open-finance), [Banco Central — iniciação de Pix](https://www.bcb.gov.br/detalhenoticia/568/noticia).

Não encontrei neste material uma solução demonstrada para autorizar pagamentos sozinha em todos os bancos. Para o caso atual, a meta continua ser preparar o QR rapidamente e deixar o pagamento para você, conforme autorizado.

## Ordem de trabalho

1. Implementar e testar o executor determinístico de checkout até QR, reutilizando o pedido pendente quando válido.
2. Acrescentar medições por etapa, validação após preenchimento e cancelamento propagado às ações reais.
3. Tratar resultado desconhecido e retomada sem duplicar pedidos.
4. Consolidar autorizações persistentes por loja/ação e manter dados pessoais no cofre.
5. Finalizar o viewer remoto interativo para acompanhar ou intervir. Hoje a prévia por screenshots existe; a publicação permanente do desktop remoto ainda depende da configuração correspondente.
6. Avaliar pagamentos bancários como integração separada, depois do checkout→QR funcionar de ponta a ponta.

O maior ganho imediato é reduzir ações repetitivas e tentativas cegas. A meta de três minutos deve ser medida no checkout real, incluindo falhas e expiração de sessão, antes de ser apresentada como desempenho garantido.
