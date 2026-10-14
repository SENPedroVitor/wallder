# Wendler

Interface local de uma equipe pessoal de agentes. O chat pode conversar com o Codex CLI instalado neste computador por meio de um serviço Node.js local. Os demais painéis da interface ainda incluem recursos demonstrativos.

Stack do projeto: React com TypeScript, JavaScript no Node.js e CSS. A implementação e as futuras integrações não devem utilizar Python.

## Executar

Requer Node.js e pnpm.

```sh
pnpm install
pnpm start
```

Abra o endereço exibido pelo Vite. Para verificar a compilação:

```sh
pnpm build
```

Para respostas do modelo, instale o Codex CLI e entre com sua conta ChatGPT neste computador. O serviço local informa quando ele está indisponível. O estado do runtime fica em `.wendler/`; perfil, preferências e dados anteriores da interface continuam neste navegador. Não há conta Wendler nem sincronização entre dispositivos. Consulte [Runtime local](docs/RUNTIME-LOCAL.md) para configuração, armazenamento e limites dos recursos.

## Organização

- `src/App.tsx`: navegação e fluxos da interface.
- `src/styles.css`: temas, layout e componentes.
- `src/components/Mascot.tsx` e `mascot.css`: personagens e dez estados expressivos.
- `BRIEF.md`: decisões de produto.
- `docs/BRIEFING-PROXIMA-REUNIAO.md`: estado atual, verificações e pauta para retomar o projeto.
- `docs/`: pesquisa e referências.

O projeto anterior foi consultado em `.reference/legacy`, pasta ignorada pelo Git e independente da aplicação nova. Não é necessário para executar o Wendler.
