import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {collection,doc,getDocs,setDoc,writeBatch} from 'firebase/firestore';
assert.match(process.env.FIRESTORE_EMULATOR_HOST??'',/^127\.0\.0\.1:8085$/,'Only the local demo emulator is allowed');
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},appType:'custom'});
const env=await initializeTestEnvironment({projectId:'demo-camellia',firestore:{host:'127.0.0.1',port:8085,rules:await readFile(new URL('./fixtures/schoolpark.firestore.rules',import.meta.url),'utf8')}});
try{
 const {mapCamelliaState}=await server.ssrLoadModule('/lib/schoolpark/map.ts');
 const {restoreArchive}=await server.ssrLoadModule('/lib/schoolpark/restore.ts');
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {guestCheckValue}=await server.ssrLoadModule('/lib/onboarding/guest-check.ts');
 const uid='check-first-qa-owner',other='check-first-qa-other',db=env.authenticatedContext(uid).firestore();
 const path=`camellia_users/${uid}`;
 const at=new Date().toISOString();
 const check=guestCheckValue({id:crypto.randomUUID(),mood:3,sleep:7,createdAt:at,updatedAt:at});
 assert.ok(check);
 assert.equal((await getDocs(collection(db,`${path}/imports`))).size,0,'guest preview has no formal archive');
 const state=emptyState();
 state.profile={...state.profile,name:'Synthetic QA',birthDate:'1995-01-01',womanSelfDeclared:true,agreedAt:at};state.onboardingComplete=true;
 state.checkins=[{...check,id:'old-synthetic-check',createdAt:'2026-10-29T00:00:00.000Z',updatedAt:'2026-10-29T00:00:00.000Z'},check];
 const mapped=mapCamelliaState(state);
 for(let attempt=0;attempt<2;attempt++){
  const batch=writeBatch(db);
  for(const item of mapped)batch.set(doc(db,item.path?`${path}/${item.path}`:path),item.data);
  await batch.commit();
 }
 const archive=await getDocs(collection(db,`${path}/imports`));
 const restored=restoreArchive(archive.docs.map(item=>item.data()),emptyState());
 assert.equal(restored.checkins.length,2,'existing Check retained alongside adopted Check');
 assert.equal(restored.checkins.filter(item=>item.id===check.id).length,1,'retry uses the same document id');
 assert.deepEqual(restored.checkins.find(item=>item.id===check.id),check,'original timestamp and values restored');
 const forbidden=doc(env.authenticatedContext(other).firestore(),`${path}/imports/checkin-${check.id}`);
 await assertFails(setDoc(forbidden,{content:JSON.stringify(check)}));
 await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),`${path}/imports/guest`),{content:JSON.stringify(check)}));
 assert.equal((await getDocs(collection(env.authenticatedContext(other).firestore(),`camellia_users/${other}/imports`))).size,0);
 console.log('Check-first Firestore PASS: no guest archive, owner save, retry idempotence, exact restore, existing records preserved, foreign/unauthenticated writes denied (local emulator only).');
}finally{await env.cleanup();await server.close();}
