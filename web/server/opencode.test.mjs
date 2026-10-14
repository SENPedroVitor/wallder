import test from 'node:test'
import assert from 'node:assert/strict'
import {OpenCodeService,isLightWeather,weatherIntent} from './opencode.mjs'
test('light routing excludes private/account data, work and attachments',()=>{
 assert.equal(isLightWeather({message:'Qual o clima em São Paulo?'}),true);
 for(const input of [{message:'Qual o clima? Meu CPF é 52998224725'},{message:'Qual o clima?',mode:'work'},{message:'Qual o clima?',attachment:{}},{message:'Comprar um jogo na Steam'},{message:'Clima da minha conta @email'}])assert.equal(isLightWeather(input),false);
});
test('weather interpretation cannot substitute a city or invent weather',()=>{
 assert.deepEqual(weatherIntent('{"city":"São Paulo"}','Qual clima em São Paulo?'),{city:'São Paulo'});
 assert.deepEqual(weatherIntent('{"city":null}','Qual clima em Minas Gerais?'),{city:null});
 assert.throws(()=>weatherIntent('{"city":"São Paulo"}','Qual clima em Minas Gerais?'));
 assert.throws(()=>weatherIntent('ensolarado','Qual clima?'));
});
test('OpenCode does not send conversation history or user preferences to its isolated session',async()=>{
 const sent=[];const service=new OpenCodeService({dataDir:'unused'});service.settings=async()=>({model:'openai/gpt-6-luna'});service.request=async(resource,options)=>{sent.push({resource,options});if(resource==='/session')return {id:'session-test'};if(resource.endsWith('/message'))return {parts:[{type:'text',text:'{"city":"São Paulo"}'}]};return true};
 assert.deepEqual(await service.interpretWeather('Qual clima em São Paulo?'),{city:'São Paulo'});
 assert.equal(sent[1].options.body.parts.length,1);assert.equal(sent[1].options.body.parts[0].text,'Qual clima em São Paulo?');assert.equal(sent.at(-1).options.method,'DELETE');
});
