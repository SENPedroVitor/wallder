# Plano de melhorias: autonomia e compras do Wendler

Status: aprovado pelo usuário; implementação em andamento no servidor.

## Segunda entrega — melhorias que independem do QR

Implementadas e publicadas no servidor:

- Diagnóstico `preflight` da Steam: navegador, autenticação, CPF protegido, perfil de recibos e pedido pendente. A verificação de sessão deixou de tratar ausência de uma aba da loja como prova de logout; há consulta temporária sem reutilizar a aba de checkout.
- Progresso visível no chat, com atividade atual, contador e botão de interrupção existente. As etapas do executor de Pix também emitem progresso.
- Controle exclusivo compartilhado entre navegador geral e Steam, liberação ao concluir e bloqueio de mudanças de aba originadas em outra tarefa. A navegação trabalha com páginas principais identificadas pela API do Firefox; comandos de protocolo e navegação têm prazos menores.
- Permissões persistentes por agente e origem do site, com inclusão e revogação em Conexões. Pesquisa e ações comuns foram autorizadas para todos os agentes em Steam, Nuuvem, Green Man Gaming, Amazon Brasil, Mercado Livre e Shopee. Dados sensíveis, contratos e finalização financeira continuam em seus fluxos específicos.
- Ferramenta `wendler_shopping` para ofertas observadas e comparação, disponível aos agentes. O preço deve aparecer na observação do navegador; o produto também. Frete desconhecido impede um total confirmado. Edições diferentes e consultas com mais de 30 minutos não recebem recomendação de melhor total. Não há aplicação automática de cupons não validados.
- Ferramenta `wendler_research` para consultar até três páginas públicas de lojas em paralelo, sem cookies ou login e sem ocupar o navegador. Há limite de tempo, tamanho de resposta, destinos de redirecionamento e bloqueio de rotas transacionais. As provas ficam restritas à execução e são removidas ao encerrar; registros de ofertas podem usar essa fonte. Páginas dinâmicas e bloqueios ainda exigem o Firefox.
- Widget comparativo no chat, com fonte, edição, preço, frete, total, pagamento informado e horário de consulta.
- Registro de acompanhamento de pedidos com identificador e estado presentes na página observada. Conexões mostra o último estado registrado, sem afirmar consulta contínua. A atualização exige nova consulta ao comerciante; nenhum pedido de exemplo foi inserido.
- Backup criptografado de JSONs de configurações, conversas e acompanhamento Steam, a cada seis horas, com oito cópias locais. A criação verifica descriptografia e hashes. O perfil do Firefox, arquivos de projetos e a chave do cofre não estão incluídos; não é uma cópia externa para recuperar perda do disco inteiro.
- Endpoint de saúde, monitor de falta de resposta e reinício do contêiner quando um serviço principal encerra. A política de reinício existente permanece ativa.
- Viewer interativo concluído em `https://faux-poweredge-t110-ii.tail212b91.ts.net/computer/`, pelo HTTPS privado já existente. Foi utilizado o suporte a subpasta do Selkies, com proxy HTTP/WebSocket no servidor do Wendler. O ajuste é persistente no Docker e não exige a etapa de sudo/porta 8443 solicitada anteriormente. Referência: [configuração oficial de proxy do Selkies](https://docs.linuxserver.io/selkies/user-guide/reverse-proxy/).
- Instruções comuns aos agentes distinguem tentativa, preparação, conclusão e último estado consultado.

Verificação realizada:

- **48 testes relevantes passaram**, incluindo navegação, isolamento de autorização, comparação de edições/frete, persistência, backup, pesquisa pública paralela, proxy do desktop e preservação de checkout ao verificar sessão.
- TypeScript e Vite passaram. Permanece o aviso de tamanho do bundle.
- Backup real criado e verificado com 20 arquivos, antes dos registros novos da comparação.
- Interrompido somente o processo de backend do Wendler: o supervisor encerrou o contêiner e Docker o reiniciou. O endpoint voltou a responder, preservando configuração e metadados do backup.
- Teste real no chat: Pam observou Steam e Nuuvem, registrou Mafia III: Definitive Edition por R$29,98 e R$33,99 respectivamente e publicou o widget. Não criou pedido ou QR. A leitura teve avisos de timeout; depois disso foram reduzidos os prazos de protocolo e removidas consultas desnecessárias para identificar páginas principais. Não há promessa de tempo de pesquisa garantido.
- Conferidos no navegador os controles de permissões, saúde, backup e pedidos vazios. A Steam foi verificada conectada após os ajustes de autenticação.
- Teste real de pesquisa pública das duas fontes concluído em 2,77 segundos: o texto da Steam continha o preço esperado; o da Nuuvem não continha o preço promocional consultado no Firefox. Esse resultado confirma leitura paralela, não extração universal de preços. A Nuuvem pode exigir a fonte dinâmica do navegador.
- Viewer validado no navegador: transmissão visível do Firefox conectado à Steam, troca para a aba nova e retorno à Steam por entrada interativa. Nenhum pedido foi criado. O acesso permaneceu dentro do Tailscale.

Limitações ainda presentes: QR real aguarda o usuário. Retomar um checkout incerto evita reenvio, mas um reinício não reexecuta automaticamente compras ou contratos. Ações do Firefox compartilhado são serializadas; leituras HTTP públicas podem ocorrer em paralelo, mas não foram provisionados perfis independentes com logins para vários agentes navegarem simultaneamente. Não há integração universal com lojas, aplicação genérica de cupons, leitura da caixa Outlook do usuário ou monitoramento contínuo de entregas configurados.

## Registro da primeira implementação

- Implementado `prepare_qr` para PagSeguro: seleção da janela vinculada ao pedido, preenchimento protegido em grupo, conferência do valor, registro antes do clique e captura sem reenviar uma solicitação anterior.
- Acrescentados prazos por etapa, verificação dos campos, duração da última etapa e identificação explícita de checkout expirado.
- Criada autorização persistente e revogável em Conexões para preparar Pix da Steam. Ela foi ativada conforme o pedido do usuário e não autoriza pagamento bancário.
- Acrescentado suporte ao código copia e cola quando disponível, com conferência de CRC antes de disponibilizá-lo no widget.
- Corrigida a leitura de controles que desaparecem durante navegação: controles inválidos são descartados mantendo a correspondência entre índice e elemento.
- Testes relevantes: 21 passaram, incluindo expiração durante autorização sem preenchimento tardio. TypeScript e build Vite passaram; Vite mantém aviso de tamanho do bundle.
- Teste real: o checkout anterior chegou ao clique de geração, mas o PagSeguro informou página expirada. Não houve QR nem pagamento. O registro foi arquivado após consulta autenticada do histórico sem Mafia III ou pedido pendente.
- Teste no chat: a primeira leitura após navegar retornou `NoSuchHandleError`. Após a correção, Pam chegou à revisão e confirmou Mafia III: Definitive Edition, total R$29,98, Pix R$29,78 e carteira R$0,20. Parou antes dos termos e de gerar pedido. Foi solicitada confirmação para aceitar os termos no checkout novo e continuar até o QR, sem pagar.
- Controle de autorização ativo e Steam conectada foram conferidos no navegador do servidor.
- Viewer interativo: a publicação permanente depende de `sudo tailscale serve --bg --yes --https=8443 3012`. O servidor exigiu senha de sudo; foi solicitado ao usuário executar esse passo sem compartilhar a senha.

**Ainda não comprovado:** QR real no chat a partir de checkout válido, retomada real após falha durante geração e compra inteira concluída em até três minutos. A implementação do executor não equivale à conclusão dessas verificações.

Referência: [análise do open-grokbot](./ANALISE-OPEN-GROKBOT-2026-10-13.md).

## Resultado que queremos

Você escreve para a Pam: “Prepara o Pix do jogo X”. Ela usa o navegador do servidor, encontra o produto correto, prepara o pedido, preenche os dados protegidos e entrega um widget com QR e código copiável. Se houver um impedimento, responde com o motivo concreto e preserva o progresso. A execução deve encerrar em até três minutos; o pagamento continua sendo feito por você.

Esse será o primeiro fluxo completo. Depois de comprovado, reutilizaremos a infraestrutura para outras lojas e tarefas dos agentes. Os adaptadores de checkout serão específicos para cada loja/processador; não vamos pressupor que todos os sites funcionam com os mesmos campos.

## Ponto de partida

Segundo a última revisão do projeto:

| Item | Estado |
| --- | --- |
| Backend e Firefox persistente no servidor | Instalados; a sessão de cada site ainda precisa estar válida. |
| Comunicação entre agentes | Implementada e testada, inclusive Pam → Homer. |
| Cofre de dados pessoais e preenchimento em grupo | Implementados; falta verificar o preenchimento no fluxo real até o final. |
| Prazo global de três minutos | Implementado; ainda precisamos garantir que as ações em execução parem junto. |
| Captura de QR e widget | Há implementação e testes com fixture; falta prova no checkout real. |
| Compra Steam → processador → QR no chat | Ainda não comprovada de ponta a ponta. |
| Acompanhamento remoto | Prévia por screenshots disponível; viewer interativo permanente ainda pendente. |
| Pagamento bancário autônomo | Não implementado. Não faz parte da primeira entrega. |

Antes de alterar, confirmar esses estados no código e no servidor. O pedido pendente anterior deve ser inspecionado antes de qualquer tentativa de retomada.

## Fase 1 — Fechar o fluxo Steam até o QR

### Fluxo proposto

1. Receber a intenção, identificar jogo e edição. Perguntar somente se houver ambiguidade real.
2. Verificar sessão e pedido pendente. Reutilizar o pedido correto se ainda válido.
3. Conferir produto, valor atual e itens do carrinho. Preservar itens não relacionados e não incluí-los silenciosamente no pedido.
4. Abrir o processador indicado pela Steam e vincular sua origem ao pedido.
5. Preencher nome, e-mail de recibo e CPF a partir do cofre, diretamente pelo executor.
6. Verificar se os campos foram aceitos e se o valor corresponde ao pedido.
7. Registrar a tentativa e solicitar o QR uma única vez.
8. Capturar o QR real e o código copiável, quando disponibilizado, e publicar o widget no chat da Pam.

### Mudanças concretas

- Criar uma operação `prepare_qr` que reúna as etapas previsíveis, reduzindo chamadas ao modelo.
- Separar adaptadores PagSeguro e Nuvei, com seletores e validações próprios.
- Corrigir o registro de tentativa para incluir o botão `Finalizar compra`.
- Retomar diretamente o processador vinculado ao pedido, sem reconstruir o carrinho.
- Acrescentar leitura após preenchimento, tratamento de erro de formulário e estado de QR expirado.
- Reutilizar o widget e a linguagem visual existentes. Mudanças visuais só quando necessárias para explicar os estados.

### Critérios de aceitação

- Uma mensagem inicia o fluxo e um QR verdadeiro aparece na mesma conversa, sem pagamento realizado pelo agente.
- Produto, edição, moeda e valor exibidos correspondem ao checkout.
- CPF, cookies e tokens não aparecem em mensagens, logs ou screenshots do formulário.
- Sessão expirada, campo inválido e processador indisponível retornam erros específicos.
- A tentativa termina em até 180 segundos. Medir duração real e etapas; não prometer conclusão quando o site impede.
- Não duplicar pedido após timeout ou reinício.

## Fase 2 — Execução confiável e retomada

Adotar as ideias mais úteis do projeto estudado: prazos por etapa, cancelamento propagado e bloqueio de repetição quando o resultado é desconhecido.

Estados internos: `recebido`, `verificando`, `checkout`, `preenchendo`, `solicitando-qr`, `qr-pronto`, `intervenção-necessária`, `resultado-desconhecido`, `falhou` e `interrompido`.

O estado deve persistir no servidor. Se a resposta desaparecer depois do clique, a próxima ação será consultar o pedido existente. Não interpretar uma resposta perdida como autorização para comprar de novo.

O limite de três minutos inclui delegação, ações e esperas. Cada etapa usa apenas o tempo restante. Cancelar impede ações seguintes; não equivale a cancelar um pedido já criado na loja. Se não houver evidência de cancelamento no comerciante, informar isso claramente.

Critérios: simular falha depois do clique, reinício do executor e cancelamento durante preenchimento; comprovar retomada sem duplicação e nenhuma ação posterior indevida.

## Fase 3 — Autonomia sem perguntas repetidas

Criar políticas persistentes por agente, serviço e tipo de ação. Exemplo: Pam pode pesquisar produtos, preparar carrinhos e gerar QR nas lojas conectadas; o fluxo usa os dados protegidos autorizados para aquele destino.

O executor consulta essa política antes de agir. A mesma autorização não deve ser solicitada por cada campo ou ferramenta. Mudanças de destinatário ou ações fora do escopo precisam ser reconhecidas; uma preferência interna do Wendler não elimina uma exigência de autenticação da loja, sistema operacional ou banco.

Mostrar nas configurações o escopo ativo, permitir revogação e registrar ações sem dados secretos. Perguntas no chat ficam reservadas a impedimentos concretos, como edição ambígua, login vencido ou destino ainda não autorizado.

Critérios: duas operações dentro do mesmo escopo reutilizam a política; revogação tem efeito; outro agente/site não herda acesso indevidamente.

## Fase 4 — Navegador remoto que você consegue acompanhar

Concluir o viewer interativo do servidor, conectado ao Firefox já utilizado pelos agentes. Manter prévia leve no painel e permitir ampliar para acompanhar ou assumir uma etapa de login.

Detectar desconexão e ausência de atualização após entradas; distinguir navegador sem resposta de site carregando. Mostrar quem está usando a sessão e serializar operações que alteram o mesmo carrinho para evitar conflito entre agentes.

Critérios: você vê a mesma sessão usada pela Pam, consegue intervir, reconecta após interrupção e não há dois agentes alterando simultaneamente o mesmo checkout.

Dependência conhecida: concluir a configuração permanente de acesso ao desktop remoto no servidor. Não apresentar a prévia de screenshots como controle interativo já pronto.

## Fase 5 — Expandir para comparação de preços e outras lojas

Após o primeiro fluxo passar, adicionar lojas uma por vez. Separar pesquisa de oferta e preparação de checkout.

Comparação deve considerar produto/edição, região de ativação, frete quando aplicável, preço final e forma de pagamento realmente disponível. Cupom só entra no total quando validado. Sessões e dados continuam protegidos.

Entregar um widget comparativo com fonte, horário da consulta e total confirmado; depois preparar a opção escolhida. Monitoramento recorrente será um fluxo separado, com frequência e condição de alerta definidas.

Critérios: não recomendar outra edição como equivalente, não apresentar cupom hipotético como desconto confirmado e não afirmar Pix disponível sem evidência no site.

## Pagamento sozinho: etapa futura separada

Preparar checkout e gerar QR não dá ao bot capacidade de debitar sua conta. Essa parte exige escolher e validar um provedor/instituição, seu fluxo de autorização e limites. O open-grokbot revisado não demonstrou uma solução pronta para isso.

Por enquanto, a proposta termina no QR. Não incluir envio de Pix, débito ou confirmação de pagamento no escopo aprovado das fases anteriores.

## Estratégia de testes e entrega

1. Revisar o código atual e preservar os dados/pedido existentes.
2. Implementar o executor e testes relevantes para transições, valores, cancelamento e resultado desconhecido.
3. Verificar o fluxo real no navegador do servidor, sem pagar e sem repetir pedido indevidamente.
4. Verificar o widget no navegador do computador e a compilação quando houver alteração na interface.
5. Apresentar duração medida, evidência do QR e pendências. Fixtures e testes simulados serão identificados como tais.

## Aprovação sugerida

Aprovar primeiro as fases 1 e 2: entregar um caminho Steam → QR confiável e mensurável. Elas atacam o problema atual diretamente. Depois, consolidar permissões e acompanhamento remoto nas fases 3 e 4; expandir lojas na fase 5.

O usuário aprovou o início da implementação. As próximas entregas devem atualizar este registro com evidência real, preservando as limitações acima até os testes correspondentes passarem.
