import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID,createCipheriv,createDecipheriv,randomBytes } from 'node:crypto'

export function normalizeCpf(value) {
  if (typeof value !== 'string' || !/^[\d.\-\s]{11,18}$/.test(value)) throw Error('Informe um CPF válido.')
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) throw Error('Informe um CPF válido.')
  for (let size = 9; size <= 10; size++) {
    const sum = [...digits.slice(0, size)].reduce((total, digit, index) => total + Number(digit) * (size + 1 - index), 0)
    const check = (sum * 10) % 11
    if (Number(digits[size]) !== (check === 10 ? 0 : check)) throw Error('Informe um CPF válido.')
  }
  return digits
}

let windowsProtection
export async function dpapi() {
  if (process.platform !== 'win32') return linuxProtection();
  return windowsProtection ??= loadProtection()
}
export async function linuxProtection(keyFile=process.env.WENDLER_VAULT_KEY_FILE){
 if(!keyFile||!path.isAbsolute(keyFile))throw Error('Configure a chave protegida do cofre no servidor.');
 const key=await readFile(keyFile);if(key.length!==32)throw Error('Chave do cofre inválida.');
 return {protect:bytes=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);return Buffer.concat([Buffer.from('WDL1'),iv,cipher.getAuthTag(),encrypted])},unprotect:bytes=>{if(bytes.length<32||bytes.subarray(0,4).toString()!=='WDL1')throw Error('Registro incompatível com o cofre deste servidor.');const cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(4,16));cipher.setAuthTag(bytes.subarray(16,32));return Buffer.concat([cipher.update(bytes.subarray(32)),cipher.final()])}}
}
async function loadProtection() {
  const { default: koffi } = await import('koffi')
  koffi.struct('WENDLER_DATA_BLOB', { cbData: 'uint32_t', pbData: 'void *' })
  const crypt = koffi.load('crypt32.dll'), kernel = koffi.load('kernel32.dll')
  const protect = crypt.func('int __stdcall CryptProtectData(WENDLER_DATA_BLOB *input, str16 description, void *entropy, void *reserved, void *prompt, uint32_t flags, _Out_ WENDLER_DATA_BLOB *output)')
  const unprotect = crypt.func('int __stdcall CryptUnprotectData(WENDLER_DATA_BLOB *input, void *description, void *entropy, void *reserved, void *prompt, uint32_t flags, _Out_ WENDLER_DATA_BLOB *output)')
  const free = kernel.func('void * __stdcall LocalFree(void *memory)')
  const transform = (operation, bytes) => {
    const output = {}
    if (!operation({cbData:bytes.length,pbData:bytes}, null, null, null, null, 1, output)) throw Error('O Windows não conseguiu proteger os dados.')
    try { return Buffer.from(koffi.decode(output.pbData, 'uint8_t', output.cbData)) }
    finally { free(output.pbData) }
  }
  return { protect: bytes => transform(protect, bytes), unprotect: bytes => transform(unprotect, bytes) }
}

export function createProtectedData({dataDir, protection = dpapi}) {
  const file = path.join(dataDir, 'protected-cpf.json')
  let queue = Promise.resolve()
  async function status() {
    try { const saved = JSON.parse(await readFile(file,'utf8')); if(saved.version!==1 || saved.protection!=='windows-user-dpapi' || typeof saved.ciphertext!=='string') throw Error('Registro protegido indisponível.'); return {saved:true,masked:'***.***.***-**',protection:process.platform==='win32'?'Windows':'Servidor',available:process.platform==='win32'||!!process.env.WENDLER_VAULT_KEY_FILE} }
    catch(error) { if(error.code==='ENOENT') return {saved:false,masked:null,protection:process.platform==='win32'?'Windows':'Servidor',available:process.platform==='win32'||!!process.env.WENDLER_VAULT_KEY_FILE}; throw Error('Não foi possível consultar o CPF protegido.') }
  }
  function mutate(operation) { const task = queue.then(operation); queue = task.catch(()=>{}); return task }
  async function save(value) {
    const bytes = Buffer.from(normalizeCpf(value),'utf8')
    try {
      const encrypted = await (await protection()).protect(bytes)
      await mutate(async()=>{await mkdir(dataDir,{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify({version:1,protection:'windows-user-dpapi',ciphertext:encrypted.toString('base64')}),{mode:0o600});await rename(temporary,file)})
      return status()
    } finally { bytes.fill(0) }
  }
  async function remove() { await mutate(()=>rm(file,{force:true}));return status() }
  async function withCpf(operation) {
    const saved=JSON.parse(await readFile(file,'utf8'))
    if(saved.version!==1||saved.protection!=='windows-user-dpapi')throw Error('CPF protegido indisponível.')
    const bytes=(await protection()).unprotect(Buffer.from(saved.ciphertext,'base64'))
    try { return await operation(normalizeCpf(bytes.toString('utf8'))) } finally {bytes.fill(0)}
  }
  // No endpoint returns the plaintext. Future approved autofill must use a
  // narrowly scoped native service, rather than passing the CPF to an agent.
  return {status,save,remove,withCpf}
}
