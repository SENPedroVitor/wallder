export function mathContent({a=1,b=0,c=0}={}) {
  if([a,b,c].some(v=>!Number.isFinite(v)||Math.abs(v)>100))throw Object.assign(new Error('Use coeficientes numéricos de −100 a 100.'),{status:400})
  const number=v=>Number(v.toFixed(4)).toLocaleString('pt-BR')
  const delta=b*b-4*a*c,root=a===0?(b===0?[]:[-c/b]):delta<0?[]:[(-b-Math.sqrt(delta))/(2*a),(-b+Math.sqrt(delta))/(2*a)]
  const formula=`${number(a)}x² ${b<0?'−':'+'} ${number(Math.abs(b))}x ${c<0?'−':'+'} ${number(Math.abs(c))}`
  const values=Array.from({length:81},(_,i)=>{const x=-.5+i*5/80;return a*x*x+b*x+c})
  const degenerate=a===0&&b===0
  const solution=degenerate?(c===0?'Todo número real satisfaz a equação.':'A equação não tem solução.'):a===0?'A equação é linear. Raiz: '+number(root[0])+'.':delta<0?'Não há raízes reais.':'Raízes reais: '+root.map(number).join(' e ')+'.'
  return {formula:{a,b,c},roots:root,values,notes:`Função: y = ${formula}.\nDiscriminante: Δ = b² − 4ac = ${number(delta)}.\n${solution}\nJanela do gráfico original: x de −0,5 a 4,5; y de −5 a 7. Trechos e raízes fora desses limites não aparecem no gráfico.`,bindings:{
    'Título da matemática':a===0?'Equação linear':'Equação do segundo grau','Estado da exploração':'EXPLORAR','Equação explorada':formula+' = 0','Título dos coeficientes':'COEFICIENTES',
    ...Object.fromEntries(['a','b','c'].flatMap(key=>[[`Rótulo do coeficiente ${key}`,key],[`Diminuir ${key}`,'−'],[`Aumentar ${key}`,'+'],[`Valor do coeficiente ${key}`,number({a,b,c}[key])]])),
    'Título do slider':'Ajustar o termo c','Valor do slider':number(c),'Mínimo do slider':number(Math.min(-6,c)),'Máximo do slider':number(Math.max(6,c)),'Explicação — título':'O que muda?','Explicação — conteúdo':'c desloca a curva verticalmente.','Testar outro valor — texto':'Testar c = 0','Legenda da função':'y = '+formula,
    ...Object.fromEntries([0,1,2,3,4].map(x=>['Eixo x — '+x,String(x)])), 'Eixo y — 4':'4','Eixo y — 0':'0','Eixo y — -4':'-4',
    'Título da resolução':'Resolução passo a passo','Cálculo do discriminante':'Δ = '+number(delta),'Fórmula de Bhaskara':a===0?'x = −c / b':'x = (−b ± √Δ) / (2a)','Substituição na fórmula':a===0?'Coeficiente a = 0':'('+number(-b)+' ± √'+number(delta)+') / '+number(2*a),
    'Primeira raiz — resultado':degenerate?(c===0?'Todos os reais':'Sem solução'):root.length?'x₁ = '+number(root[0]):'Sem raiz real','Segunda raiz — resultado':root.length>1?'x₂ = '+number(root[1]):'—','Agente da resposta':'','Ação do card':'Entender a resolução'
  }}
}
