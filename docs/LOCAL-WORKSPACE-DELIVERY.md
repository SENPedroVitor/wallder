# Organização local do Wendler

Entrega: busca, backup, sincronização entre abas, controle do vínculo entre chats e equipes por projeto. JavaScript/TypeScript, React e CSS; nenhuma IA ou VM foi conectada.

- A lupa no cabeçalho busca mensagens, anexos, tarefas e rascunhos no chat atual. A busca ignora acentos e aceita vários termos. Selecionar um resultado abre a tarefa ou rola até a mensagem, destacando e expandindo o texto.
- Ajustes > Backup exporta os oito conjuntos de dados locais. A importação valida a versão, os agentes e a estrutura, mostra uma prévia e só restaura quando o usuário escolhe restaurar. A cópia anterior fica recuperável no navegador. Em erro de escrita, a restauração reverte os dados. Os arquivos não são enviados a serviços externos.
- Conversas, tarefas, mini chats, preferências, vínculos e plugins usam `useLocalStore`: mutações leem os valores mais recentes dentro do Web Lock `wendler:data`; eventos de armazenamento atualizam as outras abas. Rotinas usam o mesmo lock. A proteção de gravações simultâneas depende de Web Locks, disponível no navegador usado na verificação. Em navegadores sem esse recurso há atualização por eventos, mas sem exclusão mútua entre abas. É sincronização no mesmo navegador e origem; não é nuvem entre dispositivos. Abas de navegação do workspace continuam sendo apresentação local.
- Um vínculo pode ser pausado pelos dois chats; o histórico externo fica oculto e não entra em novos pedidos. Retomar libera o histórico completo. Snapshots de tarefas anteriores permanecem no histórico.
- Gerenciar equipes permite criar, renomear, trocar participantes, arquivar e restaurar. Cada projeto tem um único chat; modificar participantes mantém mensagens antigas. Chats individuais continuam permanentes e separados dos grupos.

## Verificação

Compilação TypeScript/Vite. Testes de backup (25), tarefas, chats permanentes e rotinas. Navegador: duas mensagens enviadas simultaneamente em duas abas e preservadas em ambas; criação/renomeação/participantes/arquivamento/restauração de equipe com histórico; busca por anexo e destaque; pausa bidirecional e tarefa com somente cinco mensagens do chat principal; exportação/importação/restauração do backup real com recuperação; encaixe dos diálogos de equipe e controles de backup em 390 px.
