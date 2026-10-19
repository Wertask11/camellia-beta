import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try {
 const {requireEligibleUser}=await server.ssrLoadModule('/lib/server/eligibility.ts');
 const {createGeminiChatHandler}=await server.ssrLoadModule('/lib/conversation/gemini-server.ts');
 const consent='2026-10-19T00:00:00.000Z';
 for(const scenario of ['valid','existing','expired','revoked','disabled','anonymous','no-profile','no-consent','bad-consent']){
  let generated=0,reads=0,revocationChecked=false;
  const deps={auth:{verifyIdToken:async(token,checkRevoked)=>{
   assert.equal(token,'local-only-token');revocationChecked=checkRevoked;
   if(['expired','revoked','disabled'].includes(scenario))throw new Error('synthetic SDK rejection');
   return {uid:'synthetic-user',firebase:{sign_in_provider:scenario==='anonymous'?'anonymous':'google.com'}};
  }},db:{doc:path=>{assert.equal(path,'camellia_users/synthetic-user');return {get:async()=>{reads++;return{exists:scenario!=='no-profile',data:()=>({agreedAt:scenario==='no-consent'?undefined:scenario==='bad-consent'?{}:consent})};}}}}};
  const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'local-only',VERCEL_ENV:'preview'},verifyToken:t=>requireEligibleUser(t,deps),getTodayMood:async()=>undefined,generate:async()=>{generated++;return '今日は仕事のことが気になるんだね。';}});
  let status;await handler({method:'POST',headers:{authorization:'Bearer local-only-token'},body:{message:'仕事のことを話したい'}},{setHeader(){},status:s=>{status=s;return{json(){}}}});
  const valid=['valid','existing'].includes(scenario);
  assert.equal(status,valid?200:401,scenario);assert.equal(generated,valid?1:0,scenario+' provider must not be charged');assert.equal(revocationChecked,true);
  if(['expired','revoked','disabled','anonymous'].includes(scenario))assert.equal(reads,0);
 }
 console.log('PASS 9 eligibility cases: Admin revocation flag, anonymous, profile/consent and no provider calls on rejection (synthetic local dependencies; NOT real OAuth/revocation acceptance).');
}finally{await server.close();}
