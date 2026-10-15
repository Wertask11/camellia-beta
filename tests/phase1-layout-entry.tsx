/* oxlint-disable next/no-img-element -- isolated local component layout fixture */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TodayScreen} from '@/screens/TodayScreen';
import {DiscoverScreen} from '@/screens/DiscoverScreen';
import {ActionSheet} from '@/components/ActionSheet';
import {emptyState} from '@/hooks/useCamelliaStore';
import type {ActionDefinition,Category} from '@/types';
import '@/app/globals.css';
const noop=()=>{};
function Layout(){
 const [view,setView]=useState('today'),[category,setCategory]=useState<Category>(),[action,setAction]=useState<ActionDefinition>();
 const state=emptyState();const now=new Date();
 state.checkins=[0,-1,-2].map((offset)=>({id:String(offset),createdAt:new Date(+now+offset*86400000-60000).toISOString(),updatedAt:now.toISOString(),mood:offset===0?4:3,sleep:7,stress:'普通'}));
 return <div className="app-shell"><aside aria-label="Layout fixture">Component layout fixture · API / Auth acceptance excluded</aside><nav><button onClick={()=>setView('today')}>Today fixture</button><button onClick={()=>setView('discover')}>Discover fixture</button></nav>{view==='today'?<TodayScreen state={state} recommendations={[]} onCheckView={noop} onCheckStart={noop} onCheckin={noop} onOpenAction={r=>setAction(r.action)} onChoose={r=>setAction(r.action)} onIntent={noop} onTalk={noop} onFortune={noop} onTree={noop} onComplete={noop} onFeedback={noop} onProposals={noop} onTrack={noop}/>:<DiscoverScreen state={state} category={category} onCategory={setCategory} onOpenAction={r=>setAction(r.action)} onOpenSecondary={noop}/>}{action&&<ActionSheet action={action} onClose={()=>setAction(undefined)} onStart={()=>setAction(undefined)} onSave={()=>setAction(undefined)} onSkip={()=>setAction(undefined)} onDone={()=>setAction(undefined)}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<Layout/>);
