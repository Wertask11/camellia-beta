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
 const {generateKeyPairSync}=await import('node:crypto');
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const instance=app.initializeApp({projectId:'unit-only-project',credential:app.cert({projectId:'unit-only-project',clientEmail:'test@unit-only-project.iam.gserviceaccount.com',privateKey})},'local-sdk-initialization');
 auth.getAuth(instance);firestore.getFirestore(instance);
 await app.deleteApp(instance);
 console.log('Server SDK imports and initialization PASS with require(ESM) disabled (synthetic local key; no network/auth/storage calls)');
`],{encoding:'utf8',timeout:30_000});
assert.equal(result.status,0,result.stderr||result.error?.message||result.signal);
console.log(result.stdout.trim());
