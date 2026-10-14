# Autonomia da equipe

Configuração global em Perfil → Permissões → Autonomia da equipe. O nível é persistido em `.wendler/automation.json` e lido pelo backend no início de cada execução, inclusive rotinas. Aplica-se a todos os agentes; uma nova autorização não precisa ser definida para cada personagem.

No nível Automática, formulários comuns de autorização das conexões são aceitos sem interromper o chat. Formulários que exigem dados adicionais, autenticação externa ou revisão de alto risco continuam manuais. Navegação cotidiana no Firefox também dispensa aprovações repetidas, mantendo observações atuais, isolamento entre conversas e confirmação de ações sensíveis.

Não é um bypass irrestrito. Credenciais, pagamentos, publicações, envio de dados pessoais, exclusões e ações identificadas como alto risco permanecem sob revisão. Comandos locais e ações na janela do computador mantêm seus controles de autorização próprios. A configuração não concede novos acessos a serviços que ainda não estejam conectados.

Escolha Pedir aprovação e salve para revogar a autonomia das próximas execuções. Execuções já iniciadas preservam o nível com que começaram; interrompa uma execução ativa se precisar revogar imediatamente.
