import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'

export const leagues = { 'soccer/all':'Futebol', 'soccer/eng.1':'Premier League', 'soccer/bra.1':'Brasileirão', 'soccer/bra.2':'Série B', 'soccer/uefa.champions':'Champions League', 'soccer/esp.1':'La Liga', 'soccer/ita.1':'Serie A', 'soccer/ger.1':'Bundesliga', 'soccer/fra.1':'Ligue 1', 'soccer/fifa.world':'Copa do Mundo', 'basketball/nba':'NBA', 'basketball/wnba':'WNBA', 'football/nfl':'NFL', 'hockey/nhl':'NHL', 'baseball/mlb':'MLB' }
const clean = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const today = now => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(now))
export function parseGame(event, league, date, checkedAt) {
  const competition = event.competitions?.[0], competitors = competition?.competitors
  if (!/^\d{1,20}$/.test(event.id) || !Array.isArray(competitors) || competitors.length !== 2) return null
  const status = competition.status || event.status, state = status?.type?.state
  if (!['pre','in','post'].includes(state) || !Number.isFinite(Date.parse(event.date))) return null
  const team = side => { const item=competitors.find(item=>item.homeAway===side); if(!item?.team?.displayName)return null;return { name:item.team.displayName, abbreviation:item.team.abbreviation || item.team.shortDisplayName || item.team.displayName, score:state==='pre'?null:/^\d{1,3}$/.test(String(item.score))?Number(item.score):null } }
  const home=team('home'),away=team('away'); if(!home || !away)return null
  const interrupted=/POSTPONED|CANCELED|SUSPENDED|DELAYED/i.test(status.type.name || '')
  return { id:event.id, league, leagueName:leagues[league], date, startsAt:event.date, state:interrupted?'unavailable':state, home, away, clock:state==='in'?String(status.displayClock || ''):'', period:status.period || null, detail:interrupted?'Partida interrompida ou adiada':state==='post'?'Encerrado':state==='pre'?'Agendado':/HALFTIME/i.test(status.type.name || '')?'Intervalo':String(status.displayClock || 'Em andamento'), checkedAt, source:'ESPN', url:'https://www.espn.com/'+(league.startsWith('soccer/')?'soccer/match/_/gameId/':league.split('/')[1]+'/game/_/gameId/')+event.id }
}
export class SportsService {
  constructor({ dataDir, fetcher=fetch, now=Date.now }) { this.file=path.join(dataDir,'sports-following.json'); this.fetcher=fetcher;this.now=now;this.cache=new Map();this.follows=[];this.queue=Promise.resolve();this.loaded=false }
  async load(){if(this.loaded)return;try{const saved=JSON.parse(await readFile(this.file,'utf8'));this.follows=Array.isArray(saved)?saved.filter(game=>leagues[game.league]&&/^\d{1,20}$/.test(game.id)&&/^\d{4}-\d{2}-\d{2}$/.test(game.date)).slice(0,3):[]}catch(error){if(error.code!=='ENOENT')throw error}this.loaded=true}
  async save(){await mkdir(path.dirname(this.file),{recursive:true});const temporary=this.file+'.tmp';await writeFile(temporary,JSON.stringify(this.follows),{mode:0o600});await rename(temporary,this.file)}
  async scores({league='soccer/all',date=today(this.now()),query=''}={}) {
    if(!leagues[league] || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T12:00:00Z')))throw Error('Campeonato ou data inválidos.')
    const key=league+':'+date, previous=this.cache.get(key)
    let result
    if(previous && this.now()-previous.checkedAt<15000)result=previous
    else if(previous?.pending)result=await previous.pending
    else {
      const pending=(async()=>{
        const response=await this.fetcher('https://site.api.espn.com/apis/site/v2/sports/'+league+'/scoreboard?dates='+date.replaceAll('-','')+'&limit=1000&lang=pt&region=br',{signal:AbortSignal.timeout(7500),redirect:'error',headers:{Accept:'application/json'}})
        if(!response.ok)throw Error('A fonte de placares não respondeu (HTTP '+response.status+').')
        const data=await response.json();if(!Array.isArray(data.events))throw Error('A fonte não retornou uma tabela válida.')
        const checkedAt=this.now();const value={league,date,checkedAt,source:'ESPN',games:data.events.map(event=>parseGame(event,league,date,checkedAt)).filter(Boolean)};this.cache.set(key,value);if(this.cache.size>40)this.cache.delete(this.cache.keys().next().value);return value
      })()
      this.cache.set(key,{...previous,checkedAt:0,pending})
      try{result=await pending}catch(error){if(previous)this.cache.set(key,previous);else this.cache.delete(key);throw error}
    }
    const needle=clean(query).trim();return {...result,games:result.games.filter(game=>!needle||clean(game.home.name+' '+game.away.name).includes(needle)),notice:'Consulta da data informada. Agendado não é 0 a 0. Só state=in indica andamento; a fonte pode ter atraso. Se não encontrar, informe isso, sem usar resultados de memória.'}
  }
  async execute(args,run={}) {
    if(args.action==='scores')return this.scores(args)
    await this.load()
    if(args.action==='following')return {games:await this.snapshot()}
    if(run.privateHistory)throw Error('O acompanhamento na ilha é compartilhado. Abra uma conversa comum para acompanhar esta partida.')
    const operation=this.queue.catch(()=>{}).then(async()=>{
      if(args.action==='unfollow'){this.follows=this.follows.filter(game=>game.id!==args.eventId);await this.save();return {following:false}}
      if(args.action!=='follow')throw Error('Ação esportiva inválida.')
      const result=await this.scores(args),game=result.games.find(game=>game.id===args.eventId)
      if(!game)throw Error('Partida não encontrada nesta data. Consulte os placares antes de acompanhar.')
      if(run.cancelled)throw Error('Pedido interrompido.')
      const entry={...game,conversationId:run.conversationId,followedAt:this.now()};this.follows=[entry,...this.follows.filter(item=>item.id!==game.id)].slice(0,3);await this.save();return {following:true,game:entry}
    });this.queue=operation.then(()=>{},()=>{});return operation
  }
  async snapshot(){
    await this.load()
    return Promise.all(this.follows.filter(game=>this.now()-game.followedAt<36*3600000).map(async saved=>{
      if(saved.state==='post'&&this.now()-saved.checkedAt<60000)return {...saved,stale:false}
      try{const result=await this.scores(saved),game=result.games.find(game=>game.id===saved.id);if(!game)throw Error('Partida ausente da fonte.');Object.assign(saved,game);return {...saved,stale:false}}
      catch{return {...saved,stale:true,error:'Não foi possível atualizar o placar. Última leitura mantida.'}}
    }))
  }
}
export const sportsTools=[{type:'function',name:'wendler_sports',description:'Consult fresh ESPN scores for a specific calendar date (defaults to TODAY in São Paulo). Never answer live scores from memory, old messages or search snippets. When the competition is unknown, use soccer/all first. If a league returns no game, retry soccer/all for the same date before asking. scores returns real event IDs and checkedAt; if empty, say no match was found and ask the competition/date. follow uses a returned eventId, league and date to track the game in the Windows island; use when the user asks for a live score or to follow the game. Never call a pre/post game live. Source may lag; report its clock and time checked. Following is shared; private chats cannot follow. List supported leagues from the fixed enum.',inputSchema:{type:'object',additionalProperties:false,required:['action'],properties:{action:{type:'string',enum:['scores','follow','unfollow','following']},league:{type:'string',enum:Object.keys(leagues)},date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},query:{type:'string',maxLength:100},eventId:{type:'string',pattern:'^\\d{1,20}$'}}}}]
