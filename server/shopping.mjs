import path from 'node:path';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const money=value=>Number.isFinite(value)&&value>=0;
const itemKey=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function compareOffers(offers){
 const rows=offers.map(offer=>({...offer,total:offer.shipping===null?null:Math.round((offer.price+offer.shipping)*100)/100,stale:offer.checkedAt?Date.now()-Date.parse(offer.checkedAt)>30*60*1000:false}));
 rows.sort((a,b)=>(a.total??Infinity)-(b.total??Infinity)||a.price-b.price);
 const mixedEditions=new Set(rows.map(row=>row.edition||'Não informada')).size>1;
 return {offers:rows,bestConfirmed:mixedEditions?null:rows.find(row=>row.total!==null&&!row.stale)?.id??null,mixedEditions,unknownTotals:rows.filter(row=>row.total===null).length};
}
export class ShoppingService{
 constructor(dataDir){this.file=path.join(dataDir,'shopping.json');this.queue=Promise.resolve()}
 async read(){try{return JSON.parse(await readFile(this.file,'utf8'))}catch(error){if(error.code==='ENOENT')return {offers:[],orders:[]};throw error}}
 async mutate(fn){const task=this.queue.catch(()=>{}).then(async()=>{const data=await this.read();const output=fn(data);await mkdir(path.dirname(this.file),{recursive:true});const tmp=this.file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(data),{mode:0o600});await rename(tmp,this.file);return output});this.queue=task;return task}
 async execute(args,proof){
  if(args.action==='compare'){const data=await this.read();return compareOffers(data.offers.filter(row=>itemKey(row.item)===itemKey(args.item)))}
  if(args.action==='orders')return {orders:(await this.read()).orders};
  if(!proof?.url||!proof.text)throw Error('Observe primeiro a página real que comprova este registro.');
  const source=new URL(proof.url);if(!['https:','http:'].includes(source.protocol)||source.username||source.password)throw Error('Fonte inválida.');
  if(args.action==='offer'){
   if(!/R\$|BRL/i.test(proof.text))throw Error('A página não confirmou preço em reais. Confira a região e a moeda no navegador.');
   if(!args.item?.trim()||!itemKey(proof.text).includes(itemKey(args.item))||!money(args.price)||args.price===0||!['BRL'].includes(args.currency))throw Error('Produto ou preço inválido; use o nome exibido na página e reais.');
   const shown=args.price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
   if(!proof.text.includes(shown))throw Error('O preço informado não aparece na observação atual.');
   const shipping=args.shipping??null;if(shipping!==null&&!money(shipping))throw Error('Frete inválido.');
   if(shipping!==null&&shipping!==0&&!proof.text.includes(shipping.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})))throw Error('O frete informado não aparece na página.');
   if(shipping===0&&!/frete grátis|free shipping|download|digital|steam/i.test(proof.text))throw Error('Não confirme frete zero sem evidência.');
   const offer={id:randomUUID(),item:args.item.trim(),price:args.price,currency:'BRL',shipping,source:source.origin+source.pathname,checkedAt:new Date().toISOString(),payment:args.payment||'Não confirmado',edition:args.edition||'Não informada'};
   return this.mutate(data=>{data.offers=data.offers.filter(row=>!(row.item===offer.item&&row.source===offer.source));data.offers.push(offer);return {saved:true,offer}});
  }
  if(args.action==='order'){
   if(!args.orderId?.trim()||!proof.text.includes(args.orderId)||!['pending','paid','shipped','delivered','cancelled'].includes(args.status))throw Error('Pedido ou estado inválido. O identificador deve aparecer na página.');
   const patterns={pending:/pendente|aguardando|pending/i,paid:/pago|pagamento aprovado|paid|payment received/i,shipped:/enviado|despachado|shipped/i,delivered:/entregue|delivered/i,cancelled:/cancelado|cancelled|canceled/i};
   if(!patterns[args.status].test(proof.text))throw Error('O estado do pedido não foi encontrado na página.');
   const order={orderId:args.orderId,item:args.item,merchant:source.hostname,source:source.origin+source.pathname,status:args.status,checkedAt:new Date().toISOString()};
   return this.mutate(data=>{data.orders=data.orders.filter(row=>!(row.orderId===order.orderId&&row.merchant===order.merchant));data.orders.push(order);return {saved:true,order}})
  }
  throw Error('Ação inválida.');
 }
}
export const shoppingTools=[{type:'function',name:'wendler_shopping',description:'Record shopping offers and order status from the actual current browser observation, then compare offers of the exact same item. For public HTTP research, pass source as the URL returned by wendler_research in this run. Never executes payment. Unknown shipping means unknown total. Payment method is descriptive and must be checked by the agent in checkout. orders lists saved observations, not a live merchant feed.',inputSchema:{type:'object',additionalProperties:false,required:['action'],properties:{action:{type:'string',enum:['offer','compare','order','orders']},source:{type:'string'},item:{type:'string',maxLength:250},price:{type:'number'},currency:{type:'string',enum:['BRL']},shipping:{type:['number','null']},edition:{type:'string',maxLength:150},payment:{type:'string',maxLength:150},orderId:{type:'string',maxLength:150},status:{type:'string',enum:['pending','paid','shipped','delivered','cancelled']}}}}];
