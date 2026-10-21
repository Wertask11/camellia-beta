'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { firstInSession } from '@/lib/analytics/once';
import { ConversationModelSelector } from '@/components/ConversationModelSelector';
import { conversationModelName, defaultConversationModel, isConversationModel } from '@/lib/conversation/models';
import { isModelSwitchMessage } from '@/lib/conversation/entries';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { respond, classifyIntent, classifyTopics } from '@/lib/conversation/engine';
import { immediateSafetyReply } from '@/lib/conversation/safety';
import { CONVERSATION_ACTIONS } from '@/lib/conversation/action-catalog';
import { geminiHistory, redactKnownNames } from '@/lib/conversation/privacy';
import { conversationStarters } from '@/lib/conversation/starters';
import { moodMeta, todayCheck } from '@/lib/today/flow';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import type { AIMessage, AnalyticsEventName, CamelliaState, ConversationIntent, ConversationTopic, ConversationModelId, Recommendation, TreeLeaf } from '@/types';

type Provider = 'gemini' | 'fallback';
type ChatError = 'rate_limited' | 'timeout' | 'network' | 'provider_error' | 'disabled' | 'invalid_request' | 'safety_block' | 'invalid_response';
type ChatResponse = { reply: string; provider: Provider; responseTimeMs?: number; safety?: boolean; actionId?: string; modelId?: ConversationModelId };
type RetryState = { originalMessage: string; userId: string; message: string; history: Array<{ role: 'user' | 'assistant'; text: string }>; modelId:ConversationModelId };
const wallClockNow = () => Date.now();
const createMessageId = () => globalThis.crypto.randomUUID();

async function requestGemini(message: string, history: RetryState['history'], modelId:ConversationModelId): Promise<ChatResponse> {
  const user = schoolParkAuth.currentUser;
  if (!user) throw Object.assign(new Error('authentication_required'), { category: 'provider_error' as ChatError });
  const token = await user.getIdToken();
  const response = await fetch('/api/camellia/chat', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, history, modelId }),
    signal: AbortSignal.timeout(40_000),
  });
  const result = await response.json().catch(() => ({})) as Partial<ChatResponse> & { category?: ChatError };
  if (!response.ok || typeof result.reply !== 'string' || (result.provider !== 'gemini' && result.provider !== 'fallback')) {
    const category = result.category || (response.status === 429 ? 'rate_limited' : response.status === 504 ? 'timeout' : response.status === 503 ? 'disabled' : 'provider_error');
    throw Object.assign(new Error('temporarily_unavailable'), { category });
  }
  if(result.modelId!==undefined&&result.modelId!==modelId)throw Object.assign(new Error('invalid_model_response'),{category:'invalid_response' as ChatError});
  return result as ChatResponse;
}

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
}: {
  conversationId?: string;
  state: CamelliaState;
  recommendations: Recommendation[];
  onSaveConversation: (user: string, assistant: string, intent: ConversationIntent, topics: ConversationTopic[], provider?: Provider, assistantModel?:ConversationModelId|null, requestModel?:ConversationModelId) => void;
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
}) {
  const currentTime = useCurrentTime(state.checkins);
  const starters = conversationStarters(state, currentTime, Boolean(treeContext));
  const check = todayCheck(state, currentTime);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>((conversationId ? state.aiConversations.find(item=>item.id===conversationId) : state.aiConversations[0])?.messages ?? []);
  const [activeModel,setActiveModel]=useState<ConversationModelId>(()=>defaultConversationModel(initialModel??(conversationId?state.aiConversations.find(item=>item.id===conversationId)?.activeModel:state.aiConversations[0]?.activeModel)));
  const [visibleCount,setVisibleCount]=useState(40);
  const chatViewport=useRef<HTMLDivElement>(null);
  const [suggestedAction,setSuggestedAction]=useState<string>();
  const [memoryCandidate, setMemoryCandidate] = useState('');
  const [last, setLast] = useState<ReturnType<typeof respond>>();
  const [lastSafety, setLastSafety] = useState(false);
  const [availability, setAvailability] = useState<'checking' | 'enabled' | 'disabled' | 'unavailable'>('checking');
  const messageEnd = useRef<HTMLDivElement>(null);
  useEffect(()=>{messageEnd.current?.scrollIntoView?.({block:'end',behavior:'smooth'});},[messages]);
  const requestInFlight = useRef(false);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const [chatError, setChatError] = useState<ChatError | null>(null);
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

  const savePair = (userText: string, assistantText: string, provider: Provider, assistantModel:ConversationModelId|null, requestModel:ConversationModelId) => {
    const intent = classifyIntent(userText);
    const topics = classifyTopics(userText);
    onSaveConversation(userText, assistantText, intent, topics, provider,assistantModel,requestModel);
    return { intent, topics };
  };

  const send = async (value = input) => {
    const clean = value.trim();
    if (!clean || requestInFlight.current || availability === 'checking') return;
    // Only exchanges generated in this Gemini session can leave the device.
    // Legacy/fallback replies may quote Memory or My Tree notes.
    const previousHistory = geminiHistory(messages).map(({ role, text }) => ({ role, text: redactKnownNamesForState(text, state) }));
    const geminiMessage = redactKnownNamesForState(clean, state);
    const userId = createMessageId();
    const requestModel=activeModel;
    const local = respond(state, recommendations, clean, messages, treeContext);
    const urgentReply = immediateSafetyReply(clean);
    const useGemini = availability !== 'disabled' && !treeContext;
    requestInFlight.current = true;
    setSending(true);
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
        const result = await requestGemini(geminiMessage, previousHistory,requestModel);
        reply = result.reply;
        setSuggestedAction(result.actionId);
        provider = result.provider;
        safety = result.safety === true;
        assistantModel=result.provider==='gemini'&&!safety&&isConversationModel(result.modelId)?result.modelId:null;
        responseTimeMs = result.responseTimeMs ?? wallClockNow() - started;
      } catch (error) {
        failedCategory = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
        reply = '今はうまく返せなかったみたい。少し時間をおいて、もう一度試してみてください。';
        setChatError(failedCategory);
        if (failedCategory !== 'disabled') setRetryState({ originalMessage: clean, userId, message: geminiMessage, history: previousHistory,modelId:requestModel });
        onTrack('conversation_error', { provider: 'gemini', error_category: failedCategory, model_id: requestModel });
      }
    }

    const now = new Date().toISOString();
    const userMessage: AIMessage = { id: userId, role: 'user', text: clean, intent: local.intent, topics: local.topics, createdAt: now };
    const assistantMessage: AIMessage = { id: `${userId}-a`, role: 'assistant', text: reply, provider, assistantModel, intent: local.intent, topics: local.topics, createdAt: now };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    const { intent, topics } = savePair(clean, reply, provider,assistantModel,requestModel);
    setLast({ ...local, text: reply, intent, topics, ...(provider === 'gemini' || safety || failedCategory ? { choices: [], showAction: false, showCircle: false } : {}) });
    setLastSafety(safety);
    if (/覚えておいて|覚えてて/.test(clean)) setMemoryCandidate(clean);
    if (provider === 'gemini' || safety) {
      onTrack('conversation_response_received', { provider, model_id: requestModel, ...(responseTimeMs !== undefined ? { response_time_ms: responseTimeMs } : {}) });
    }
    requestInFlight.current = false;
    setSending(false);
  };

  const retryLast = async () => {
    if (!retryState || requestInFlight.current || treeContext || (availability === 'disabled' || availability === 'checking')) return;
    requestInFlight.current = true;
    setRetrying(true);
    setChatError(null);
    try {
      const result = await requestGemini(retryState.message, retryState.history,retryState.modelId);
      setSuggestedAction(result.actionId);
      const now = new Date().toISOString();
      const assistantModel=result.provider==='gemini'&&!result.safety&&isConversationModel(result.modelId)?result.modelId:null;
      setMessages((current) => current.map((message) => message.id === `${retryState.userId}-a` ? { ...message, text: result.reply, provider: result.provider,assistantModel, createdAt: now } : message));
      onReplaceConversationAssistant(retryState.originalMessage, result.reply, result.provider,assistantModel);
      setLast((current) => current ? { ...current, text: result.reply, choices: [], showAction: false, showCircle: false } : current);
      setLastSafety(result.safety === true);
      setRetryState(null);
      setChatError(null);
      onTrack('conversation_response_received', { provider: result.provider, model_id: retryState.modelId, ...(result.responseTimeMs !== undefined ? { response_time_ms: result.responseTimeMs } : {}) });
    } catch (error) {
      const category = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
      setChatError(category);
      onTrack('conversation_error', { provider: 'gemini', error_category: category, model_id: retryState.modelId });
    } finally {
      requestInFlight.current = false;
      setRetrying(false);
    }
  };

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
      <header><div><p className="eyebrow">答えを急がないパートナー</p><h1>Camellia</h1><ConversationModelSelector value={activeModel} onSelect={chooseModel} disabled={sending||retrying||availability==='disabled'||Boolean(treeContext)}/></div><span className="avatar-flower" aria-hidden="true">✿</span></header>
      {availability==='disabled'&&!treeContext&&<output className="meta">今は共通の返答でお話ししています。</output>}
      {!messages.length && <section className="ai-context"><p>{check?'今日のCheckから気になったことや、その後のこと。今の気持ちから続けてみませんか。':'今日はどんなことがありましたか？聞いてほしいだけでも大丈夫です。'}</p></section>}
      {treeContext && <section className="panel"><p>{treeContext.name}さんについて話しています。この人についての会話では、My Treeに残した記録を端末内で参照します。記録を参照している間は、共通の話し方でお返しします。</p><button className="text-button" onClick={onClearTreeContext}>この人の参照を終える</button></section>}

      <div ref={chatViewport} className="chat" role="log" aria-label="Camelliaとの会話" aria-live="polite" aria-relevant="additions">
        {messages.length>visibleCount&&<button className="text-button" onClick={()=>{const viewport=chatViewport.current;const previousHeight=viewport?.scrollHeight??0;setVisibleCount(count=>count+40);requestAnimationFrame(()=>{if(viewport)viewport.scrollTop+=viewport.scrollHeight-previousHeight;});}}>前の会話を読む</button>}
        {messages.slice(-visibleCount).map((message) => isModelSwitchMessage(message)?<div className="model-switch-marker" role="note" key={message.id}>{conversationModelName(message.to)}に切り替えました</div>:<div className={`bubble ${message.role}`} key={message.id}>{message.role==='assistant'&&<span className="message-model-label">{conversationModelName(message.assistantModel)}</span>}{message.text}{message.role==='user'&&<button className="memory-message-button" onClick={()=>setMemoryCandidate(message.text)}>この一言を残す</button>}</div>)}
        {sending && <div className="bubble assistant chat-loading" aria-label="返答を受信中">…</div>}
        <div ref={messageEnd} aria-hidden="true"/>
      </div>
      <div className="conversation-followups">
      {chatError && <output className="chat-error" aria-live="polite"><span className="sr-only">{errorCopy[chatError]}</span>{retryState && !treeContext && availability !== 'disabled' && <><button className="text-button" disabled={retrying || sending} onClick={() => void retryLast()}>{retrying ? '…' : 'もう一度試す'}</button>{retryState.modelId!==activeModel&&<span className="meta">この返答は{conversationModelName(retryState.modelId)}で再試行します。</span>}</>}</output>}
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
