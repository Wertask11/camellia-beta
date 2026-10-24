/** Women only, by invite: the code from a link, the invite screen, the stopped screen, a member's invite and
 *  what reaches analytics. Local only: SchoolPark's backend is replaced by a fake fetch. No live-auth acceptance. */
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {createElement,act} from 'react';
import {fileURLToPath} from 'node:url';
const dom=new Window({url:'https://camellia-beta.vercel.app/?invite=k7qm-2xpa&utm_source=invite&utm_campaign=instagram_1027'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLDetailsElement','Event','MouseEvent','localStorage','sessionStorage','history','location'])globalThis[key]=key==='window'?dom:dom[key];
Object.defineProperty(globalThis,'navigator',{value:dom.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const root=fileURLToPath(new URL('..',import.meta.url));
// The real auth module talks to Firebase; only its API base and token header are needed here.
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',plugins:[{name:'fake-auth',enforce:'pre',resolveId(id){if(id.endsWith('/auth/camellia')||id.endsWith('./camellia'))return '\0fake-auth';},load(id){if(id==='\0fake-auth')return "export const CAMELLIA_AUTH_API='https://backend.test/api/camellia-auth';export async function authHeaders(){return {Authorization:'Bearer synthetic'};}";}}]});
const previousFetch=globalThis.fetch;let app;
const pause=()=>new Promise(r=>setTimeout(r,20));
try{
 const access=await server.ssrLoadModule('/lib/auth/access.ts');
 const {InviteScreen,SuspendedScreen}=await server.ssrLoadModule('/screens/InviteScreen.tsx');
 const {MemberInvite}=await server.ssrLoadModule('/components/MemberInvite.tsx');
 const analytics=await server.ssrLoadModule('/lib/analytics/posthog.ts');

 assert.equal(access.normalizeInviteCode('k7qm-2xpa'),'K7QM2XPA');
 assert.equal(access.normalizeInviteCode('K7QM 2XP0'),'','0 is never in a code');
 assert.equal(access.normalizeInviteCode('ABC'),'');
 access.captureInviteFromUrl();
 assert.equal(access.pendingInvite(),'K7QM2XPA');
 assert.equal(location.search,'?utm_source=invite&utm_campaign=instagram_1027','the code leaves the address bar; utm stays');
 access.captureInviteFromUrl();
 assert.equal(access.pendingInvite(),'K7QM2XPA','a second look does not lose it');
 console.log('PASS a link\'s code is kept until login and removed from the URL');

 const calls=[];let answer={status:404,body:{error:'INVITE_NOT_FOUND'}};
 globalThis.fetch=async(url,options={})=>{calls.push([typeof url==='string'?url:url.href,options.method??'GET',options.body?JSON.parse(options.body):undefined,options.headers]);return new Response(JSON.stringify(answer.body),{status:answer.status,headers:{'Content-Type':'application/json'}});};
 answer={status:200,body:{ok:true,inviteRequired:true,needsInvite:true,suspended:false,admitted:false}};
 assert.deepEqual(await access.fetchAccess(),{inviteRequired:true,needsInvite:true,suspended:false,admitted:false});
 assert.equal(calls.at(-1)[3].Authorization,'Bearer synthetic');
 answer={status:503,body:{error:'AUTH_UNAVAILABLE'}};
 assert.equal(await access.fetchAccess(),null,'unknown, not "blocked", when the server cannot answer');
 for(const [error,result] of [['INVITE_USED_UP','used_up'],['INVITE_EXPIRED','expired'],['RATE_LIMITED','rate_limited'],['SOMETHING','error']]){answer={status:410,body:{error}};assert.equal((await access.redeemInvite('K7QM2XPA')).result,result);}
 answer={status:200,body:{ok:true,already:false,kind:'operator',label:'instagram_1027'}};
 assert.deepEqual(await access.redeemInvite('K7QM2XPA'),{result:'accepted',kind:'operator',label:'instagram_1027'});
 assert.deepEqual(calls.at(-1).slice(0,3),['https://backend.test/api/camellia-auth/invite/redeem','POST',{code:'K7QM2XPA'}]);
 console.log('PASS access answers and invite results are read without guessing');

 const host=document.createElement('div');document.body.append(host);app=createRoot(host);
 const tracked=[];let accepted;
 const click=async(text)=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert.ok(button,text);await act(async()=>{button.click();await pause();});};
 // The native value setter, so React's controlled input sees the change.
 const type=async(value)=>{const input=host.querySelector('input');await act(async()=>{Reflect.set(dom.HTMLInputElement.prototype,'value',value,input);input.dispatchEvent(new dom.Event('input',{bubbles:true}));await pause();});};
 await act(async()=>{app.render(createElement(InviteScreen,{initialCode:'K7QM2XPA',initialResult:'used_up',onTrack:(name,p)=>tracked.push([name,p]),onLogout:()=>{},onAccepted:r=>{accepted=r;}}));await pause();});
 assert.equal(host.querySelector('input').value,'K7QM-2XPA','the link\'s code is filled in');
 assert.ok(host.textContent.includes('使える人数に達しています'),'why the link did not work');
 assert.ok(host.textContent.includes('18〜45歳の女性に限ったサービス'));
 assert.deepEqual(tracked[0],['invite_view',{from_link:true}]);
 await type('ZZZZ');await click('招待コードを使う');
 assert.ok(host.textContent.includes('招待コードは8文字です'));assert.deepEqual(tracked.at(-1),['invite_submit',{result:'invalid',from_link:false}]);
 answer={status:404,body:{error:'INVITE_NOT_FOUND'}};await type('mmmm-3333');await click('招待コードを使う');
 assert.ok(host.textContent.includes('見つかりませんでした'));assert.deepEqual(tracked.at(-1),['invite_submit',{result:'not_found',from_link:false}]);
 answer={status:200,body:{ok:true,already:false,kind:'member',label:''}};await click('招待コードを使う');
 assert.deepEqual(accepted,{result:'accepted',kind:'member',label:''});assert.deepEqual(tracked.at(-1),['invite_submit',{result:'accepted',from_link:false}]);
 console.log('PASS invite screen: prefilled from the link, explains each failure, lets her in on success');

 let loggedOut=false;
 await act(async()=>{app.render(createElement(SuspendedScreen,{onLogout:()=>{loggedOut=true;},onTrack:name=>tracked.push([name])}));await pause();});
 assert.ok(host.textContent.includes('このアカウントの利用を止めています'));assert.ok(host.textContent.includes('記録は消していません'));
 await click('ログアウトする');assert.equal(loggedOut,true);assert.deepEqual(tracked.at(-1),['access_suspended_view']);
 console.log('PASS a stopped account sees why, keeps her records, and can log out');

 let mine=null;
 globalThis.fetch=async(url,options={})=>{const href=typeof url==='string'?url:url.href;calls.push([href,options.method??'GET']);if(href.endsWith('/invite/mine')){if(options.method==='POST')mine={code:'Q4RT8WXY',uses:1,maxUses:3,url:'https://camellia-beta.vercel.app/?invite=Q4RT8WXY&utm_source=member_invite'};return Response.json({ok:true,invite:mine});}return Response.json({});};
 let shared;dom.navigator.share=async data=>{shared=data;};
 await act(async()=>{app.render(createElement(MemberInvite,{onTrack:(name,p)=>tracked.push([name,p])}));await pause();});
 const details=host.querySelector('details');await act(async()=>{details.open=true;details.dispatchEvent(new dom.Event('toggle'));await pause();});
 assert.ok(calls.some(c=>c[0].endsWith('/invite/mine')&&c[1]==='GET'),'opening only reads');assert.ok(!calls.some(c=>c[0].endsWith('/invite/mine')&&c[1]==='POST'));
 await click('招待コードを作る');
 assert.ok(host.textContent.includes('Q4RT-8WXY'));assert.ok(host.textContent.includes('あと2人招待できます'));
 await click('招待を送る');
 assert.equal(shared.text,'Camelliaに招待します 🌸https://camellia-beta.vercel.app/?invite=Q4RT8WXY&utm_source=member_invite');
 assert.deepEqual(tracked.slice(-2),[['member_invite_open',undefined],['member_invite_share',{share_method:'share'}]]);
 console.log('PASS a member creates one code on request and shares it');

 const state={profile:{id:'synthetic-device'},analyticsEvents:[]};
 const safe=analytics.sanitizeEventProperties({id:'e1',name:'invite_accepted',properties:{invite_kind:'operator',invite_channel:'instagram_1027',code:'K7QM2XPA',invite:'K7QM2XPA',utm_campaign:'instagram_1027'},createdAt:new Date().toISOString()},state);
 assert.equal(safe.invite_kind,'operator');assert.equal(safe.invite_channel,'instagram_1027');assert.equal(safe.utm_campaign,'instagram_1027');
 assert.ok(!JSON.stringify(safe).includes('K7QM2XPA'),'the code itself never reaches analytics');
 for(const bad of ['090-1234-5678','tel09012345678','https://x.test','Instagram 1027','山田さん'])assert.equal(analytics.sanitizeEventProperties({id:'e2',name:'invite_accepted',properties:{invite_kind:'operator',invite_channel:bad},createdAt:new Date().toISOString()},state).invite_channel,undefined,bad);
 const submit=analytics.sanitizeEventProperties({id:'e3',name:'invite_submit',properties:{result:'used_up',from_link:true},createdAt:new Date().toISOString()},state);
 assert.deepEqual([submit.result,submit.from_link],['used_up',true]);
 assert.equal(analytics.sanitizeEventProperties({id:'e4',name:'invite_submit',properties:{result:'K7QM2XPA'},createdAt:new Date().toISOString()},state).result,undefined);
 assert.equal(analytics.sanitizeEventProperties({id:'e5',name:'member_invite_share',properties:{share_method:'line'}},state).share_method,undefined);
 console.log('PASS analytics gets results and the operator\'s channel name, never a code or free text');
}finally{if(app)await act(async()=>app.unmount());globalThis.fetch=previousFetch;await server.close();await dom.happyDOM.abort();}
