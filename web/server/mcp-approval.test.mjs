import assert from 'node:assert/strict'
import { test } from 'node:test'
import { permissionContent } from './mcp-approval.mjs'
test('permission replies choose the narrowest supported scope without inventing user input',()=>{
  assert.deepEqual(permissionContent({type:'object',properties:{}}),{})
  assert.deepEqual(permissionContent({properties:{scope:{enum:['session','once']}},required:['scope']}),{scope:'once'})
  assert.deepEqual(permissionContent({properties:{scope:{enum:['session']}},required:['scope']}),{scope:'session'})
  assert.throws(()=>permissionContent({properties:{email:{type:'string'}},required:['email']}),/informações adicionais/)
})
