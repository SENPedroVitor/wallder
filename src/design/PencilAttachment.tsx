import { CanvasScene } from './CanvasScene'
export function PencilAttachment({file}:{file:{name:string;size:number;data:string}}){
 return <div className="pencil-chat-attachment"><CanvasScene id="uJByS" crop={false} clip={{left:216,top:301,width:226,height:48}} bindings={{'Nome do arquivo':{text:file.name},'Detalhes do arquivo':{text:(file.size/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB'},'Baixar plano do acervo':{action:'Baixar arquivo'}}} onAction={()=>{const link=document.createElement('a');link.href=file.data;link.download=file.name;link.click()}}/></div>
}
