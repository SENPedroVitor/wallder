import { claimBrowserPreview } from './browser-monitor.mjs'
import path from "node:path";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { launchFirefox } from "./firefox.mjs";
import {createPurchaseProfile} from './purchase-profile.mjs';
import {validPixCode} from './pix-code.mjs';
import {remoteFirefoxConfig,claimRemoteControl,releaseRemoteControl} from './remote-firefox.mjs';

export function steamAddress(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    ![
      "store.steampowered.com",
      "checkout.steampowered.com",
      "help.steampowered.com",
      "steamcommunity.com",
      "cdn.safecharge.com",
      "checkout.international.pagseguro.com",
    ].includes(url.hostname)
  )
    throw Error("Endereço fora da loja Steam ou do processador autorizado.");
  return url;
}
export function checkoutControl(name) {
  return /^(?:continue to processor|continuar.*processador|purchase|comprar|pagar|pay now|finalizar compra)$/i.test(
    name.trim(),
  );
}
export function steamClickDestination(href,currentUrl){
  steamAddress(currentUrl);
  // These are Steam's observed native cart controls, not navigation URLs.
  if(/^javascript:\s*(?:addToCart|addBundleToCart)\(\s*\d+\s*\);?\s*$/i.test(href))return null;
  const processor=externalCheckout(href,currentUrl);if(processor)return processor;
  return steamAddress(new URL(href,currentUrl).href);
}
export function externalCheckout(href,currentUrl){
 const current=steamAddress(currentUrl);
 if(!['checkout.steampowered.com','store.steampowered.com'].includes(current.hostname))return null;
 const match=/^javascript:\s*PerformExternalFinalizeTransaction\(\s*(['"])(https:\/\/[^'"]+)\1\s*,\s*(?:true|false)\s*\);?\s*$/i.exec(href);
 if(!match)return null;
 const url=steamAddress(match[2]);
 if(!['cdn.safecharge.com','checkout.international.pagseguro.com'].includes(url.hostname))throw Error('Processador externo desconhecido.');
 return url;
}
export function verifiedPix(url) {
  return (
    url.origin === "https://cdn.safecharge.com" &&
    url.pathname ===
      "/safecharge_resources/v1/checkout/collectApmFields.html" &&
    url.searchParams.get("merchantId") === "4626141330879790125" &&
    url.searchParams.get("merchantSiteId") === "237088" &&
    url.searchParams.get("paymentMethod") === "apmgw_PIX" &&
    url.searchParams.get("currency") === "BRL" &&
    Number.isFinite(Number(url.searchParams.get("amount"))) &&
    Number(url.searchParams.get("amount")) > 0
  );
}
export function verifiedProcessor(url,pending){
 if(!pending)return false;
 if(verifiedPix(url))return Number(url.searchParams.get('amount'))<=pending.total;
 if(url.hostname!=='checkout.international.pagseguro.com'||!pending.processorUrl)return false;
 const source=new URL(pending.processorUrl);
 return url.origin===source.origin&&url.pathname===source.pathname&&/^\/[\da-f-]{36}$/i.test(source.pathname);
}
export function processorAmount(body,total){
 const values=[...new Set([...body.matchAll(/(?:R\$|BRL)\s*((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})/g)].map(match=>Number(match[1].replace(/\./g,'').replace(',','.'))))];
 if(values.length!==1||!Number.isFinite(values[0])||values[0]<=0||values[0]>total)throw Error('Não consegui confirmar um único valor válido neste processador.');
 return values[0];
}
export class SteamWebService {
  constructor({ dataDir, protectedData, launch = launchFirefox }) {
    this.root = path.join(dataDir, "steam-web");
    this.file = path.join(this.root, "pending.json");
    this.protectedData = protectedData;
    this.purchaseProfile=createPurchaseProfile({dataDir});
    this.launch = launch;
    this.context = null;
    this.page = null;
    this.queue = Promise.resolve();
    this.owner = null;
    this.observation = null;
    this.visible = false;
    this.authenticated = false;
    this.historyChecked = false;
    this.historyPending = false;
  }
  serial(fn) {
    const result = this.queue.catch(() => {}).then(fn);
    this.queue = result;
    return result;
  }
  async pending() {
    try {
      const value = JSON.parse(await readFile(this.file, "utf8"));
      return value.phase === "closed" ? null : value;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
  async save(value) {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.file + ".tmp", JSON.stringify(value),{mode:0o600});
    await rename(this.file + ".tmp", this.file);
  }
  async start(visible = false) {
    if (this.context && this.visible === visible) return;
    if (this.context) await this.context.close();
    this.context = await this.launch(this.root, {
      visible,
      profileMode: "dedicated",
    });
    claimBrowserPreview(this);
    this.lastAuthCheck=0;this.authVerified=false;
    this.visible = visible;
    const pending=await this.pending();
    const pages=this.context.pages?await this.context.pages():[this.context.initialPage];
    const allowed=pages.filter(page=>{try{return !!steamAddress(page.url())}catch{return false}});
    const processors=pending?allowed.filter(page=>verifiedProcessor(new URL(page.url()),pending)):[];
    this.page=processors.length===1?processors[0]:allowed.find(page=>/steampowered\.com$/.test(new URL(page.url()).hostname))||allowed[0]||this.context.initialPage;
    this.observation = null;
    const context = this.context;
    context.on("page", (page) => {
      if(context.remoteControl?.lease&&context.remoteControl.lease!==this.owner)return;
      try{steamAddress(page.url())}catch{return;}
      this.page = page;
      this.observation = null;
    });
    context.on("close", () => {
      if (this.context === context) {
        this.context = null;
        this.page = null;
        this.observation = null;
      }
    });
    if(!allowed.includes(this.page)){this.page=await this.context.newPage();await this.page.goto("https://store.steampowered.com/", {waitUntil:"domcontentloaded"});}
  }
  async status() {
    if(!this.context&&(process.env.WENDLER_BROWSER_ENDPOINT||await remoteFirefoxConfig(this.root)))await this.start(false);
    const context=this.context;
    let authenticatedPage=null,probeAuthenticated=false,storeSeen=false;
    const pages=context?.pages?await Promise.resolve().then(()=>context.pages()).catch(()=>[]):[];
    const candidates=[...new Set([this.page,...pages].filter(Boolean))];
    for(const page of candidates){
      let url;try{url=steamAddress(page.url())}catch{continue}
      if(url.hostname!=='store.steampowered.com')continue;
      storeSeen=true;
      if(await page.evaluate(()=>!!document.querySelector('#account_pulldown')).catch(()=>false)){authenticatedPage=page;break}
    }
    if(!authenticatedPage&&context?.newPage&&!this.owner&&!context.remoteControl?.lease&&(!this.lastAuthCheck||Date.now()-this.lastAuthCheck>60000)){
      this.lastAuthCheck=Date.now();const lease='steam-auth-probe';let probe;
      try{claimRemoteControl(context,lease);probe=await context.newPage();await probe.goto('https://store.steampowered.com/',{waitUntil:'domcontentloaded',timeout:10000});probeAuthenticated=await probe.evaluate(()=>!!document.querySelector('#account_pulldown'));this.authVerified=probeAuthenticated;}
      catch{this.lastAuthCheck=0;}
      finally{await probe?.close?.().catch(()=>{});releaseRemoteControl(context,lease)}
    }
    if(this.context===context){this.authenticated=!!(authenticatedPage||probeAuthenticated||(!storeSeen&&this.lastAuthCheck&&Date.now()-this.lastAuthCheck<60000&&this.authVerified));
      if(authenticatedPage&&!this.owner&&this.page!==authenticatedPage&&!await this.pending()){this.page=authenticatedPage;this.observation=null;}
    }
    const authenticated = !!this.context && this.authenticated;
    return {
      active: !!this.context,
      url: this.page?new URL(this.page.url()).origin+new URL(this.page.url()).pathname:'',
      remote: !!this.context?.remote,
      desktopUrl: this.context?.desktopUrl,
      background: !!this.context && !this.visible,
      authenticated,
      pending: await this.pending().then((value) =>
        value
          ? {
              id: value.id,
              item: value.item,
              total: value.total,
              phase: value.phase,
              pix: value.pix,
              processorExpired:value.processorExpired===true,
              lastStage:value.lastStage,
              lastStageMs:value.lastStageMs,
            }
          : null,
      ),
      cpf: await this.protectedData.status(),
    };
  }
  async configure(action, { checked = false } = {}) {
    return this.serial(async () => {
      if (this.owner) throw Error("Aguarde a Pam terminar a tarefa.");
      if (["login","background","disconnect"].includes(action)) claimBrowserPreview(this);
      if (action === "login") {
        await this.start(true);
        await this.page.goto("https://store.steampowered.com/login/", {
          waitUntil: "domcontentloaded",
        });
      } else if (action === "background") await this.start(false);
      else if(action==='disconnect'){if(this.context)await this.context.close();this.context=null;this.page=null;this.authenticated=false;}
      else if (action === "close-pending") {
        if (checked !== true)
          throw Error(
            "Confira primeiro o estado do pedido no histórico da Steam.",
          );
        const pending = await this.pending();
        if (!pending) throw Error("Não há pedido pendente.");
        await this.save({
          ...pending,
          phase: "closed",
          closedAt: new Date().toISOString(),
        });
        this.historyChecked = false;
      } else throw Error("Ação inválida.");
      return this.status();
    });
  }
  async preview() {
    const page=this.page;
    if(!page)return {active:false,remote:!!process.env.WENDLER_BROWSER_ENDPOINT,url:'',events:[]};
    const url=page.url();
    const privateForm=['cdn.safecharge.com','checkout.international.pagseguro.com'].includes(new URL(url).hostname)||await page.evaluate(()=>[...document.querySelectorAll('input[type="password"]')].some(input=>input.value)).catch(()=>true);
    const image=privateForm?null:'data:image/png;base64,'+(await page.screenshot()).toString('base64');
    if(page!==this.page||url!==page.url())return {active:true,remote:!!this.context?.remote,image:null,url:'',events:[]};
    return {active:true,remote:!!this.context?.remote,desktopUrl:this.context?.desktopUrl,title:await page.title(),url:url.split('?')[0],image,protected:privateForm,capturedAt:new Date().toISOString(),source:'steam',events:[]};
  }
  async fillProfile(run,authorize){
    const pending=await this.pending(),profile=await this.purchaseProfile.read();
    if(!profile.configured)throw Error('Cadastre nome e e-mail de recibos primeiro.');
    const check=()=>{if(run.cancelled||!verifiedProcessor(new URL(this.page.url()),pending)||new URL(this.page.url()).hostname!=='checkout.international.pagseguro.com')throw Error('Pedido mudou ou foi interrompido.');};
    check();const body=await this.page.locator('body').innerText();
    if(/página expirou|página expirada|page expired/i.test(body)){await this.save({...pending,processorExpired:true});throw Error('A página do PagSeguro expirou. Confira o pedido na Steam antes de iniciar outra compra.');}
    const pix=processorAmount(body,pending.total);
    if(!await authorize({title:'Preencher dados protegidos do pedido Steam / PagSeguro',details:{merchant:'Steam / PagSeguro',fullName:profile.fullName,receiptEmail:profile.receiptEmail,cpf:'***.***.***-**',pix}}))throw Error('Preenchimento recusado.');
    const fill=async(field,value)=>{check();const handles=await this.page.locator('input[name="'+field+'"],input[id="'+field+'"]').elementHandles();try{const visible=[];for(const handle of handles)if(await handle.isVisible())visible.push(handle);if(visible.length!==1)throw Error('Não encontrei um único campo '+field+'.');await visible[0].fill(value);check();if(visible[0].evaluate&&!await visible[0].evaluate(node=>!!node.value&&node.validity.valid))throw Error('O formulário não aceitou o campo '+field+'.')}finally{await Promise.allSettled(handles.map(handle=>handle.dispose()))}};
    await fill('fullName',profile.fullName);await fill('email',profile.receiptEmail);
    await this.protectedData.withCpf(value=>fill('cpfCnpjDocument',value));this.observation=null;
    return {filled:['nome','email','cpf'],cpf:'***.***.***-**',pix};
  }
  async prepareQr(run,authorize){
    const deadline=Math.min(run.deadlineAt??Date.now()+180000,Date.now()+180000);
    const check=()=>{if(run.cancelled||Date.now()>=deadline)throw Error('Preparação interrompida; o pedido foi preservado.');};
    const step=async(name,operation,budget=15000)=>{
      check();let timer;const started=Date.now();
      const current=await this.pending();if(current)await this.save({...current,lastStage:name,stageStartedAt:new Date(started).toISOString()});
      run.onProgress?.('Steam · '+name+'…');
      try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>{run.cancelled=true;reject(Error('Prazo excedido na etapa '+name+'. Pedido preservado; não reenvie.'));},Math.max(1,Math.min(budget,deadline-Date.now())))})]);}
      finally{clearTimeout(timer);const current=await this.pending();if(current)await this.save({...current,lastStage:name,lastStageMs:Date.now()-started})}
    };
    const pending=await this.pending();
    if(!pending)throw Error('Abra primeiro o processador do pedido Steam autorizado.');
    const pages=this.context.pages?await this.context.pages():[this.page];
    let matches=pages.filter(page=>{try{return verifiedProcessor(new URL(page.url()),pending)}catch{return false}});
    if(matches.length>1){
      const populated=[];
      for(const page of matches){check();if(await page.evaluate(()=>[...document.querySelectorAll('input[name="fullName"],input[name="cpfCnpjDocument"]')].some(node=>!!node.value)))populated.push(page);}
      if(populated.length===1)matches=populated;
    }
    if(matches.length!==1)throw Error('Não encontrei uma única janela do pedido. Retome o processador; não crie outro pedido.');
    this.page=matches[0];check();
    // A prior submission is reconciled by capture only, never another click.
    if(!['pix-requested','qr-ready'].includes(pending.phase)){
      if(new URL(this.page.url()).hostname!=='checkout.international.pagseguro.com')throw Error('Preparação automática ainda disponível apenas para PagSeguro; use o fluxo protegido da Nuvei.');
      await step('preenchimento',()=>this.fillProfile(run,authorize));check();
      const handles=await this.page.locator('button,input[type="submit"],[role="button"]').elementHandles();
      try{
        const matches=[];
        for(const handle of handles){check();if(await handle.isVisible()&&await handle.evaluate(node=>!node.disabled&&/^(finalizar compra|gerar (?:pix|qr(?: code)?)|pagar|pay now)$/i.test((node.textContent||node.value||node.getAttribute('aria-label')||'').trim())))matches.push(handle);}
        if(matches.length!==1)throw Error('Não encontrei um único botão de geração de Pix. Nenhum pedido foi reenviado.');
        const pix=processorAmount(await this.page.locator('body').innerText(),pending.total);
        check();await this.save({...pending,pix,phase:'pix-requested',requestedAt:new Date().toISOString()});check();
        await step('solicitação do QR',()=>matches[0].click());
      }finally{await Promise.allSettled(handles.map(handle=>handle.dispose()));}
    }
    const captureUntil=Math.min(deadline,Date.now()+20000);
    while(Date.now()<captureUntil){
      check();
      try{return await step('captura do QR',()=>this.qr(run),5000)}catch(error){
        if(!/não está mostrando|Não encontrei um único QR/i.test(error.message))throw error;
      }
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    throw Error('O QR não apareceu no prazo. Resultado da solicitação incerto; retome o mesmo pedido, sem reenviar.');
  }
  async qr(run) {
    const url = steamAddress(this.page.url()),
      pending = await this.pending();
    if (!pending || !verifiedProcessor(url,pending) || !['processor-requested','pix-requested','qr-ready'].includes(pending.phase))
      throw Error("Abra o QR do pedido pendente no processador verificado.");
    const text = await this.page.locator("body").innerText();
    if(/página expirou|página expirada|page expired/i.test(text)){await this.save({...pending,processorExpired:true});throw Error('A página do PagSeguro expirou. Confira o pedido na Steam antes de iniciar outra compra.');}
    if (!/pix/i.test(text))
      throw Error("O processador ainda não está mostrando um Pix.");
    const pix=url.hostname==='checkout.international.pagseguro.com'?processorAmount(text,pending.total):pending.pix;
    if(!Number.isFinite(pix)||pix<=0)throw Error('O valor do Pix ainda não foi confirmado.');
    const handles = await this.page
      .locator(
        'img[alt*="QR" i],img[id*="qr" i],canvas[id*="qr" i],img[class*="qr" i],canvas[class*="qr" i],svg[id*="qr" i]',
      )
      .elementHandles();
    try {
      const visible = [];
      for (const handle of handles)
        if (await handle.isVisible().catch(() => false)) visible.push(handle);
      if (visible.length !== 1)
        throw Error("Não encontrei um único QR Code real para capturar.");
      const image =
        "data:image/png;base64," +
        (await visible[0].screenshot()).toString("base64");
      const candidates=await this.page.evaluate(()=>[...document.querySelectorAll('textarea,input,[data-pix-code]')].map(node=>node.value||node.getAttribute('data-pix-code')||'').filter(value=>value.startsWith('000201'))).catch(()=>[]);
      const codes=[...new Set(candidates.filter(validPixCode))];
      const code=codes.length===1?codes[0]:undefined;
      const saved = { ...pending, pix,phase: "qr-ready", qr: image,...(code?{code}:{}) };
      if(run?.cancelled||this.page.url()!==url.href)throw Error('Captura interrompida ou página alterada. Pedido preservado.');
      await this.save(saved);
      return {
        widget: {
          type: "pix",
          data: {
            id: pending.id,
            item: pending.item,
            total: pending.total,
            pix,
            image,
            ...(code?{code}:{}),
          },
        },
        message: "QR Code real capturado. O pagamento fica para o usuário.",
      };
    } finally {
      await Promise.allSettled(handles.map((handle) => handle.dispose()));
    }
  }
  async observe() {
    const observedUrl=this.page.url();steamAddress(observedUrl);
    const handles = await this.page
      .locator('a[href],button,input,select,[role="button"]')
      .elementHandles();
    const visible = [];
    for (const handle of handles) {
      if (visible.length < 180 && (await handle.isVisible().catch(() => false)))
        visible.push(handle);
      else await handle.dispose().catch(()=>{});
    }
    const targets = await Promise.all(
      visible.map(async (handle, target) => ({
        target,
        ...(await handle.evaluate((node) => ({
          name: (
            node.getAttribute("aria-label") ||
            node.textContent ||
            [...(node.labels || [])]
              .map((label) => label.textContent)
              .join(" ") ||
            node.getAttribute("placeholder") ||
            node.name ||
            node.id ||
            ""
          )
            .trim()
            .slice(0, 150),
          type: node.type || "",
          options:
            node.tagName === "SELECT"
              ? [...node.options]
                  .slice(0, 30)
                  .map((option) => ({
                    value: option.value,
                    label: option.textContent,
                  }))
              : undefined,
          href: node.getAttribute("href") || "",
        }))),
      })).map(promise=>promise.catch(()=>null)),
    );
    if(this.page.url()!==observedUrl){await Promise.allSettled(visible.map(handle=>handle.dispose()));this.observation=null;throw Error('A navegação ocorreu e a página mudou durante a leitura. Observe novamente; não repita o clique.');}
    const retained=[];const controls=[];
    for(let index=0;index<targets.length;index++){const target=targets[index];if(target){controls.push({...target,target:retained.length});retained.push(visible[index]);}else await visible[index].dispose().catch(()=>{});}
    if (this.observation)
      await Promise.allSettled(
        this.observation.handles.map((handle) => handle.dispose()),
      );
    this.observation = {
      id: randomUUID(),
      url: this.page.url(),
      handles: retained,
      targets:controls,
    };
    const body = await this.page.locator("body").innerText();
    if (
      new URL(this.page.url()).hostname === "store.steampowered.com" &&
      new URL(this.page.url()).pathname === "/account/history/"
    ) {
      this.historyChecked = (await this.status()).authenticated;
      this.historyPending =
        /pending purchase|pending transaction|compra pendente|transação pendente|pagamento pendente/i.test(
          body,
        );
    }
    return {
      observationId: this.observation.id,
      url: this.page.url().split("?")[0],
      text: body
        .replace(
          /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g,
          "***.***.***-**",
        )
        .slice(0, 18000),
      targets: controls.map((control) => ({
        ...control,
        href: control.href.split("?")[0],
      })),
      ...(await this.status()),
    };
  }
  async execute(args, run, authorize) {
    return this.serial(async () => {
      if (run.agentId !== "pam") throw Error("Esta ferramenta pertence à Pam.");
      if(args.action==='profile')return this.purchaseProfile.read();
      if (this.owner && this.owner !== run.requestId)
        throw Error("A Steam está em uso por outra tarefa.");
      if (args.action === "status") return this.status();
      if(args.action==='preflight'){
        const status=await this.status();const profile=await this.purchaseProfile.read();
        return {browser:status.active,authenticated:status.authenticated,cpfSaved:status.cpf.saved,profileConfigured:profile.configured,pending:status.pending,ready:status.active&&status.authenticated&&status.cpf.saved&&profile.configured,requires:!status.authenticated?'Confira o login da Steam':!status.cpf.saved?'Cadastre CPF protegido':!profile.configured?'Cadastre nome e e-mail de recibos':null};
      }
      this.owner = run.requestId;
      if (this.context && this.visible && !(await this.status()).authenticated)
        throw Error(
          "Conclua o login na janela da Steam e ative o segundo plano em Conexões.",
        );
      await this.start(false);
      claimRemoteControl(this.context,run.requestId);
      claimBrowserPreview(this,run.conversationId);
      if (run.cancelled) throw Error("Tarefa interrompida.");
      if(args.action==='prepare_qr')return this.prepareQr(run,authorize);
      if(args.action==='fill_profile')return this.fillProfile(run,authorize);
      if(args.action==='payment_window'){
        const pending=await this.pending();
        const candidates=this.context.pages?await this.context.pages():[this.page];
        const matches=pending?candidates.filter(page=>{try{return verifiedProcessor(new URL(page.url()),pending)}catch{return false}}):[];
        if(matches.length!==1)throw Error('Não encontrei uma única janela verificada do processador deste Pix. Não gere outro pedido.');
        this.page=matches[0];this.observation=null;
        return this.observe();
      }
      if (
        args.action === "connect" ||
        args.action === "observe" ||
        args.action === "restore"
      )
        return this.observe();
      if (args.action === "resume") {
        const pending = await this.pending();
        if (!pending) throw Error("Não há pedido local para retomar.");
        if (pending.qr)
          return {
            widget: {
              type: "pix",
              data: {
                id: pending.id,
                item: pending.item,
                total: pending.total,
                pix: pending.pix,
                image: pending.qr,
                ...(pending.code?{code:pending.code}:{}),
              },
            },
            message:
              "Captura existente do pedido; confira a validade no processador. Não foi criado outro pedido.",
          };
        await this.page.goto(
          pending.processorUrl&&verifiedProcessor(steamAddress(pending.processorUrl),pending)?pending.processorUrl:"https://store.steampowered.com/account/history/",
          { waitUntil: "domcontentloaded" },
        );
        return this.observe();
      }
      if (args.action === "qr") return this.qr(run);
      if (args.action === "open") {
        const address = steamAddress(args.url);
        await this.page.goto(address.href, { waitUntil: "domcontentloaded" });
        return this.observe();
      }
      if (!this.observation || args.observationId !== this.observation.id)
        throw Error("Observe novamente antes de agir.");
      const control = this.observation.targets[args.target],
        handle = this.observation.handles[args.target];
      if (!control || !handle) throw Error("Controle não encontrado.");
      steamAddress(this.page.url());
      if(args.action==='click'&&control.href){
        const destination=steamClickDestination(control.href,this.page.url());
        if(destination&&/cancel|delete|remove/i.test(destination.pathname))throw Error('Cancelar ou remover exige intervenção do usuário.');
      }
      if (args.action === "fill_cpf") {
        const url = new URL(this.page.url()),
          pending = await this.pending();
        if(url.hostname==='checkout.international.pagseguro.com'){
          if(!verifiedProcessor(url,pending)||!/cpf|personal_id/i.test(control.name))throw Error('Campo fora do processador vinculado a este pedido Steam.');
          const pix=processorAmount(await this.page.locator('body').innerText(),pending.total);
          if(!await authorize({title:'Usar CPF protegido no PagSeguro da Steam',details:{merchant:'Steam / PagSeguro',cpf:'***.***.***-**',pix}}))throw Error('Uso do CPF recusado.');
          this.ensureObservation(args,run);await this.protectedData.withCpf(value=>handle.fill(value));this.observation=null;
          return {filled:true,cpf:'***.***.***-**'};
        }
        if (!pending || Number(url.searchParams.get("amount")) > pending.total)
          throw Error("O CPF só pode ser usado no pedido pendente verificado.");
        if (
          url.origin !== "https://cdn.safecharge.com" ||
          url.pathname !==
            "/safecharge_resources/v1/checkout/collectApmFields.html" ||
          url.searchParams.get("merchantId") !== "4626141330879790125" ||
          url.searchParams.get("merchantSiteId") !== "237088" ||
          url.searchParams.get("paymentMethod") !== "apmgw_PIX" ||
          url.searchParams.get("currency") !== "BRL" ||
          !Number.isFinite(Number(url.searchParams.get("amount"))) ||
          Number(url.searchParams.get("amount")) <= 0 ||
          !/cpf|personal_id/i.test(control.name)
        )
          throw Error("Campo fora do processador Pix verificado.");
        if (
          !(await authorize({
            title: "Usar CPF protegido neste pedido Steam",
            details: {
              merchant: "Steam",
              cpf: "***.***.***-**",
              pix: Number(url.searchParams.get("amount")),
            },
          }))
        )
          throw Error("Uso do CPF recusado.");
        this.ensureObservation(args, run);
        await this.protectedData.withCpf((value) => handle.fill(value));
        this.observation = null;
        return { filled: true, cpf: "***.***.***-**" };
      }
      if (args.action === "select") {
        this.ensureObservation(args, run);
        if (
          !/^select-/.test(control.type) ||
          !control.options?.some((option) => option.value === args.text)
        )
          throw Error("Escolha uma opção real do controle observado.");
        await handle.selectOption(args.text);
      } else if (args.action === "fill") {
        this.ensureObservation(args, run);
        if (
          /password|cpf|personal_id|card|cvv/i.test(
            control.type + " " + control.name,
          )
        )
          throw Error(
            "Dados protegidos exigem o fluxo próprio; login é feito pelo usuário.",
          );
        await handle.fill(args.text || "");
      } else if (args.action === "click") {
        if (/sign.?in|log.?in|senha|password/i.test(control.name))
          throw Error(
            "Conecte sua conta em Conexões → Steam em segundo plano.",
          );
        if (
          /subscriber agreement|i agree|termos|terms/i.test(control.name) &&
          !(await authorize({
            title: "Aceitar termos da Steam",
            details: { merchant: "Steam", control: control.name },
          }))
        )
          throw Error("Termos não aceitos.");
        if (
          checkoutControl(control.name) &&
          !['cdn.safecharge.com','checkout.international.pagseguro.com'].includes(new URL(this.page.url()).hostname)
        ) {
          if (!this.historyChecked || this.historyPending)
            throw Error(
              "Confira o histórico autenticado da Steam antes de preparar outro pedido. Se houver compra pendente, retome esse pedido.",
            );
          const pending = await this.pending();
          if (pending)
            throw Error(
              "Há um pedido pendente. Consulte o histórico da Steam e retome esse pedido; não crie outro.",
            );
          const text = await this.page.locator("body").innerText();
          if (
            !/continue to processor|continuar.*processador/i.test(
              control.name,
            ) ||
            !/pix/i.test(text)
          )
            throw Error(
              "Só posso preparar um Pix. Não posso finalizar outra forma de pagamento.",
            );
          if (
            !args.purchase?.item ||
            !Number.isFinite(args.purchase.total) ||
            args.purchase.total <= 0
          )
            throw Error("Confirme o jogo e o preço real exibido pela Steam.");
          if (
            !(await authorize({
              title: "Preparar Pix da Steam",
              details: {
                ...args.purchase,
                payment: "O pagamento será feito pelo usuário.",
              },
            }))
          )
            throw Error("Pedido recusado.");
          if (run.cancelled) throw Error("Tarefa interrompida.");
          await this.save({
            id: randomUUID(),
            phase: "processor-requested",
            item: args.purchase.item,
            total: args.purchase.total,
            processorUrl:control.href?externalCheckout(control.href,this.page.url())?.href:undefined,
            createdAt: new Date().toISOString(),
          });
        }
        if (
          checkoutControl(control.name) &&
          new URL(this.page.url()).hostname === "cdn.safecharge.com"
        ) {
          const url = new URL(this.page.url()),
            pending = await this.pending();
          if (
            !verifiedPix(url) ||
            !pending ||
            Number(url.searchParams.get("amount")) > pending.total
          )
            throw Error("Valor ou processador do pedido não verificado.");
          if (pending.phase === "pix-requested" || pending.phase === "qr-ready")
            throw Error(
              "O Pix já foi solicitado. Observe ou retome o pedido, sem reenviar.",
            );
          await this.save({
            ...pending,
            phase: "pix-requested",
            pix: Number(url.searchParams.get("amount")),
          });
        }
        this.ensureObservation(args, run);
        if(new URL(this.page.url()).hostname==='checkout.international.pagseguro.com'){
          const pending=await this.pending();
          if(!verifiedProcessor(new URL(this.page.url()),pending))throw Error('Este processador não está vinculado ao pedido Steam.');
          if(/pagar|pay|gerar|generate|confirmar|finalizar compra/i.test(control.name)){
            if(['pix-requested','qr-ready'].includes(pending.phase))throw Error('O Pix já foi solicitado. Capture o QR sem reenviar.');
            const pix=processorAmount(await this.page.locator('body').innerText(),pending.total);
            await this.save({...pending,pix,phase:'pix-requested'});
          }
        }
        await handle.click();
      } else throw Error("Ação desconhecida.");
      this.observation = null;
      return this.observe();
    });
  }
  ensureObservation(args, run) {
    if (
      run.cancelled ||
      !this.observation ||
      args.observationId !== this.observation.id ||
      this.page.url() !== this.observation.url
    )
      throw Error(
        "A página mudou ou a tarefa foi interrompida. Observe novamente.",
      );
  }
  release(run) {
    releaseRemoteControl(this.context,run.requestId);
    if (this.owner === run.requestId) {
      this.owner = null;
      const previous = this.observation;
      this.observation = null;
      if (previous)
        void Promise.allSettled(
          previous.handles.map((handle) => handle.dispose()),
        );
    }
  }
}
export const steamWebTools = [
  {
    type: "function",
    name: "wendler_steam",
    description:
      "Pam: persistent dedicated Firefox Steam session in background. Never uses native Computer Use. Connect/observe read current page; open only Steam URLs. Fresh observationId and target required for click/fill/fill_cpf. User performs one-time login from Connections. Prepare unpaid Pix only; do not pay. Do not ask a budget just to prepare Pix: read actual Steam price. Check pending orders before checkout; never duplicate an uncertain order. CPF is filled privately into verified Steam processor, never sent as tool text. Report actual failures.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: {
          type: "string",
          enum: [
            "profile",
            "fill_profile",
            "prepare_qr",
            "status",
            "preflight",
            "connect",
            "observe",
            "open",
            "click",
            "fill",
            "select",
            "fill_cpf",
            "restore",
            "payment_window",
            "qr",
            "resume",
          ],
        },
        url: { type: "string" },
        target: { type: "integer" },
        observationId: { type: "string" },
        text: { type: "string" },
        purchase: {
          type: "object",
          properties: { item: { type: "string" }, total: { type: "number" } },
          required: ["item", "total"],
          additionalProperties: false,
        },
      },
      required: ["action"],
    },
  },
];
