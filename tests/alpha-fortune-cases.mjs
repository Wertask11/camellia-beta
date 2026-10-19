import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
const dom=new Window({url:'http://localhost'});globalThis.localStorage=dom.localStorage;
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const {readFortuneReflection,saveFortuneReflection,clearFortuneReflections,quarantineLegacyFortuneReflections}=await server.ssrLoadModule('/lib/fortune/reflection.ts');
 const date='2026-10-19';saveFortuneReflection('local-profile-A',date,'yes');
 assert.equal(readFortuneReflection('local-profile-A',date),'yes');assert.equal(readFortuneReflection('local-profile-B',date),undefined);assert.equal(readFortuneReflection('local-profile-A','2026-10-20'),undefined);
 localStorage.setItem('camellia-fortune-reflect:'+date,'some');quarantineLegacyFortuneReflections();assert.equal(readFortuneReflection('local-profile-B',date),undefined);assert.equal(localStorage.getItem('camellia-fortune-reflect:unassigned:'+date),'some');assert.equal(localStorage.getItem('camellia-fortune-reflect:'+date),null);
 assert.equal(readFortuneReflection('local-profile-A',date),'yes');clearFortuneReflections();assert.equal(readFortuneReflection('local-profile-A',date),undefined);assert.equal(localStorage.length,0);
 console.log('PASS Fortune: local profile/date scope, no B inheritance, unowned legacy quarantine, clear all answers only at explicit personal delete. No real account/auth operations.');
}finally{await server.close();await dom.happyDOM.abort();}
