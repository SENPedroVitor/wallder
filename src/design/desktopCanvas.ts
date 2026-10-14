export function desktopCanvasSize(width:number,height:number){
  const scale=Math.min(1,Math.max(1,width)/800,Math.max(1,height)/600)
  return {scale,width:width/scale,height:height/scale}
}
