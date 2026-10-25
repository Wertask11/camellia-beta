'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { firstInSession } from '@/lib/analytics/once';
import { ConversationModelSelector } from '@/components/ConversationModelSelector';
import { conversationModelName, defaultConversationModel, isConversationModel } from '@/lib/conversation/models';
import { isModelSwitchMessage } from '@/lib/conversation/entries';
import { REACTION_AFTER_REPLY_MS, REACTION_DELAY_MS, REACTION_EMOJI, REACTION_LABEL, REACTION_LEAD_MS, REACTION_POSE_MS, reactionFor, type ConversationReaction } from '@/lib/conversation/reactions';
import { CamelliaCharacter, EXPRESSION_FOR_REACTION, characterLabel, characterName, type CharacterExpression } from '@/components/CamelliaCharacter';
import { CharacterProfileSheet } from '@/components/CharacterProfileSheet';
import {requestGemini,type ChatError} from '@/lib/conversation/client';
import {conversationPerformance,previewBatchTransport,afterConversationPaint,safeConversationTiming,type ConversationTiming} from '@/lib/conversation/performance';
import { respond, classifyIntent, classifyTopics } from '@/lib/conversation/engine';
import { immediateSafetyReply } from '@/lib/conversation/safety';
import { CONVERSATION_ACTIONS } from '@/lib/conversation/action-catalog';
import { geminiHistory, redactKnownNames } from '@/lib/conversation/privacy';
import { conversationStarters } from '@/lib/conversation/starters';
import { moodMeta, todayCheck } from '@/lib/today/flow';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import type { AIMessage, AnalyticsEventName, CamelliaState, ConversationIntent, ConversationTopic, ConversationModelId, Recommendation, TreeLeaf } from '@/types';

type Provider = 'gemini' | 'fallback';
type RetryState = { originalMessage: string; userId: string; message: string; history: Array<{ role: 'user' | 'assistant'; text: string }>; modelId:ConversationModelId };
const wallClockNow = () => Date.now();
const monotonicNow = () => performance.now();
const createMessageId = () => globalThis.crypto.randomUUID();

function redactKnownNamesForState(value: string, state: CamelliaState) {
  const names = [state.profile.name, ...state.treeLeaves.map((leaf) => leaf.name)]
    .filter((name): name is string => typeof name === 'string');
  return redactKnownNames(value, names);
}

export function CamelliaScreen({
  conversationId,
  state,
  recommendations,
  onSaveConversation,
  onPendingConversation,
  onReplaceConversationAssistant,
  onOpenAction,
  onNavigate,
  treeContext,
  onClearTreeContext,
  onTree,
  onRemember,
  onTrack,
  initialModel,
  onSelectModel,
  onRenameCharacter,
}: {
  conversationId?: string;
  state: CamelliaState;
  recommendations: Recommendation[];
  onSaveConversation: (user: string, assistant: string, intent: ConversationIntent, topics: ConversationTopic[], provider?: Provider, assistantModel?:ConversationModelId|null, requestModel?:ConversationModelId,userId?:string,pending?:boolean,reaction?:ConversationReaction) => void;
  onPendingConversation?:(message:AIMessage,model:ConversationModelId)=>void;
  onReplaceConversationAssistant: (user: string, assistant: string, provider: Provider, assistantModel?:ConversationModelId|null) => void;
  initialModel?:ConversationModelId;
  onSelectModel?:(modelId:ConversationModelId,markerId:string)=>void;
  onOpenAction: (recommendation: Recommendation) => void;
  onNavigate: (where: 'discover' | 'circle' | 'place') => void;
  treeContext?: TreeLeaf;
  onClearTreeContext: () => void;
  onTree: () => void;
  onRemember: (text: string) => void;
  onTrack: (name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) => void;
  /** Renaming Camellia's character from her profile (tap the floating character). */
  onRenameCharacter?: (name: string | null) => void;
}) {
  const currentTime = useCurrentTime(state.checkins);
  const starters = conversationStarters(state, currentTime, Boolean(treeContext));
  const check = todayCheck(state, currentTime);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>((conversationId ? state.aiConversations.find(item=>item.id===conversationId) : state.aiConversations[0])?.messages ?? []);
  const [activeModel,setActiveModel]=useState<ConversationModelId>(()=>defaultConversationModel(initialModel??(conversationId?state.aiConversations.find(item=>item.id===conversationId)?.activeModel:state.aiConversations[0]?.activeModel)));
  const [visibleCount,setVisibleCount]=useState(40);
  const chatViewport=useRef<HTMLDivElement>(null),stickToEnd=useRef(true);
  const recovered=messages.findLast(message=>message.role==='user'&&message.pending);
  const [draftReply,setDraftReply]=useState('');
  /* The floating character reacts for a moment (the same reaction she put on the message, with its emoji beside her;
     a face after the reply), then goes back to thinking or listening. The key restarts the little hop animation. */
  const [moment,setMoment]=useState<{expression:CharacterExpression;key:number;reaction?:ConversationReaction}>();
  const [profileOpen,setProfileOpen]=useState(false);
  const momentTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),momentCount=useRef(0);
  const flash=(expression:CharacterExpression,ms:number,reaction?:ConversationReaction)=>{clearTimeout(momentTimer.current);momentCount.current+=1;setMoment({expression,key:momentCount.current,reaction});momentTimer.current=setTimeout(()=>{if(mounted.current)setMoment(undefined);},ms);};
  useEffect(()=>()=>clearTimeout(momentTimer.current),[]);
  const abortRequest=useRef<AbortController|undefined>(undefined),mounted=useRef(true);
  const measurement=useRef<{start:number;request?:number;firstVisible?:number;model:ConversationModelId;timing?:ConversationTiming;transport?:string;done?:boolean;end?:number;paintScheduled?:boolean;epoch?:number;timeline?:Record<string,number>}|undefined>(undefined);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abortRequest.current?.abort();};},[state.profile.id,conversationId]);
  useEffect(()=>{
   const sample=measurement.current;if(!sample||sample.paintScheduled||sample.firstVisible!==undefined||!draftReply)return;
   sample.paintScheduled=true;afterConversationPaint(()=>{if(mounted.current&&measurement.current===sample&&sample.firstVisible===undefined&&chatViewport.current?.querySelector('.stream-draft')?.textContent)sample.firstVisible=monotonicNow()-sample.start;});
  },[draftReply]);
  const [suggestedAction,setSuggestedAction]=useState<string>();
  const [memoryCandidate, setMemoryCandidate] = useState('');
  const [last, setLast] = useState<ReturnType<typeof respond>>();
  const [lastSafety, setLastSafety] = useState(false);
  const [availability, setAvailability] = useState<'checking' | 'enabled' | 'disabled' | 'unavailable'>('checking');
  const messageEnd = useRef<HTMLDivElement>(null);
  useEffect(()=>{if(stickToEnd.current)messageEnd.current?.scrollIntoView?.({block:'end',behavior:'auto'});},[messages,draftReply]);
  const requestInFlight = useRef(false);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryState, setRetryState] = useState<RetryState | null>(()=>recovered?{originalMessage:recovered.text,userId:recovered.id,message:redactKnownNamesForState(recovered.text,state),history:geminiHistory(messages.slice(0,messages.indexOf(recovered))).map(({role,text})=>({role,text:redactKnownNamesForState(text,state)})),modelId:defaultConversationModel(recovered.requestModel??activeModel)}:null);
  const [chatError, setChatError] = useState<ChatError | null>(recovered?'provider_error':null);
  useEffect(() => {
    void fetch('/api/camellia/chat', { method: 'GET', cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(5000) })
      .then(async (response): Promise<{ enabled?: boolean; dataPolicy?: string }> => {
        if (!response.ok) throw new Error('STATUS_UNAVAILABLE');
        const status = await response.json();
        if (!status || typeof status !== 'object' || !('enabled' in status) || typeof status.enabled !== 'boolean') throw new Error('STATUS_INVALID');
        return { enabled: status.enabled };
      })
      .then((status) => {
        setAvailability(status.enabled ? 'enabled' : 'disabled');
      })
      // A failed status probe does not mean the server feature flag is OFF.
      // POST is authoritative and still enforces the flag before external transmission.
      .catch(() => setAvailability('unavailable'));
  }, []);

  useEffect(() => {
    if (availability === 'checking' || !firstInSession('camellia-conversation-open')) return;
    onTrack('conversation_open', { provider: availability !== 'disabled' ? 'gemini' : 'fallback', model_id: activeModel });
  }, [availability, onTrack, activeModel]);

  const chooseModel=(next:ConversationModelId)=>{
    if(requestInFlight.current||!isConversationModel(next))return;
    const markerId=createMessageId(), from=activeModel;
    const hasConversation=messages.some(message=>message.role!=='system');
    if(from!==next){
      setActiveModel(next);
      if(hasConversation)setMessages(current=>[...current,{id:markerId,role:'system',type:'system_model_switch',text:'',from,to:next,createdAt:new Date().toISOString()}]);
    }
    onSelectModel?.(next,markerId);
    onTrack('conversation_model_selected',{model_id:next});
    if(from!==next&&hasConversation)onTrack('conversation_model_switched',{from_model:from,to_model:next});
  };

  const savePair = (userText: string, assistantText: string, provider: Provider, assistantModel:ConversationModelId|null, requestModel:ConversationModelId,userId:string,pending=false,reaction?:ConversationReaction) => {
    const intent = classifyIntent(userText);
    const topics = classifyTopics(userText);
    onSaveConversation(userText, assistantText, intent, topics, provider,assistantModel,requestModel,userId,pending,reaction);
    return { intent, topics };
  };

  const reportPerformance=(extra:Record<string,string|number|boolean>,sample:NonNullable<typeof measurement.current>)=>{
    sample.done=true;
    afterConversationPaint(()=>{
      if(!mounted.current)return;
      const timing=safeConversationTiming({...sample.timing,client_send_to_request_ms:sample.request,client_first_visible_ms:sample.firstVisible??monotonicNow()-sample.start,client_response_complete_ms:sample.end,client_full_response_ms:monotonicNow()-sample.start});
      const timeline={...sample.timeline,T0:sample.epoch??0,T1:(sample.epoch??0)+(sample.request??0),T8:(sample.epoch??0)+(timing.client_first_visible_ms??0),T9:wallClockNow()};
      conversationPerformance(sample.model,sample.transport??'json',timing,timeline);
      onTrack('conversation_response_received',{...extra,...timing,transport:sample.transport??'json'});
    });
  };
  /* Her message lands, then メリィ puts a reaction on it (decided on the device, so it never waits for the model) and
     makes the same face; only then does she start thinking (the typing dots) and reply. The request goes out at once;
     the dots and the reply text wait until the reaction has had its moment. */
  const [reacting,setReacting]=useState(false);
  const reactionHold=useRef(0),heldDraft=useRef<string|undefined>(undefined),draftTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),reactTimers=useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(()=>()=>{clearTimeout(draftTimer.current);reactTimers.current.forEach(clearTimeout);},[]);
  const react=(userId:string,reaction:ConversationReaction,model:ConversationModelId)=>{
    reactTimers.current.forEach(clearTimeout);
    reactionHold.current=monotonicNow()+REACTION_DELAY_MS+REACTION_LEAD_MS;setReacting(true);
    reactTimers.current=[
      setTimeout(()=>{if(!mounted.current)return;setMessages(current=>current.map(message=>message.id===userId&&message.role==='user'?{...message,reaction}:message));flash(EXPRESSION_FOR_REACTION[reaction],REACTION_POSE_MS,reaction);onTrack('conversation_reaction_shown',{reaction,model_id:model});},REACTION_DELAY_MS),
      setTimeout(()=>{if(mounted.current)setReacting(false);},REACTION_DELAY_MS+REACTION_LEAD_MS),
    ];
  };
  const showDraft=(text:string)=>{
    const wait=reactionHold.current-monotonicNow();
    if(wait<=0){setDraftReply(text);return;}
    heldDraft.current=text;
    draftTimer.current??=setTimeout(()=>{draftTimer.current=undefined;if(mounted.current&&heldDraft.current!==undefined)setDraftReply(heldDraft.current);},wait);
  };
  /** Before the finished reply is placed: the reaction gets its moment first. */
  const afterReaction=async()=>{
    const wait=reactionHold.current-monotonicNow();
    if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
    clearTimeout(draftTimer.current);draftTimer.current=undefined;heldDraft.current=undefined;
  };
  const streamOptions=(controller:AbortController)=>({signal:controller.signal,onText:(text:string)=>{if(mounted.current&&!controller.signal.aborted)showDraft(text);},onRequest:()=>{if(measurement.current)measurement.current.request=monotonicNow()-measurement.current.start;},batch:previewBatchTransport()});
  const send = async (value = input) => {
    const pressedAt=monotonicNow();
    const clean = value.trim();
    if (!clean || requestInFlight.current || availability === 'checking') return;
    // Only exchanges generated in this Gemini session can leave the device.
    // Legacy/fallback replies may quote Memory or My Tree notes.
    const previousHistory = geminiHistory(messages).map(({ role, text }) => ({ role, text: redactKnownNamesForState(text, state) }));
    const geminiMessage = redactKnownNamesForState(clean, state);
    const userId = createMessageId();
    const controller=new AbortController();abortRequest.current=controller;
    const sample={start:pressedAt,model:activeModel} as NonNullable<typeof measurement.current>;sample.epoch=wallClockNow()-(monotonicNow()-sample.start);measurement.current=sample;
    const requestModel=activeModel;
    const urgentReply = immediateSafetyReply(clean);
    const useGemini = availability !== 'disabled' && !treeContext;
    // Gemini never uses the private local Memory/Tree processor; avoid building its full context.
    const local:ReturnType<typeof respond> = useGemini ? {text:'',intent:classifyIntent(clean),topics:classifyTopics(clean),showAction:false,action:undefined,choices:[],showCircle:false} : respond(state,recommendations,clean,messages,treeContext);
    requestInFlight.current = true;
    stickToEnd.current=true;setSending(true);
    const pending:AIMessage={id:userId,role:'user',text:clean,createdAt:new Date().toISOString(),pending:true,requestModel};
    setMessages(current=>[...current,pending]);onPendingConversation?.(pending,requestModel);setDraftReply('');
    // No reaction on an urgent safety reply.
    let reaction:ConversationReaction|undefined=urgentReply?undefined:reactionFor(clean);
    reactionHold.current=0;if(reaction)react(userId,reaction,requestModel);
    setSuggestedAction(undefined);
    setInput('');
    setChatError(null);
    setRetryState(null);
    onTrack('conversation_message_sent', { provider: useGemini && !urgentReply ? 'gemini' : 'fallback', model_id: requestModel });
    const started = wallClockNow();
    let reply = urgentReply ?? local.text;
    let provider: Provider = 'fallback';
    let safety = Boolean(urgentReply);
    let responseTimeMs: number | undefined;
    let failedCategory: ChatError | null = null;
    let assistantModel:ConversationModelId|null=null;

    if (useGemini && !urgentReply) {
      try {
        const result = await requestGemini(geminiMessage, previousHistory,requestModel,streamOptions(controller));
        if(!mounted.current||controller.signal.aborted)return;
        await afterReaction();
        if(!mounted.current||controller.signal.aborted)return;
        sample.timing=result.timing;sample.timeline=result.timeline;sample.transport=result.transport;sample.end=monotonicNow()-sample.start;
        reply = result.reply;
        if(result.safety)reaction=undefined;
        setSuggestedAction(result.actionId);
        provider = result.provider;
        safety = result.safety === true;
        assistantModel=result.provider==='gemini'&&!safety&&isConversationModel(result.modelId)?result.modelId:null;
        responseTimeMs = result.responseTimeMs ?? wallClockNow() - started;
      } catch (error) {
        if(!mounted.current||controller.signal.aborted)return;
        setDraftReply('');
        failedCategory = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
        reply = '今はうまく返せなかったみたい。少し時間をおいて、もう一度試してみてください。';
        setChatError(failedCategory);
        if (failedCategory !== 'disabled') setRetryState({ originalMessage: clean, userId, message: geminiMessage, history: previousHistory,modelId:requestModel });
        onTrack('conversation_error', { provider: 'gemini', error_category: failedCategory, model_id: requestModel, ...safeConversationTiming(error&&typeof error==='object'&&'timing'in error?error.timing:{}),client_full_response_ms:Math.min(120000,monotonicNow()-sample.start) });
      }
    }

    await afterReaction();
    const now = new Date().toISOString();
    const userMessage: AIMessage = { id: userId, role: 'user', text: clean, intent: local.intent, topics: local.topics, createdAt: now,...(failedCategory?{pending:true,requestModel}:{}),...(reaction?{reaction}:{}) };
    const assistantMessage: AIMessage = { id: `${userId}-a`, role: 'assistant', text: reply, provider, assistantModel, intent: local.intent, topics: local.topics, createdAt: now };
    if(!mounted.current||controller.signal.aborted)return;
    setDraftReply('');
    setMessages((current) => [...current.filter(message=>message.id!==userId), userMessage, assistantMessage]);
    const { intent, topics } = savePair(clean, reply, provider,assistantModel,requestModel,userId,Boolean(failedCategory),reaction);
    if(reaction)flash(EXPRESSION_FOR_REACTION[reaction],REACTION_AFTER_REPLY_MS);
    setLast({ ...local, text: reply, intent, topics, ...(provider === 'gemini' || safety || failedCategory ? { choices: [], showAction: false, showCircle: false } : {}) });
    setLastSafety(safety);
    if (/覚えておいて|覚えてて/.test(clean)) setMemoryCandidate(clean);
    if (provider === 'gemini' || safety) {
      sample.end??=monotonicNow()-sample.start;reportPerformance({provider,model_id:requestModel,...(responseTimeMs!==undefined?{response_time_ms:responseTimeMs}:{})},sample);
    }
    requestInFlight.current = false;
    setSending(false);
  };

  const retryLast = async () => {
    if (!retryState || requestInFlight.current || treeContext || (availability === 'disabled' || availability === 'checking')) return;
    requestInFlight.current = true;
    const controller=new AbortController();abortRequest.current=controller;
    const sample={start:monotonicNow(),model:retryState.modelId} as NonNullable<typeof measurement.current>;sample.epoch=wallClockNow()-(monotonicNow()-sample.start);measurement.current=sample;
    stickToEnd.current=true;setRetrying(true);setDraftReply('');
    setChatError(null);
    try {
      reactionHold.current=0;
      const result = await requestGemini(retryState.message, retryState.history,retryState.modelId,streamOptions(controller));
      if(!mounted.current||controller.signal.aborted)return;
      await afterReaction();
      if(!mounted.current||controller.signal.aborted)return;
      sample.timing=result.timing;sample.timeline=result.timeline;sample.transport=result.transport;sample.end=monotonicNow()-sample.start;setDraftReply('');
      setSuggestedAction(result.actionId);
      const now = new Date().toISOString();
      const assistantModel=result.provider==='gemini'&&!result.safety&&isConversationModel(result.modelId)?result.modelId:null;
      // Her message keeps the reaction it got when she sent it (none under a safety reply).
      setMessages(current=>{const next=current.map(message=>message.id===retryState.userId?{...message,pending:false,...(result.safety?{reaction:undefined}:{})}:message.id===`${retryState.userId}-a`?{...message,text:result.reply,provider:result.provider,assistantModel,createdAt:now}:message);return next.some(message=>message.id===`${retryState.userId}-a`)?next:[...next,{id:`${retryState.userId}-a`,role:'assistant',text:result.reply,provider:result.provider,assistantModel,createdAt:now}];});
      onReplaceConversationAssistant(retryState.originalMessage, result.reply, result.provider,assistantModel);
      setLast((current) => current ? { ...current, text: result.reply, choices: [], showAction: false, showCircle: false } : current);
      setLastSafety(result.safety === true);
      setRetryState(null);
      setChatError(null);
      reportPerformance({provider:result.provider,model_id:retryState.modelId,...(result.responseTimeMs!==undefined?{response_time_ms:result.responseTimeMs}:{})},sample);
    } catch (error) {
      if(!mounted.current||controller.signal.aborted)return;
      setDraftReply('');
      const category = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
      setChatError(category);
      onTrack('conversation_error', { provider: 'gemini', error_category: category, model_id: retryState.modelId,...safeConversationTiming(error&&typeof error==='object'&&'timing'in error?error.timing:{}),client_full_response_ms:Math.min(120000,monotonicNow()-sample.start) });
    } finally {
      requestInFlight.current = false;
      setRetrying(false);
    }
  };

  // Who reacted: the form that answered this message, or the one she is talking with now.
  const characterNameSetting=state.profile.characterName;
  const reactionForm=(userId:string):ConversationModelId=>{const answer=messages.find(item=>item.id===`${userId}-a`);return isConversationModel(answer?.assistantModel)?answer.assistantModel:activeModel;};
  const busy=sending||retrying;
  // While the reaction has its moment she is not thinking yet.
  const thinking=busy&&!reacting;
  const mascotForm:ConversationModelId=retrying&&retryState?retryState.modelId:activeModel;
  const mascotExpression:CharacterExpression=moment?.expression??(thinking?'think':'listen');

  const errorCopy: Record<ChatError, string> = {
    rate_limited: '今は少し混み合っているみたい。時間をおいて、もう一度試してみてください。',
    timeout: '返答に少し時間がかかっています。時間をおいて、もう一度試してみてください。',
    network: 'うまくつながらなかったみたい。通信を確認して、もう一度試してみてください。',
    provider_error: '今はうまく返せなかったみたい。少し時間をおいて、もう一度試してみてください。',
    disabled: '今はいつもの会話でお返ししています。',
    safety_block: 'この内容にはここでお返しできないみたい。話せる範囲で、別の言葉にしてみてください。',
    invalid_response: 'うまく言葉にできなかったみたい。少し時間をおいて、もう一度試してみてください。',
    invalid_request: 'うまく送れなかったみたい。入力を確認してみてください。',
  };

  return (
    <main className="screen camellia">
      <header><div><p className="eyebrow">答えを急がないパートナー</p><h1>Camellia</h1><ConversationModelSelector value={activeModel} onSelect={chooseModel} disabled={sending||retrying||availability==='disabled'||Boolean(treeContext)}/></div>{/* メリィ lives at the top of the conversation, next to the title, so she never covers a message: she bobs
          (YURA also sways), thinks while the reply comes, and reacts for a moment. Tap her for her profile. */}
        <div className={`chat-mascot chat-mascot--${mascotForm}${thinking?' chat-mascot--busy':''}`}>
          <button className="chat-mascot-button" onClick={()=>{setProfileOpen(true);onTrack('character_profile_open',{model_id:mascotForm});}} aria-label={`${characterName(characterNameSetting)}のプロフィールを開く`}>
            <span className="chat-mascot-figure" key={moment?.key??mascotExpression} aria-hidden="true"><CamelliaCharacter form={mascotForm} expression={mascotExpression} size={76}/>{moment?.reaction&&<span className={`chat-mascot-emoji chat-mascot-emoji--${moment.reaction}`}>{REACTION_EMOJI[moment.reaction]}</span>}</span>
            <span className="chat-mascot-name" aria-hidden="true">{characterName(characterNameSetting)}{thinking?<small>は考え中です</small>:<small>{mascotForm==='yura'?' · YURA':' · Lactone'}</small>}</span>
          </button>
        </div></header>
      {availability==='disabled'&&!treeContext&&<output className="meta">今は共通の返答でお話ししています。</output>}
      {!messages.length && <section className="ai-context"><p>{check?'今日のCheckから気になったことや、その後のこと。今の気持ちから続けてみませんか。':'今日はどんなことがありましたか？聞いてほしいだけでも大丈夫です。'}</p></section>}
      {treeContext && <section className="panel"><p>{treeContext.name}さんについて話しています。この人についての会話では、My Treeに残した記録を端末内で参照します。記録を参照している間は、共通の話し方でお返しします。</p><button className="text-button" onClick={onClearTreeContext}>この人の参照を終える</button></section>}

      {profileOpen&&<CharacterProfileSheet name={characterNameSetting} form={mascotForm} busy={busy} canSwitch={!busy&&availability!=='disabled'&&!treeContext} onClose={()=>setProfileOpen(false)} onSwitch={chooseModel} onRename={name=>{onRenameCharacter?.(name);onTrack('character_renamed',{custom_name:name!==null});}}/>}
      <div ref={chatViewport} onScroll={()=>{const v=chatViewport.current;if(v)stickToEnd.current=v.scrollHeight-v.scrollTop-v.clientHeight<80;}} className="chat" role="log" aria-label="Camelliaとの会話" aria-live="polite" aria-relevant="additions">
        {messages.length>visibleCount&&<button className="text-button" onClick={()=>{const viewport=chatViewport.current;const previousHeight=viewport?.scrollHeight??0;setVisibleCount(count=>count+40);requestAnimationFrame(()=>{if(viewport)viewport.scrollTop+=viewport.scrollHeight-previousHeight;});}}>前の会話を読む</button>}
        {messages.slice(-visibleCount).map((message) => {
          if(isModelSwitchMessage(message))return <div className="model-switch-marker" role="note" key={message.id}>{conversationModelName(message.to)}に切り替えました</div>;
          if(message.role==='assistant'){
            const form=isConversationModel(message.assistantModel)?message.assistantModel:undefined;
            return <div className={`bubble assistant${form?` bubble--${form}`:''}`} key={message.id}><span className="message-model-label">{form?characterLabel(characterNameSetting,form):conversationModelName(message.assistantModel)}</span>{message.text}</div>;
          }
          const reactedBy=reactionForm(message.id);
          return <div className={`bubble ${message.role}`} key={message.id}>{message.text}{message.pending&&!sending&&!retrying&&<small className="meta">返答はまだ確定していません</small>}{message.role==='user'&&<button className="memory-message-button" onClick={()=>setMemoryCandidate(message.text)}>この一言を残す</button>}
            {message.role==='user'&&message.reaction&&<span className="message-reaction"><span className="sr-only">{characterLabel(characterNameSetting,reactedBy)}のリアクション：{REACTION_LABEL[message.reaction]}</span><span aria-hidden="true">{REACTION_EMOJI[message.reaction]}</span></span>}
          </div>;
        })}
        {thinking&&<div className={`bubble assistant bubble--${mascotForm} chat-loading`} aria-label="返答を受信中" aria-busy="true">{draftReply?<span className="stream-draft" aria-live="off">{draftReply}</span>:<output className="typing-dots"><span className="sr-only">返答を受信中</span><i/><i/><i/></output>}</div>}
        <div ref={messageEnd} aria-hidden="true"/>
      </div>
      <div className="conversation-followups">
      {chatError && <output className="chat-error" aria-live="polite"><span>{errorCopy[chatError]}</span>{retryState && !treeContext && availability !== 'disabled' && <><button className="text-button" disabled={retrying || sending} onClick={() => void retryLast()}>{retrying ? '…' : 'もう一度試す'}</button>{retryState.modelId!==activeModel&&<span className="meta">この返答は{conversationModelName(retryState.modelId)}で再試行します。</span>}</>}</output>}
      {lastSafety && <p className="chat-safety-note" role="alert">緊急時はCamelliaだけで対応せず、身近な人や地域の緊急窓口につながってください。</p>}
      {suggestedAction&&CONVERSATION_ACTIONS.filter(action=>action.id===suggestedAction).map(action=><div className="conversation-action" key={action.id}><p className="eyebrow">よければ、こんな選択も</p><button onClick={()=>onOpenAction({action,score:0,reasons:['会話の続きに、自分で選べる小さな過ごし方']})}>{action.title}<span>内容を見る →</span></button><button className="text-button" onClick={()=>setSuggestedAction(undefined)}>今は話を続ける</button></div>)}
      {last?.showAction && last.action && <div className="conversation-action"><p className="eyebrow">よければ、こんな選択も</p><button onClick={() => { const recommendation = recommendations.find((item) => item.action.id === last.action?.id); onOpenAction(recommendation ?? { action: last.action!, score: 0, reasons: [] }); }}>{last.action.title}<span>詳しく見る →</span></button><button onClick={() => onNavigate('discover')}>ほかの選択を見る<span>Discover →</span></button></div>}
      {!!last?.choices?.length && <div className="quick-inputs conversation-choices">{last.choices.map((choice) => <button type="button" key={choice} onClick={() => void send(choice)}>{choice}</button>)}</div>}
      {last?.showCircle && <div className="conversation-action"><button onClick={() => onNavigate('circle')}><MessageCircle/>安心して話せるCircleを見る</button></div>}
      {last?.topics.some((topic) => ['RELATIONSHIP', 'FAMILY', 'FRIEND', 'LOVE'].includes(topic)) && <button className="text-button" onClick={onTree}>この人とのこと、My Treeに残しておく？</button>}
      {memoryCandidate && <section className="panel"><h2>自分のために、この一言を残しておく？</h2><p>{memoryCandidate}</p><p className="meta">Myから確認・削除できます。会話のすべてをMemoryにはしません。</p><button className="secondary-button" onClick={() => { onRemember(memoryCandidate); setMemoryCandidate(''); }}>この一言を覚えておく</button><button className="text-button" onClick={() => setMemoryCandidate('')}>今は保存しない</button></section>}
      </div>
      <div className="conversation-entry">
        <p className="meta">話し始めに迷ったら、ここから。</p>
        <div className="quick-inputs" aria-label="会話のきっかけ">{starters.map((starter) => <button type="button" key={starter.id} disabled={sending || retrying || availability === 'checking'} onClick={() => { onTrack('conversation_starter_selected', { starter_id: starter.id }); void send(starter.text); }}>{starter.text}</button>)}</div>
        {check && <p className="today-check-chip">今日のCheck：<span aria-hidden="true">{moodMeta(check.mood).emoji}</span> {moodMeta(check.mood).label}</p>}
        <div className="composer"><input aria-label="Camelliaへのメッセージ" maxLength={1000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void send(); }} placeholder="今の気持ちを話してね…" disabled={sending || retrying || availability === 'checking'} /><button type="button" disabled={!input.trim() || sending || retrying || availability === 'checking'} onClick={() => void send()} aria-label="送信"><Send size={18}/></button></div>
      </div>
    </main>
  );
}
