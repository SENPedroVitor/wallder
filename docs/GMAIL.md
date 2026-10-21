# Gmail pessoal

Conexão oficial pela API Gmail e OAuth Google, separada do AgentMail da Pam. Implementação não significa conta conectada: o estado só muda após o retorno autorizado do Google. Disponível somente para Pam.

Permissões: gmail.readonly e gmail.send. Busca, leitura, envio e resposta em conversa. Não exclui mensagens nem marca como lidas. Envio exige revisão no chat e não tem repetição automática em caso de resultado incerto. Aceitação pela API não prova entrega ao destinatário. Conteúdo de e-mail é tratado como dado de terceiros, sem autoridade para comandar o agente.

## Configuração

1. No Google Cloud, ative Gmail API no projeto escolhido.
2. Configure Google Auth Platform: nome Wendler, público externo para conta pessoal, e-mail de suporte/contato e usuário de teste correspondente à conta que será conectada.
3. Crie cliente OAuth do tipo Aplicativo da Web. Retorno exato: `http://localhost:15274/api/gmail/callback`.
4. Baixe o JSON e importe em Conexões → Ver conexões → Gmail pessoal. Não coloque o JSON no Git, chat ou arquivos públicos.
5. Neste Windows, execute `node scripts/gmail-tunnel.mjs`. A ponte SSH usa a conexão Tailscale existente, somente em loopback. Ela é necessária durante a autorização, não para leitura posterior no servidor.
6. Clique Conectar com Google e depois Autorizar minha conta no Google. O usuário escolhe a conta e concede leitura/envio diretamente no Google. Volte ao card e atualize o estado.

Tokens e segredo do cliente ficam no arquivo criptografado `protected-gmail.json`, usando o cofre do servidor ou DPAPI do Windows. Nenhum endpoint retorna os tokens. OAuth usa state aleatório, expiração de dez minutos, uso único e PKCE. Callback não carrega recursos externos nem redireciona para destinos fornecidos pelo navegador.

Em modo Testing, o Google pode expirar o refresh token após sete dias para estes escopos. Não prometer conexão permanente nesse modo. Publicação e verificação seguem as regras do Google; não publicar o aplicativo automaticamente nem ampliar acesso a outras contas.

Desconectar revoga o token junto ao Google antes de apagar os tokens locais. Também pode ser revogado diretamente na Conta Google. O cadastro do cliente é preservado.

## Limites

Sem anexos nesta entrega. Mensagens HTML sem alternativa de texto retornam o resumo disponibilizado pelo Gmail. Busca retorna até vinte IDs por página, que podem ser lidos individualmente. Não há monitoramento automático ou envio sem revisão configurado.

Testes automatizados usam conta e tokens fictícios. Fluxo real depende da criação do cliente e autorização pelo usuário; não afirmar validação real até realizá-la. A IA do servidor também precisa estar autenticada para usar o conector pelo chat.

Referências: https://developers.google.com/identity/protocols/oauth2/web-server e https://developers.google.com/workspace/gmail/api/auth/scopes.

## Estado em 20/10/2026

API Gmail ativada no projeto Google Cloud selecionado. Cliente Wendler Gmail pessoal criado, identificado como agente de IA, e importado pelo card real no servidor. Estado verificado: configured=true, connected=false, aguardando autorização da conta. Backend autenticado na IA após publicação. Compilação TypeScript/Vite e testes Gmail, AgentMail, origem e equipe passaram; o conector foi conferido no navegador. Ainda não foi feita leitura nem envio real de e-mail.

