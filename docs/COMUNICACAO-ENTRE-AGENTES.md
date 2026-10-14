
# Comunicação entre agentes

Todos os agentes do Wendler têm `wendler_team`: consultar equipe, enviar mensagem e ler recados recebidos. Um envio abre uma execução real do destinatário, com sua personalidade e ferramentas, e devolve a resposta ao remetente. A conversa mostra quem está sendo consultado; o remetente entrega o resultado ao usuário.

O destinatário recebe somente a mensagem enviada e o projeto atual, com as permissões de arquivos e computador já autorizadas. Pedidos sensíveis continuam sendo revisados no mesmo chat. A comunicação não permite ampliar permissões nem enviar e-mail automaticamente. A interrupção do remetente interrompe as execuções dependentes.

Os recados ficam no servidor em `team-messages.json`, com remetente, destinatário, resultado e horário. Conversas privadas não gravam recados. A caixa de entrada pertence ao agente; quando há projeto selecionado, só lista recados daquele projeto. Falhas são registradas como falhas, sem afirmar entrega concluída. Cadeias circulares são recusadas; cada pedido pode passar por até três agentes distintos.

Teste real: Pam enviou o resumo dos erros da Steam ao Homer e recebeu sua confirmação. O canal está disponível também para Ash delegar aos especialistas.
