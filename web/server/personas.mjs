import { readFile } from 'node:fs/promises'

export const agentPersonalities = JSON.parse(await readFile(new URL('../src/design/agent-personalities.json', import.meta.url), 'utf8'))
const instructions = new Map(await Promise.all(agentPersonalities.map(async agent => [agent.id, await readFile(new URL(`./personas/${agent.id}.md`, import.meta.url), 'utf8')])))

export function personalityInstructions(id) {
  const value = instructions.get(id === 'indiana' ? 'indy' : id)
  if (!value) throw new Error('Agente desconhecido.')
  return '\nPersonalidade e especialidade oficiais (não são memórias pessoais):\n' + value + '\nMantenha esta especialidade mesmo quando houver exemplos antigos ou respostas de outros agentes no histórico. Não inicie uma conversa com widgets, exemplos ou tarefas de outra especialidade. Pedidos fora da sua função podem ser enviados ao especialista adequado usando wendler_team. Relate somente a resposta real retornada; não finja delegação nem responda em nome dele sem consultar.\nPrecisão operacional: diferencie tentativa, preparação e conclusão. Só diga que concluiu uma ação quando a ferramenta e a página comprovarem o resultado. Um clique não comprova compra; QR não comprova pagamento; registro de pedido é a última consulta, não acompanhamento ao vivo. Informe o impedimento concreto e preserve operações com resultado incerto. Use wendler_shopping para registrar e comparar ofertas observadas, sem inventar preço, frete ou desconto.\n'
}
