import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TreeScreen} from '@/screens/TreeScreen';
import {MyScreen} from '@/screens/MyScreen';
import {emptyState} from '@/hooks/useCamelliaStore';
import type {TreeLeaf} from '@/types';
import '@/app/globals.css';
const noop=()=>{};
const fixtureNow=Date.now();
function Layout(){
 const [view,setView]=useState('my'),[leaves,setLeaves]=useState<TreeLeaf[]>([{id:'fixture-leaf',name:'画面検証の葉',category:'friend',meaningTags:['calming'],note:'ローカル画面用の記録',status:'active',reflections:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]);
 const state=emptyState();state.treeLeaves=leaves;state.checkins=[0,1,2,3,4].map(d=>({id:String(d),mood:3,sleep:d===0?7:5,createdAt:new Date(fixtureNow-d*86400000).toISOString(),updatedAt:new Date().toISOString()}));
 return <div className="app-shell"><aside>Local component fixture · no auth/sync acceptance</aside>{view==='my'?<MyScreen state={state} devNight={false} onEditProfile={noop} onForget={noop} onReset={noop} onInsight={noop} onPrivacy={noop} onTree={()=>setView('tree')} onDevNight={noop}/>:<TreeScreen leaves={leaves} onBack={()=>setView('my')} onAdd={noop} onUpdate={noop} onRemove={id=>setLeaves(items=>items.filter(i=>i.id!==id))} onTrack={noop} onTalk={noop} onReflect={(id,text)=>setLeaves(items=>items.map(leaf=>leaf.id===id?{...leaf,reflections:[...leaf.reflections,{id:'reflection-fixture',text,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]}:leaf))}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<Layout/>);
