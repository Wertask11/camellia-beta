import assert from'node:assert/strict';import{createServer}from'vite';import{initializeApp,deleteApp}from'firebase-admin/app';import{getFirestore}from'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8085');const app=initializeApp({projectId:'demo-camellia'},'member-free-limit'),db=getFirestore(app),vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
try{
 const{takeMemberFreeDaily}=await vite.ssrLoadModule('/lib/membership/ai-basic-limit.ts');
 const at=Date.parse('2026-11-19T14:59:59Z'),uid='member-free-limit-owner';await db.doc(`camellia_users/${uid}`).set({agreedAt:new Date(at).toISOString()});
 const values=await Promise.all(Array.from({length:35},()=>takeMemberFreeDaily(db,uid,at)));const admitted=values.filter(Boolean).length;assert.ok(admitted<=30);for(let i=admitted;i<30;i++)assert.equal(await takeMemberFreeDaily(db,uid,at),true);assert.equal(await takeMemberFreeDaily(db,uid,at),false);await assert.rejects(()=>takeMemberFreeDaily(db,uid,at,true),e=>e.code==='FREE_DAILY_LIMIT');
 assert.equal(await takeMemberFreeDaily(db,uid,at+1000),true,'daily boundary is JST midnight');
 await db.doc(`camellia_users/${uid}/admin/subscription`).set({plan:'plus',source:'client',expiresAt:new Date(at+86400000).toISOString()});assert.equal(await takeMemberFreeDaily(db,uid,at),false,'client plan cannot escape ceiling');
 await db.doc(`camellia_users/${uid}/admin/subscription`).set({plan:'plus',source:'operator_trial',status:'trialing',expiresAt:new Date(at+86400000).toISOString()});assert.equal(await takeMemberFreeDaily(db,uid,at),true,'existing Plus grants not assigned a new undecided ceiling');
 assert.equal(await takeMemberFreeDaily(db,uid,at+86400001),true,'expired Plus returns to Free on its new JST day');
 await db.doc(`camellia_users/${uid}`).update({personalDeleteInProgress:true});assert.equal(await takeMemberFreeDaily(db,uid,at),false);await db.doc(`camellia_users/${uid}`).delete();assert.equal(await takeMemberFreeDaily(db,uid,at),false);
 console.log('PASS registered Free atomic 30/day under concurrency, JST reset, forged plan denial, valid Plus preservation and deletion lock. Counter is per verified ID, not proof of one human; no provider calls.');
}finally{await vite.close();await db.terminate();await deleteApp(app);}
