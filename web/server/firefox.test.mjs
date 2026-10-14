import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {parseFirefoxProfile} from './firefox.mjs'
test('Firefox profile selection follows the installed default before the legacy Default flag',()=>{const source='[Profile0]\nName=current\nIsRelative=1\nPath=Profiles/current\n[InstallABC]\nDefault=Profiles/current\nLocked=1\n[Profile1]\nName=old\nPath=Profiles/old\nIsRelative=1\nDefault=1';assert.deepEqual(parseFirefoxProfile(source,'C:/Firefox'),{name:'current',path:path.resolve('C:/Firefox/Profiles/current')});assert.throws(()=>parseFirefoxProfile('[General]\nVersion=2','C:/Firefox'))})
