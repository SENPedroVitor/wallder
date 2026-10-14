# Pam e Steam

## Fluxo atual no servidor

A Pam usa o Firefox compartilhado do servidor pelo WebDriver BiDi. A configuração de compras guarda nome completo e e-mail de recibos criptografados em `protected-purchase-profile.json`; `wendler_steam action=profile` consulta esses campos. O e-mail de recibos é independente da caixa própria da Pam. O arquivo de personalidade contém a instrução de consulta, sem copiar dados pessoais para o código.

O CPF fica em seu cofre separado e só é utilizado por `fill_cpf`, no processador vinculado ao pedido. Há suporte ao checkout PagSeguro selecionado pela Steam e ao fluxo legado da Nuvei. O valor mostrado como `BRL 29,78` é reconhecido junto de `R$ 29,78`. A geração entrega o QR real pelo widget Pix; preparar um QR não confirma pagamento.

As seções seguintes descrevem também o fluxo nativo Windows anterior.

A ferramenta `wendler_steam` é disponibilizada somente para a Pam, inclusive no chat normal. Ela usa o ComputerBridge existente e permite consultar status, selecionar/abrir a Steam instalada, observar, executar uma ação aprovada, acompanhar a janela APM Adapter e preencher o CPF protegido.

O acesso é limitado às janelas Steam/APM Adapter do processo Steam. Uma tarefa tem a posse da ponte; outras tarefas não podem reutilizá-la. Mudanças de janela ou interrupções invalidam as observações. Cliques e teclas de confirmação continuam sujeitos à aprovação exibida no chat. Solicitações de autorização do serviço nativo também são encaminhadas ao chat da Pam, sem revelar CPF.

O preenchimento protegido valida a origem e caminho da SafeCharge, merchantId e merchantSiteId usados pelo checkout Steam, método Pix, moeda BRL, campo real CPF e valor. Requer jogo, total e orçamento autorizado. Uma mudança no processador interrompe o preenchimento em vez de ampliar silenciosamente os destinos. O valor é descriptografado no processo local de execução, preenchido pela API nativa e não entra nos argumentos fornecidos pelo modelo. O resultado retorna apenas a máscara.

As observações de páginas com CPF omitem capturas e mascaram texto. URLs de processadores perdem seus parâmetros antes de retornar ao agente. Em páginas protegidas, use campos de acessibilidade e teclado: não invente coordenadas. O número não deve ser digitado como texto em uma chamada genérica.

A Pam deve inspecionar compras pendentes antes de criar pedidos, preservar itens do carrinho, confirmar preço/saldo/Pix, parar no QR Code e deixar o pagamento ao usuário. O status cadastrado não comprova que a compra inteira foi executada. Erros do processador exigem conferir o estado da Steam antes de repetir uma ação.

Testes cobrem domínio/merchant/orçamento, recusa, observação vencida, posse da tarefa, mudança de janela durante aprovação, ausência de CPF em código/resultado e supressão de capturas. O preenchimento e a geração do QR Code precisam ser verificados no pedido real autorizado pelo usuário; não geramos cobranças para uma verificação automática.
