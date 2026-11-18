import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Window} from 'happy-dom';
const dom=new Window({url:'https://camellia.test/?auth=email'});
for(const k of ['window','document','navigator','location','localStorage','sessionStorage'])Object.defineProperty(globalThis,k,{value:k==='window'?dom:dom[k],configurable:true});
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const email=await server.ssrLoadModule('/lib/auth/email-id.ts'),{profileComplete}=await server.ssrLoadModule('/lib/profile.ts'),{emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const sends=[];let user=null,time=Date.parse('2026-11-17T05:00:00Z'),signins=0,links=0;
 const makeUser=(uid,verified=true)=>({uid,isAnonymous:false,emailVerified:verified,async reload(){},async getIdToken(){return 'LOCAL_TOKEN';}});
 const driver={ready:async()=>{},current:()=>user,send:async(address,url)=>{sends.push({address,url});},isLink:url=>url.includes('oobCode=LOCAL'),signin:async()=>{signins++;user=makeUser('new-email-id');return user;},link:async current=>{links++;return current;}};
 const service=email.createEmailIdService(driver,localStorage,()=>time);
 await assert.rejects(()=>service.request('invalid','https://camellia.test','signin',true),/EMAIL_INVALID/);
 await assert.rejects(()=>service.request('user@example.test','https://camellia.test','signin',false),/EMAIL_CONSENT_REQUIRED/);
 await service.request('user@example.test','https://camellia.test','signin',true);assert.equal(sends.length,1);assert.equal(sends[0].url,'https://camellia.test/?auth=email');assert.ok(!sends[0].url.includes('user@'));
 await assert.rejects(()=>service.complete('https://camellia.test/?oobCode=LOCAL','different@example.test'),/EMAIL_LINK_INVALID/);assert.equal(signins,0);
 const result=await service.complete('https://camellia.test/?oobCode=LOCAL');assert.equal(result.uid,'new-email-id');assert.equal(result.linked,false);assert.equal(signins,1);assert.equal(localStorage.getItem(email.EMAIL_PENDING_KEY),null);assert.equal(email.readVerifiedEmailIntent(result.uid,localStorage,time).targetAcknowledged,true);
 const profile={...emptyState().profile,emailIdSetup:true,ageRangeSelfDeclared:true,womanSelfDeclared:true,agreedAt:new Date(time).toISOString()};assert.equal(profileComplete(profile),true);assert.equal(profile.birthDate,undefined);assert.equal(profile.age,'');assert.equal(profileComplete({...profile,ageRangeSelfDeclared:false}),false);
 user=makeUser('existing-line-uid');localStorage.setItem('EXISTING_PRIVATE','EXACT_ORIGINAL');await service.request('old@example.test','https://camellia.test','link');const linked=await service.complete('https://camellia.test/?oobCode=LOCAL');assert.equal(linked.uid,'existing-line-uid');assert.equal(linked.linked,true);assert.equal(links,1);assert.equal(localStorage.getItem('EXISTING_PRIVATE'),'EXACT_ORIGINAL');
 await service.request('old@example.test','https://camellia.test','link');user=makeUser('different-account');await assert.rejects(()=>service.complete('https://camellia.test/?oobCode=LOCAL'),/EMAIL_AUTH_CHANGED/);assert.equal(links,1);
 user=null;await service.request('old@example.test','https://camellia.test','signin',true);time+=email.EMAIL_INTENT_TTL+1;assert.equal(service.pending(),undefined);await assert.rejects(()=>service.complete('https://camellia.test/?oobCode=LOCAL'),/EMAIL_REQUIRED/);
 driver.signin=async()=>{user=makeUser('unverified',false);return user;};await service.request('old@example.test','https://camellia.test','signin',true);await assert.rejects(()=>service.complete('https://camellia.test/?oobCode=LOCAL'),/EMAIL_UNVERIFIED/);
 const clean=email.stripEmailCallback(new URL('https://camellia.test/?auth=email&oobCode=PRIVATE_CODE&apiKey=PRIVATE_KEY&mode=signIn&lang=ja'));assert.equal(clean,'/');assert.ok(!email.emailIdError({code:'unknown',message:'PRIVATE_EMAIL'}).includes('PRIVATE'));
 console.log('PASS email verification driver, consent without fake birthday, same-UID explicit linking, changed-account/mismatched-email/expiry/unverified refusal, callback scrubbing and sanitized errors. Adapter only, no real email sent.');
}finally{await server.close();await dom.happyDOM.close();}
