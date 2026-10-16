/** API bootstrap regression; no live credentials, identity or provider requests. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const saved={...process.env};
let server;
const invoke=async(handler,method)=>{let status,body;await handler({method,headers:{},body:{message:'unit bootstrap'}},{setHeader(){},status(code){status=code;return{json(value){body=value;}}}});return{status,body};};
try{
 delete process.env.GEMINI_API_KEY;process.env.CAMELLIA_GEMINI_CHAT_ENABLED='false';delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
 const {default:handler}=await server.ssrLoadModule('/api/camellia/chat.ts');
 assert.equal((await invoke(handler,'GET')).body.enabled,false);console.log('PASS status without optional configuration');
 assert.equal((await invoke(handler,'POST')).status,503);console.log('PASS disabled POST fails closed');
 process.env.GEMINI_API_KEY='unit-only-not-real';process.env.CAMELLIA_GEMINI_CHAT_ENABLED='true';process.env.VERCEL_ENV='preview';
 assert.equal((await invoke(handler,'GET')).body.enabled,true);console.log('PASS enabled status');
 assert.equal((await invoke(handler,'POST')).status,401);console.log('PASS real runtime loads; anonymous request rejected');
 await server.close();
 server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',plugins:[{name:'unit-broken-runtime',enforce:'pre',resolveId(id){if(id.includes('gemini-runtime'))return '\0broken-runtime';},load(id){if(id==='\0broken-runtime')return 'throw Object.assign(new Error("unit only"),{code:"ERR_MODULE_NOT_FOUND"});';}}]});
 const {default:broken}=await server.ssrLoadModule('/api/camellia/chat.ts');
 assert.equal((await invoke(broken,'GET')).status,200);const result=await invoke(broken,'POST');assert.equal(result.status,503);assert.equal(result.body.category,'provider_error');assert.ok(!JSON.stringify(result.body).includes('unit only'));console.log('PASS missing runtime cannot break status or expose exception');
}finally{await server?.close();for(const key of ['GEMINI_API_KEY','CAMELLIA_GEMINI_CHAT_ENABLED','FIREBASE_SERVICE_ACCOUNT_JSON','VERCEL_ENV']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
