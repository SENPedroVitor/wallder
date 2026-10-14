# Wendler Local — plugin do Figma

1. No Figma Desktop, abra o arquivo desejado.
2. Vá em Plugins → Development → Import plugin from manifest e escolha `manifest.json` desta pasta. Se o Figma pedir um ID de plugin, use Plugins → Development → New plugin para gerar um ID e coloque somente esse ID no manifest; ele não é uma chave de API.
3. Execute Plugins → Development → Wendler Local.
4. No Wendler, abra Perfil → Conexões → Ver conexões. No card Figma local, clique em Gerar código de conexão.
5. Digite o código no plugin e clique em Conectar arquivo. O card deve mostrar o nome real do arquivo conectado.
6. Mantenha o arquivo e o plugin abertos. Converse com o bot Figma no Wendler.

Não há chave de API do Figma, assinatura extra, serviço de nuvem ou IA própria neste plugin. A ponte usa exclusivamente `http://localhost:5174`. Se o Figma pedir autorização para acessar a rede local, permita a conexão ao computador. Seus acessos e limites normais da conta Figma continuam valendo.

O bot pode ler camadas, textos e layouts, listar fontes, criar frames, formas, componentes e textos, editar propriedades, importar SVG, duplicar, selecionar e exportar PNG/SVG. Não há execução arbitrária de JavaScript nem chamada à API REST ou ao MCP oficial. Edições podem ser desfeitas no próprio Figma. A conexão depende do serviço local do Wendler ligado.

O código de pareamento expira em dez minutos. Quando o manifest possui um ID de desenvolvimento, a autorização local fica no armazenamento privado do plugin. Sem ID, ela permanece apenas durante a execução: ao reabrir o plugin, gere outro código. Nenhuma credencial é embutida no código. Desconectar no plugin apaga sua autorização salva. Um plugin fechado fica inativo após alguns segundos; o bot recebe uma mensagem real de desconexão.
