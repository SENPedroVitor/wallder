import test from 'node:test'
import assert from 'node:assert/strict'
import {desktopCanvasSize} from '../src/design/desktopCanvas.ts'
import {conversationRecipients} from '../src/chatWork.ts'
test('desktop canvas fills desktop windows without retaining the old 800 by 600 frame',()=>{for(const [width,height] of [[1920,1080],[1366,768],[1080,1040],[1040,720],[800,600],[800,500]]){const size=desktopCanvasSize(width,height);assert.ok(Math.abs(size.width*size.scale-width)<.001);assert.ok(Math.abs(size.height*size.scale-height)<.001);assert.ok(size.scale<=1);assert.ok(size.width>=800&&size.height>=600)}})
test('project members do not all reply unless explicitly mentioned',()=>{const agents=[{id:'west',name:'Ash'},{id:'ted',name:'Ted Mosby'},{id:'pam',name:'Pam'}];assert.deepEqual(conversationRecipients('Abre o navegador',agents,'west').map(a=>a.id),['west']);assert.deepEqual(conversationRecipients('@Ted Mosby responde por favor',agents,'west').map(a=>a.id),['ted']);assert.deepEqual(conversationRecipients('@Ash e @Pam me ajudem',agents,'west').map(a=>a.id),['west','pam'])})
