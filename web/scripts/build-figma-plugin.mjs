import { mkdir, readFile, writeFile } from 'node:fs/promises'
const engine = await readFile(new URL('../server/figma-executor.mjs', import.meta.url), 'utf8')
const boot = await readFile(new URL('../plugins/figma-local/boot.js', import.meta.url), 'utf8')
await writeFile(new URL('../plugins/figma-local/code.js', import.meta.url), engine.replace('export function makeFigmaExecutor', 'function makeFigmaExecutor') + '\n' + boot)
// Store-only ZIP: no runtime dependencies or private pairing credentials.
const entries=['manifest.json','code.js','ui.html','README.md'],parts=[],central=[]
let offset=0
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
for(const name of entries){const bytes=await readFile(new URL('../plugins/figma-local/'+name,import.meta.url)),filename=Buffer.from('wendler-figma-local/'+name),crc=crc32(bytes),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);parts.push(header,filename,bytes);const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(bytes.length,20);directory.writeUInt32LE(bytes.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);central.push(directory,filename);offset+=header.length+filename.length+bytes.length}
for (let i=0;i<parts.length;i+=3) parts[i].writeUInt16LE(0x21,12)
for (let i=0;i<central.length;i+=2) central[i].writeUInt16LE(0x21,14)
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
await mkdir(new URL('../public/design/',import.meta.url),{recursive:true})
await writeFile(new URL('../public/design/figma-local-plugin.zip',import.meta.url),Buffer.concat([...parts,directory,end]))
console.log('Plugin local do Figma compilado.')
