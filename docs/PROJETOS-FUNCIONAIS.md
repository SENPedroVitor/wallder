# Projetos pelo chat

O backend disponibiliza `wendler_project` para os agentes criarem tarefas, alterarem título, responsável e estado, ou salvarem notas no projeto da conversa atual. O responsável deve pertencer à equipe. Conversas privadas não alteram projetos persistentes.

A criação usa um identificador de operação para não duplicar tarefas em uma repetição. As gravações compartilham a fila do armazenamento da interface e avançam sua revisão; uma gravação antiga do navegador recebe conflito em vez de apagar a alteração do agente. Cada alteração retorna os dados salvos e exibe o widget de tarefas. O navegador atualiza os registros ao finalizar a resposta.

Registros com uma marca antiga de alteração não sincronizada são recuperados na inicialização: a cópia original é preservada no armazenamento do navegador, com a chave `wendler:records-recovery:<horário>`. Registros de ambos os lados são conservados e versões mais recentes prevalecem. Em projetos locais mais recentes, tarefas presentes no servidor também são preservadas. Essa recuperação é conservadora e pode conservar uma tarefa removida durante uma edição desconectada; a cópia original permanece disponível.

Criar ou concluir uma tarefa altera o quadro local. Isso não representa execução de seu conteúdo, pagamento ou compra externa. Execução em arquivos exige ativar Arquivos do espaço e o modo Criar tarefa.

## WSL

WSL 3.0.1.0 instalado em 11 de outubro de 2026. DISM habilitou VirtualMachinePlatform e Microsoft-Windows-Subsystem-Linux sem reiniciar automaticamente. O Windows indica reinicialização necessária e o processador reporta VirtualizationFirmwareEnabled=false. Ubuntu/WSL 2 ainda não iniciam: é necessário ativar a virtualização no firmware e reiniciar. Nenhuma VM de agente foi criada.
