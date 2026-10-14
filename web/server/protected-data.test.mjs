import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createProtectedData, normalizeCpf, dpapi } from './protected-data.mjs'

test('CPF validation rejects invalid digits without including the supplied value in errors',()=>{
  assert.equal(normalizeCpf('529.982.247-25'),'52998224725')
  for(const invalid of ['11111111111','52998224724','not a cpf'])assert.throws(()=>normalizeCpf(invalid),/^Error: Informe um CPF válido\.$/)
})
test('Windows DPAPI roundtrip protects bytes and rejects tampering',{skip:process.platform!=='win32'},async()=>{
  const protection=await dpapi(),plain=Buffer.from('local-test-only'),encrypted=protection.protect(plain)
  assert.ok(!encrypted.includes(plain));assert.deepEqual(protection.unprotect(encrypted),plain)
  encrypted[encrypted.length-1]^=1;assert.throws(()=>protection.unprotect(encrypted))
})
test('CPF persists only protected ciphertext and status never returns raw or partial digits',async()=>{
  const dataDir=await mkdtemp(path.join(tmpdir(),'wendler-vault-'))
  try {
    const protection=process.platform==='win32'?dpapi:async()=>({protect:bytes=>Buffer.from(bytes).reverse()})
    const vault=createProtectedData({dataDir,protection});assert.equal((await vault.status()).saved,false)
    const status=await vault.save('529.982.247-25');assert.deepEqual(Object.keys(status).sort(),['available','masked','protection','saved']);assert.equal(status.masked,'***.***.***-**')
    const disk=await readFile(path.join(dataDir,'protected-cpf.json'),'utf8');assert.ok(!disk.includes('52998224725'));assert.ok(!disk.includes('529.982.247-25'))
    assert.equal((await createProtectedData({dataDir,protection}).status()).saved,true)
    await assert.rejects(vault.save('11111111111'));assert.equal((await vault.status()).saved,true)
    assert.equal((await vault.remove()).saved,false)
  } finally { await rm(dataDir,{recursive:true,force:true}) }
})
