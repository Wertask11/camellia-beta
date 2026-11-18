import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Window} from 'happy-dom';
const dom=new Window({url:'https://local.test/'});
for(const key of ['window','document','navigator','location','localStorage','sessionStorage'])Object.defineProperty(globalThis,key,{value:key==='window'?dom:dom[key],configurable:true});
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false}});
try{
 const free=await server.ssrLoadModule('/lib/free/access.ts'),store=await server.ssrLoadModule('/hooks/useCamelliaStore.ts'),backup=await server.ssrLoadModule('/lib/storage/backup.ts');
 const now=Date.parse('2026-11-16T14:59:00Z'),headers={origin:'https://local.test',host:'local.test','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.1'};
 free.requireFreeOrigin(headers);assert.throws(()=>free.requireFreeOrigin({...headers,origin:'https://attacker.test'}));assert.throws(()=>free.requireFreeOrigin({...headers,'content-type':'text/plain'}));assert.throws(()=>free.freeNetwork({...headers,'x-vercel-forwarded-for':undefined,'x-forwarded-for':'192.0.2.1'}));
 const first=free.freeIdentity(headers,'LOCAL_FIXTURE_SECRET',now);assert.match(first.cookie,/Secure; HttpOnly; SameSite=Strict/);assert.ok(!first.cookie.includes('192.0.2.1'));assert.equal(free.FREE_DAILY_LIMIT,30);
 const cookie=first.cookie.split(';')[0],again=free.freeIdentity({...headers,cookie},'LOCAL_FIXTURE_SECRET',now);assert.equal(again.uid,first.uid);assert.equal(again.cookie,undefined);
 const forged=free.freeIdentity({...headers,cookie:cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a')},'LOCAL_FIXTURE_SECRET',now);assert.notEqual(forged.uid,first.uid);assert.equal(forged.networkKey,first.networkKey,'cookie deletion cannot reset network daily cap');
 assert.notEqual(free.freeIdentity({...headers,cookie},'LOCAL_FIXTURE_SECRET',now+120000).uid,first.uid,'JST next date renews the capability');assert.equal(free.freeDay(now),'2026-11-16');assert.equal(free.freeDayEnd(now),Date.parse('2026-11-16T15:00:00Z'));
 const account=store.emptyState();account.profile.name='PRIVATE_ACCOUNT';localStorage.setItem(store.STORAGE_KEY,JSON.stringify(account));const original=localStorage.getItem(store.STORAGE_KEY);
 const local=store.load(store.FREE_STORAGE_KEY);assert.notEqual(local.profile.id,account.profile.id);assert.equal(local.profile.name,'');localStorage.setItem(store.FREE_STORAGE_KEY,JSON.stringify(local));backup.preserveBeforeRestore(local,store.FREE_STORAGE_KEY);assert.equal(localStorage.getItem(store.STORAGE_KEY),original);assert.throws(()=>backup.mergePersonalBackup(local,account),/BACKUP_OWNER_MISMATCH/);
 const localDb=code=>({collection:()=>({doc:()=>({})}),runTransaction:async()=>{throw Object.assign(new Error('local quota storage'),{code});}});assert.equal(await free.takeFreeDaily(localDb(10),{uid:'local',networkKey:'local'},crypto.randomUUID(),now),false,'contention cannot dispatch generation');await assert.rejects(()=>free.takeFreeDaily(localDb(7),{uid:'local',networkKey:'local'},crypto.randomUUID(),now),e=>e.code===7,'permission failures are not hidden as quota');
 const fortune=await server.ssrLoadModule('/lib/fortune/reflection.ts');fortune.saveFortuneReflection(local.profile.id,'2026-11-17','yes');fortune.saveFortuneReflection(account.profile.id,'2026-11-17','no');fortune.clearFortuneReflections(local.profile.id);assert.equal(fortune.readFortuneReflection(local.profile.id,'2026-11-17'),undefined);assert.equal(fortune.readFortuneReflection(account.profile.id,'2026-11-17'),'no');
 console.log('PASS signed daily HttpOnly capability, same-origin/forged-IP denial, JST reset, 30 owner limit, isolated local Free loading/backup and foreign-account rejection. No real provider or auth.');
}finally{await server.close();await dom.happyDOM.close();}
