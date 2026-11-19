import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const {checkoutConfiguration,stripeHostedUrl}=await vite.ssrLoadModule('/lib/billing/checkout.ts'),{billingDisclosure}=await vite.ssrLoadModule('/lib/billing/disclosure.ts');
 assert.equal(checkoutConfiguration(undefined,'test'),undefined);assert.equal(billingDisclosure({approved:true,secret:'NEVER RETURN'}),undefined);
 for(const url of ['javascript:alert(1)','https://checkout.stripe.com.evil.test/','https://user:secret@checkout.stripe.com/','https://checkout.stripe.com:444/','http://checkout.stripe.com/'])assert.throws(()=>stripeHostedUrl(url,'checkout'));
 assert.equal(stripeHostedUrl('https://checkout.stripe.com/c/pay/test','checkout'),'https://checkout.stripe.com/c/pay/test');
 assert.throws(()=>stripeHostedUrl('https://checkout.stripe.com/c/pay/test','portal'));
 const endpoint=(await vite.ssrLoadModule('/api/camellia/billing.ts')).default;
 let code;await endpoint({method:'POST',headers:{},body:{operation:'checkout',paid:true,uid:'FORGED'}},{setHeader(){},status(c){code=c;return{json(){}};}});assert.equal(code,503);
 console.log('PASS stopped Checkout rejects client paid/UID, seller/config validation and strict Stripe hosted URLs. No provider request.');
}finally{await vite.close();}
