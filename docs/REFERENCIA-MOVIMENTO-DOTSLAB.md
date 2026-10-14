# Movimento dos mascotes — 1 de outubro de 2026

Referência visual: [DotsLab](https://dots-lab.pages.dev/#m1890009g7ee7433).

O editor foi observado para estudar olhos, movimentos suaves, pausas e respostas de estado. A implementação do Wendler usa geometria SVG e animações CSS próprias; nenhum código exportado, pacote ou arquivo do DotsLab foi incorporado.

## Entrega

- Biblioteca ampliada de 10 para 20 estados e 18 expressões de olhos.
- Camadas separadas para piscada, olhar, inclinação, entrada e movimento do corpo. Piscada em torno do centro dos olhos, sem deslocar os traços para baixo.
- Movimentos para ouvir, pesquisar, escrever, revisar, aguardar, concentrar, concluir, alertar, bloquear, pedir ajuda, demonstrar curiosidade, desconfiança, alegria, determinação, confusão e cumplicidade, além de descansar e se surpreender.
- Pensando mantém a transformação em três formas, com saltos menores, intervalos coordenados e tempo de descanso.
- Tela Expressões com uma prévia animada, controles de pausa/repetição, seleção de estado e olhos. Miniaturas estáticas. Aplicação aos 20 personagens disponíveis, sem alterar suas silhuetas ou acrescentar bocas.
- Avatares da sidebar continuam animados; chamar equipe anima quando aberto; chat anima apenas o avatar da última resposta. Estados bloqueado e concluído acompanham as tarefas demonstrativas.
- Um listener compartilhado para seguir o cursor, pausa fora do viewport e com a página oculta, e respeito a prefers-reduced-motion.

## Verificação

Compilação TypeScript/Vite e testes existentes de tarefas, conversas permanentes, rotinas e backup. Conferência no navegador de estados, troca de personagem, olhos, pausa, miniaturas estáticas e layout de 390 px sem rolagem horizontal.

Novos estados continuam sendo estudos visuais e demonstrações locais. Não representam novas conexões de IA ou ferramentas.
