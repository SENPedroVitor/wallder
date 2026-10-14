type Data=Record<string,unknown>
export default function ApprovalDetails({details}:{details:unknown}){
  if(!details||typeof details!=='object')return null
  const data=details as Data
  let browser:Data|undefined
  if(data.kind==='browser')browser=data
  else if(data.reason==='Navegador do Wendler'&&typeof data.command==='string'){try{const value:unknown=JSON.parse(data.command);if(value&&typeof value==='object')browser=value as Data}catch{/* Legacy approval may contain a plain description. */}}
  if(browser){const labels:Record<string,string>={url:'Site',control:'Controle',action:'Ação',text:'Texto a preencher',merchant:'Vendedor',item:'Produto',total:'Total',currency:'Moeda',budget:'Orçamento'};const actions:Record<string,string>={click:'Clicar',fill:'Preencher',press:'Pressionar tecla'};return <dl className="waddle-approval-details">{Object.entries(labels).flatMap(([key,label])=>{const value=browser[key];if(typeof value!=='string'&&typeof value!=='number')return [];return <div key={key}><dt>{label}</dt><dd>{key==='action'?actions[String(value)]||String(value):String(value)}</dd></div>})}</dl>}
  return <div className="waddle-approval-details">{typeof data.reason==='string'&&data.reason&&<p>{data.reason}</p>}{typeof data.command==='string'&&data.command&&<pre>{data.command}</pre>}{typeof data.cwd==='string'&&data.cwd&&<p>{data.cwd}</p>}</div>
}
