import puppeteer from 'puppeteer-core'
import { readFile, access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {remoteFirefoxConfig,ensureRemoteTunnel,acquireRemoteBrowser} from './remote-firefox.mjs'

const run=promisify(execFile)
export function parseFirefoxProfile(source,root){
  const sections=source.split(/(?=^\[)/m).map(section=>Object.fromEntries(section.split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)]})))
  const installed=sections.find(s=>s.Locked==='1'&&s.Default)?.Default
  const profile=sections.find(s=>s.Path===installed)||sections.find(s=>s.Path&&s.Default==='1')||sections.find(s=>s.Path)
  if(!profile)throw new Error('Não encontrei o perfil do Firefox.')
  return {name:profile.Name||'Firefox',path:profile.IsRelative==='1'?path.resolve(root,profile.Path):path.resolve(profile.Path)}
}
export async function firefoxProfile(dataDir,mode){
  if(mode==='dedicated'){const folder=path.join(dataDir,'firefox-profile');await mkdir(folder,{recursive:true});return {name:'Wendler',path:folder}}
  const root=path.join(process.env.APPDATA||'', 'Mozilla','Firefox')
  const profile=parseFirefoxProfile(await readFile(path.join(root,'profiles.ini'),'utf8'),root)
  const processes=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process firefox -ErrorAction SilentlyContinue).Count"],{windowsHide:true})
  if(Number(processes.stdout.trim())>0)throw new Error('Feche as janelas do Firefox e tente novamente para usar seus logins no mesmo perfil. O aplicativo não vai fechar suas janelas nem copiar suas senhas.')
  await access(profile.path,constants.R_OK);return profile
}
function wrapHandle(handle){return {selectOption:value=>handle.select(value),screenshot:()=>handle.screenshot({type:'png'}).then(Buffer.from),isVisible:()=>handle.isVisible(),evaluate:(fn)=>handle.evaluate(fn),dispose:()=>handle.dispose(),click:options=>handle.click(options),press:key=>handle.press(key),fill:async text=>{await handle.evaluate((node,value)=>{if(node.disabled||node.readOnly)throw Error('Campo indisponível.');const proto=node instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(!setter)throw Error('Campo não permite preenchimento.');node.focus();setter.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},text)}}}
const wrappedPages=new WeakMap()
function wrapPage(page){const existing=wrappedPages.get(page);if(existing)return existing;const wrapped={close:()=>page.close(),waitForSelector:(selector,options)=>page.waitForSelector(selector,options),evaluate:fn=>page.evaluate(fn),url:()=>page.url(),title:()=>page.title(),screenshot:()=>page.screenshot({type:'png'}).then(Buffer.from),goto:(url,options)=>page.goto(url,options),goBack:options=>page.goBack(options),goForward:options=>page.goForward(options),mouse:page.mouse,locator:selector=>({elementHandles:async()=> (await page.$$(selector)).map(wrapHandle),innerText:()=>page.$eval(selector,node=>node.innerText)})};wrappedPages.set(page,wrapped);return wrapped}
export async function launchFirefox(dataDir,{visible,profileMode='existing'}){
  if(process.env.WENDLER_BROWSER_ENDPOINT){
    const endpoint=process.env.WENDLER_BROWSER_ENDPOINT;
    if(!/^ws:\/\/127\.0\.0\.1:\d+\/session$/.test(endpoint))throw Error('Endpoint privado do Firefox inválido.');
    const connection=await acquireRemoteBrowser(options=>puppeteer.connect(options),{browserWSEndpoint:endpoint,headers:{Host:'127.0.0.1:9222'},protocol:'webDriverBiDi',defaultViewport:null,protocolTimeout:30000},{localServer:true});
    const context=await firefoxContext(connection.browser,'Firefox · servidor do trabalho',true,connection.release);context.remoteControl=connection.control;context.desktopUrl=process.env.WENDLER_BROWSER_DESKTOP_URL||'/computer/';return context;
  }
  const remote=await remoteFirefoxConfig(dataDir)
  if(remote){
    await ensureRemoteTunnel(remote)
    const shared=remote.steam&&remote.steamUseGeneral===true;
    const connection=await acquireRemoteBrowser(options=>puppeteer.connect(options),{browserWSEndpoint:`ws://127.0.0.1:${remote.steam&&!shared?29224:29223}/session`,headers:{Host:'127.0.0.1:9222'},protocol:'webDriverBiDi',defaultViewport:null,protocolTimeout:30000},{...remote,steam:remote.steam&&!shared})
    const context=await firefoxContext(connection.browser,remote.steam?'Steam · servidor do trabalho':'Firefox · servidor do trabalho',true,connection.release);
    context.remoteControl=connection.control;
    if(shared)context.desktopUrl='http://127.0.0.1:3012/';
    return context;
  }
  const profile=await firefoxProfile(dataDir,profileMode)
  const executablePath=path.join(process.env.ProgramFiles||'C:/Program Files','Mozilla Firefox','firefox.exe')
  await access(executablePath,constants.X_OK)
  const browser=await puppeteer.launch({browser:'firefox',executablePath,userDataDir:profile.path,headless:!visible,defaultViewport:{width:1280,height:800},timeout:45000,extraPrefsFirefox:{'signon.rememberSignons':true},args:['--width=1280','--height=800']})
  return firefoxContext(browser,profile.name,false)
}
async function firefoxContext(browser,profileName,remote,release){
 const topPage=page=>!page.isClosed()&&page.mainFrame().parentFrame()===null;
 const pages=(await browser.pages()).filter(topPage);const first=pages.find(p=>p.url()==='about:blank')||pages[0]||await browser.newPage();
 const listeners=[];
 const context={profileName,remote,desktopUrl:remote?'http://127.0.0.1:'+ (profileName.startsWith('Steam')?3013:3012)+'/':undefined,initialPage:wrapPage(first),pages:async()=>(await browser.pages()).filter(topPage).map(wrapPage),newPage:async()=>wrapPage(await browser.newPage()),
 close:async()=>{for(const [event,handler] of listeners)browser.off(event,handler);remote?await release():await browser.close()},
 on:(name,callback)=>{
  if(name==='close'){listeners.push(['disconnected',callback]);browser.on('disconnected',callback)}
  if(name==='page'){const handler=async target=>{try{if(target.type()!=='page')return;const page=await target.page();if(!page||page.isClosed())return;const select=()=>{if(topPage(page))callback(wrapPage(page))};if(page.url()==='about:blank')page.once('domcontentloaded',select);else select()}catch{}};listeners.push(['targetcreated',handler]);browser.on('targetcreated',handler)}
 }};
 return context;
}
