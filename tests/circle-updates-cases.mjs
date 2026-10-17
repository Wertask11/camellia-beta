import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false}});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<100;i++){if(check())return;await pause(10);}assert.fail('update condition did not complete');}
try{
 const {watchCircleUpdates}=await server.ssrLoadModule('/lib/circle/updates.ts');
 let active=true,version=1,current=1,reads=0,refreshes=0;
 const errors=[];
 const watcher=watchCircleUpdates({intervalMs:5,active:()=>active,currentVersion:()=>current,readVersion:async()=>{reads++;return version;},refresh:async()=>{refreshes++;current=version;},onError:e=>errors.push(e)});
 await until(()=>reads>=2);assert.equal(refreshes,0,'unchanged revision does not refetch the feed');
 version=2;await until(()=>refreshes===1);await until(()=>reads>=4);assert.equal(refreshes,1);
 active=false;await pause(20);const hiddenReads=reads;await pause(25);assert.equal(reads,hiddenReads,'hidden or pending views do not make requests');
 active=true;watcher.refresh();await until(()=>refreshes===2);watcher.stop();const stoppedReads=reads;await pause(25);assert.equal(reads,stoppedReads);assert.deepEqual(errors,[]);
 let resolveRead,lateRefresh=0;
 const delayed=watchCircleUpdates({intervalMs:5,active:()=>true,currentVersion:()=>0,readVersion:()=>new Promise(resolve=>{resolveRead=resolve;}),refresh:async()=>{lateRefresh++;},onError:()=>{}});
 delayed.refresh();await until(()=>Boolean(resolveRead));delayed.stop();resolveRead(1);await pause(20);assert.equal(lateRefresh,0,'navigating away discards an in-flight refresh');
 let attempts=0,recovered=0,failures=0,seen=0;
 const retry=watchCircleUpdates({intervalMs:5,active:()=>true,currentVersion:()=>seen,readVersion:async()=>1,refresh:async()=>{attempts++;if(attempts===1)throw new Error('temporary');seen=1;recovered++;},onError:()=>failures++});
 await until(()=>recovered===1);retry.stop();assert.equal(failures,1);assert.equal(attempts,2,'a failed refresh does not acknowledge unseen data');
 console.log('Circle refresh PASS: changed-only reads, foreground/pending pause, focus refresh, cancellation, retry without losing changes.');
}finally{await server.close();}
