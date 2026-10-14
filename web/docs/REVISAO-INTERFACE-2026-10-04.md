# Revisão da interface — 4 de outubro de 2026

Os mascotes DotsLab agora usam SVG inline com referências exclusivas por instância. Olhos e corpo acompanham o ponteiro; sem movimento por oito segundos, os olhos procuram ao redor. Movimento para fora da tela, janela oculta e preferência por movimento reduzido suspende a animação. Nenhuma boca foi adicionada. O estúdio apresenta 11 estados e dez estilos de olhos, com prévia animada.

Atividades reais do Codex selecionam pensando, pesquisando, revisando, escrevendo ou aguardando autorização. Sidebar e última resposta usam animação; o convite de equipe só anima aberto. A cena vazia e o estúdio também possuem movimento. Respostas antigas preservam o texto e não repetem avatares animados.

As mensagens agora renderizam parágrafos, listas, títulos, citações e blocos de código sem HTML executável. Links aceitam somente HTTP/HTTPS. Bolhas, contraste, espaçamento e compositor foram refinados. Telas estreitas usam drawer; conteúdo, mini-chat e painel de trabalho respeitam os limites da tela. O compositor usa a altura visível e áreas seguras, incluindo a redução de espaço ao abrir o teclado.

Cada agente mantém sua thread Codex. Foi corrigido o descarte do histórico atualizado na retomada de uma thread. Mensagens de grupo chegam em sequência aos participantes; cada um recebe as respostas dos anteriores. Menções direcionam os destinatários. Conversas paralelas vinculadas continuam disponíveis ao chat principal depois de fechar o mini-chat; o compartilhamento pode ser pausado. São transcrições compartilhadas a cada pedido, não uma execução autônoma contínua entre agentes.

Teste real: Indiana recebeu a palavra AURORA-271 no mini-chat; após fechá-lo, Ash recuperou exatamente a palavra na conversa principal. Evidência em `.artifacts/context-real.png`. No navegador, o olhar mudou entre direções do ponteiro e a rotação do corpo acompanhou o movimento. Dimensões verificadas: desktop 1280 × 800, celular 390 × 844 e altura reduzida 390 × 450, sem overflow horizontal e com o compositor dentro da tela. Isso não substitui um teste físico em cada aparelho/navegador.

Conversas e mini-chats foram zerados com cópia recuperável em `.wendler/backups/conversas-antes-reset-2026-10-05T01-09-24-848Z.json`. A data do nome é UTC. Perfil, tema, plugins e 20 personalidades foram preservados. A nova versão de contexto inicia threads limpas sem criar novos contatos ou múltiplos históricos individuais. Resultados antigos de rotinas não reaparecem no histórico limpo. O backup foi validado para importação na tela de Backup.

Compilação TypeScript/Vite e 47 testes passaram. Os testes do protocolo verificam contexto em threads retomadas, isolamento por personagem, nova versão de contexto, cancelamento e autorizações. A conexão remota mantém o site privado e a execução depende do computador acordado e conectado.
