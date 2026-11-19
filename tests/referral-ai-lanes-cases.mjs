import assert from'node:assert/strict';import{createServer}from'vite';
const vite=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const{createGeminiChatHandler,classifyChatError}=await vite.ssrLoadModule('/lib/conversation/gemini-server.ts');let called,controls,code,body;const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'LOCAL FIXTURE'},verifyToken:async()=>({uid:'LOCAL UID'}),getTodayMood:async()=>undefined,limiter:{take:(uid,lane)=>{called={uid,lane};return true;}},generate:async(_c,_p,o)=>{controls=o;return'{"reply":"LOCAL SYNTHETIC REPLY","actionId":null}';}});const response={setHeader(){},status(n){code=n;return{json(v){body=v;}};}};
 await handler({method:'POST',headers:{authorization:'Bearer LOCAL'},body:{message:'今日を整理したい',modelId:'yura'}},response);assert.equal(code,200);assert.equal(called.lane,'basic');assert.equal(controls.identity.usageLane,undefined);
 await handler({method:'POST',headers:{authorization:'Bearer LOCAL'},body:{message:'今日を整理したい',modelId:'lactone',usageLane:'referral_extension'}},response);assert.equal(code,200);assert.equal(called.lane,'referral_extension');assert.equal(controls.identity.usageLane,'referral_extension');assert.equal(body.modelId,'lactone');
 for(const c of ['TRIAL_AI_LIMIT','TRIAL_AI_TOKEN_LIMIT','TRIAL_EXPIRED','TRIAL_AI_NOT_CONFIGURED'])assert.equal(classifyChatError({code:c}),'trial_limited');assert.equal(classifyChatError({status:503}),'provider_error');
 const{trialExtensionReady}=await vite.ssrLoadModule('/lib/referral/ai-availability.ts');assert.equal(await trialExtensionReady({},'LOCAL'),false,'unconfigured feature never offers a trial button');
 console.log('PASS explicit basic/trial lane forwarding, immutable request model, quota-specific safe errors and stopped capability. Provider is injected; no API call.');
}finally{await vite.close();}
