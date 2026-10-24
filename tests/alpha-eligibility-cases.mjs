import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try {
 const {requireEligibleUser,EligibilityServiceError}=await server.ssrLoadModule('/lib/server/eligibility.ts');
 const {createGeminiChatHandler,chatServerStatus}=await server.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const consent='2026-10-19T00:00:00.000Z';
 for(const scenario of ['valid','existing','expired','revoked','disabled','anonymous','no-profile','no-consent','bad-consent','token-service-failure','unknown-token-service-failure','profile-storage-failure','suspended','invite-required','invite-admitted','invite-before-switch','invite-off-suspended']){
  let generated=0,reads=0,revocationChecked=false;
  const deps={auth:{verifyIdToken:async(token,checkRevoked)=>{
   assert.equal(token,'local-only-token');revocationChecked=checkRevoked;
   if(['expired','revoked','disabled'].includes(scenario))throw Object.assign(new Error('synthetic SDK rejection'),{code:{expired:'auth/id-token-expired',revoked:'auth/id-token-revoked',disabled:'auth/user-disabled'}[scenario]});
   if(scenario==='token-service-failure')throw Object.assign(new Error('synthetic backend secret'),{code:'auth/insufficient-permission'});
   if(scenario==='unknown-token-service-failure')throw new Error('synthetic backend secret');
   return {uid:'synthetic-user',firebase:{sign_in_provider:scenario==='anonymous'?'anonymous':'google.com'}};
  }},db:{doc:path=>{
   // Invites switched on at 2000; the person's record was made at 1000 only in invite-before-switch.
   const inviteOn=['invite-required','invite-admitted','invite-before-switch'].includes(scenario);
   if(path==='camellia_admin/release_phase1/config/access')return{get:async()=>({exists:inviteOn,data:()=>inviteOn?{inviteRequired:true,requiredSince:2000}:undefined})};
   if(path==='camellia_users/synthetic-user/admin/access')return{get:async()=>({exists:['suspended','invite-admitted','invite-off-suspended'].includes(scenario),data:()=>({suspended:scenario.endsWith('suspended'),admitted:scenario==='invite-admitted'})})};
   assert.equal(path,'camellia_users/synthetic-user');return {get:async()=>{reads++;if(scenario==='profile-storage-failure')throw new Error('synthetic backend secret');return{exists:scenario!=='no-profile',createTime:{toMillis:()=>scenario==='invite-before-switch'?1000:3000},data:()=>({agreedAt:scenario==='no-consent'?undefined:scenario==='bad-consent'?{}:consent})};}}}}};
  const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'local-only',VERCEL_ENV:'preview'},verifyToken:t=>requireEligibleUser(t,deps),getTodayMood:async()=>undefined,generate:async()=>{generated++;return '今日は仕事のことが気になるんだね。';}});
  let status,result;await handler({method:'POST',headers:{authorization:'Bearer local-only-token'},body:{message:'仕事のことを話したい'}},{setHeader(){},status:s=>{status=s;return{json(v){result=v;}}}});
  const valid=['valid','existing','invite-admitted','invite-before-switch'].includes(scenario);
  const expected=valid?200:scenario.includes('service-failure')||scenario==='profile-storage-failure'?503:['anonymous','no-profile','no-consent','bad-consent','suspended','invite-required','invite-off-suspended'].includes(scenario)?403:401;
  if(scenario.endsWith('suspended'))assert.equal(result.error,'suspended',scenario);
  if(scenario==='invite-required')assert.equal(result.error,'invite_required');
  assert.equal(status,expected,scenario);assert.ok(!JSON.stringify(result).includes('synthetic backend secret'));assert.equal(generated,valid?1:0,scenario+' provider must not be charged');assert.equal(revocationChecked,true);
  if(['expired','revoked','disabled','anonymous'].includes(scenario))assert.equal(reads,0);
 }
 let setupStatus;const unavailable=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'local-only'},verifyToken:async()=>{throw new EligibilityServiceError('configuration');},getTodayMood:async()=>undefined,generate:async()=>{throw new Error('must not generate');}});await unavailable({method:'POST',headers:{authorization:'Bearer local-only'},body:{message:'test'}},{setHeader(){},status:s=>{setupStatus=s;return{json(){}}}});assert.equal(setupStatus,503);
 assert.equal(chatServerStatus({VERCEL_ENV:'production'}).rateLimitMode,'unavailable');assert.equal(chatServerStatus({}).serverAuthConfiguration,'missing');assert.equal(chatServerStatus({FIREBASE_SERVICE_ACCOUNT_JSON:'local-placeholder'}).rateLimitMode,'firestore');assert.ok(!JSON.stringify(chatServerStatus({FIREBASE_SERVICE_ACCOUNT_JSON:'local-placeholder'})).includes('local-placeholder'));
 console.log('PASS 18 eligibility cases and status labels: Admin revocation flag, anonymous, profile/consent and no provider calls on rejection (synthetic local dependencies; NOT real OAuth/revocation acceptance).');
}finally{await server.close();}
