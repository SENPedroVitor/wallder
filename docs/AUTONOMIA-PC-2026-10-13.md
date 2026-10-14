# Navegador em segundo plano e aplicativos no chat

Todos os agentes recebem o navegador persistente. Abrir um site pelo chat inicia o Firefox oculto quando não há sessão ativa. O padrão é um perfil separado do Wendler, evitando bloquear o Firefox pessoal. Cookies e sessões permanecem no perfil; a aplicação não copia senhas do perfil pessoal para esse perfil.

Em Perfil → Conta → Serviço local → Navegador, o proprietário pode abrir uma janela para entrar nas contas e depois voltar ao segundo plano. Essa troca conserva o perfil e reabre o endereço anterior. Uma conversa em execução impede a troca de modo. O site ainda pode pedir login, autenticação adicional ou impedir automação; sessão persistente não garante acesso a todos os sites.

Com a permissão Computador habilitada, os agentes recebem `computer_apps`, `computer_open`, `computer_observe` e `computer_action` também no chat normal. Os aplicativos são escolhidos do inventário real de aplicativos instalados. Não há caminhos inventados nem execução de comandos enviados pelo cliente. Uma conversa por vez usa a janela nativa.

Em Serviço local → Computador, selecionar uma janela habilita “Autorizar tarefas comuns neste aplicativo”. A autorização é salva no backend e pode ser revogada nesse painel. Ela permite controles conhecidos, digitação em campos comuns e navegação, com observações recentes. Ações sensíveis, coordenadas sem controle identificado, pagamentos, exclusões, envio de dados, contratos e acesso a configurações protegidas conservam a revisão.

Solicitações nativas comuns de baixo ou médio risco podem reutilizar a autorização quando o aplicativo da solicitação corresponde exatamente ao aplicativo salvo. Solicitações de alto risco não são aprovadas por essa regra. Isso não elimina todas as confirmações do Codex ou do Windows. Aplicativos nativos podem aparecer na área de trabalho; o modo oculto é garantido para o navegador dedicado, não para todo aplicativo instalado.

## Verificação

- Compilação TypeScript e Vite concluídas.
- 131 testes automatizados passaram.
- Firefox real, em perfil temporário: cookie HttpOnly conservado após fechar e reiniciar, com troca de janela visível para modo oculto.
- Homer real, chat privado de teste: abriu Wikipedia pelo navegador dedicado oculto e respondeu “Wikipedia”.
- Homer real: encontrou a Calculadora pelo inventário no chat normal.
- Serviço nativo: abriu Calculadora e verificou 2 + 2 = 4.
- A inspeção visual pelo navegador do Codex não pôde ser feita: não havia navegador disponível nesta sessão. Os controles foram compilados, mas não há captura visual validada desta alteração.

Os testes privados não adicionaram conversas demonstrativas ao espaço do usuário. Nenhuma compra foi feita nem conta externa conectada durante esta verificação.
