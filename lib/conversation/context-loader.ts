import {getTodayJstDate,normalizeMoodForPrompt} from './gemini-server.js';
import {safeTodayContext} from './today-server.js';
type Snapshot={data:()=>Record<string,unknown>|undefined};
type ContextDb={doc:(path:string)=>unknown;getAll:(...refs:unknown[])=>Promise<Snapshot[]>};
/** Per-request only: two minimal documents, one RPC, no cache of consent or personal context. */
export async function loadConversationContext(uid:string,db:ContextDb,timeoutMs=1500){
  let timer:ReturnType<typeof setTimeout>|undefined;
  const date=getTodayJstDate();
  try{
    return await Promise.race([
      db.getAll(db.doc(`camellia_users/${uid}/daily/${date}`),db.doc(`camellia_users/${uid}/daily_context/${date}`),{fieldMask:['mood','stage','actionId']}).then(([daily,context])=>{
        const check=daily?.data(),selected=context?.data();
        return {mood:normalizeMoodForPrompt(check?.mood),context:safeTodayContext({stage:selected?.stage,actionId:selected?.actionId})};
      }),
      new Promise<{mood?:string;context:string}>(resolve=>{timer=setTimeout(()=>resolve({context:''}),timeoutMs);}),
    ]);
  }catch{return {context:''};}finally{if(timer)clearTimeout(timer);}
}
