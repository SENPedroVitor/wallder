import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodes = JSON.parse(fs.readFileSync(path.join(root, 'scripts/android-mascots.json'), 'utf8'));
const ids = ['west','pam','batman','indiana','songbird','kyle','rorschach','homer','dumbledore','c3po','sheldon','ted','reed','ultron','captain','marilia','hal','tony'];
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;');
const color = value => /^#[0-9a-f]{8}$/i.test(value) ? `#${value.slice(7)}${value.slice(1,7)}` : value;
function shape(n) {
  if (n.enabled === false) return '';
  const x=n.x||0, y=n.y||0, w=n.width, h=n.height;
  let geometry=n.geometry, transform=`android:translateX="${x}" android:translateY="${y}"`;
  if(n.type==='path') {
    const [vx,vy,vw,vh]=n.viewBox;
    transform=`android:translateX="${x-vx*w/vw}" android:translateY="${y-vy*h/vh}" android:scaleX="${w/vw}" android:scaleY="${h/vh}"`;
  } else if(n.type==='rectangle') {
    const r=Math.min(Number(n.cornerRadius)||0,w/2,h/2);
    geometry=`M${r},0 H${w-r} Q${w},0 ${w},${r} V${h-r} Q${w},${h} ${w-r},${h} H${r} Q0,${h} 0,${h-r} V${r} Q0,0 ${r},0 Z`;
  } else throw new Error(`Unsupported mascot shape: ${n.type}`);
  return `<group ${transform}><path android:fillColor="${escape(color(typeof n.fill==='string'?n.fill:'#00000000'))}" ${n.stroke ? `android:strokeColor="${escape(color(n.stroke))}" android:strokeWidth="${n.strokeWidth||1}" android:strokeLineCap="round"` : ''} android:pathData="${escape(geometry)}" /></group>`;
}
for(let i=0;i<nodes.length;i++) {
  const n=nodes[i];
  for(const part of ['body','eyes']) {
    const children=n.children.filter(c=>/Olhos/.test(c.name)===(part==='eyes'));
    const xml=`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="240dp" android:height="240dp" android:viewportWidth="${n.width}" android:viewportHeight="${n.height}">${children.map(shape).join('')}</vector>\n`;
    fs.writeFileSync(path.join(root,`app/src/main/res/drawable/mascot_${ids[i]}_${part}.xml`),xml);
  }
}
console.log(`Exported ${nodes.length} original Pencil mascots as Android vectors.`);
