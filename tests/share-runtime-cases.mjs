import assert from 'node:assert/strict';import{createServer}from'vite';
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const{sharingConfiguration}=await vite.ssrLoadModule('/lib/partner/config.ts');const{membershipFromResponse}=await vite.ssrLoadModule('/lib/membership/model.ts');
 const cfg={version:'partner_v1',approved:true,enabled:true,privacyReviewed:true,entitlementsReviewed:true,approvedBy:'LOCAL OPERATOR',approvedAt:new Date().toISOString()};
 assert.equal(sharingConfiguration(cfg,{}),false);assert.equal(sharingConfiguration(undefined,{CAMELLIA_PARTNER_SHARING_ENABLED:'true'}),false);assert.equal(sharingConfiguration(cfg,{CAMELLIA_PARTNER_SHARING_ENABLED:'true'}),true);
 for(const field of ['approved','enabled','privacyReviewed','entitlementsReviewed'])assert.equal(sharingConfiguration({...cfg,[field]:false},{CAMELLIA_PARTNER_SHARING_ENABLED:'true'}),false);
 const paid={plan:'plus',paid:true,trial:false,expiresAt:new Date(Date.now()+3600000).toISOString(),priceYen:500,sharingReady:true};assert.equal(membershipFromResponse(paid).sharingReady,false,'legacy unversioned hint remains stopped');assert.equal(membershipFromResponse({...paid,capabilitiesVersion:'partner_v1'}).sharingReady,true);
 console.log('PASS independent server/operator sharing approvals and versioned capability parsing; no URL, entitlement or flag is created.');
}finally{await vite.close();}
