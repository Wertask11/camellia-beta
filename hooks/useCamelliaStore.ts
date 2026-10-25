/* oxlint-disable react-compiler -- localStorage hydration and state transitions are intentionally centralized in this prototype store */
'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { validateStoredState, LocalDataRecoveryError } from '@/lib/storage/validation';
import { clearFortuneReflections } from '@/lib/fortune/reflection';
import {appendConversationPair,appendPendingConversationMessage,replaceThreadReply,switchConversationModel} from '@/lib/conversation/threads';
import { defaultConversationModel,isConversationModel } from '@/lib/conversation/models';
import { serializeConversationState } from '@/lib/conversation/persistence';
import { captureContext } from '@/lib/memory/engine';
import { analyticsSession, analyticsTimestamp, ANALYTICS_SESSION_CHANGED } from '@/lib/analytics/session';
import { sessionAttribution } from '@/lib/analytics/attribution';
import * as analyticsDelivery from '@/lib/analytics/posthog';
import { forwardEvent } from '@/lib/analytics/posthog';
import { deleteSyncedCamelliaData, prepareSchoolParkAccount, syncToSchoolPark, type AccountChoice } from '@/lib/schoolpark/sync';
import { resetAnalyticsIdentity } from '@/lib/analytics/posthog';
import type { ActionDefinition,AnalyticsEventName,CamelliaState,Checkin,ConversationIntent,ConversationTopic,DailyFortune,DismissReason,ConversationModelId,FeedbackRating,Insight,InsightFeedback,Mood,Profile,SaveTiming,TreeLeaf } from '@/types';
export const STORAGE_KEY='camellia-prototype-v3'; const V2_KEY='camellia-prototype-v2'; const V1_KEY='camellia-prototype-v1';
const stamp=()=>new Date().toISOString(); const uid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;
export function emptyState():CamelliaState{const now=stamp();return{version:3,profile:{id:uid(),name:'',age:'',interests:[],lifestyle:'',priority:'',periodEnabled:false,createdAt:now,updatedAt:now},checkins:[],actions:[],actionFeedback:[],savedActions:[],aiConversations:[],contextualMemory:[],personalMemories:[],insights:[],insightFeedback:[],fortunes:[],treeLeaves:[],analyticsEvents:[],onboardingComplete:false,createdAt:now,updatedAt:now}}
export function migrate(raw:unknown):CamelliaState {
 const result=validateStoredState(raw,emptyState(),true);
 if(result.issues.length)throw new LocalDataRecoveryError(result.state,result.issues);
 return result.state;
}
export function load():CamelliaState {
 if(typeof window==='undefined')return emptyState();
 try {
  const v3=localStorage.getItem(STORAGE_KEY);
  if(v3){const result=validateStoredState(JSON.parse(v3),emptyState());if(result.issues.length)throw new LocalDataRecoveryError(result.state,result.issues);return result.state;}
  const v2=localStorage.getItem(V2_KEY);if(v2)return migrate(JSON.parse(v2));
  const v1=localStorage.getItem(V1_KEY);if(v1)return migrate(JSON.parse(v1));
 }catch(error){if(error instanceof LocalDataRecoveryError)throw error;throw new Error('LOCAL_DATA_UNREADABLE');}
 return emptyState();
}
export function useCamelliaStore(){
 const[state,setState]=useState<CamelliaState>(()=>emptyState());const[ready,setReady]=useState(false);const[storageError,setStorageError]=useState('');const skipNextSync=useRef(false);const hydrated=useRef(false);const storageHealthy=useRef(false);
 const readProtected=useCallback(()=>{try{setState(load());setStorageError('');}catch(error){storageHealthy.current=false;analyticsDelivery.setAnalyticsDeliveryAllowed?.(false);if(error instanceof LocalDataRecoveryError)setState(error.recovered);setStorageError('LOCAL_DATA_UNREADABLE');}},[]);
 useEffect(()=>{if(hydrated.current)return;hydrated.current=true;readProtected();setReady(true);},[readProtected]);
 useEffect(()=>{if(!ready||storageError)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(serializeConversationState({...state,updatedAt:stamp()})));}catch{storageHealthy.current=false;analyticsDelivery.setAnalyticsDeliveryAllowed?.(false);setStorageError('LOCAL_SAVE_FAILED');return;}storageHealthy.current=true;if(skipNextSync.current){skipNextSync.current=false;return;}syncToSchoolPark(state);},[state,ready,storageError]);
 const retryStorage=useCallback(()=>{if(storageError!=='LOCAL_SAVE_FAILED'){readProtected();return;}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(serializeConversationState({...state,updatedAt:stamp()})));setStorageError('');}catch{setStorageError('LOCAL_SAVE_FAILED');}},[storageError,state,readProtected]);
 const forwarded = useRef(new Set<string>());
 const deliveryOwner = useRef(state.profile.id); deliveryOwner.current = state.profile.id;
 useEffect(()=>{analyticsDelivery.setAnalyticsDeliveryAllowed?.(ready&&!storageError&&storageHealthy.current);},[ready,storageError]);
 useEffect(()=>{
  if(!ready||storageError||!storageHealthy.current)return;
  const owner=state.profile.id;
  analyticsDelivery.initAnalytics?.(owner);
  for(const event of state.analyticsEvents.filter(e=>!e.forwardedAt&&!e.deliverySuppressed&&!forwarded.current.has(`${owner}:${e.id}`))){
   const key=`${owner}:${event.id}`;forwarded.current.add(key);
   const queued=forwardEvent(event,state,result=>{
    if(deliveryOwner.current!==owner)return;
    setState(current=>current.profile.id!==owner?current:{...current,analyticsEvents:current.analyticsEvents.map(item=>item.id!==event.id?item:
     result.status==='accepted'?{...item,forwardedAt:result.at}:{...item,deliverySuppressed:result.reason})});
   });
   if(!queued)forwarded.current.delete(key);
  }
 },[ready,state,storageError]);
 const sessionEvents=useCallback(()=>{
  const session=analyticsSession(deliveryOwner.current);
  return {session,events:session.fresh?[{id:uid(),name:'session_start' as const,properties:sessionAttribution(),createdAt:analyticsTimestamp(),sessionId:session.id}]:[]};
 },[]);
 const track=useCallback((name:AnalyticsEventName,properties?:Record<string,string|number|boolean>)=>{
  const {session,events}=sessionEvents();
  if(name==='session_start'&&!events.length)return;
  const event={id:uid(),name,properties:{...properties,...sessionAttribution()},createdAt:analyticsTimestamp(),sessionId:session.id};
  setState(s=>({...s,analyticsEvents:[...s.analyticsEvents,...events,...(name==='session_start'?[]:[event])]}));
  if(session.fresh)window.dispatchEvent(new Event(ANALYTICS_SESSION_CHANGED));
 },[sessionEvents]);
 useEffect(()=>{
  if(!ready||storageError)return;
  const resume=()=>{if(document.visibilityState!=='hidden')track('session_start');};resume();
  window.addEventListener('focus',resume);window.addEventListener('pointerdown',resume);window.addEventListener('keydown',resume);document.addEventListener('visibilitychange',resume);
  return()=>{window.removeEventListener('focus',resume);window.removeEventListener('pointerdown',resume);window.removeEventListener('keydown',resume);document.removeEventListener('visibilitychange',resume);};
 },[ready,track,storageError,state.profile.id]);
 const viewCheck=useCallback(()=>track('check_view'),[track]);
 const startCheck=useCallback(()=>{
  const {session,events}=sessionEvents();const now=analyticsTimestamp();
  setState(s=>{const last=[...s.analyticsEvents].reverse().find(e=>e.name==='check_start'||e.name==='check_complete');
   if(last?.name==='check_start'&&last.sessionId===session.id)return s;
   return{...s,analyticsEvents:[...s.analyticsEvents,...events,{id:uid(),name:'check_start',properties:sessionAttribution(),createdAt:now,sessionId:session.id}]};});
  if(session.fresh)window.dispatchEvent(new Event(ANALYTICS_SESSION_CHANGED));
 },[sessionEvents]);
 const memory=(s:CamelliaState,actionId:string,event:'proposed'|'saved'|'dismissed'|'started'|'completed'|'feedback',extra:Record<string,unknown>={})=>({id:uid(),actionId,event,context:captureContext(s),createdAt:stamp(),...extra});
 const updateProfile=useCallback((p:Partial<Profile>)=>setState(s=>({...s,profile:{...s.profile,...p,updatedAt:stamp()}})),[]);const completeOnboarding=useCallback(()=>setState(s=>({...s,onboardingComplete:true})),[]);
 const addCheckin=useCallback((v:{mood:Mood}&Partial<Omit<Checkin,'id'|'mood'|'createdAt'|'updatedAt'>>)=>{const now=stamp();setState(s=>({...s,checkins:[...s.checkins,{id:uid(),...v,createdAt:now,updatedAt:now}],analyticsEvents:[...s.analyticsEvents,{id:uid(),name:'check_complete',sessionId:analyticsSession(deliveryOwner.current).id,properties:{...sessionAttribution(),hasDetails:Boolean(v.sleep!==undefined||v.body||v.stress||v.periodDays!==undefined)},createdAt:analyticsTimestamp()}]}))},[]);
 const recordProposals=useCallback((ids:string[])=>setState(s=>{const today=new Date().toDateString();const add=ids.filter(id=>!s.contextualMemory.some(m=>m.actionId===id&&m.event==='proposed'&&new Date(m.createdAt).toDateString()===today)).map(id=>memory(s,id,'proposed'));return add.length?{...s,contextualMemory:[...s.contextualMemory,...add]}:s}),[]);
 const startAction=useCallback((a:ActionDefinition)=>{const now=stamp();setState(s=>({...s,actions:[...s.actions,{id:uid(),actionId:a.id,title:a.title,category:a.category,status:'started',startedAt:now,createdAt:now,updatedAt:now}],contextualMemory:[...s.contextualMemory,memory(s,a.id,'started')]}))},[]);
 // Done right here (an in-place action): one record, started and completed together, so feedback can follow.
 const doneAction=useCallback((a:ActionDefinition)=>{const now=stamp();setState(s=>({...s,actions:[...s.actions,{id:uid(),actionId:a.id,title:a.title,category:a.category,status:'completed',startedAt:now,completedAt:now,createdAt:now,updatedAt:now}],contextualMemory:[...s.contextualMemory,memory(s,a.id,'started'),memory(s,a.id,'completed')]}))},[]);
 const completeAction=useCallback((id:string)=>setState(s=>{const a=s.actions.find(x=>x.id===id);return{...s,actions:s.actions.map(x=>x.id===id?{...x,status:'completed',completedAt:stamp(),updatedAt:stamp()}:x),contextualMemory:a?[...s.contextualMemory,memory(s,a.actionId,'completed')]:s.contextualMemory}}),[]);
 const skipAction=useCallback((a:ActionDefinition,reason:DismissReason)=>{const now=stamp();setState(s=>({...s,actions:[...s.actions,{id:uid(),actionId:a.id,title:a.title,category:a.category,status:'skipped',dismissReason:reason,createdAt:now,updatedAt:now}],contextualMemory:[...s.contextualMemory,memory(s,a.id,'dismissed',{dismissReason:reason})]}))},[]);
 const saveAction=useCallback((a:ActionDefinition,timing:SaveTiming)=>setState(s=>{const now=stamp();return{...s,savedActions:[...s.savedActions,{id:uid(),actionId:a.id,timing,createdAt:now,updatedAt:now}],contextualMemory:[...s.contextualMemory,memory(s,a.id,'saved',{saveTiming:timing})]}}),[]);
 const addFeedback=useCallback((recordId:string,actionId:string,rating:FeedbackRating)=>{const now=stamp();setState(s=>s.actionFeedback.some(f=>f.actionRecordId===recordId)?s:({...s,actionFeedback:[...s.actionFeedback,{id:uid(),actionRecordId:recordId,actionId,rating,createdAt:now,updatedAt:now}],contextualMemory:[...s.contextualMemory,memory(s,actionId,'feedback',{feedback:rating})]}))},[]);
 const addConversation=useCallback((u:string,a:string,intent:ConversationIntent,topics:ConversationTopic[],provider:'gemini'|'fallback'='fallback',conversationId?:string,assistantModel?:ConversationModelId|null,requestModel?:ConversationModelId,userId?:string,pending?:boolean,reaction?:import('@/lib/conversation/reactions').ConversationReaction)=>{const now=stamp();setState(s=>({...s,profile:requestModel?{...s.profile,lastConversationModel:requestModel,updatedAt:now}:s.profile,aiConversations:appendConversationPair(s.aiConversations,conversationId??s.aiConversations[0]?.id??uid(),[{id:userId??uid(),role:'user',text:u,intent,topics,createdAt:now,...(pending?{pending:true,requestModel}:{}),...(reaction?{reaction}:{})},{id:userId?`${userId}-a`:uid(),role:'assistant',text:a,provider,intent,topics,createdAt:now,...(assistantModel!==undefined?{assistantModel}:{})}],now,requestModel)}))},[]);
 const pendingConversation=useCallback((message:import('@/types').AIMessage,conversationId:string,model:ConversationModelId)=>{const now=stamp();setState(s=>({...s,aiConversations:appendPendingConversationMessage(s.aiConversations,conversationId,message,model,now)}));},[]);
 const replaceConversationAssistant=useCallback((userText:string,text:string,provider:'gemini'|'fallback',conversationId?:string,assistantModel?:ConversationModelId|null)=>{const now=stamp();setState(s=>{const id=conversationId??s.aiConversations[0]?.id;return id?{...s,aiConversations:replaceThreadReply(s.aiConversations,id,userText,text,provider,now,assistantModel)}:s;})},[]);
 const selectConversationModel=useCallback((conversationId:string,modelId:ConversationModelId,markerId:string)=>{if(!isConversationModel(modelId))return;const now=stamp();setState(s=>({...s,profile:{...s.profile,lastConversationModel:modelId,updatedAt:now},aiConversations:switchConversationModel(s.aiConversations,conversationId,modelId,defaultConversationModel(s.profile.lastConversationModel),now,markerId)}))},[]);
 const syncInsights=useCallback((items:Insight[])=>setState(s=>({...s,insights:items})),[]);const feedbackInsight=useCallback((key:string,verdict:InsightFeedback['verdict'])=>{const now=stamp();setState(s=>({...s,insightFeedback:[...s.insightFeedback,{id:uid(),insightKey:key,verdict,createdAt:now,updatedAt:now}],insights:s.insights.map(i=>i.key===key?{...i,confidence:verdict==='incorrect'?Math.max(0,i.confidence-.5):Math.min(1,i.confidence+.15),updatedAt:now}:i)}))},[]);
 const setFortune=useCallback((fortune:DailyFortune)=>setState(s=>({...s,fortunes:[...s.fortunes.filter(f=>f.date!==fortune.date),fortune]})),[]);
 const addTreeLeaf=useCallback((leaf:Omit<TreeLeaf,'id'|'createdAt'|'updatedAt'|'reflections'|'status'>)=>{const now=stamp();setState(s=>({...s,treeLeaves:[...s.treeLeaves,{...leaf,id:uid(),status:'active',reflections:[],createdAt:now,updatedAt:now}],analyticsEvents:[...s.analyticsEvents,{id:uid(),name:'tree_add_complete',properties:{category:leaf.category,tagCount:leaf.meaningTags.length},createdAt:analyticsTimestamp()}]}))},[]);
 const updateTreeLeaf=useCallback((id:string,patch:Partial<TreeLeaf>)=>setState(s=>({...s,treeLeaves:s.treeLeaves.map(l=>l.id===id?{...l,...patch,updatedAt:stamp()}:l)})),[]);
 // Deleting a person erases what was written about them; the empty record carries the deletion to Firestore (sync only writes).
 const removeTreeLeaf=useCallback((id:string)=>setState(s=>({...s,treeLeaves:s.treeLeaves.map(l=>l.id===id?{...l,name:'',note:'',meaningTags:[],reflections:[],status:'removed' as const,updatedAt:stamp()}:l)})),[]);
 const addTreeReflection=useCallback((id:string,text:string)=>{const now=stamp();setState(s=>({...s,treeLeaves:s.treeLeaves.map(l=>l.id===id?{...l,reflections:[...l.reflections,{id:uid(),text,createdAt:now,updatedAt:now}],updatedAt:now}:l),analyticsEvents:[...s.analyticsEvents,{id:uid(),name:'tree_reflection_add',createdAt:analyticsTimestamp()}]}))},[]);
 const remember=useCallback((text:string)=>setState(s=>{const clean=text.trim().slice(0,500);if(!clean)return s;const now=stamp();return{...s,personalMemories:[...(s.personalMemories??[]),{id:uid(),text:clean,createdAt:now,updatedAt:now,source:'explicit_conversation' as const}]}}),[]);
 const forget=useCallback((id:string)=>setState(s=>({...s,personalMemories:(s.personalMemories??[]).map(item=>item.id===id?{...item,text:'',status:'removed' as const,updatedAt:stamp()}:item)})),[]);
 const prepareAccount=useCallback(async(accountUid:string,choice:AccountChoice|false=false)=>{const restored=await prepareSchoolParkAccount(load(),accountUid,choice,emptyState());const safe=validateStoredState(restored,emptyState());if(safe.issues.length)throw new Error('REMOTE_ARCHIVE_INVALID');setState(safe.state)},[]);
 const reset=useCallback(async()=>{const result=await deleteSyncedCamelliaData(()=>{clearFortuneReflections();localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(V2_KEY);localStorage.removeItem(V1_KEY);localStorage.removeItem('camellia-sync-sent');localStorage.removeItem('camellia-sync-conflict');localStorage.removeItem('camellia-cache-owner');for(const key of Object.keys(localStorage))if(key.startsWith('camellia-sync-sent:')||key.startsWith('camellia-sync-conflict:')||key.startsWith('camellia-cloud-version:')||key.startsWith('camellia-local-backup:'))localStorage.removeItem(key);resetAnalyticsIdentity()});skipNextSync.current=true;setState(emptyState());return result},[]);return{state,ready,storageError,retryStorage,remember,forget,prepareAccount,updateProfile,completeOnboarding,addCheckin,recordProposals,startAction,doneAction,completeAction,skipAction,saveAction,addFeedback,addConversation,pendingConversation,replaceConversationAssistant,selectConversationModel,syncInsights,feedbackInsight,setFortune,addTreeLeaf,updateTreeLeaf,removeTreeLeaf,addTreeReflection,viewCheck,startCheck,track,reset}}
