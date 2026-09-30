# Conversas e trabalho no Wendler

Entrega em 29/09/2026. React, TypeScript, CSS e Lucide; sem serviços de IA ou máquinas conectadas.

## Fluxos implementados

1. Respostas próximas do mesmo agente são agrupadas visualmente, sem repetir nome e horário. Relatórios longos têm Mostrar mais/menos e formatação de títulos, negrito e código. Apenas a última resposta mantém o avatar animado.
2. Digitar @ abre a lista de agentes. Setas selecionam, Enter/Tab inserem e Escape fecha. A mensagem enviada identifica os destinatários mencionados.
3. Ao chamar outro agente, uma linha recolhível registra origem, destinos e as mensagens efetivamente compartilhadas. Inclui o contexto do mini chat aberto. É uma demonstração local, sem transmissão a IA.
4. Menções ou o botão Criar tarefa geram uma tarefa vinculada ao chat permanente. Um cartão compacto abre seus detalhes. Estados: pensando, em execução, aguardando você, bloqueada e concluída. Atualizações não repetem o mesmo cartão.
5. Painel com Tarefa, Arquivos e Computador. Tarefa mostra responsável, pedido, contexto, histórico e motivo/próximo passo de bloqueio. Concluir manualmente prepara um rascunho Markdown local. Arquivos reúne anexos e rascunhos. Computador informa que nenhuma VM está conectada. Rotinas existentes continuam na aba Tarefa.

## Armazenamento e limites

Tarefas usam `wendler:tasks:v1`. Conversas e contextos permanecem no navegador. As mudanças de estado são simuladas manualmente; não executam ferramentas. Relatórios de exemplo usam trechos limitados do contexto, evitando copiar recursivamente relatórios inteiros. O contexto completo permanece disponível nos detalhes.

As menções não criam outro chat nem fixam o destinatário na sidebar. Os grupos continuam separados dos contatos individuais.

## Verificação

- Compilação TypeScript/Vite e testes Node de destinatários, transições, contexto e persistência válida.
- Testes anteriores de chats permanentes e rotinas mantidos.
- Navegador: autocomplete por teclado, envio com menção, expansão do contexto, estados, conclusão, Mostrar mais/menos, arquivos, computador e abertura do cartão a partir da aba Arquivos.
- Recarga mantém o chat individual, tarefas e histórico.
- Conferência desktop e celular; animação limitada à sidebar e última resposta com Chamar equipe fechado.
