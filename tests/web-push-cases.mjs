import assert from'node:assert/strict';import{createRequire}from'node:module';import{createECDH,randomBytes}from'node:crypto';import{readFile}from'node:fs/promises';import{runInNewContext}from'node:vm';import{createServer}from'vite';
const require=createRequire(import.meta.url),sdk=require('web-push'); // Also proves the deployed CommonJS dependency entry can load.
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const{pushSettings,pushSubscription}=await vite.ssrLoadModule('/lib/notifications/push.ts');
 const vapid=sdk.generateVAPIDKeys(),receiver=createECDH('prime256v1');receiver.generateKeys();
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/LOCAL-ONLY',keys:{p256dh:receiver.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 assert.deepEqual(pushSubscription(sub),sub);assert.equal(pushSettings({}),undefined);
 const env={CAMELLIA_WEB_PUSH_ENABLED:'true',CAMELLIA_NOTIFICATION_DISPATCH_SECRET:'ab'.repeat(32),CAMELLIA_PUSH_PUBLIC_KEY:vapid.publicKey,CAMELLIA_PUSH_PRIVATE_KEY:vapid.privateKey,CAMELLIA_PUSH_SUBJECT:'mailto:fixture@example.test'};assert.ok(pushSettings(env));assert.equal(pushSettings({...env,CAMELLIA_PUSH_PRIVATE_KEY:randomBytes(32).toString('base64url')}),undefined);
 for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:444/x','https://fcm.googleapis.com/x?private=1'])assert.throws(()=>pushSubscription({...sub,endpoint}));
 assert.throws(()=>pushSubscription({...sub,keys:{...sub.keys,auth:'invalid'}}));assert.throws(()=>pushSubscription({...sub,uid:'forged'}));
 const request=sdk.generateRequestDetails(sub,'FIXED GENERIC NOTICE',{vapidDetails:{...vapid,subject:env.CAMELLIA_PUSH_SUBJECT},TTL:3600});assert.equal(request.headers['Content-Encoding'],'aes128gcm');assert.ok(!request.body.toString().includes('FIXED GENERIC NOTICE'));assert.ok(!JSON.stringify(request.headers).includes(vapid.privateKey));
 const listeners={},shown=[],opened=[];const scope={addEventListener:(k,fn)=>listeners[k]=fn,location:{origin:'https://camellia.example'},registration:{showNotification:async(title,opts)=>shown.push({title,opts})},clients:{openWindow:async url=>opened.push(url)}};
 runInNewContext(await readFile('public/camellia-push-sw.js','utf8'),{self:scope,URL});const tasks=[];
 listeners.push({data:{json:()=>({key:'a'.repeat(64),body:'PRIVATE HEALTH',url:'https://evil.test'})},waitUntil:p=>tasks.push(p)});assert.ok(tasks.length>0);await Promise.all(tasks);tasks.length=0;assert.equal(shown[0].title,'Camellia');assert.ok(!JSON.stringify(shown).includes('PRIVATE'));assert.equal(shown[0].opts.data.path,'/?open=discover');
 listeners.notificationclick({notification:{close(){}},waitUntil:p=>tasks.push(p)});assert.ok(tasks.length>0);await Promise.all(tasks);tasks.length=0;assert.deepEqual(opened,['https://camellia.example/?open=discover']);assert.equal(listeners.fetch,undefined,'no private offline cache');
 const dispatch=(await vite.ssrLoadModule('/lib/notifications/dispatch-handler.ts')).default;let status;await dispatch({method:'POST',headers:{},body:{uid:'FORGED'}},{setHeader(){},status(c){status=c;return{json(){}};}});assert.equal(status,401);
 console.log('PASS CommonJS SDK load + real encryption request construction, SSRF/key/shape refusal, VAPID matching, untrusted SW text ignored, fixed click URL, no cache, protected dispatcher. No network send or real permission.');
}finally{await vite.close();}
