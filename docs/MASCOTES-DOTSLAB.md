# Mascotes DotsLab — 3 de outubro de 2026

Origem: [Dots Lab](https://dots-lab.pages.dev/#m1890009g7ee7433), criado por Guillaume, [@guillaume_rygn](https://x.com/guillaume_rygn).

A pedido do usuário, os desenhos e movimentos próprios antigos foram removidos. Agora usamos SVGs locais gerados com a geometria, a coreografia e o exportador SVG do DotsLab consultado nesta data. O código do editor não é carregado na aplicação e não há dependência de rede para exibir os mascotes. Os SVGs têm créditos nos metadados. Esta entrega substitui o estudo anterior em REFERENCIA-MOVIMENTO-DOTSLAB.md.

## Adaptação ao Wendler

- 20 IDs, nomes, papéis, personalidades, memórias e conversas preservados. Apenas a apresentação visual foi substituída.
- Formas do catálogo: círculo, pedra, cápsula, gota, chama, triângulo, quadrado, maleta, estrela, coração, nuvem e trevo. Cada agente tem uma combinação de forma e cor própria.
- Olhos em cápsulas na interface e oito estados originais: disponível, ouvindo, pensando, escrevendo, concluído, alerta, precisa de ajuda e descansando. A prévia também oferece os dez estilos originais de olhos: cartoon, cápsulas, pontos, anéis, felizes, cruzes, traços, diagonais, apertados e piscadela.
- Bocas removidas de todos os estados, inclusive das animações de conclusão, alerta e erro, conforme a regra do produto. Essa é uma diferença intencional em relação ao original.
- 720 arquivos em public/dotslab/agents: oito estados animados e oito poses estáticas para cada agente, além de dez estilos de olhos com versões animadas e estáticas. Estilos de olhos usam a animação de repouso.
- Avatares respeitam o espaço disponível no layout; o SVG externo encapsula suas animações, evitando conflitos entre transformações CSS do corpo e dos olhos.
- Apenas os locais que já solicitavam animação continuam animados. Imagens estáticas em mensagens antigas e miniaturas. Animação desativada fora da área visível, com a página oculta e com movimento reduzido.
- Tela Expressões mostra os oito estados e dez estilos reais. Os controles antigos foram substituídos e os acessórios retirados; tom, humor e memória continuam editáveis.

Os estados antigos usados por tarefas e pelo runtime são traduzidos para o equivalente disponível no DotsLab. Exemplo: pesquisando → pensando; bloqueado → precisa de ajuda. Não representam estados adicionais exportados pela biblioteca.
