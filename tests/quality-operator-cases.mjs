import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const n=await server.ssrLoadModule('/lib/notifications/preferences.ts'),a=await server.ssrLoadModule('/lib/server/ai-usage.ts');
 const value={requested:true,topics:['place'],frequency:'weekly',updatedAt:new Date().toISOString()};assert.ok(n.validNotificationPreferences(value));
 for(const patch of [{topics:[]},{topics:['place','place']},{topics:['private-check']},{frequency:'always'},{text:'PRIVATE'},{requested:'yes'}])assert.ok(!n.validNotificationPreferences({...value,...patch}));
 assert.equal(n.notificationCanSend(value),false);assert.deepEqual(n.safeNotificationPreview(),{title:'Camellia',body:'今日は、自分のために何する？選択肢を見にいく。'});
 const usage=a.usageObservation('gemini-test',{promptTokenCount:100,candidatesTokenCount:50,text:'PRIVATE'});assert.deepEqual(usage,{model:'gemini-test',inputTokens:100,outputTokens:50});assert.equal(a.usageObservation('arbitrary',{promptTokenCount:1,candidatesTokenCount:2}),undefined);assert.equal(a.usageObservation('gemini-test',{promptTokenCount:-1,candidatesTokenCount:2}),undefined);
 assert.equal(a.estimatedUsageYen(usage).status,'pricing_not_configured');assert.equal(a.estimatedUsageYen(usage,{approved:false}).status,'pricing_not_configured');
 const cost=a.estimatedUsageYen(usage,{approved:true,currency:'JPY',inputPerMillion:100,outputPerMillion:200,sourceUrl:'https://example.org/approved-price',checkedAt:'2026-11-10'});assert.equal(cost.amountYen,0.02);assert.equal(cost.invoiceVerified,false);
 console.log('PASS explicit notification topics/frequency/off, generic lock-screen copy, delivery stopped; numeric-only usage, invalid metadata, unconfigured prices and estimates distinguished from invoices.');
}finally{await server.close();}
