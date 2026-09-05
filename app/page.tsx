/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- modal backdrop is pointer-dismissable; inner controls are buttons */
'use client';
import { useMemo, useState } from 'react';
import { ActionSheet } from '@/components/ActionSheet';
import { BottomNav, type MainTab } from '@/components/BottomNav';
import { ACTIONS } from '@/data/actions';
import { useCamelliaStore } from '@/hooks/useCamelliaStore';
import { recommend } from '@/lib/recommendation';
import { CamelliaScreen } from '@/screens/CamelliaScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { MyScreen } from '@/screens/MyScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { FortuneScreen } from '@/screens/FortuneScreen';
import { TreeScreen } from '@/screens/TreeScreen';
import { SecondaryScreen } from '@/screens/SecondaryScreen';
import { TodayScreen } from '@/screens/TodayScreen';
import type { Category, Recommendation } from '@/types';

export default function Page(){
 const store=useCamelliaStore(); const [tab,setTab]=useState<MainTab>('today'); const [category,setCategory]=useState<Category>(); const [chosen,setChosen]=useState<Recommendation>(); const [secondary,setSecondary]=useState<'circle'|'place'>(); const [talkMenu,setTalkMenu]=useState(false); const [privacy,setPrivacy]=useState(false); const [feature,setFeature]=useState<'fortune'|'tree'>(); const [devNight,setDevNight]=useState(false);
 const recommendationDate=useMemo(()=>{const value=new Date();if(devNight)value.setHours(21,0,0,0);return value},[devNight]); const recs=useMemo(()=>recommend(store.state,recommendationDate),[store.state,recommendationDate]);
 if(!store.ready)return <div className="loading">Camellia ✿</div>;
 if(!store.state.onboardingComplete)return <OnboardingScreen onFinish={p=>{store.updateProfile(p);store.completeOnboarding();setTab('today')}}/>;
 const openAction=(r:Recommendation)=>{if(r.action.destination){setSecondary(r.action.destination);return}setChosen(r)};
 const intent=(x:string)=>{if(x==='何もしない'){const a=ACTIONS.find(a=>a.id==='do-nothing');if(a)setChosen({action:a,score:0,reasons:['何もしないことも、今日の大切な休息だから']});return}const map:Record<string,Category>={整える:'BODY',楽しむ:'PLAY',学ぶ:'LEARN',休む:'REST'};setCategory(map[x]);setTab('discover')};
 if(secondary)return <div className="app-shell"><SecondaryScreen kind={secondary} onBack={()=>setSecondary(undefined)}/></div>;
 if(privacy)return <div className="app-shell"><span className="beta-badge">Camellia β</span><PrivacyScreen onBack={()=>setPrivacy(false)}/></div>;
 if(feature==='fortune')return <div className="app-shell"><span className="beta-badge">Camellia β</span><FortuneScreen state={store.state} recommendations={recs} onBack={()=>setFeature(undefined)} onSave={store.setFortune} onTrack={store.track} onAction={openAction}/>{chosen&&<ActionSheet action={chosen.action} onClose={()=>setChosen(undefined)} onStart={()=>{store.startAction(chosen.action);setChosen(undefined)}} onSave={timing=>{store.saveAction(chosen.action,timing);setChosen(undefined)}} onSkip={reason=>{store.skipAction(chosen.action,reason);setChosen(undefined)}}/>}</div>;
 if(feature==='tree')return <div className="app-shell"><span className="beta-badge">Camellia β</span><TreeScreen leaves={store.state.treeLeaves} onBack={()=>setFeature(undefined)} onAdd={store.addTreeLeaf} onUpdate={store.updateTreeLeaf} onReflect={store.addTreeReflection} onTrack={store.track}/></div>;
 return <div className="app-shell"><span className="beta-badge">Camellia β</span>
  {tab==='today'&&<TodayScreen state={store.state} recommendations={recs} forceNight={devNight} onCheckin={store.addCheckin} onOpenAction={openAction} onIntent={intent} onTalk={()=>setTalkMenu(true)} onFortune={()=>{store.track('fortune_open');setFeature('fortune')}} onTree={()=>{store.track('tree_open');setFeature('tree')}} onComplete={store.completeAction} onFeedback={store.addFeedback} onProposals={store.recordProposals}/>}
  {tab==='camellia'&&<CamelliaScreen state={store.state} recommendations={recs} onSaveConversation={store.addConversation} onOpenAction={openAction} onNavigate={x=>{if(x==='discover')setTab('discover');else setSecondary(x)}}/>}
  {tab==='discover'&&<DiscoverScreen state={store.state} category={category} onCategory={setCategory} onOpenAction={openAction} onOpenSecondary={setSecondary}/>} 
  {tab==='my'&&<MyScreen state={store.state} devNight={devNight} onProfile={store.updateProfile} onReset={store.reset} onInsight={store.feedbackInsight} onPrivacy={()=>setPrivacy(true)} onTree={()=>{store.track('tree_open');setFeature('tree')}} onDevNight={setDevNight}/>}<BottomNav active={tab} onChange={setTab}/>
  {chosen&&<ActionSheet action={chosen.action} onClose={()=>setChosen(undefined)} onStart={()=>{store.startAction(chosen.action);setChosen(undefined)}} onSave={timing=>{store.saveAction(chosen.action,timing);setChosen(undefined)}} onSkip={reason=>{store.skipAction(chosen.action,reason);setChosen(undefined)}}/>}
  {talkMenu&&<div className="modal-backdrop" onClick={()=>setTalkMenu(false)}><section className="sheet compact" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setTalkMenu(false)}>×</button><p className="eyebrow">話す</p><h2>誰と話しますか？</h2><button className="primary" onClick={()=>{setTab('camellia');setTalkMenu(false)}}>AI Camelliaと話す</button><button className="secondary-button" onClick={()=>{setSecondary('circle');setTalkMenu(false)}}>Circleを見る</button></section></div>}
 </div>
}
