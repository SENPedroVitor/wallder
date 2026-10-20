import test from 'node:test'
import assert from 'node:assert/strict'
import { claimBrowserPreview, conversationBrowserPreview } from './browser-monitor.mjs'
import { BrowserBridge } from './browser.mjs'

function fixture() {
 const source = { page: {}, calls: 0, async preview() { this.calls++; return { active: true, image: 'private-frame', title: 'Only Ash' } } }
 return source
}
test('chat monitor only captures the conversation that used the browser, including after release', async () => {
 const bridge = new BrowserBridge('/nonexistent/monitor-test'); bridge.context = {}; bridge.page = {}
 bridge.preview = async () => ({ active: true, image: 'ash-frame' })
 bridge.requireScope({ conversationId: 'ash' }); bridge.releaseScope({ conversationId: 'ash' })
 assert.equal(bridge.owner, null)
 assert.equal((await conversationBrowserPreview([bridge], 'ash')).image, 'ash-frame')
 for (const id of ['ted', 'another-ash-chat', '', null]) assert.equal((await conversationBrowserPreview([bridge], id)).image, undefined)
 bridge.requireScope({ conversationId: 'ted' })
 assert.equal((await conversationBrowserPreview([bridge], 'ash')).active, false)
 assert.equal((await conversationBrowserPreview([bridge], 'ted')).active, true)
})
test('a newer claim in the shared browser blocks the previous conversation without taking a screenshot', async () => {
 const browser = fixture(), steam = fixture(), sources = [browser, steam]
 claimBrowserPreview(browser, 'ash'); claimBrowserPreview(steam, 'pam')
 assert.equal((await conversationBrowserPreview(sources, 'ash')).image, undefined)
 assert.equal(browser.calls + steam.calls, 0)
 assert.equal((await conversationBrowserPreview(sources, 'pam')).active, true)
 claimBrowserPreview(steam) // manual login, mode change or disconnect
 assert.equal((await conversationBrowserPreview(sources, 'pam')).image, undefined)
 assert.equal((await conversationBrowserPreview(sources, 'ash')).image, undefined)
})
test('a capture finishing after a conversation change cannot return the old image', async () => {
 const browser = fixture(), steam = fixture(); let complete
 browser.preview = () => new Promise(resolve => { complete = resolve })
 claimBrowserPreview(browser, 'ash')
 const pending = conversationBrowserPreview([browser, steam], 'ash')
 claimBrowserPreview(steam, 'pam'); complete({ active: true, image: 'stale-private-frame' })
 assert.equal((await pending).image, undefined)
 claimBrowserPreview(browser, 'ash')
 const another = conversationBrowserPreview([browser, steam], 'ash')
 claimBrowserPreview(browser, 'ted'); complete({ active: true, image: 'another-stale-frame' })
 assert.equal((await another).active, false)
})
