# Navegação e automação local

Abra o ícone de computador no cabeçalho da conversa, depois **Navegador**.

- **Abrir Firefox** usa o Firefox instalado no Windows. **Meu Firefox, com meus logins** seleciona o perfil atual, identificado pelo arquivo profiles.ini. Feche as janelas do Firefox antes de iniciar esse modo. Não há cópia de senhas ou cookies para o aplicativo. **Perfil separado do Wendler** usa `.wendler/firefox-profile` e requer seus próprios logins.
- **Iniciar em segundo plano** usa o mesmo perfil, com uma prévia no painel. Para trocar entre janela visível e segundo plano, pare e inicie novamente.
- **Confirmar cada ação** é o padrão. Abrir e ler páginas são permitidos; clicar e preencher apresentam revisão no chat.
- **Autorizar esta sessão por 15 minutos** libera até 100 ações comuns. Dados pessoais, envios, exclusões e finalizações de compras continuam com confirmação. A autorização expira e não é salva após encerrar o navegador.
- **Parar navegador e revogar acesso** fecha a sessão, remove a autorização e interrompe a conversa que estava usando a ferramenta.

Cada conversa usa `wendler_browser` para abrir, observar, clicar, preencher e pressionar teclas. As ações usam controles reais e exigem uma observação atual da página. A prévia do painel não invalida a observação usada pelo agente. Uma conversa controla o navegador por sessão; a conversa libera o navegador quando a resposta termina, revogando observações e autorizações anteriores.

Para compras, informe produto, vendedor e orçamento. O agente pode pesquisar e preparar um carrinho nos sites compatíveis com esses controles. Antes de finalizar, a ferramenta exige vendedor, produto, total, moeda e orçamento, e apresenta esses dados na autorização do chat. Credenciais e dados de cartão devem ser digitados pelo usuário na janela visível. Uma ação executada não comprova compra: o agente deve conferir o recibo. CAPTCHAs, confirmação bancária e interfaces que exigem controles especiais podem precisar da participação do usuário.

Na aba **Computador**, selecione uma janela. O modo **Navegação automática por 15 minutos** permite rolagem e teclas de navegação por até 100 ações nessa janela. Cliques e digitação continuam com confirmação. Selecionar outra janela ou parar revoga essa autorização. Os controles nativos do Windows permanecem em vigor.

## Mascotes

A suavização e a piscada usam o movimento do LiveOrb fornecido pelo usuário, mantendo os corpos e olhos originais do Pencil. A interpolação considera o intervalo de cada quadro; a piscada fecha em 55 ms, mantém 45 ms e abre em 80 ms. Todos os mascotes compartilham um ciclo de animação e os eventos do cursor. A figura principal também flutua suavemente. A opção de movimento reduzido desativa a flutuação e a piscada e centraliza o olhar.

## Verificação

Compilação TypeScript/Vite e testes de permissões, escopo, expiração, orçamento, observações vencidas e interrupção passaram. No desktop, o Ted abriu `example.com` com a ferramenta do Wendler, leu o título e o texto real, solicitou autorização e navegou pelo link para a página Example Domains da IANA. O movimento do cursor e a piscada foram observados na interface, incluindo mascotes nos widgets.

## Correção de abertura e autoria — 11/10/2026

Abrir uma URL pelo agente agora inicia uma janela visível automaticamente, reutilizando o perfil próprio. URLs HTTP/HTTPS e caminhos variados são aceitos; o campo do painel começa vazio e também aceita um domínio sem protocolo. O navegador não depende de example.com. Há comandos de rolagem e histórico com observação atual.

Falhas de navegação conservam a URL solicitada e a mensagem real no painel. Ao terminar a resposta, a conversa libera o navegador para a próxima conversa, invalidando observações e autorizações anteriores. Uma conversa ainda em execução mantém exclusividade.

Conversas de equipe identificam cada resposta com seu nome e avatar. O caso relatado continha uma resposta do Ash e outra do Ted; apenas o último avatar aparecia anteriormente. Mensagens antigas conservaram seus remetentes reais.

Teste pelo chat: Ash chamou wendler_browser, iniciou janela visível e abriu X. A URL de onboarding inicialmente retornada pelo site redirecionou depois para https://x.com/, com a página pública e botões de acesso carregados. Nenhum login foi preenchido. Não houve instalação de Docker ou alteração dos dados das contas.

## Conversa natural e limpeza — 12/10/2026

O seletor manual de widgets foi retirado. O botão de adicionar serve para anexar arquivos. As ferramentas de clima, foco, bolsa, tarefas e gastos, e o catálogo interno de cards oficiais, são escolhidos pelo agente conforme a conversa e os dados disponíveis. Clima usa Open-Meteo; um estado sem cidade exige esclarecimento. Dados de cartões vêm dos cadastros locais e não de uma conexão bancária. Ausência de cadastro é informada sem inventar números.

A Pam tem instruções próprias em `server/personas/pam.md`, carregadas pelo serviço. Todos os agentes receberam orientação de linguagem natural; mudanças nas instruções renovam a sessão do modelo. Não é necessário incluir nomes de ferramentas nos pedidos.

`/clear` e `/q` abrem um chat vazio com o mesmo agente/equipe e vínculo de projeto. A conversa anterior fica arquivada, recuperável pelo histórico. A nova conversa recebe outro identificador, de modo que o modelo não continua a transcrição anterior. Projetos, arquivos, cadastros e preferências são preservados. Respostas em andamento precisam terminar antes da limpeza. Também há **Limpar este chat** nas opções da conversa.

Verificado pelo navegador: Firefox conectado ao perfil `default-release`, pedido natural ao Ash abriu a Wikipédia e retornou seu título real; Pam consultou cartão inexistente sem inventar dados, pediu a cidade de Minas Gerais, exibiu o clima de Belo Horizonte e iniciou foco de um minuto. `/clear` e `/q` foram exercitados nos chats de teste. Compilação e 96 testes passaram.
