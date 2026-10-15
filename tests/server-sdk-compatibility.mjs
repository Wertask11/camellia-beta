/** Vercel may disable synchronous require(ESM), unlike a default local Node24 process. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--no-experimental-require-module','--input-type=module','-e',`
 const [genai,app,auth,firestore]=await Promise.all([
   import('@google/genai'),import('firebase-admin/app'),
   import('firebase-admin/auth'),import('firebase-admin/firestore')
 ]);
 for(const value of [genai.GoogleGenAI,app.cert,auth.getAuth,firestore.getFirestore]){
   if(typeof value!=='function')throw new Error('Missing server SDK export');
 }
 console.log('Server SDK imports PASS with require(ESM) disabled');
`],{encoding:'utf8',timeout:30_000});
assert.equal(result.status,0,result.stderr||result.error?.message||result.signal);
console.log(result.stdout.trim());
