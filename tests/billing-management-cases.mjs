import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Window} from 'happy-dom';
const dom=new Window({url:'https://camellia.test/?open=billing'});
for(const k of ['window','document','navigator','location','localStorage','sessionStorage'])Object.defineProperty(globalThis,k,{value:k==='window'?dom:dom[k],configurable:true});
const vite=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const {billingIntent,armBillingLogin,clearBillingLogin}=await vite.ssrLoadModule('/lib/billing/intent.ts'),{billingHistory}=await vite.ssrLoadModule('/lib/billing/client.ts');
 const now=Date.now(),callback=new URL('https://camellia.test/?code=LOCAL&state=LOCAL');
 assert.equal(billingIntent(new URL('https://camellia.test/?open=billing'),localStorage,now),true);
 assert.equal(billingIntent(callback,localStorage,now),false);armBillingLogin();assert.equal(billingIntent(callback,localStorage,Date.now()),true);
 assert.equal(billingIntent(callback,localStorage,now+11*60000),false);assert.equal(billingIntent(callback,localStorage,now-60000),false);assert.equal(billingIntent(new URL('https://camellia.test/'),localStorage,now),false);clearBillingLogin();assert.equal(billingIntent(callback,localStorage,now),false);
 const invoices=[{status:'paid',amountPaidYen:500,createdAt:'2026-11-19T00:00:00Z',email:'PRIVATE',customer:'PRIVATE'}];assert.deepEqual(billingHistory({invoices,more:false}),{invoices:[{status:'paid',amountPaidYen:500,createdAt:invoices[0].createdAt}],more:false});
 for(const v of [{invoices},{invoices:'not-array',more:false},{invoices:Array(13).fill(invoices[0]),more:false},{invoices:[{...invoices[0],amountPaidYen:-1}],more:false},{invoices:[{...invoices[0],createdAt:'invalid'}],more:false},{invoices:[{...invoices[0],status:'CLIENT_PAID'}],more:false}])assert.throws(()=>billingHistory(v));
 console.log('PASS management navigation hint TTL/callback scoping, no authorization in query, invoice allowlist/projection and malformed history rejection. Local only.');
}finally{await vite.close();await dom.happyDOM.close();}
