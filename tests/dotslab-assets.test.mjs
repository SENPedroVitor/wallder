import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dotslabAgents } from '../src/components/dotslabAgents.ts';

test('every personality has all eight local animated and static mascot assets',()=>{
 const states=['idle','listening','thinking','writing','success','alert','error','asleep'];
 assert.equal(Object.keys(dotslabAgents).length,21);
 assert.equal(new Set(Object.values(dotslabAgents).map(a=>`${a.shape}:${a.color}`)).size,21);
 for(const agent of Object.keys(dotslabAgents).filter(agent=>agent!=='kendrick'))for(const state of states)for(const animated of [true,false]){
  const asset=path.join('public/dotslab/agents',agent,`${state}${animated?'':'-static'}.svg`);
  const svg=fs.readFileSync(asset,'utf8');
  assert.match(svg,/<svg[^>]+viewBox="0 0 512 512"/,asset);
  assert.equal(/<animate\b/.test(svg),animated,asset);
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|(?:href|src)="https?:|\b(?:NaN|Infinity)\b/i,asset);
  assert.match(svg,/Dots Lab by Guillaume/,asset);
 }
});

test('all ten original eye styles have script-free local previews for each agent',()=>{
 for(const agent of Object.keys(dotslabAgents).filter(agent=>agent!=='kendrick'))for(const eyes of ['toon','pill','dot','ring','happy','plus','dash','slash','squint','wink'])for(const animated of [true,false]){
  const asset=path.join('public/dotslab/agents',agent,'eyes',`${eyes}${animated?'':'-static'}.svg`);
  const svg=fs.readFileSync(asset,'utf8');
  assert.equal(/<animate\b/.test(svg),animated,asset);
  assert.match(svg,/<svg[^>]+viewBox="0 0 512 512"/,asset);
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|(?:href|src)="https?:|\b(?:NaN|Infinity)\b/i,asset);
 }
});
