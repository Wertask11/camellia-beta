import assert from'node:assert/strict';import{createServer}from'vite';
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const{createGeminiChatHandler}=await vite.ssrLoadModule('/lib/conversation/gemini-server.ts');let generated=0,status,body;
 const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'LOCAL-ONLY'},verifyToken:async()=>({uid:'local-fixture'}),getTodayMood:async()=>undefined,limiter:{take:async()=>{throw Object.assign(new Error('FREE_DAILY_LIMIT'),{code:'FREE_DAILY_LIMIT'});}},generate:async()=>{generated++;return'not allowed';}});
 await handler({method:'POST',headers:{authorization:'Bearer LOCAL-ONLY'},body:{message:'今日は少し話したい',modelId:'yura'}},{setHeader(){},status(n){status=n;return{json(v){body=v;}};}});
 assert.equal(status,429);assert.equal(body.category,'daily_limited');assert.equal(generated,0);
 console.log('PASS daily quota has a specific safe error before provider dispatch; no Gemini call or paid offer.');
}finally{await vite.close();}
