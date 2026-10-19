import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try {
 const {requireEligibleUser,EligibilityServiceError}=await server.ssrLoadModule('/lib/server/eligibility.ts');
 const {createGeminiChatHandler,chatServerStatus}=await server.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const consent='2026-10-19T00:00:00.000Z';
 for(const scenario of ['valid','existing','expired','revoked','disabled','anonymous','no-profile','no-consent','bad-consent','token-service-failure','unknown-token-service-failure','profile-storage-failure']){
  let generated=0,reads=0,revocationChecked=false;
  const deps={auth:{verifyIdToken:async(token,checkRevoked)=>{
   assert.equal(token,'local-only-token');revocationChecked=checkRevoked;
   if(['expired','revoked','disabled'].includes(scenario))throw Object.assign(new Error('synthetic SDK rejection'),{code:{expired:'auth/id-token-expired',revoked:'auth/id-token-revoked',disabled:'auth/user-disabled'}[scenario]});
   if(scenario==='token-service-failure')throw Object.assign(new Error('synthetic backend secret'),{code:'auth/insufficient-permission'});
   if(scenario==='unknown-token-service-failure')throw new Error('synthetic backend secret');
   return {uid:'synthetic-user',firebase:{sign_in_provider:scenario==='anonymous'?'anonymous':'google.com'}};
  }},db:{doc:path=>{assert.equal(path,'camellia_users/synthetic-user');return {get:async()=>{reads++;if(scenario==='profile-storage-failure')throw new Error('synthetic backend secret');return{exists:scenario!=='no-profile',data:()=>({agreedAt:scenario==='no-consent'?undefined:scenario==='bad-consent'?{}:consent})};}}}}};
  const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'local-only',VERCEL_ENV:'preview'},verifyToken:t=>requireEligibleUser(t,deps),getTodayMood:async()=>undefined,generate:async()=>{generated++;return '今日は仕事のことが気になるんだね。';}});
  let status,result;await handler({method:'POST',headers:{authorization:'Bearer local-only-token'},body:{message:'仕事のことを話したい'}},{setHeader(){},status:s=>{status=s;return{json(v){result=v;}}}});
  const valid=['valid','existing'].includes(scenario);
  const expected=valid?200:scenario.includes('service-failure')||scenario==='profile-storage-failure'?503:['anonymous','no-profile','no-consent','bad-consent'].includes(scenario)?403:401;
  assert.equal(status,expected,scenario);assert.ok(!JSON.stringify(result).includes('synthetic backend secret'));assert.equal(generated,valid?1:0,scenario+' provider must not be charged');assert.equal(revocationChecked,true);
  if(['expired','revoked','disabled','anonymous'].includes(scenario))assert.equal(reads,0);
 }
 let setupStatus;const unavailable=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'local-only'},verifyToken:async()=>{throw new EligibilityServiceError('configuration');},getTodayMood:async()=>undefined,generate:async()=>{throw new Error('must not generate');}});await unavailable({method:'POST',headers:{authorization:'Bearer local-only'},body:{message:'test'}},{setHeader(){},status:s=>{setupStatus=s;return{json(){}}}});assert.equal(setupStatus,503);
 assert.equal(chatServerStatus({VERCEL_ENV:'production'}).rateLimitMode,'unavailable');assert.equal(chatServerStatus({}).serverAuthConfiguration,'missing');assert.equal(chatServerStatus({FIREBASE_SERVICE_ACCOUNT_JSON:'local-placeholder'}).rateLimitMode,'firestore');assert.ok(!JSON.stringify(chatServerStatus({FIREBASE_SERVICE_ACCOUNT_JSON:'local-placeholder'})).includes('local-placeholder'));
 console.log('PASS 13 eligibility cases and status labels: Admin revocation flag, anonymous, profile/consent and no provider calls on rejection (synthetic local dependencies; NOT real OAuth/revocation acceptance).');
}finally{await server.close();}
