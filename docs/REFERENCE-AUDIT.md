# Auditoria de referência legada

Escopo: leitura de `.reference/legacy` para orientar o Wendler. Esta é uma referência conceitual, não uma base para migração de código.

## Reaproveitar

- **Mascote expressivo:** o componente [`WaddleAvatar.tsx`](../.reference/legacy/web/src/components/WaddleAvatar.tsx) combina silhueta simples, olhos grandes, acessórios e estados visíveis. A ideia útil é comunicar presença e atividade por expressão, não por textos técnicos.
- **Olhar e movimento com propósito:** [`eyeTracker.ts`](../.reference/legacy/web/src/lib/eyeTracker.ts) move os olhos discretamente em direção ao cursor e respeita `prefers-reduced-motion`. Para Wendler, manter só microinterações que expliquem estado: atento, pensando, aguardando e concluído.
- **Estados como linguagem visual:** [`WaddleAvatar.css`](../.reference/legacy/web/src/components/WaddleAvatar.css) separa idle, thinking, working, waiting, blocked e done. É uma boa gramática para a cena inicial do West.
- **Base dark real:** em [`index.css`](../.reference/legacy/web/src/index.css), os tons noturnos são `#17161d` (app), `#1c1b24` (sidebar/main), `#232230` (input), `#262530` (hover), `#2d2b38` (seleção), `#372f57` (bolha do usuário), com textos `#efeef5`, `#b8b5c4` e `#918e9f`. Servem como ponto de partida, sujeitos à direção visual própria do Wendler.

## Não reaproveitar agora

- A arquitetura Python, Supabase, desktop/QML, Docker, CLI, scheduler, provedores e ferramentas da pasta `src/` é ampla demais para a primeira versão visual local.
- Não copiar o sistema de personas, prompts, bancos, credenciais, automações ou integrações do legado. O Wendler precisa decidir seu contrato com o Codex e seu modelo de dados antes de implementar isso.
- Não transferir nomes, avatares, marcas de terceiros ou cosméticos específicos. Aproveitar o princípio de uma identidade visual por personagem, criando ativos originais.

## Decisão de design sugerida

Construir primeiro uma única cena de chat com West: avatar, quatro estados, mensagem, card de delegação e um detalhe de movimento. Só depois validar navegação e outros agentes. A paleta do legado é referência de contraste e densidade, não uma especificação final.
