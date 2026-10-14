import test from 'node:test'
import assert from 'node:assert/strict'
import {weatherKind,weatherScene,WEATHER_SKIES,moonAge} from '../src/components/ui/weather-scene.ts'
test('weather effect follows the reported condition, including fog, snow and storms',()=>{for(const [code,kind] of [[0,'clear'],[2,'partly'],[3,'cloud'],[45,'mist'],[53,'drizzle'],[61,'rain'],[66,'sleet'],[73,'snow'],[95,'storm']])assert.equal(weatherKind(code),kind)})
test('supplied scene changes its rain frames and draws a moon at night rather than a sun',()=>{const options={cols:57,rows:15,horizon:14,hour:12,sky:WEATHER_SKIES.rain};const first=weatherScene({...options,tick:0}),next=weatherScene({...options,tick:2});assert.notEqual(first.rain,next.rain);const night=weatherScene({...options,hour:23,sky:{...WEATHER_SKIES.clear,moonPhase:moonAge(new Date('2026-10-12T00:00:00Z'))}});assert.equal(night.sun,'');assert.ok(night.moon.length+night.moonDark.length>0);assert.ok(night.star.length>0)})
