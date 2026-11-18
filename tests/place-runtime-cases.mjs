/** Standalone Node packaging: Vite's @ alias must not hide a server dependency on client Fortune data. */
import assert from 'node:assert/strict';
import {transform} from 'esbuild';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
await mkdir('work',{recursive:true});
const dir=await mkdtemp(resolve('work/place-runtime-'));
await writeFile(join(dir,'package.json'),JSON.stringify({type:'commonjs'}));
const seen=new Set();
async function compile(relative){
 if(seen.has(relative))return;seen.add(relative);
 const {code}=await transform(await readFile(relative,'utf8'),{loader:'ts',format:'cjs',target:'node24'});
 const output=join(dir,relative.replace(/\.ts$/,'.js'));await mkdir(dirname(output),{recursive:true});await writeFile(output,code);
 for(const match of code.matchAll(/require\(["']([^"']+)["']\)/g)){
  const name=match[1];
  assert.ok(!name.startsWith('@/'),'Server runtime imported a client-only alias: '+name);
  if(name.startsWith('.'))await compile(resolve(dirname(relative),name).slice(process.cwd().length+1).replace(/\.js$/,'.ts'));
 }
}
try{
 await compile('lib/place/recommendation.ts');
 assert.ok(!seen.has('lib/fortune/engine.ts'),'Place server must not initialize Fortune/client catalog');
 const script=`const assert=require('node:assert/strict');const {rankPlaces,localPlaceIntents}=require(${JSON.stringify(join(dir,'lib/place/recommendation.js'))});assert.equal(typeof rankPlaces,'function');assert.deepEqual(rankPlaces([],[]),[]);assert.deepEqual(localPlaceIntents({checkins:[{createdAt:'2026-11-17T15:00:00Z',mood:1}],actions:[]},new Date('2026-11-18T00:00:00Z')),['rest','quiet']);console.log('PASS standalone Place CommonJS load, no alias/client data, preserved JST recommendation behavior');`;
 const result=spawnSync(process.execPath,['--no-experimental-require-module','-e',script],{encoding:'utf8',timeout:15000});assert.equal(result.status,0,result.stderr);console.log(result.stdout.trim());
}finally{await rm(dir,{recursive:true,force:true});}
