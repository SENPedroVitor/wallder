// Pure Plugin API executor: shared by the local plugin build and integration tests.
export function makeFigmaExecutor(figma) {
  const factories = { FRAME: 'createFrame', RECTANGLE: 'createRectangle', ELLIPSE: 'createEllipse', TEXT: 'createText', LINE: 'createLine', COMPONENT: 'createComponent' }
  const numeric = new Set(['x','y','width','height','rotation','opacity','strokeWeight','cornerRadius','fontSize','itemSpacing','paddingTop','paddingBottom','paddingLeft','paddingRight'])
  const options = { layoutMode:['NONE','HORIZONTAL','VERTICAL'],textAlignHorizontal:['LEFT','CENTER','RIGHT','JUSTIFIED'],primaryAxisAlignItems:['MIN','CENTER','MAX','SPACE_BETWEEN'],counterAxisAlignItems:['MIN','CENTER','MAX','BASELINE'],primaryAxisSizingMode:['AUTO','FIXED'],counterAxisSizingMode:['AUTO','FIXED'],layoutSizingHorizontal:['FIXED','HUG','FILL'],layoutSizingVertical:['FIXED','HUG','FILL'] }
  const allowed = new Set([...numeric,...Object.keys(options),'name','visible','clipsContent','fill','stroke','characters','fontFamily','fontStyle'])
  function validateProps(props) {
    if (!props || typeof props !== 'object' || Array.isArray(props)) throw new Error('Propriedades inválidas.')
    for (const [key,value] of Object.entries(props)) {
      if (!allowed.has(key)) throw new Error('Propriedade não suportada: ' + key)
      if (numeric.has(key) && (!Number.isFinite(value) || Math.abs(value)>100000 || (['width','height','fontSize'].includes(key) && value<=0) || (key==='opacity' && (value<0||value>1)))) throw new Error('Valor inválido: '+key)
      if (options[key] && !options[key].includes(value)) throw new Error('Opção inválida: '+key)
      if (['visible','clipsContent'].includes(key) && typeof value!=='boolean') throw new Error('Valor inválido: '+key)
      if (!numeric.has(key) && !options[key] && !['visible','clipsContent'].includes(key) && (typeof value!=='string'||value.length>50000)) throw new Error('Texto inválido: '+key)
      if (['fill','stroke'].includes(key) && !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error('Use uma cor #RRGGBB ou #RRGGBBAA.')
    }
  }
  function paint(value) { return [{type:'SOLID',color:{r:parseInt(value.slice(1,3),16)/255,g:parseInt(value.slice(3,5),16)/255,b:parseInt(value.slice(5,7),16)/255},opacity:value.length===9?parseInt(value.slice(7,9),16)/255:1}] }
  async function nodeById(id) {
    const node = await figma.getNodeByIdAsync(id)
    if (!node || node.removed) throw new Error('Camada não encontrada: ' + id)
    return node
  }
  async function parent(id) { const node=id?await nodeById(id):figma.currentPage;if(!node.appendChild)throw new Error('Esta camada não aceita filhos.');return node }
  async function apply(node, props) {
    validateProps(props)
    for (const key of Object.keys(props)) {
      const property={fill:'fills',stroke:'strokes',fontFamily:'fontName',fontStyle:'fontName',width:'width',height:'height'}[key]??key
      if (!(property in node)) throw new Error('Propriedade incompatível com '+node.type+': '+key)
    }
    if ('characters' in node && ['characters','fontFamily','fontStyle','fontSize'].some(key=>key in props)) {
      if (props.fontFamily || props.fontStyle) { const font={family:props.fontFamily||(node.fontName===figma.mixed?'Arial':node.fontName.family),style:props.fontStyle||(node.fontName===figma.mixed?'Regular':node.fontName.style)};await figma.loadFontAsync(font);node.fontName=font }
      else { const fonts=node.fontName===figma.mixed?node.getRangeAllFontNames(0,node.characters.length):[node.fontName];for(const font of fonts)await figma.loadFontAsync(font) }
    }
    if ('width' in props || 'height' in props) node.resize(props.width??node.width,props.height??node.height)
    for (const [key,value] of Object.entries(props)) {
      if (['width','height','fontFamily','fontStyle'].includes(key)) continue
      if (key==='fill') node.fills=paint(value)
      else if (key==='stroke') node.strokes=paint(value)
      else node[key]=value
    }
  }
  function describe(node, depth, budget) {
    if (--budget.remaining < 0) { budget.truncated=true; return null }
    const output={id:node.id,type:node.type,name:node.name,parentId:node.parent?.id}
    for (const key of ['x','y','width','height','rotation','visible','opacity','characters','fontSize','fontName','fills','strokes','strokeWeight','cornerRadius','layoutMode','itemSpacing','paddingTop','paddingBottom','paddingLeft','paddingRight','primaryAxisAlignItems','counterAxisAlignItems','primaryAxisSizingMode','counterAxisSizingMode','layoutSizingHorizontal','layoutSizingVertical']) {
      if (typeof node[key]!=='symbol' && node[key]!==undefined) output[key]=node[key]
    }
    if (node.children) {
      output.childCount=node.children.length
      if (depth>0) { output.children=[];for(const child of node.children){if(budget.remaining<=0){budget.truncated=true;break}const value=describe(child,depth-1,budget);if(value)output.children.push(value)} }
    }
    return output
  }
  function document() { return {name:figma.root.name,fileKey:figma.fileKey??null,editorType:figma.editorType,page:figma.currentPage.name,currentPageId:figma.currentPage.id,pages:figma.root.children.map(page=>({id:page.id,name:page.name})),selection:figma.currentPage.selection.map(node=>({id:node.id,name:node.name,type:node.type}))} }
  const bytes64 = bytes => { const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1],c=bytes[i+2];out+=alphabet[a>>2]+alphabet[((a&3)<<4)|((b??0)>>4)]+(b===undefined?'=':alphabet[((b&15)<<2)|((c??0)>>6)])+(c===undefined?'=':alphabet[c&63])}return out }
  async function execute(name, args = {}) {
    if (name==='figma_local_document') return document()
    if (name==='figma_local_fonts') return {fonts:(await figma.listAvailableFontsAsync()).map(item=>item.fontName).filter(font=>!args.family||font.family.toLowerCase().includes(args.family.toLowerCase())).slice(0,200)}
    if (name==='figma_local_read') {
      const node=args.nodeId?await nodeById(args.nodeId):figma.currentPage
      if (node.type==='PAGE' && node.loadAsync) await node.loadAsync()
      const budget={remaining:Math.min(500,args.limit??200),truncated:false};const tree=describe(node,Math.min(6,args.depth??2),budget)
      return {document:document(),tree,truncated:budget.truncated}
    }
    if (name==='figma_local_create') {
      let count=0
      function validate(def,depth=0){if(depth>10||++count>100||!factories[def?.type])throw new Error('Tipo ou quantidade de camadas inválida.');validateProps(def.props??{});if(def.children){if(!['FRAME','COMPONENT'].includes(def.type)||!Array.isArray(def.children))throw new Error('Filhos inválidos.');def.children.forEach(child=>validate(child,depth+1))}}
      if(!Array.isArray(args.nodes)||!args.nodes.length)throw new Error('Informe as camadas.');args.nodes.forEach(def=>validate(def))
      const container=await parent(args.parentId),created=[],roots=[]
      async function create(def,container,isRoot=false){const node=figma[factories[def.type]]();created.push(node);if(isRoot)roots.push(node);container.appendChild(node);if(def.type==='TEXT')await apply(node,{fontFamily:'Arial',fontStyle:'Regular',...def.props});else await apply(node,def.props??{});for(const child of def.children??[])await create(child,node);return node}
      try { for(const def of args.nodes)await create(def,container,true);figma.commitUndo();return {created:created.map(node=>({id:node.id,name:node.name,type:node.type})),roots:roots.map(node=>node.id)} }
      catch(error){for(const node of [...created].reverse())if(!node.removed)node.remove();throw error}
    }
    if (name==='figma_local_update') {const node=await nodeById(args.nodeId);if(['PAGE','DOCUMENT'].includes(node.type))throw new Error('Edite camadas dentro da página.');await apply(node,args.props);figma.commitUndo();return {updated:describe(node,0,{remaining:1})}}
    if (name==='figma_local_svg') {
      if(typeof args.svg!=='string'||args.svg.length>500000||!/<svg[\s>]/i.test(args.svg)||/<(?:script|foreignObject|image)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i.test(args.svg))throw new Error('SVG inválido ou com recursos externos.')
      const container=await parent(args.parentId),node=figma.createNodeFromSvg(args.svg);container.appendChild(node);await apply(node,{name:args.name??'SVG',x:args.x??0,y:args.y??0});figma.commitUndo();return {created:{id:node.id,name:node.name}}
    }
    if (name==='figma_local_clone') {const original=await nodeById(args.nodeId);if(!original.clone)throw new Error('Esta camada não pode ser duplicada.');const container=await parent(args.parentId??original.parent.id),node=original.clone();try{container.appendChild(node);await apply(node,{name:args.name??original.name+' — cópia',x:args.x??original.x+24,y:args.y??original.y+24});figma.commitUndo();return {created:{id:node.id,name:node.name}}}catch(error){node.remove();throw error}}
    if (name==='figma_local_select') {const nodes=await Promise.all(args.nodeIds.map(nodeById));if(nodes.some(node=>['PAGE','DOCUMENT'].includes(node.type)))throw new Error('Selecione camadas, não páginas.');if(nodes.length){let page=nodes[0];while(page&&page.type!=='PAGE')page=page.parent;if(!page||nodes.some(node=>{let p=node;while(p&&p.type!=='PAGE')p=p.parent;return p!==page}))throw new Error('Selecione camadas da mesma página.');await figma.setCurrentPageAsync(page)}figma.currentPage.selection=nodes;if(nodes.length)figma.viewport.scrollAndZoomIntoView(nodes);return {selected:nodes.map(node=>node.id)}}
    if (name==='figma_local_export') {const node=await nodeById(args.nodeId);if(!node.exportAsync)throw new Error('Esta camada não pode ser exportada.');const format=args.format??'PNG';const bytes=await node.exportAsync(format==='SVG'?{format:'SVG'}:{format:'PNG',constraint:{type:'SCALE',value:args.scale??1}});if(bytes.length>900000)throw new Error('Prévia muito grande. Exporte uma camada menor ou reduza a escala.');return format==='PNG'?{nodeId:node.id,image:bytes64(bytes)}:{nodeId:node.id,svg:decodeURIComponent(Array.from(bytes,byte=>'%'+byte.toString(16).padStart(2,'0')).join(''))} }
    throw new Error('Ferramenta local desconhecida.')
  }
  return { execute, document }
}
