/** Future sharing service acceptance against a local demo database. Production API creation stays disabled. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc} from 'firebase/firestore';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8085','Never run against production');
const env=await initializeTestEnvironment({projectId:'demo-camellia',firestore:{host:'127.0.0.1',port:8085,rules:await readFile(new URL('./fixtures/schoolpark.firestore.rules',import.meta.url),'utf8')}});
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
const app=initializeApp({projectId:'demo-camellia'},'partner-local-acceptance'),db=getFirestore(app),root='camellia_admin/release_phase1';
try{
 const {PartnerShareService,shareHash}=await server.ssrLoadModule('/lib/partner/service.ts');
 const {createSharedRateLimiter}=await server.ssrLoadModule('/lib/server/shared-limit.ts');
 const {memberStatus}=await server.ssrLoadModule('/lib/membership/server.ts');
 const owner='partner-local-owner',other='partner-local-other',now=Date.now();
 const payload={kind:'feeling',feelingId:'listen',recipient:'partner',timing:'today',days:1,consent:true};
 await db.doc(`camellia_users/${owner}`).set({agreedAt:new Date(now).toISOString()});
 const service=new PartnerShareService(db,()=>now);
 await assert.rejects(service.create(owner,payload),{code:'PLUS_REQUIRED'});
 for(const context of [env.unauthenticatedContext(),env.authenticatedContext(owner),env.authenticatedContext(owner,{camelliaModerator:true})]){
  await assertFails(setDoc(doc(context.firestore(),`camellia_users/${owner}/admin/subscription`),{plan:'plus',source:'verified_payment'}));
  await assertFails(setDoc(doc(context.firestore(),`camellia_users/${owner}/admin/partner_share_quota`),{count:0}));
  await assertFails(getDoc(doc(context.firestore(),`${root}/partner_shares/forged`)));
  await assertFails(setDoc(doc(context.firestore(),`${root}/partner_shares/forged`),{content:{title:'forged'}}));
 }
 await db.doc(`camellia_users/${owner}/admin/subscription`).set({plan:'plus',source:'verified_payment',status:'active',paymentReceipt:'LOCAL-SYNTHETIC-NOT-A-PAYMENT',currency:'JPY',amount:500,expiresAt:new Date(now+3600000).toISOString()});
 assert.equal((await memberStatus(db,owner,now)).sharingReady,false,'Even a paid fixture cannot enable live sharing in this release');
 const created=await service.create(owner,payload);assert.equal(created.token.length,43);assert.equal(created.id,shareHash(created.token));
 const stored=(await db.doc(`${root}/partner_shares/${created.id}`).get()).data();assert.ok(!JSON.stringify(stored).includes(created.token),'Only a token hash is stored');
 const publicValue=await service.read(created.token);assert.equal(publicValue.title,'今日は話を聞いてほしい');assert.ok(!JSON.stringify(publicValue).includes(owner));assert.ok(!JSON.stringify(publicValue).includes('paymentReceipt'));
 await assert.rejects(service.revoke(other,created.id),{code:'SHARE_NOT_FOUND'});
 await service.revoke(owner,created.id);await assert.rejects(service.read(created.token),{code:'SHARE_NOT_FOUND'});assert.deepEqual((await db.doc(`${root}/partner_shares/${created.id}`).get()).data().content,{});
 const expiring=await service.create(owner,payload);await assert.rejects(new PartnerShareService(db,()=>now+86400001).read(expiring.token),{code:'SHARE_NOT_FOUND'});
 const removed=await service.create(owner,payload);await db.doc(`camellia_users/${owner}`).delete();await assert.rejects(service.read(removed.token),{code:'SHARE_NOT_FOUND'});
 await db.doc(`camellia_users/${owner}`).set({agreedAt:new Date(now+1000).toISOString()});await assert.rejects(service.read(removed.token),{code:'SHARE_NOT_FOUND'},'Recreating an account cannot revive old links');
 const limiter=createSharedRateLimiter(db,{CAMELLIA_CHAT_RATE_USER:'1',CAMELLIA_CHAT_RATE_GLOBAL:'2'},()=>1793700000000,'partner_rate_windows');
 assert.equal(await limiter.take('local-partner-reader'),true);assert.equal(await limiter.take('local-partner-reader'),false);
 assert.equal((await db.doc(`${root}/rate_windows/global-${Math.floor(1793700000000/300000)}`).get()).exists,false,'Sharing never consumes Gemini quota');
 console.log('PASS local sharing-service boundary: protected entitlements/quota, Free denial, hash-only token, public projection, owner-only revoke + content scrub, expiry, delete/recreate invalidation, separate rate limits. API issuance remains disabled; no real payment.');
}finally{await env.cleanup();await server.close();await db.terminate();await deleteApp(app);}
