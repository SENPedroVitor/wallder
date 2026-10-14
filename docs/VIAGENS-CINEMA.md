# Viagens e cinema na conversa

A Pam e os demais agentes podem usar `wendler_travel` para preparar a pesquisa e apresentar os cards originais do Pencil de ônibus e cinema. Não há um seletor de widget obrigatório para o usuário.

O fluxo começa com origem, destino, data e, para cinema, filme e unidade. Quando a data ainda estiver aberta, o card pode apresentar o planejamento com os demais campos a consultar. Uma data de estreia não define a data da visita.

## Fontes reais

`read` lê páginas públicas do Cine Araújo, ClickBus e BuscaOnibus por HTTPS, sem cookies, login nem chave. Há limite de tamanho, tempo e redirecionamentos; páginas de conta e checkout ficam fora dessa leitura. Outros provedores, pesquisas interativas e poltronas usam o Firefox configurado no servidor.

Cada leitura tem um identificador associado à execução atual. `present` exige esse identificador recente e confere se preço, horários e disponibilidade aparecem na leitura. Valores e sessões precisam de uma data que também conste na página. O desenho não é usado como fonte de informação. Se a leitura pública falhar, aparece um card identificando a fonte indisponível e mantendo os dados sem confirmação.

## Cards e controles

- Ônibus: origem/destino, horários e preço quando consultados, fonte, horário da leitura e miniatura esquemática. O mapa abre a rota no Google Maps; a miniatura não representa uma posição geográfica medida nem localização de um ônibus.
- Cinema: filme, unidade, até três sessões consultadas, preço e poltronas quando a fonte os informar. O mapa do desenho não fornece cadeiras livres por padrão. A prévia de poltronas usa controles reais da página organizados por fileira; os rótulos devem informar livre, ocupada ou selecionada. Sem estado explícito, o assento permanece desconhecido e não pode ser escolhido.
- Escolher uma poltrona na prévia pede nova conferência ao agente; não constitui reserva. Confira o mapa completo e a disponibilidade atual no provedor.
- Os botões declarados pelos cards agora são ligados às ações do componente: abrir fonte, consultar outra sessão ou enviar pedido ao agente.

## Ilha do Windows

Uma pesquisa ativa de ônibus mostra o ícone vetorial percorrendo uma linha. A animação indica trabalho em andamento; não é GPS, localização física ou porcentagem de conclusão. A consulta de cinema usa uma claquete animada. A expansão mostra o contexto da rota ou filme, e resultados consultados podem mostrar o valor retornado. Autorizações continuam tendo prioridade. Rotas de conversas privadas não aparecem na ilha.

## Validação e limites

No servidor, a leitura pelo navegador encontrou bloqueio na ClickBus e uma página sem texto útil do cinema. A leitura pública direta conseguiu consultar ambas. Um teste real com a Pam, uma rota de ônibus e uma unidade do cinema produziu os dois cards em cerca de 19 segundos. Como o usuário não escolheu o dia, preços e sessões ficaram a consultar. Esse tempo é uma medição do teste, sem garantia para todas as pesquisas.

Não foi feita reserva nem compra. O fluxo não inclui adaptadores universais de bilheteria ou ônibus: mapas e disponibilidade dependem do que o site publicar e expuser na sessão consultada. Sites podem bloquear acesso ou exigir login; nesses casos a limitação aparece na resposta.
