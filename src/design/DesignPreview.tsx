import { useRef } from 'react'
import { Download, Expand, X } from 'lucide-react'
import './design-preview.css'
export type DesignPreviewData={projectId:string;revision:number;name:string;frameId:string;frameName:string;conversationId:string}
export function DesignPreview({data}:{data:DesignPreviewData}){
 const dialog=useRef<HTMLDialogElement>(null)
 const url=(format:string)=>'/api/design/asset?'+new URLSearchParams({project:data.projectId,conversation:data.conversationId,frame:data.frameId,revision:String(data.revision),format})
 return <section className="design-preview" aria-label="Tela criada pelo Kendrick"><header><strong>{data.frameName}</strong><small>{data.name} · revisão {data.revision}</small></header><button type="button" className="design-preview-image" aria-label="Ampliar tela" onClick={()=>dialog.current?.showModal()}><img src={url('png')} alt={'Tela '+data.frameName+' criada no Imhotep'}/><span><Expand size={14}/>Ampliar</span></button><footer><span>Exportar versão atual</span>{(['html','react','tailwind'] as const).map(format=><a key={format} href={url(format)} download><Download size={14}/>{format==='html'?'HTML':format==='react'?'React':'Tailwind'}</a>)}</footer><dialog ref={dialog} className="design-preview-dialog"><button type="button" autoFocus aria-label="Fechar tela ampliada" onClick={()=>dialog.current?.close()}><X size={20}/></button><img src={url('png')} alt={data.frameName}/></dialog></section>
}
