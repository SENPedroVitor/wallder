# Kendrick no Wendler

O Kendrick aparece na lateral e no catálogo de agentes, com o desenho original do Imhotep. O usuário pode pedir uma tela, solicitar alterações, ampliar a prévia e baixar HTML, React ou Tailwind diretamente no chat. Não precisa abrir o editor. O Imhotep continua sendo o motor e precisa estar em execução.

A ferramenta `wendler_design` pertence ao Kendrick e expõe `create`, `read`, `apply` e `present`. Cada conversa mantém um projeto persistido em `design-conversations.json`; várias telas desse projeto são frames. `apply` exige a revisão lida, mantém autoria `wendler:kendrick` e usa o mecanismo validado de operações do Imhotep. A criação é idempotente por conversa. Em conversas privadas, o serviço explica que criar telas exige uma conversa com histórico, pois os projetos persistem.

`present` renderiza o frame real, confere a revisão e salva uma captura PNG dessa revisão em `design-previews`. O card da conversa mantém essa captura mesmo após novas edições. As exportações dizem explicitamente que baixam a versão atual. HTML exporta o protótipo suportado; React/Tailwind são componentes visuais.

O navegador acessa imagens e downloads por `/api/design/asset` na mesma origem HTTPS do Wendler, evitando conteúdo misto com a API local do Imhotep. O projeto deve estar vinculado à conversa informada. A origem do motor é HTTP em loopback, configurável por `WENDLER_IMHOTEP_URL`, padrão `http://127.0.0.1:4173`. O MCP existente do Imhotep permanece disponível; a prévia do chat não depende de abrir uma aba do editor ou consultar sua seleção.

Validação: compilação TypeScript/Vite; testes de vínculo por conversa, conflitos, persistência, isolamento, captura imutável, ampliação, Escape e download; testes de navegação e personalidades. A integração também foi exercitada contra o Imhotep real, com PNG válido, e por uma chamada real ao Kendrick no executor já configurado do Wendler. Os SVGs originais do Kendrick permanecem separados dos assets Dots Lab.
