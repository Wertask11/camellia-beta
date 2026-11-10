'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {currentAnalyticsSession} from '@/lib/analytics/session';
import {emptyState} from '@/hooks/useCamelliaStore';
import {createGuestExploration,updateGuestJourney,type GuestDraft} from '@/lib/onboarding/guest-check';
import {actionPlaceIntent,type PlaceIntent} from '@/lib/place/recommendation';
import {recommend} from '@/lib/recommendation';
import {ACTIONS} from '@/data/actions';
import {PLACE_DEMO_DATA} from '@/data/place-demo';
import {LIVE_DESTINATIONS} from '@/lib/features';
import {TodayScreen} from './TodayScreen';
import {DiscoverScreen} from './DiscoverScreen';
import {CamelliaScreen} from './CamelliaScreen';
import {PlaceScreen} from './PlaceScreen';
import {BottomNav,type MainTab} from '@/components/BottomNav';
import {ActionSheet} from '@/components/ActionSheet';
import {PartnerShareDialog,type ShareDraft} from '@/components/PartnerShareDialog';
import {PlusOffer} from '@/components/PlusOffer';
import type {ActionDefinition,AIConversation,AnalyticsEventName,Category,ConversationModelId,Recommendation,SaveTiming} from '@/types';
type Props={draft?:GuestDraft;savePrompt:ReactNode;onCheckin:Parameters<typeof TodayScreen>[0]['onCheckin'];onCheckView:()=>void;onCheckStart:()=>void;onTrack:(name:AnalyticsEventName,props?:Record<string,string|number|boolean>)=>void};
const noop=()=>{};
export function GuestExperience({draft,savePrompt,onCheckin,onCheckView,onCheckStart,onTrack}:Props){
 const [tab,setTab]=useState<MainTab>(()=>draft?.shown.includes('prompt')?'my':'today');
 const [showSave,setShowSave]=useState(()=>Boolean(draft?.shown.includes('prompt')));
 const [placeIntent,setPlaceIntent]=useState<PlaceIntent>();
 const [place,setPlace]=useState(false),[category,setCategory]=useState<Category>(),[chosen,setChosen]=useState<Recommendation>();
 const [conversations,setConversations]=useState<AIConversation[]>([]),[model,setModel]=useState<ConversationModelId>('yura');
 const [reason,setReason]=useState('');
 const [choiceSource,setChoiceSource]=useState<'discover'|'melly'|'today'>('discover');
 const [shareDraft,setShareDraft]=useState<ShareDraft>(),[offer,setOffer]=useState(false);
 const state=useMemo(()=>({...emptyState(),profile:{...emptyState().profile,id:draft?.check?.id??'guest'},checkins:draft?.check?[draft.check]:[],actions:draft?.actions??[],savedActions:draft?.savedActions??[],placeChoices:draft?.placeChoices??[],aiConversations:conversations}),[draft,conversations]);
 const recs=useMemo(()=>recommend(state,new Date()),[state]);
 useEffect(()=>{if(tab==='my')onTrack('my_view');if(tab==='my'&&showSave)onTrack('save_prompt_view');},[tab,showSave,onTrack]);
 const openPlaces=(intent?:PlaceIntent)=>{setPlaceIntent(intent);setPlace(true);};
 const navigate=(next:MainTab)=>{setPlace(false);setTab(next);const url=new URL(location.href);if(['place','place-demo'].includes(url.searchParams.get('open')??'')){url.searchParams.delete('open');url.searchParams.delete('place');history.replaceState({},'',url.pathname+url.search);}};
 const retain=()=>{setReason('');setShowSave(true);navigate('my');};
 const open=(item:Recommendation,source:'discover'|'melly'|'today'='discover')=>{setChoiceSource(source);if(item.action.opens==='camellia'){navigate('camellia');return;}setChosen(item);};
 const select=(action:ActionDefinition,completed=false)=>{
  if(!draft)createGuestExploration(currentAnalyticsSession());if(choiceSource==='discover')onTrack('discover_action_selected',{actionId:action.id});const at=new Date().toISOString();
  updateGuestJourney({actions:[...(draft?.actions??[]),{id:crypto.randomUUID(),actionId:action.id,title:action.title,category:action.category,status:completed?'completed':'started',startedAt:at,...(completed?{completedAt:at}:{}),createdAt:at,updatedAt:at}]});
  setChosen(undefined);navigate('my');
 };
 const later=(timing:SaveTiming)=>{if(!chosen)return;if(!draft)createGuestExploration(currentAnalyticsSession());if(choiceSource==='discover')onTrack('discover_action_selected',{actionId:chosen.action.id});const at=new Date().toISOString();updateGuestJourney({savedActions:[...(draft?.savedActions??[]),{id:crypto.randomUUID(),actionId:chosen.action.id,timing,createdAt:at,updatedAt:at}]});setChosen(undefined);navigate('my');};
 const wantsIdentity=(message:string)=>{setReason(message);setShowSave(true);navigate('my');};
 const bridge=<section className="choice-bridge guest-next"><h2>だから、今日は何をする？</h2><p>気持ちを言葉にしても、したいことから選んでも。</p><button className="primary" onClick={()=>navigate('camellia')}>Camelliaと、どうしたいか話す</button><button className="secondary-button" onClick={()=>navigate('discover')}>Discoverで、したいことを探す →</button><button className="text-button" onClick={()=>openPlaces()}>今日に合うPlaceを見る</button><button className="text-button" onClick={retain}>今日のあなたを残す（無料）</button></section>;
 const dialogs=<>{shareDraft&&<PartnerShareDialog draft={shareDraft} onClose={()=>setShareDraft(undefined)} onTrack={onTrack}/>} {offer&&<PlusOffer source="place" onClose={()=>setOffer(false)} onTrack={onTrack}/>}</>;
 if(place)return <><PlaceScreen initialIntent={placeIntent} contextState={state} demoPlaces={LIVE_DESTINATIONS.has('place')?undefined:PLACE_DEMO_DATA} onBack={()=>navigate(tab)} onTrack={onTrack} onOpenPlus={()=>setOffer(true)} onSelectPlace={(selected,demo)=>{if(!draft)createGuestExploration(currentAnalyticsSession());const at=new Date().toISOString();updateGuestJourney({placeChoices:[...(draft?.placeChoices??[]),{id:crypto.randomUUID(),slug:selected.slug,title:selected.name,demo,createdAt:at,updatedAt:at}]});navigate('my');}} onSharePlace={(p,demo)=>setShareDraft({kind:'place',placeSlug:p.slug,placeTitle:p.name,demo})}/>{dialogs}</>;
 return <>
  {reason&&tab!=='my'&&<output className="app-notice">{reason}</output>}
  {tab==='today'&&<TodayScreen state={state} recommendations={recs} onCheckView={onCheckView} onCheckStart={onCheckStart} onCheckin={onCheckin} onSkipCheck={()=>{createGuestExploration(currentAnalyticsSession());}} guestSavePrompt={draft?.check?bridge:<></>} onTrack={(name,props)=>{if(name!=='save_prompt_view')onTrack(name,props);}} onOpenAction={r=>open(r,'today')} onTalk={()=>navigate('camellia')} onIntent={()=>navigate('discover')} onFortune={()=>wantsIdentity('今日の一枚を1日1枚の記録として残すため、無料のCamellia IDにつなぎます。')} onTree={retain} onComplete={noop} onFeedback={noop} onProposals={noop}/>}
  {tab==='camellia'&&<CamelliaScreen onShareFeeling={()=>setShareDraft({kind:'feeling'})} guestMode conversationId="guest-conversation" state={state} recommendations={recs} initialModel={model} onSelectModel={setModel} onTrack={onTrack} onOpenAction={r=>open(r,'melly')} onNavigate={where=>where==='place'?openPlaces():where==='circle'?wantsIdentity('安心してCircleへ参加するため、Camellia IDで参加者を確認します。'):navigate('discover')} onClearTreeContext={noop} onTree={retain} onRemember={retain} onReplaceConversationAssistant={noop} onSaveConversation={(user,assistant,intent,topics,provider,assistantModel,requestModel,userId)=>{const at=new Date().toISOString(),id=userId??crypto.randomUUID();setConversations(previous=>[{id:'guest-conversation',activeModel:requestModel??model,createdAt:previous[0]?.createdAt??at,updatedAt:at,messages:[...(previous[0]?.messages??[]).slice(-10),{id,role:'user',text:user,intent,topics,createdAt:at},{id:`${id}-a`,role:'assistant',text:assistant,provider,assistantModel,intent,topics,createdAt:at}]}]);}}/>}
  {tab==='discover'&&<DiscoverScreen state={state} category={category} onCategory={setCategory} onTrack={onTrack} onOpenAction={open} onOpenSecondary={where=>where==='place'?openPlaces():wantsIdentity('Circleの参加・投稿には、安全のためCamellia IDが必要です。')}/>}
  {tab==='my'&&<main className="screen guest-my"><header><div><p className="eyebrow">選んだことが、私に積み重なる</p><h1>My</h1></div></header><p className="meta">登録前の体験は一時保存です。残すものは、選んだ行動・Placeと、Checkをした場合の回答です。会話は含みません。</p>
   <section className="panel"><h2>今日、選んだこと</h2>{state.actions.map(a=><div className="history-row" key={a.id}><span>{a.title}<small>{a.status==='completed'?'できた':'やってみたい'}</small></span>{a.status==='started'&&<button className="text-button" onClick={()=>{const at=new Date().toISOString();updateGuestJourney({actions:state.actions.map(old=>old.id===a.id?{...old,status:'completed',completedAt:at,updatedAt:at}:old)});}}>できた</button>}</div>)}{state.savedActions.map(a=><p key={a.id}>{ACTIONS.find(item=>item.id===a.actionId)?.title} · あとで</p>)}{state.placeChoices?.map(p=><p key={p.id}>{p.title}{p.demo?' · 体験イメージ':''}</p>)}{!state.actions.length&&!state.savedActions.length&&!state.placeChoices?.length&&<p>気になる選択肢を、Discoverから見つけてみませんか。</p>}<button className="text-button" onClick={()=>navigate('discover')}>したいことを探す →</button></section>
   {reason&&<p className="meta">{reason}</p>}
   {showSave?<section aria-label="Camellia IDで残す"><p className="eyebrow">Camellia IDは無料です</p>{savePrompt}</section>:<section className="choice-bridge"><h2>今日のあなたを残しておきませんか？</h2><p>記録を残すと、明日のTodayやMyから振り返れます。</p><button className="primary" onClick={retain}>今日のあなたを残す</button></section>}
  </main>}
  {dialogs}
  <BottomNav active={tab} onChange={navigate}/>
  {chosen&&<ActionSheet action={chosen.action} onClose={()=>setChosen(undefined)} onStart={()=>select(chosen.action)} onSave={later} onSkip={()=>setChosen(undefined)} onDone={()=>select(chosen.action,true)} onPlace={()=>{openPlaces(actionPlaceIntent(chosen.action));setChosen(undefined);}} onShare={()=>{setShareDraft({kind:'action',actionId:chosen.action.id});setChosen(undefined);}}/>}
 </>;
}
