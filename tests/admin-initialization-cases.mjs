/** Startup validation only: generated local RSA key, no real account or network calls. */
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createServer} from 'vite';
const original=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const server=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try {
 const {adminInitializationStatus}=await server.ssrLoadModule('/lib/server/admin.ts');
 delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;assert.equal(adminInitializationStatus(),'not_configured');
 process.env.FIREBASE_SERVICE_ACCOUNT_JSON='not json';assert.equal(adminInitializationStatus(),'invalid_json');
 process.env.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({project_id:'another-project'});assert.equal(adminInitializationStatus(),'wrong_project');
 process.env.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({project_id:'emusch-2a111',client_email:'test@emusch-2a111.iam.gserviceaccount.com',private_key:'not a PEM key'});assert.equal(adminInitializationStatus(),'invalid_credential');
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const {parseServiceAccountJson,credentialInputFormat}=await server.ssrLoadModule('/lib/server/credential-json.js');
 const account={project_id:'emusch-2a111',client_email:'test@emusch-2a111.iam.gserviceaccount.com',private_key:privateKey};
 const json=JSON.stringify(account,null,2);
 for(const input of [json,'\uFEFF'+json,JSON.stringify(json),"'"+json+"'",'```json\n'+json+'\n```','FIREBASE_SERVICE_ACCOUNT_JSON='+json,json.replace(/\\n/g,'\n')])assert.deepEqual(parseServiceAccountJson(input),account,'transport normalization must preserve exact credential identity');
 for(const input of ['null','[]',privateKey,'test.json','const account = '+json,json.slice(0,-1),JSON.stringify(JSON.stringify(json))])assert.throws(()=>parseServiceAccountJson(input),error=>error instanceof SyntaxError&&error.message==='INVALID_SERVICE_ACCOUNT_JSON','malformed/non-object/code input must fail without quoting credential text');
 for(const [input,format] of [[privateKey,'private_key_only'],['downloaded-unit-only.json','file_name'],['not json','other_text'],['{broken','object_like']])assert.equal(credentialInputFormat(input),format);
 process.env.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({project_id:'emusch-2a111',client_email:'test@emusch-2a111.iam.gserviceaccount.com',private_key:privateKey});assert.equal(adminInitializationStatus(),'initialized');
 const {getApps,deleteApp}=await import('firebase-admin/app');for(const app of getApps())if(app.name==='camellia-phase1')await deleteApp(app);
 console.log('Admin startup diagnoses local format/project/key failures and initializes real SDKs with synthetic key; no auth or Firestore requests.');
} finally {if(original===undefined)delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;else process.env.FIREBASE_SERVICE_ACCOUNT_JSON=original;await server.close();}
