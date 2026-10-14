
const steamApp=app=>/steam(?:webhelper)?\.exe/i.test(app||'')
function validatePurchase(purchase,amount=0){if(!purchase||purchase.merchant!=='Steam'||!purchase.item?.trim()||![purchase.total,purchase.budget].every(value=>Number.isFinite(value)&&value>0)||purchase.total>purchase.budget||amount>purchase.total)throw Error('Informe o jogo, total e orçamento autorizado antes de continuar a compra.')}
export function steamPayment(frame) {
  const tree=frame.accessibility?.tree||''
  const line=tree.split('\n').find(line=>/\bdocument .*Value: https:\/\//.test(line))
  const address=line?.match(/Value: (https:\/\/\S+)/)?.[1]
  let url;try{url=new URL(address)}catch{throw Error('Não foi possível verificar o endereço do processador.')}
  if(url.origin!=='https://cdn.safecharge.com'||url.pathname!=='/safecharge_resources/v1/checkout/collectApmFields.html'||url.searchParams.get('merchantId')!=='4626141330879790125'||url.searchParams.get('merchantSiteId')!=='237088'||url.searchParams.get('paymentMethod')!=='apmgw_PIX'||url.searchParams.get('currency')!=='BRL')throw Error('Este formulário não é o processador Pix da Steam autorizado.')
  const amount=Number(url.searchParams.get('amount'));if(!Number.isFinite(amount)||amount<=0)throw Error('Valor do Pix inválido.')
  const input=tree.match(/^\s*(\d+) edit .*?(?:CPF|personal_id).*$/m)
  if(!input)throw Error('Campo CPF não encontrado. Observe novamente.')
  return {amount,index:Number(input[1]),origin:url.origin}
}
export function redactNativeFrame(frame) {
  const tree=frame.accessibility?.tree||''
  const sensitive=/CPF|personal_id/i.test(tree)
  const mask=value=>typeof value==='string'?value.replace(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g,'***.***.***-**').replace(/(Value: https?:\/\/[^?\s]+)\?[^\s]*/g,'$1'):value
  const accessibility=Object.fromEntries(Object.entries(frame.accessibility||{}).map(([key,value])=>[key,Array.isArray(value)?value.map(mask):mask(value)]))
  return {...frame,accessibility,...(sensitive?{image:null,screenshots:[],sensitiveField:true}:{})}
}
export class SteamService {
  constructor({computer,protectedData,dataDir}) {this.computer=computer;this.protectedData=protectedData;this.dataDir=dataDir;this.owner=null}
  async execute(args,run,authorize) {
    if(run.agentId!=='pam')throw Error('Esta ferramenta pertence à Pam.')
    if(this.owner&&this.owner!==run.requestId)throw Error('A Steam está em uso por outra tarefa.')
    if(args.action==='status')return {cpf:await this.protectedData.status(),connected:!!this.computer.window&&steamApp(this.computer.window.app),window:this.computer.window}
    this.activeRun=run
    if(args.action==='connect'||args.action==='payment_window') {
      if(run.automation!=='automatic'&&!await authorize({title:args.action==='connect'?'Autorizar Pam na Steam':'Autorizar janela do Pix',details:{kind:'steam',scope:args.action==='connect'?'Steam local':'Processador Pix aberto pela Steam'}}))throw Error('Acesso à Steam recusado.')
      if(run.cancelled)throw Error('Tarefa interrompida.')
      const inventory=await this.computer.apps()
      let windows=inventory.apps.flatMap(app=>app.windows||[]).filter(window=>steamApp(window.app)&& (args.action==='connect'?window.title==='Steam':window.title==='APM Adapter'))
      if(args.action==='connect'&&!windows.length){const apps=inventory.apps.filter(app=>/^(?:Steam)$/i.test(app.displayName||'')&&/steam\.exe/i.test(app.id));if(apps.length===1){await this.computer.serialized(()=>this.computer.execute(`await sky.launch_app({app:${JSON.stringify(apps[0].id)}});nodeRepl.write('WENDLER_RESULT:null');`));windows=(await this.computer.apps()).apps.flatMap(app=>app.windows||[]).filter(window=>steamApp(window.app)&&window.title==='Steam')}}
      if(windows.length!==1)throw Error(args.action==='connect'?'Abra a Steam e mantenha uma única janela principal.':'Abra o processador Pix na Steam. Preciso de uma única janela APM Adapter.')
      if(this.computer.window?.id!==windows[0].id||this.computer.window?.app!==windows[0].app)await this.computer.select({window:windows[0]})
      this.owner=run.requestId;run.steamGeneration=this.computer.generation
      return redactNativeFrame(await this.computer.frame(true))
    }
    if(!this.owner||this.owner!==run.requestId||run.steamGeneration!==this.computer.generation||!steamApp(this.computer.window?.app))throw Error('Conecte a Steam nesta tarefa antes de agir.')
    if(args.action==='observe'||args.action==='restore')return redactNativeFrame(await this.computer.frame(true))
    if(args.action==='fill_cpf') {
      if(!(await this.protectedData.status()).saved)throw Error('Cadastre seu CPF em Perfil → Dados protegidos. Não envie o número no chat.')
      if(args.observationId!==this.computer.observationId)throw Error('Observe novamente o formulário antes de preencher.')
      const frame=this.computer.latestFrame,payment=frame.payment??steamPayment(frame)
      const purchase=args.purchase
      validatePurchase(purchase,payment.amount)
      if(!await authorize({title:'Usar CPF protegido no Pix da Steam',details:{kind:'steam',merchant:'Steam / SafeCharge',item:purchase.item,total:purchase.total,budget:purchase.budget,pix:payment.amount,currency:'BRL',destination:payment.origin,cpf:'***.***.***-**'}}))throw Error('Uso do CPF recusado.')
      if(run.cancelled||run.steamGeneration!==this.computer.generation||args.observationId!==this.computer.observationId)throw Error('Janela mudou. Observe novamente.')
      const moduleUrl=new URL('./protected-data.mjs',import.meta.url).href
      const generation=run.steamGeneration
      await this.computer.serialized(async()=>{
        if(run.cancelled||generation!==this.computer.generation||args.observationId!==this.computer.observationId)throw Error('Tarefa interrompida ou observação vencida.')
        this.computer.observationId=null
        await this.computer.execute(`${this.computer.guardCode()} {try{const fresh=await sky.get_window_state({window:wendlerWindow,include_screenshot:false,include_text:true});const check=(await import(${JSON.stringify(import.meta.url)})).steamPayment(fresh);if(check.index!==${payment.index}||check.amount!==${payment.amount})throw Error('Campo mudou.');const vault=(await import(${JSON.stringify(moduleUrl)})).createProtectedData({dataDir:${JSON.stringify(this.dataDir)}});await vault.withCpf(async value=>{await sky.set_value({window:fresh.window,element_index:check.index,value});});globalThis.wendlerObservation=null;nodeRepl.write('WENDLER_RESULT:'+JSON.stringify({filled:true,cpf:'***.***.***-**'}));}catch{throw Error('Não foi possível preencher o CPF protegido. Observe novamente o formulário.');}}`)
      })
      return {filled:true,cpf:'***.***.***-**',message:'CPF protegido preenchido. Observe o foco e use teclado para continuar até o QR Code, com aprovação. Não leia nem repita o CPF.'}
    }
    if(args.action==='act'){
      const input=args.input;if(!input)throw Error('Informe a ação observada.')
      if(input.action==='type_text'&&/CPF|personal_id/i.test(this.computer.latestFrame?.accessibility?.tree||''))throw Error('Use fill_cpf neste formulário. Não envie o CPF como texto.')
      const accessibility=this.computer.latestFrame?.accessibility||{}
      const control=Number.isInteger(input.element_index)?(accessibility.tree||'').split('\n').find(line=>new RegExp('^\\s*'+input.element_index+' ').test(line))||'':String(accessibility.focused_element||'')
      const checkout=/continue to processor|pagar|pay now|purchase|comprar|subscriber agreement|i agree/i.test(control)||(this.computer.window.title==='APM Adapter'&&input.action==='press_key'&&/^(Enter|Return)$/i.test(input.key||''))
      if(checkout)validatePurchase(args.purchase,this.computer.latestFrame?.payment?.amount||0)
      const sensitive=/remove|delete|excluir|apagar|cancel.*(?:purchase|order|pedido)|password|senha|log.?in|sign.?in|cpf|personal_id|credit card|cvv|cartão|security|privacy|permiss|segurança|privacidade|accept|agree|terms/i.test(control)
      const navigation=input.action==='scroll'||(input.action==='press_key'&&/^(?:Tab|Shift\+Tab|Escape|Left|Right|Up|Down|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|PageUp|PageDown|Home|End)$/i.test(input.key||''))
      const automatic=run.automation==='automatic'&&!checkout&&!sensitive&&(navigation||!!control)
      if(!automatic&&!await authorize({title:checkout?'Revisar pedido antes de gerar o Pix':'Autorizar ação da Pam na Steam',details:{kind:'steam',window:this.computer.window.title,action:input.action,key:input.key,control:input.element_index,purchase:args.purchase,...(this.computer.latestFrame?.payment?{pix:this.computer.latestFrame.payment.amount}:{})}}))throw Error('Ação recusada.')
      if(run.cancelled||run.steamGeneration!==this.computer.generation)throw Error('Tarefa interrompida.')
      return redactNativeFrame(await this.computer.action(input,run.steamGeneration))
    }
    throw Error('Ação Steam desconhecida.')
  }
  release(run){if(this.activeRun===run)this.activeRun=null;if(this.owner===run.requestId){this.owner=null;this.computer.releaseObservation(run.steamGeneration)}}
}
export const steamTools=[{type:'function',name:'wendler_steam',description:'Pam only: control the actual local Steam app and its Pix payment window. Status checks protected CPF registration without returning the number. Connect asks permission, observes the real Steam window, and may launch the installed Steam app. Observe before each act. fill_cpf inserts the stored CPF locally into the verified Steam Pix processor after approval, without revealing it. Stop at the actual QR code; never pay the Pix or repeat pending orders. No arbitrary application access.',inputSchema:{type:'object',additionalProperties:false,properties:{action:{type:'string',enum:['status','connect','payment_window','restore','observe','act','fill_cpf']},observationId:{type:'string'},purchase:{type:'object',additionalProperties:false,properties:{merchant:{type:'string'},item:{type:'string'},total:{type:'number'},budget:{type:'number'}},required:['merchant','item','total','budget']},input:{type:'object',additionalProperties:false,properties:{action:{type:'string',enum:['click','press_key','type_text','scroll']},observationId:{type:'string'},element_index:{type:'integer'},x:{type:'number'},y:{type:'number'},key:{type:'string'},text:{type:'string'},scrollX:{type:'number'},scrollY:{type:'number'}},required:['action','observationId']}},required:['action']}}]
