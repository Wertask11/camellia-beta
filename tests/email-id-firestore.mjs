import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc} from 'firebase/firestore';
import {createServer} from 'vite';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8085');
const env=await initializeTestEnvironment({projectId:'demo-camellia',firestore:{host:'127.0.0.1',port:8085,rules:await readFile(new URL('./fixtures/schoolpark.firestore.rules',import.meta.url),'utf8')}});
const server=await createServer({configFile:false,resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const uid='email-verified-local',at=new Date().toISOString(),path=`camellia_users/${uid}`;
 const verified=env.authenticatedContext(uid,{email_verified:true,firebase:{sign_in_provider:'password'}}).firestore(),unverified=env.authenticatedContext(uid,{email_verified:false,firebase:{sign_in_provider:'password'}}).firestore();
 await assertFails(setDoc(doc(unverified,path),{agreedAt:at}));
 await assertSucceeds(setDoc(doc(verified,path),{agreedAt:at,womanSelfDeclared:true}));
 await assertSucceeds(setDoc(doc(verified,path+'/imports/local'),{kind:'personal-memory',value:{text:'LOCAL PRIVATE'}}));
 await assertFails(getDoc(doc(unverified,path)));await assertFails(getDoc(doc(unverified,path+'/imports/local')));
 await assertFails(setDoc(doc(unverified,path+'/profile/basic'),{displayName:'FORGED'}));
 await assertFails(getDoc(doc(env.authenticatedContext('email-other',{email_verified:true,firebase:{sign_in_provider:'password'}}).firestore(),path)));
 await assertFails(setDoc(doc(verified,path+'/admin/subscription'),{plan:'plus'}));
 const legacy=env.authenticatedContext('legacy-custom',{firebase:{sign_in_provider:'custom'}}).firestore(),google=env.authenticatedContext('legacy-google',{email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();await assertSucceeds(setDoc(doc(legacy,'camellia_users/legacy-custom'),{agreedAt:at}));await assertSucceeds(setDoc(doc(google,'camellia_users/legacy-google'),{agreedAt:at}));
 const {requireEligibleUser}=await server.ssrLoadModule('/lib/server/eligibility.ts');let reads=0;
 await assert.rejects(()=>requireEligibleUser('LOCAL',{auth:{verifyIdToken:async(_token,revoked)=>{assert.equal(revoked,true);return {uid,firebase:{sign_in_provider:'password'},email_verified:false};}},db:{doc(){reads++;throw new Error('must not read');}}}),{code:'LOGIN_REQUIRED'});assert.equal(reads,0);
 const identity=await requireEligibleUser('LOCAL',{auth:{verifyIdToken:async()=>({uid,firebase:{sign_in_provider:'password'},email_verified:true})},db:{doc:p=>({get:async()=>({exists:true,data:()=>p===path?{agreedAt:at}:{}})})}});assert.equal(identity.uid,uid);
 console.log('PASS actual Camellia Rules: verified-email own record access, unverified/cross-owner/paid forgery denial, legacy custom/Google preserved; server email verification before profile access. No live Auth or Rules deployment.');
}finally{await server.close();await env.cleanup();}
