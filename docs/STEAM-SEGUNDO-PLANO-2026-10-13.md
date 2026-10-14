# Steam em segundo plano e revisão do Pencil

O fluxo da Pam passou a usar `SteamWebService`, com um Firefox dedicado e persistente em `.wendler/steam-web/firefox-profile`. O serviço da Steam não usa Computer Use nem a janela nativa. O login e o Steam Guard são feitos pelo proprietário na janela preparada em Conexões → Ver conexões → Steam em segundo plano. Depois, a sessão pode iniciar oculta.

O teste real abriu `https://store.steampowered.com/` em Firefox headless e recebeu “Welcome to Steam”. A sessão autenticada e a preparação até o QR ainda dependem do login do usuário. Nenhuma nova compra foi realizada nesta alteração.

## Fluxo implementado

- Observações e ações usam controles reais e uma observação recente. Trocar a página, interromper a tarefa ou encerrar a conversa invalida os controles anteriores.
- A Pam consulta o preço real, sem pedir um orçamento apenas para preparar um Pix. O checkout permite somente a preparação via Pix; termos e envio de CPF conservam a revisão específica.
- O CPF usa o cofre Windows existente e é preenchido localmente no processador Steam/SafeCharge verificado. O número não é enviado como argumento da ferramenta. Capturas da página inteira não são retornadas.
- O pedido é registrado antes da abertura do processador. Pedidos incertos bloqueiam outra preparação, inclusive após reiniciar o serviço. Antes do checkout, o histórico autenticado deve ser consultado.
- `resume` reapresenta o QR já capturado ou abre o histórico do pedido pendente. A captura existente não comprova que o código continua válido ou que houve pagamento.
- `qr` captura exclusivamente o elemento identificado como QR no processador, após verificar a solicitação Pix. O card é emitido diretamente no chat; a imagem não é repetida no texto enviado ao modelo. Falta validar os seletores no checkout autenticado real.
- Conexões permite encerrar o acompanhamento local após o usuário conferir o estado no histórico. Isso não cancela pedidos na Steam.
- Atividades do chat descrevem a operação em execução. Nenhum status local é usado como comprovante de compra concluída.

## Pencil

O arquivo original `C:/Users/faux/Documents/wallder/untitled.pen` foi reaberto através do aplicativo e lido exclusivamente pelo MCP. Foram exportadas 217 telas de 800 × 600 para a pasta de auditoria. Descontados os atributos de identificação de camada, as 215 telas de produto já existentes em `public/design/screens` são idênticas aos exports atuais. As duas telas sem export de produto são referências: “Referência — West” e “Padrões do Waddle”. Nenhuma tela do canvas foi alterada.

Foram inspecionadas as capturas originais de conversa, plugins e clima. Esta comparação de arquivos não comprova identidade de cada pixel de todas as telas renderizadas: dados reais, controles, fontes nativas e adaptação ao tamanho do computador alteram a renderização. O novo card de QR é um controle funcional auxiliar; não foi encontrado um desenho específico de checkout Steam com QR no canvas.

## Continuação do teste

Concluir o login na janela preparada, ativar o segundo plano e recarregar o serviço com a sessão já salva antes do teste final. Conferir o histórico da Steam, inclusive pedidos preparados anteriormente pela janela nativa, antes de qualquer nova solicitação. Validar o checkout autorizado até o QR, sem pagar o Pix.
