# Conexão Figma local

Criada para o bot Figma do Wendler em 12/10/2026. Arquivo inicial fornecido: https://www.figma.com/design/Cvn94qy3tBcUTfjaYfJuxm/Sem-t%C3%ADtulo?node-id=0-1 .

## Ativação no computador

A conexão MCP `wendler-figma-local` é um processo Node local. O serviço do Wendler fornece a ponte de pareamento e a fila de comandos; o plugin no arquivo Figma executa as operações pela Plugin API.

Importe `plugins/figma-local/manifest.json` no Figma Desktop em Plugins → Development → Import plugin from manifest. Alternativamente, baixe o pacote em Perfil → Conexões → Ver conexões → Figma local. Execute Wendler Local no arquivo desejado. Gere o código no card do Wendler e digite-o no plugin. Não há chave de API do Figma.

O MCP pronto não significa arquivo conectado. Só confirme funcionamento completo depois de o plugin aparecer com o nome real do arquivo e uma leitura/edição real retornar pelo bot. Enquanto isso, o estado correto é “Ponte pronta · aguardando o plugin no Figma”.

## Operação e limites

As dez ferramentas locais oferecem status, documento, leitura de camadas, fontes, criação, edição, importação SVG, duplicação, seleção e exportação PNG/SVG. Textos carregam fontes antes de editar. Criações inválidas removem apenas os novos elementos daquele pedido. Edições podem ser desfeitas pelo Figma.

Leia o documento antes de editar e verifique o retorno depois. Vários arquivos abertos exigem sessionId para evitar editar o arquivo errado. Um timeout não comprova que a edição não aconteceu: confira o documento antes de repetir.

Esta ponte não chama o MCP oficial nem a API REST do Figma. A configuração das sessões do bot Figma desativa o conector oficial `connector_68df038e0ba48191908c8434991bbac2` e habilita a ponte local. Outros bots mantêm suas conexões existentes. Não há IA nem cobrança separada implementadas na ponte; continuam valendo a franquia do agente e as permissões da conta Figma.

O arquivo e o plugin precisam estar abertos no computador, com o serviço local ligado. Não é automação com Figma fechado, chamada literalmente ilimitada ou substituição de todas as funcionalidades do MCP oficial. O plugin recebe apenas comandos estruturados suportados, sem JavaScript arbitrário. Operações são limitadas a 100 camadas por criação, 500 por leitura e prévias com tamanho limitado.

## Manutenção

Depois de alterar `server/figma-executor.mjs`, `plugins/figma-local/boot.js`, `ui.html` ou o manifest, execute `node scripts/build-figma-plugin.mjs` e reconstrua o aplicativo. O pacote público contém somente manifest, código, interface e instruções. As credenciais locais ficam em `.wendler`, que não é publicada. O pareamento dura dez minutos, tem tentativas limitadas e não divulga tokens na tela ou nos resultados do bot.

Fontes de implementação: [Plugin API do Figma](https://developers.figma.com/docs/plugins/how-plugins-run/), [manifest e rede local](https://developers.figma.com/docs/plugins/manifest/), [MCP stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), [configuração de apps do Codex](https://learn.chatgpt.com/docs/config-file/config-reference).
