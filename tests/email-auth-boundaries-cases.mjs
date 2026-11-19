import assert from 'node:assert/strict';
import {createServer} from 'vite';
let reads=0,verifications=0;
globalThis.__emailBoundaryDeps={auth:{verifyIdToken:async(_token,revoked)=>{assert.equal(revoked,true);verifications++;return {uid:'unverified-local',email_verified:false,firebase:{sign_in_provider:'password'}};}},db:{doc(){reads++;throw new Error('private storage must not be touched');}}};
const previousFlag=process.env.CAMELLIA_PLACE_ENABLED;process.env.CAMELLIA_PLACE_ENABLED='true';
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},plugins:[{name:'email-boundary-admin',enforce:'pre',resolveId(id){if(id.endsWith('/server/admin.js'))return '\0mail-guard-admin';},load(id){if(id==='\0mail-guard-admin')return 'export const SERVER_ROOT="camellia_admin/release_phase1";export const adminConfigured=()=>true;export const serverAdmin=()=>globalThis.__emailBoundaryDeps;';}}]});
try{
 for(const [path,method,query,body,expected=401] of [['place','GET',{saved:'1'},undefined],['place','GET',{operatorStatus:'1'},undefined],['share','POST',undefined,{operation:'list'}],['share','POST',undefined,{operation:'revokeAll'}],['notification-settings','DELETE'],['notification-settings','GET',{push:'1'},undefined,403],['notification-settings','DELETE',{push:'1'}]]){
  if(typeof path!=='string')throw new Error('Invalid local fixture');
  const {default:handler}=await server.ssrLoadModule(`/api/camellia/${path}.ts`);let status,answer;
  await handler({method,query,body,headers:{authorization:'Bearer LOCAL_ONLY'}},{setHeader(){},status(n){status=n;return {json(v){answer=v;}};}});
  assert.equal(status,expected,path);assert.equal(answer.error,'LOGIN_REQUIRED');assert.equal(reads,0,path+' refuses unverified email before private access or writes');
 }
 assert.equal(verifications,7);console.log('PASS unverified email cannot read saved Place/operator status/share list or write share revocation/notification stop; seven real request paths verify revocation then reject before private storage. Injected token verifier only.');
}finally{await server.close();delete globalThis.__emailBoundaryDeps;if(previousFlag===undefined)delete process.env.CAMELLIA_PLACE_ENABLED;else process.env.CAMELLIA_PLACE_ENABLED=previousFlag;}
