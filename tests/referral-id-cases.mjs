import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createServer}from'vite';
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const {referralEmailKey,verifiedReferralIdentity}=await vite.ssrLoadModule('/lib/referral/identity.ts');const{referralDeploymentReady}=await vite.ssrLoadModule('/lib/referral/config.ts');
 const email='FixtureOnly@example.test',key='ab'.repeat(32);
 assert.equal(referralEmailKey(email,''),undefined);assert.equal(referralEmailKey(email,'short'),undefined);assert.equal(referralEmailKey(email,key),referralEmailKey(' fixtureonly@EXAMPLE.test ',key));assert.notEqual(referralEmailKey(email,key),createHash('sha256').update(email.toLowerCase()).digest('hex'));assert.notEqual(referralEmailKey(email,key),referralEmailKey(email,'cd'.repeat(32)));
 assert.equal(referralDeploymentReady({CAMELLIA_REFERRAL_ENABLED:'true',CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY:key}),true);assert.equal(referralDeploymentReady({CAMELLIA_REFERRAL_ENABLED:'false',CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY:key}),false);
 const db={collection:()=>({where:()=>({limit:()=>({get:async()=>({size:0,docs:[]})})})})};
 const account={disabled:false,metadata:{creationTime:new Date().toISOString()},providerData:[],email,emailVerified:true};const auth={getUser:async()=>account};
 process.env.CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY=key;
 const id=await verifiedReferralIdentity(db,auth,'email-fixture');assert.equal(id.keys.length,2);assert.ok(!JSON.stringify(id).toLowerCase().includes(email.toLowerCase()));
 account.emailVerified=false;await assert.rejects(()=>verifiedReferralIdentity(db,auth,'email-fixture'),/IDENTITY_REVIEW_REQUIRED/);account.emailVerified=true;account.providerData=[{providerId:'google.com',uid:'GOOGLE-SUBJECT'}];const google=await verifiedReferralIdentity(db,auth,'different-google-fixture');assert.ok(google.keys.includes(referralEmailKey(email,key)),'same verified email deduplicates provider signup without account merging');
 delete process.env.CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY;account.providerData=[{providerId:'google.com',uid:'GOOGLE-SUBJECT'}];assert.ok((await verifiedReferralIdentity(db,auth,'old-google-fixture')).keys.length>=2,'existing provider identity is preserved independently of new HMAC setup');
 console.log('PASS verified-email HMAC only, normalization, missing/rotated key, unverified refusal, provider email dedup without account merging, existing Google preserved. Fixture identity only.');
}finally{delete process.env.CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY;await vite.close();}
