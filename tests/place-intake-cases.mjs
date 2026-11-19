import assert from'node:assert/strict';import{createServer}from'vite';
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const{applicationFields,applicationIntakeReady}=await vite.ssrLoadModule('/lib/place/applications.ts');
 const fields={name:'LOCAL TEST CAFE',category:'カフェ',region:'福岡',area:'テスト地区',address:'LOCAL TEST ADDRESS',officialUrl:'https://example.test/cafe',experience:'LOCAL TEST EXPERIENCE',contactName:'PRIVATE CONTACT',contactEmail:'private@example.test',notes:'PRIVATE NOTE',consent:true};
 assert.equal(applicationFields(fields).contactEmail,fields.contactEmail);assert.equal(await applicationIntakeReady({},{}),false);
 for(const patch of [{consent:false},{uid:'FORGED'},{status:'published'},{memory:'PRIVATE'},{category:'unknown'},{officialUrl:'javascript:alert(1)'},{officialUrl:'https://example.test/callback?code=PRIVATE'},{contactEmail:'invalid'}])assert.throws(()=>applicationFields({...fields,...patch}));
 const api=(await vite.ssrLoadModule('/lib/place/application-handler.ts')).default;let code,body;
 await api({method:'GET',query:{status:'1'},headers:{}},{setHeader(){},status(n){code=n;return{json(v){body=v;}};}});assert.equal(code,200);assert.equal(body.enabled,false);
 console.log('PASS explicit consent, business-only payload, private contact shape, URL hygiene and stopped public intake. No submission or listing created.');
}finally{await vite.close();}
