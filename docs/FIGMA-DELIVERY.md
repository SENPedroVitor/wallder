# Entrega da interface a partir das referências do Figma

Implementado em 29/09/2026, com React, TypeScript, CSS e Lucide.

- Boas-vindas simples: Ash, Wendler, apresentação e Vamos começar. Perfil permanece nos ajustes.
- Conversa com bolhas, horário, anexos locais de até 2 MB e painel lateral de trabalho. O arquivo fica no armazenamento do navegador, sem transmissão externa.
- Seis estados de atividade no painel: livre, trabalhando, aguardando, bloqueado, pensando e concluído. Os dez estados originais e mascotes sem boca permanecem disponíveis em Expressões.
- Editor de rotinas por conversa: nome, instrução, horário, frequência, ativo/pausado, teste manual e histórico local. Pedidos contendo frequência e horário explícitos também criam configuração demonstrativa no chat.
- Plugins em modal, com busca, filtros e listas compactas em duas colunas. Adicionar/remove apenas registra uma preferência local; não conecta serviços.
- Chats individuais permanentes, pin após primeira mensagem e mini chats com contexto compartilhado preservados. Grupos continuam separados.

## Limites atuais

Não há IA, máquina remota, OAuth, processamento de anexos nem execução automática de rotinas. Dados permanecem no navegador e dependem de seu espaço disponível. Todos esses limites estão identificados na interface.

## Verificação

- Compilação TypeScript e Vite.
- Testes Node de migração dos chats e interpretação de horários, incluindo horários inválidos.
- Navegador em 1280×900 e 390×844; tema claro e escuro.
- Boas-vindas, retorno ao chat, perfil preservado, rotina salva e teste manual, plugins com busca/filtro/adição e persistência após recarga.
- Anexo local enviado e mantido após recarga; mini chat aberto sem mudar o chat principal.
- Nenhum erro de console durante a conferência.

Referências: arquivo Figma Cvn94qy3tBcUTfjaYfJuxm, prints de boas-vindas, conversa, rotinas e plugins. A Pam conserva o esboço original com recorte em V.
