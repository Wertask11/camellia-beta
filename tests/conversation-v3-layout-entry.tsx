import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ConversationWorkspace} from '@/screens/ConversationWorkspace';
import {BottomNav} from '@/components/BottomNav';
import {ActionSheet} from '@/components/ActionSheet';
import {useCamelliaStore,emptyState,STORAGE_KEY} from '@/hooks/useCamelliaStore';
import type {ActionDefinition,CamelliaState} from '@/types';
import '@/app/globals.css';

type Call={modelId:string;message:string;history:unknown[]};
const fixture={calls:[] as Call[],state:undefined as CamelliaState|undefined,failNext:false};
(globalThis as typeof globalThis&{v3Fixture:typeof fixture}).v3Fixture=fixture;
const noop=()=>{};
if(!localStorage.getItem(STORAGE_KEY)){
 const state=emptyState(),now=new Date().toISOString();state.profile.name='UI fixture';
 state.aiConversations=Array.from({length:36},(_,index)=>({id:`legacy-${index}`,createdAt:now,updatedAt:now,messages:[{id:`old-u-${index}`,role:'user' as const,text:`以前の会話${index}`,createdAt:now},{id:`old-a-${index}`,role:'assistant' as const,text:`以前の返答${index}`,provider:'gemini' as const,createdAt:now}]}));
 state.aiConversations.push({id:'long-history',createdAt:now,updatedAt:now,messages:Array.from({length:80},(_,index)=>({id:`long-${index}`,role:index%2?'assistant':'user',text:index===0?'長い記録を振り返る':index%2?'以前の返答です。':'以前の相談です。',createdAt:now,...(index%2?{provider:'gemini' as const}:{})}))});
 localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
globalThis.fetch=(async(input,init)=>{
 if(input!=='/api/camellia/chat')throw new Error('Fixture forbids non-chat network requests');
 if(init?.method==='GET')return Response.json({enabled:true});
 if(typeof init?.body!=='string')throw new Error('Fixture expects a JSON string body');
 const body=JSON.parse(init.body) as Call;fixture.calls.push(body);
 if(fixture.failNext){fixture.failNext=false;return Response.json({category:'provider_error'},{status:502});}
 return Response.json({reply:body.modelId==='yura'?'まだ言葉にしきれないところがあるんだね。今いちばん引っかかっているのは、どの辺？':'今日決めることと、後で考えてもよいことに分けてみよう。今決めたいのはどちら？',provider:'gemini',modelId:body.modelId,responseTimeMs:1,...(body.message.includes('何かしたい')?{actionId:'breathing'}:{})});
}) as typeof fetch;

function Fixture(){
 const store=useCamelliaStore();const [action,setAction]=useState<ActionDefinition>();
 useEffect(()=>{fixture.state=store.state;},[store.state]);
 return <div className="app-shell"><span style={{position:'fixed',right:4,top:2,fontSize:9,color:'#71616a',pointerEvents:'none'}}>LOCAL SYNTHETIC UI ONLY</span>{store.ready&&<ConversationWorkspace state={store.state} recommendations={[]} onSaveConversation={store.addConversation} onReplaceConversationAssistant={store.replaceConversationAssistant} onSelectConversationModel={store.selectConversationModel} onRemember={store.remember} onTrack={store.track} onClearTreeContext={noop} onOpenAction={r=>setAction(r.action)} onNavigate={noop} onTree={noop}/>}<BottomNav active="camellia" onChange={noop}/>{action&&<ActionSheet action={action} onClose={()=>setAction(undefined)} onStart={()=>setAction(undefined)} onSave={()=>setAction(undefined)} onSkip={()=>setAction(undefined)} onDone={()=>setAction(undefined)}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
