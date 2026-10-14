import {test} from 'node:test'
import assert from 'node:assert/strict'
import {conversationFromLink} from '../src/design/conversationLink.ts'
test('island links open only known active conversations without reviving archived history',()=>{
 const chats=[{id:'active'},{id:'archived',archived:true}]
 assert.equal(conversationFromLink(chats,'?conversation=active'),'active')
 assert.equal(conversationFromLink(chats,'?conversation=archived'),null)
 assert.equal(conversationFromLink(chats,'?conversation=unknown'),null)
 assert.equal(conversationFromLink(chats,'?conversation=https://evil.example'),null)
 assert.equal(conversationFromLink(chats,''),null)
})
