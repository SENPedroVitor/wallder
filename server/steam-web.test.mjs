import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SteamWebService, steamAddress, verifiedPix, steamClickDestination,externalCheckout,verifiedProcessor,processorAmount } from "./steam-web.mjs";
test('Steam authentication probe preserves checkout and releases its temporary browser lease',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-auth-probe-'));let closed=false;
 const service=new SteamWebService({dataDir:dir,protectedData:{status:async()=>({saved:true})}});
 const checkout={url:()=> 'https://checkout.steampowered.com/checkout/'};
 const probe={goto:async()=>{},evaluate:async()=>true,close:async()=>{closed=true}};
 service.context={pages:async()=>[checkout],newPage:async()=>probe,remoteControl:{lease:null}};service.page=checkout;
 try{const status=await service.status();assert.equal(status.authenticated,true);assert.equal(service.page,checkout);assert.equal(closed,true);assert.equal(service.context.remoteControl.lease,null)}finally{await rm(dir,{recursive:true,force:true})}
});
test('deadline during review prevents delayed protected filling and QR submission',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-deadline-'));let fills=0;
 const service=new SteamWebService({dataDir:dir,protectedData:{withCpf:async callback=>callback('private-cpf')}});
 const url='https://checkout.international.pagseguro.com/edbcbf5f-567e-4085-b46a-43f26d034658';
 service.purchaseProfile={read:async()=>({configured:true,fullName:'Test',receiptEmail:'test@example.com'})};
 const page={url:()=>url,locator:()=>({innerText:async()=> 'Pix BRL 29,78',elementHandles:async()=>[{isVisible:async()=>true,fill:async()=>{fills++},dispose:async()=>{}}]})};service.page=page;service.context={pages:async()=>[page]};
 try{await service.save({id:'order',item:'Game',total:29.98,processorUrl:url,phase:'processor-requested'});const run={deadlineAt:Date.now()+50};await assert.rejects(service.prepareQr(run,async()=>{await new Promise(resolve=>setTimeout(resolve,100));return true}),/Prazo excedido/);await new Promise(resolve=>setTimeout(resolve,100));assert.equal(run.cancelled,true);assert.equal(fills,0);assert.equal((await service.pending()).phase,'processor-requested')}finally{await rm(dir,{recursive:true,force:true})}
});
test('observation discards detached controls and retains matching target indexes',async()=>{
 const service=new SteamWebService({dataDir:os.tmpdir(),protectedData:{}});
 const stale={isVisible:async()=>true,evaluate:async()=>{throw Error('NoSuchHandleError')},dispose:async()=>{}};
 const live={isVisible:async()=>true,evaluate:async()=>({name:'Continue',href:'',type:'button'}),dispose:async()=>{}};
 service.page={url:()=> 'https://checkout.steampowered.com/checkout/',locator:()=>({elementHandles:async()=>[stale,live],innerText:async()=> 'Review'})};service.status=async()=>({});
 const result=await service.observe();assert.equal(result.targets.length,1);assert.equal(result.targets[0].target,0);assert.equal(service.observation.handles[0],live);
});
test('expired processor returns a precise error and preserves the uncertain order',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-expired-'));const service=new SteamWebService({dataDir:dir,protectedData:{}});
 const url='https://checkout.international.pagseguro.com/edbcbf5f-567e-4085-b46a-43f26d034658';service.page={url:()=>url,locator:()=>({innerText:async()=> 'Página expirada. A página expirou. Por favor, reinicie a compra.'})};
 try{await service.save({id:'order',total:29.98,item:'Game',processorUrl:url,phase:'pix-requested'});await assert.rejects(service.qr(),/expirou/);const pending=await service.pending();assert.equal(pending.id,'order');assert.equal(pending.phase,'pix-requested');assert.equal(pending.processorExpired,true)}finally{await rm(dir,{recursive:true,force:true})}
});
test('prepare QR journals before submission and never repeats an uncertain submission',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-prepare-'));
 const service=new SteamWebService({dataDir:dir,protectedData:{}});let clicks=0,fills=0;
 const url='https://checkout.international.pagseguro.com/edbcbf5f-567e-4085-b46a-43f26d034658';
 const button={isVisible:async()=>true,evaluate:async()=>true,dispose:async()=>{},click:async()=>{assert.equal((await service.pending()).phase,'pix-requested');clicks++}};
 const page={url:()=>url,locator:()=>({innerText:async()=> 'Pix BRL 29,78',elementHandles:async()=>[button]})};service.page=page;service.context={pages:async()=>[page]};
 service.fillProfile=async()=>{fills++};service.qr=async()=>({widget:{type:'pix'}});
 try{await service.save({id:'order',item:'Game',total:29.98,processorUrl:url,phase:'processor-requested'});assert.equal((await service.prepareQr({},async()=>true)).widget.type,'pix');await service.prepareQr({},async()=>true);assert.equal(clicks,1);assert.equal(fills,1);await assert.rejects(service.prepareQr({cancelled:true},async()=>true),/interrompida/);assert.equal(clicks,1)}finally{await rm(dir,{recursive:true,force:true})}
});
test('external Steam checkout is bound to the observed processor URL, not arbitrary scripts or other orders',()=>{
 const href="javascript:PerformExternalFinalizeTransaction( 'https://checkout.international.pagseguro.com/edbcbf5f-567e-4085-b46a-43f26d034658', true );";
 const page='https://checkout.steampowered.com/checkout/';
 const url=externalCheckout(href,page);assert.equal(steamClickDestination(href,page).href,url.href);
 assert.equal(verifiedProcessor(url,{total:29.98,processorUrl:url.href}),true);
 assert.equal(verifiedProcessor(new URL('https://checkout.international.pagseguro.com/00000000-0000-0000-0000-000000000000'),{total:29.98,processorUrl:url.href}),false);
 assert.throws(()=>steamClickDestination(href+'alert(1);',page));
 assert.throws(()=>steamClickDestination(href.replace('checkout.international.pagseguro.com','evil.test'),page));
 assert.equal(processorAmount('Total R$ 29,78\nPix R$ 29,78',29.98),29.78);
 assert.equal(processorAmount('Resumo BRL\u00a029,78\nTotal BRL\u00a029,78',29.98),29.78);
 assert.throws(()=>processorAmount('R$ 29,78 R$ 50,00',29.98));
 assert.throws(()=>processorAmount('R$ 40,00',29.98));
});
test('QR capture produces a Pix widget only from a real captured element on the bound processor',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-pix-'));
 const service=new SteamWebService({dataDir:dir,protectedData:{}});let disposed=0;
 const url='https://checkout.international.pagseguro.com/edbcbf5f-567e-4085-b46a-43f26d034658';
 const element={isVisible:async()=>true,screenshot:async()=>Buffer.from('captured-qr'),dispose:async()=>{disposed++}};
 service.page={url:()=>url,evaluate:async()=>[],locator:()=>({innerText:async()=> 'Pix R$ 29,78',elementHandles:async()=>[element]})};
 try{await service.save({id:'order',item:'Mafia III',total:29.98,phase:'processor-requested',processorUrl:url});const result=await service.qr();assert.equal(result.widget.type,'pix');assert.equal(result.widget.data.pix,29.78);assert.equal(result.widget.data.image,'data:image/png;base64,Y2FwdHVyZWQtcXI=');assert.equal(disposed,1);assert.equal((await service.pending()).phase,'qr-ready');service.page.url=()=>url.replace('edbcbf5f','00000000');await assert.rejects(service.qr(),/verificado/)}finally{await rm(dir,{recursive:true,force:true})}
});
test('rejected processor href never creates an uncertain payment journal',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-rejected-checkout-'));
 const service=new SteamWebService({dataDir:dir,protectedData:{}});let clicked=false;
 const url='https://checkout.steampowered.com/checkout/';service.context={};service.visible=false;service.page={url:()=>url};service.historyChecked=true;
 service.observation={id:'observed',url,targets:[{name:'Continue to Processor',href:'javascript:unknownFinalize();'}],handles:[{click:async()=>{clicked=true}}]};
 try{await assert.rejects(service.execute({action:'click',target:0,observationId:'observed',purchase:{item:'Mafia III',total:29.98}},{agentId:'pam',requestId:'run'},async()=>true),/Endereço fora/);assert.equal(await service.pending(),null);assert.equal(clicked,false)}finally{await rm(dir,{recursive:true,force:true})}
});
test('batch checkout fill uses one review and keeps CPF out of the returned data',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-fill-profile-'));
 const service=new SteamWebService({dataDir:dir,protectedData:{withCpf:async callback=>callback('private-cpf')}});let reviews=0;const filled=[];
 const url='https://checkout.international.pagseguro.com/edbcbf5f-567e-4085-b46a-43f26d034658';
 service.purchaseProfile={read:async()=>({configured:true,fullName:'Nome de Teste',receiptEmail:'receipt@example.com'})};
 service.page={url:()=>url,locator:selector=>({innerText:async()=> 'Total BRL 29,78',elementHandles:async()=>[{isVisible:async()=>true,fill:async value=>filled.push({selector,value}),dispose:async()=>{}}]})};
 try{await service.save({id:'order',item:'Game',total:29.98,processorUrl:url,phase:'processor-requested'});const result=await service.fillProfile({cancelled:false},async()=>{reviews++;return true});assert.equal(reviews,1);assert.equal(filled.length,3);assert.equal(filled[2].value,'private-cpf');assert.ok(!JSON.stringify(result).includes('private-cpf'));assert.equal((await service.pending()).phase,'processor-requested');await assert.rejects(service.fillProfile({cancelled:true},async()=>true),/interrompido/)}finally{await rm(dir,{recursive:true,force:true})}
});
test('Steam native cart buttons are clickable while arbitrary script and external links stay rejected',()=>{
 const page='https://store.steampowered.com/app/360430/';
 assert.equal(steamClickDestination('javascript:addToCart(133320);',page),null);
 assert.equal(steamClickDestination('javascript:addBundleToCart( 48195);',page),null);
 assert.equal(steamClickDestination('/cart/',page).pathname,'/cart/');
 for(const link of ['javascript:fetch("https://evil.test")','javascript:addToCart(123);alert(1)','https://evil.test/'])assert.throws(()=>steamClickDestination(link,page));
});
test('Steam live preview does not expose payment forms or change the controlled page',async()=>{
 const service=new SteamWebService({dataDir:os.tmpdir(),protectedData:{}});
 let url='https://store.steampowered.com/',captures=0;
 const page={url:()=>url,title:async()=> 'Steam',evaluate:async()=>false,screenshot:async()=>{captures++;return Buffer.from('preview')}};
 service.page=page;service.context={remote:true,desktopUrl:'/computer/'};
 assert.equal((await service.preview()).image,'data:image/png;base64,cHJldmlldw==');
 assert.equal(service.page,page);
 url='https://cdn.safecharge.com/safecharge_resources/v1/checkout/collectApmFields.html?amount=30';
 const protectedFrame=await service.preview();
 assert.equal(protectedFrame.image,null);assert.equal(protectedFrame.protected,true);assert.equal(captures,1);
 assert.ok(!protectedFrame.url.includes('?'));
});
test('Steam finds a signed-in tab after a manual login in another tab and clears expired authentication',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wendler-steam-'));
 try{
 const service=new SteamWebService({dataDir:root,protectedData:{status:async()=>({saved:false})}});
 let signedIn=true;
 const login={url:()=> 'https://store.steampowered.com/login/',evaluate:async()=>false};
 const store={url:()=> 'https://store.steampowered.com/',evaluate:async()=>signedIn};
 service.context={pages:async()=>[login,store]};service.page=login;
 assert.equal((await service.status()).authenticated,true);assert.equal(service.page,store);
 signedIn=false;assert.equal((await service.status()).authenticated,false);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('Steam status never redirects an active checkout to another authenticated tab',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wendler-steam-'));
 try{
 const service=new SteamWebService({dataDir:root,protectedData:{status:async()=>({saved:false})}});
 const checkout={url:()=> 'https://store.steampowered.com/checkout/',evaluate:async()=>false};
 const store={url:()=> 'https://store.steampowered.com/',evaluate:async()=>true};
 service.context={pages:()=>[checkout,store]};service.page=checkout;service.owner='active-task';
 assert.equal((await service.status()).authenticated,true);assert.equal(service.page,checkout);
 }finally{await rm(root,{recursive:true,force:true})}
});
test("Steam rejects lookalike domains, credentials and insecure payment links", () => {
  for (const url of [
    "http://store.steampowered.com/",
    "https://store.steampowered.com.evil.test/",
    "https://u:p@store.steampowered.com/",
    "https://example.com/",
  ])
    assert.throws(() => steamAddress(url));
  assert.equal(
    steamAddress("https://store.steampowered.com/search/?term=Mafia").hostname,
    "store.steampowered.com",
  );
});
test("CPF processor must match merchant, BRL, Pix and a positive amount", () => {
  const url = new URL(
    "https://cdn.safecharge.com/safecharge_resources/v1/checkout/collectApmFields.html?merchantId=4626141330879790125&merchantSiteId=237088&paymentMethod=apmgw_PIX&currency=BRL&amount=154.70",
  );
  assert.equal(verifiedPix(url), true);
  url.searchParams.set("currency", "USD");
  assert.equal(verifiedPix(url), false);
});
test("pending checkout survives service restart and status never exposes QR or CPF", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wendler-steam-"));
  try {
    const options = {
      dataDir: root,
      protectedData: {
        status: async () => ({ saved: true, masked: "***.***.***-**" }),
      },
    };
    const service = new SteamWebService(options);
    await service.save({
      id: "order",
      item: "Game",
      total: 30,
      phase: "qr-ready",
      qr: "private-image",
    });
    const restarted = new SteamWebService(options),
      status = await restarted.status();
    assert.equal(status.pending.id, "order");
    assert.equal(status.pending.phase, "qr-ready");
    assert.equal(JSON.stringify(status).includes("private-image"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("Pam uses a hidden dedicated Firefox and refuses stale observations before mutation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wendler-steam-"));
  let launched,
    clicked = 0;
  const handle = {
    isVisible: async () => true,
    evaluate: async () => ({ name: "Explore", type: "", href: "" }),
    dispose: async () => {},
    click: async () => {
      clicked++;
    },
  };
  const page = {
    url: () => "https://store.steampowered.com/",
    evaluate: async () => true,
    goto: async () => {},
    locator: () => ({
      elementHandles: async () => [handle],
      innerText: async () => "Steam",
    }),
  };
  const service = new SteamWebService({
    dataDir: root,
    protectedData: { status: async () => ({ saved: false }) },
    launch: async (dir, options) => {
      launched = { dir, options };
      return { initialPage: page, on() {}, close: async () => {} };
    },
  });
  try {
    const run = { agentId: "pam", requestId: "one" };
    const observation = await service.execute(
      { action: "connect" },
      run,
      async () => true,
    );
    assert.deepEqual(launched.options, {
      visible: false,
      profileMode: "dedicated",
    });
    await assert.rejects(
      service.execute(
        { action: "click", target: 0, observationId: "stale" },
        run,
        async () => true,
      ),
      /Observe novamente/,
    );
    assert.equal(clicked, 0);
    await service.execute(
      { action: "click", target: 0, observationId: observation.observationId },
      run,
      async () => true,
    );
    assert.equal(clicked, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('refused checkout does not create a journal, and an uncertain order cannot be repeated',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'wendler-steam-'));let url='https://store.steampowered.com/',clicks=0;
  const handle={isVisible:async()=>true,evaluate:async()=>({name:'Continue to Processor',type:'button',href:''}),dispose:async()=>{},click:async()=>{clicks++}};
  const page={url:()=>url,goto:async value=>{url=value},evaluate:async()=>true,locator:()=>({elementHandles:async()=>[handle],innerText:async()=> 'Game 30,00 Pix'})};
  const service=new SteamWebService({dataDir:root,protectedData:{status:async()=>({saved:false})},launch:async()=>({initialPage:page,on(){},close:async()=>{}})}),run={agentId:'pam',requestId:'one'},purchase={item:'Game',total:30};
  try{
    let observation=await service.execute({action:'connect'},run,async()=>true);
    await assert.rejects(service.execute({action:'click',target:0,observationId:observation.observationId,purchase},run,async()=>true),/histórico/);
    await service.execute({action:'open',url:'https://store.steampowered.com/account/history/'},run,async()=>true);
    observation=await service.execute({action:'open',url:'https://checkout.steampowered.com/'},run,async()=>true);
    await assert.rejects(service.execute({action:'click',target:0,observationId:observation.observationId,purchase},run,async()=>false),/recusado/);assert.equal(await service.pending(),null);assert.equal(clicks,0);
    await service.execute({action:'click',target:0,observationId:observation.observationId,purchase},run,async()=>true);assert.equal(clicks,1);
    observation=await service.execute({action:'observe'},run,async()=>true);
    await assert.rejects(service.execute({action:'click',target:0,observationId:observation.observationId,purchase},run,async()=>true),/pedido pendente/);assert.equal(clicks,1);
    service.release(run);await assert.rejects(service.execute({action:'click',target:0,observationId:observation.observationId,purchase},{...run,requestId:'two'},async()=>true),/Observe novamente/);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('closing local tracking requires explicit user acknowledgement and preserves the record',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'wendler-steam-'));const service=new SteamWebService({dataDir:root,protectedData:{status:async()=>({saved:false})}});
  try{await service.save({id:'old',phase:'pix-requested',item:'Game',total:30});await assert.rejects(service.configure('close-pending'),/Confira/);await service.configure('close-pending',{checked:true});assert.equal(await service.pending(),null);assert.equal(JSON.parse(await (await import('node:fs/promises')).readFile(service.file,'utf8')).id,'old')}finally{await rm(root,{recursive:true,force:true})}
});
