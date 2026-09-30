# Wendler

Interface local de uma equipe pessoal de agentes. Esta primeira versão é um protótipo de interface: não conecta ao Codex, não chama modelos e não executa ações externas.

Stack do projeto: React com TypeScript, JavaScript no Node.js e CSS. A implementação e as futuras integrações não devem utilizar Python.

## Executar

Requer Node.js e pnpm.

```sh
pnpm install
pnpm dev --host 127.0.0.1
```

Abra o endereço exibido pelo Vite. Para verificar a compilação:

```sh
pnpm build
```

O perfil, as preferências e as conversas demonstrativas são armazenados neste navegador. Não há conta ou login. Use dados de exemplo para avaliar a interface.

## Organização

- `src/App.tsx`: navegação e fluxos da interface.
- `src/styles.css`: temas, layout e componentes.
- `src/components/Mascot.tsx` e `mascot.css`: personagens e dez estados expressivos.
- `BRIEF.md`: decisões de produto.
- `docs/BRIEFING-PROXIMA-REUNIAO.md`: estado atual, verificações e pauta para retomar o projeto.
- `docs/`: pesquisa e referências.

O projeto anterior foi consultado em `.reference/legacy`, pasta ignorada pelo Git e independente da aplicação nova. Não é necessário para executar o Wendler.
