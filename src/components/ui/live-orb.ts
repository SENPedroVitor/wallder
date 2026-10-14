// Motion adapted from the LiveOrb component supplied by the user: 0.16 gaze
// easing and a 55 ms close, 45 ms hold, 80 ms open blink. Keep Pencil bodies.
type Gaze = {move:(event:PointerEvent)=>void;reset:()=>void;tick:(now:number)=>void}
const gazes=new Set<Gaze>()
let animationFrame=0
const moveAll=(event:PointerEvent)=>{for(const gaze of gazes)gaze.move(event)}
const resetAll=()=>{for(const gaze of gazes)gaze.reset()}
const tickAll=(now:number)=>{for(const gaze of gazes)gaze.tick(now);animationFrame=requestAnimationFrame(tickAll)}
export function createLiveGaze(root: HTMLElement) {
  const eyes = [...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].filter(node => /(?:^|— )olhos?\b/i.test(node.dataset.pencilName || ''))
  if (!eyes.length) return () => {}
  const width = parseFloat(root.style.width) || 128
  const look = {x:0,y:0.08}, target = {...look}
  let previous=performance.now(), nextBlink=previous+1800+Math.random()*2400, blinkAt=-10000
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const original = eyes.map(eye => {
    const css=eye.style.cssText,rect=eye.getBoundingClientRect(),wrapper=document.createElement('div')
    wrapper.style.position=eye.style.position||'absolute';wrapper.style.left=eye.style.left||'0px';wrapper.style.top=eye.style.top||'0px';wrapper.style.width=eye.style.width;wrapper.style.height=eye.style.height;wrapper.style.transform=eye.style.transform;wrapper.style.transformOrigin=eye.style.transformOrigin||'center';wrapper.style.zIndex=eye.style.zIndex;wrapper.style.pointerEvents='none';wrapper.style.willChange='transform'
    eye.before(wrapper);wrapper.append(eye);eye.style.left='0';eye.style.top='0';eye.style.position='absolute';eye.style.transform='';eye.style.transformOrigin='center';eye.style.willChange='transform'
    return {css,wrapper,rotation:wrapper.style.transform,horizontal:rect.width>rect.height}
  })
  root.dataset.liveGazeRoot='true'
  const move = (event:PointerEvent) => {
    const rect=root.getBoundingClientRect()
    if (!rect.width || !rect.height || event.pointerType==='touch') return
    target.x=Math.max(-1,Math.min(1,(event.clientX-rect.left-rect.width/2)/(rect.width/2)))
    target.y=Math.max(-1,Math.min(1,(rect.top+rect.height/2-event.clientY)/(rect.height/2)))
  }
  const reset=()=>{target.x=0;target.y=0.08}
  const tick=(now:number)=>{
    const reduced=reduce.matches || document.documentElement.dataset.motion==='reduced'
    const easing=1-Math.pow(1-0.16,Math.min(now-previous,64)/(1000/60)); previous=now
    look.x+=((reduced?0:target.x)-look.x)*easing; look.y+=((reduced?0.08:target.y)-look.y)*easing
    if (!reduced && now>=nextBlink) {blinkAt=now;nextBlink=now+2200+Math.random()*3800}
    const elapsed=(now-blinkAt)/1000
    const blink=reduced?0:elapsed<0.055?elapsed/0.055:elapsed<0.1?1:elapsed<0.18?1-(elapsed-0.1)/0.08:0
    if(document.visibilityState==='visible') eyes.forEach((eye,i)=>{original[i].wrapper.style.transform=`translate(${look.x*width*0.045}px,${-look.y*width*0.035}px) ${original[i].rotation}`;eye.style.transform=original[i].horizontal?`scaleX(${1-blink*0.92})`:`scaleY(${1-blink*0.92})`;eye.dataset.gazeX=look.x.toFixed(3);eye.dataset.blink=blink.toFixed(3)})
  }
  const gaze={move,reset,tick}
  if(!gazes.size){window.addEventListener('pointermove',moveAll,{passive:true});window.addEventListener('blur',resetAll);document.addEventListener('pointerleave',resetAll);animationFrame=requestAnimationFrame(tickAll)}
  gazes.add(gaze)
  return ()=>{gazes.delete(gaze);if(!gazes.size){cancelAnimationFrame(animationFrame);window.removeEventListener('pointermove',moveAll);window.removeEventListener('blur',resetAll);document.removeEventListener('pointerleave',resetAll)}delete root.dataset.liveGazeRoot;eyes.forEach((eye,i)=>{eye.style.cssText=original[i].css;if(original[i].wrapper.parentNode)original[i].wrapper.replaceWith(eye);delete eye.dataset.gazeX;delete eye.dataset.blink})}
}
