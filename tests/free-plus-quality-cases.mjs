import assert from 'node:assert/strict';
import {createServer} from 'vite';
let user=null,calls=0,resolve;
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},plugins:[{name:'local-membership',enforce:'pre',resolveId(id){if(id.endsWith('/schoolpark/firebase'))return '\0free-membership';},load(id){if(id==='\0free-membership')return 'export const schoolParkAuth=globalThis.__localMemberAuth;';}}]});
const auth={get currentUser(){return user;}};globalThis.__localMemberAuth=auth;
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{calls++;return new Promise(r=>{resolve=r;});};
try{
 const {membershipFromResponse}=await server.ssrLoadModule('/lib/membership/model.ts'),{requestMembership}=await server.ssrLoadModule('/lib/membership/client.ts');
 const now=Date.now(),expiresAt=new Date(now+86400000).toISOString(),free={plan:'free',paid:false,trial:false,priceYen:500};
 assert.deepEqual(await requestMembership(),{...free,checkoutReady:false,sharingReady:false});assert.equal(calls,0,'unregistered Free never needs an auth request to learn its plan');
 for(const value of [{plan:'plus',paid:false,trial:false,priceYen:500,expiresAt},{plan:'plus',paid:true,trial:true,priceYen:500,expiresAt},{plan:'plus',paid:true,trial:false,priceYen:100,expiresAt},{plan:'plus',paid:true,trial:false,priceYen:500,expiresAt:new Date(now-1).toISOString()},{...free,trial:true}])assert.throws(()=>membershipFromResponse(value,now));
 for(const rights of [{paid:true,trial:false},{paid:false,trial:true}]){const parsed=membershipFromResponse({plan:'plus',priceYen:500,expiresAt,...rights,checkoutReady:true,sharingReady:true},now);assert.equal(parsed.plan,'plus');assert.equal(parsed.checkoutReady,true);assert.equal(parsed.sharingReady,true);assert.equal(parsed.expiresAt,expiresAt);}
 user={uid:'A',getIdToken:async()=>'LOCAL'};const pending=requestMembership();await new Promise(r=>setTimeout(r,0));user={uid:'B'};resolve({ok:true,json:async()=>({plan:'plus',priceYen:500,paid:true,trial:false,expiresAt})});await assert.rejects(pending);
 const {placeMatchReasons}=await server.ssrLoadModule('/lib/place/recommendation.ts'),{PLACE_DEMO_DATA}=await server.ssrLoadModule('/data/place-demo.ts');const place=PLACE_DEMO_DATA[0],intents=['quiet','rest','try','move','together'];const matches=placeMatchReasons(place,intents);assert.equal(matches.length,Math.min(3,place.recommendedFor.filter(x=>intents.includes(x)).length));assert.deepEqual(placeMatchReasons(place,['diagnosis','PRIVATE']),[]);assert.ok(!JSON.stringify(matches).includes('PRIVATE'));
 console.log('PASS registration-free plan without network, paid/trial validation and expiry, fixed 500 JPY, stopped checkout/share, stale-UID response refusal, public-catalog-only match reasons. No payment or real store claim.');
}finally{globalThis.fetch=originalFetch;delete globalThis.__localMemberAuth;await server.close();}
