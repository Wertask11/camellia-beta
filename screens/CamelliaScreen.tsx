'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { firstInSession } from '@/lib/analytics/once';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { respond, classifyIntent, classifyTopics } from '@/lib/conversation/engine';
import { immediateSafetyReply } from '@/lib/conversation/safety';
import { geminiHistory, redactKnownNames } from '@/lib/conversation/privacy';
import { conversationStarters } from '@/lib/conversation/starters';
import { moodMeta, todayCheck } from '@/lib/today/flow';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import type { AIMessage, AnalyticsEventName, CamelliaState, ConversationIntent, ConversationTopic, Recommendation, TreeLeaf } from '@/types';

type Provider = 'gemini' | 'fallback';
type ChatError = 'rate_limited' | 'timeout' | 'network' | 'provider_error' | 'disabled' | 'invalid_request';
type ChatResponse = { reply: string; provider: Provider; responseTimeMs?: number; safety?: boolean };
type RetryState = { originalMessage: string; userId: string; message: string; history: Array<{ role: 'user' | 'assistant'; text: string }> };
const wallClockNow = () => Date.now();
const createMessageId = () => globalThis.crypto.randomUUID();

async function requestGemini(message: string, history: RetryState['history']): Promise<ChatResponse> {
  const user = schoolParkAuth.currentUser;
  if (!user) throw Object.assign(new Error('authentication_required'), { category: 'provider_error' as ChatError });
  const token = await user.getIdToken();
  const response = await fetch('/api/camellia/chat', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, history }),
    signal: AbortSignal.timeout(21_000),
  });
  const result = await response.json().catch(() => ({})) as Partial<ChatResponse> & { category?: ChatError };
  if (!response.ok || typeof result.reply !== 'string' || (result.provider !== 'gemini' && result.provider !== 'fallback')) {
    const category = result.category || (response.status === 429 ? 'rate_limited' : response.status === 504 ? 'timeout' : response.status === 503 ? 'disabled' : 'provider_error');
    throw Object.assign(new Error('temporarily_unavailable'), { category });
  }
  return result as ChatResponse;
}

function redactKnownNamesForState(value: string, state: CamelliaState) {
  const names = [state.profile.name, ...state.treeLeaves.map((leaf) => leaf.name)]
    .filter((name): name is string => typeof name === 'string');
  return redactKnownNames(value, names);
}

export function CamelliaScreen({
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
}: {
  state: CamelliaState;
  recommendations: Recommendation[];
  onSaveConversation: (user: string, assistant: string, intent: ConversationIntent, topics: ConversationTopic[], provider?: Provider) => void;
  onReplaceConversationAssistant: (user: string, assistant: string, provider: Provider) => void;
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
  const [messages, setMessages] = useState<AIMessage[]>(state.aiConversations[0]?.messages ?? []);
  const [memoryCandidate, setMemoryCandidate] = useState('');
  const [last, setLast] = useState<ReturnType<typeof respond>>();
  const [lastSafety, setLastSafety] = useState(false);
  const [availability, setAvailability] = useState<'checking' | 'enabled' | 'disabled'>('checking');
  const requestInFlight = useRef(false);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  useEffect(() => {
    void fetch('/api/camellia/chat', { method: 'GET', cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(5000) })
      .then(async (response): Promise<{ enabled?: boolean; freeTier?: boolean }> => response.ok ? await response.json() : {})
      .then((status) => {
        setAvailability(status.enabled ? 'enabled' : 'disabled');
      })
      .catch(() => setAvailability('disabled'));
  }, []);

  useEffect(() => {
    if (availability === 'checking' || !firstInSession('camellia-conversation-open')) return;
    onTrack('conversation_open', { provider: availability === 'enabled' ? 'gemini' : 'fallback' });
  }, [availability, onTrack]);

  const savePair = (userText: string, assistantText: string, provider: Provider) => {
    const intent = classifyIntent(userText);
    const topics = classifyTopics(userText);
    onSaveConversation(userText, assistantText, intent, topics, provider);
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
    const local = respond(state, recommendations, clean, messages, treeContext);
    const urgentReply = immediateSafetyReply(clean);
    const useGemini = availability === 'enabled' && !treeContext;
    requestInFlight.current = true;
    setSending(true);
    setInput('');
    setChatError(null);
    setRetryState(null);
    onTrack('conversation_message_sent', { provider: useGemini && !urgentReply ? 'gemini' : 'fallback' });
    const started = wallClockNow();
    let reply = urgentReply ?? local.text;
    let provider: Provider = 'fallback';
    let safety = Boolean(urgentReply);
    let responseTimeMs: number | undefined;
    let failedCategory: ChatError | null = null;

    if (useGemini && !urgentReply) {
      try {
        const result = await requestGemini(geminiMessage, previousHistory);
        reply = result.reply;
        provider = result.provider;
        safety = result.safety === true;
        responseTimeMs = result.responseTimeMs ?? wallClockNow() - started;
      } catch (error) {
        failedCategory = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
        reply = '今はうまく返せなかったみたい。少し時間をおいて、もう一度試してみてください。';
        setChatError(failedCategory);
        if (failedCategory !== 'disabled') setRetryState({ originalMessage: clean, userId, message: geminiMessage, history: previousHistory });
        onTrack('conversation_error', { provider: 'gemini', error_category: failedCategory });
      }
    }

    const now = new Date().toISOString();
    const userMessage: AIMessage = { id: userId, role: 'user', text: clean, intent: local.intent, topics: local.topics, createdAt: now };
    const assistantMessage: AIMessage = { id: `${userId}-a`, role: 'assistant', text: reply, provider, intent: local.intent, topics: local.topics, createdAt: now };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    const { intent, topics } = savePair(clean, reply, provider);
    setLast({ ...local, text: reply, intent, topics, ...(provider === 'gemini' || safety || failedCategory ? { choices: [], showAction: false, showCircle: false } : {}) });
    setLastSafety(safety);
    if (/覚えておいて|覚えてて/.test(clean)) setMemoryCandidate(clean);
    if (provider === 'gemini' || safety) {
      onTrack('conversation_response_received', { provider, ...(responseTimeMs !== undefined ? { response_time_ms: responseTimeMs } : {}) });
    }
    requestInFlight.current = false;
    setSending(false);
  };

  const retryLast = async () => {
    if (!retryState || requestInFlight.current || treeContext || availability !== 'enabled') return;
    requestInFlight.current = true;
    setRetrying(true);
    setChatError(null);
    try {
      const result = await requestGemini(retryState.message, retryState.history);
      const now = new Date().toISOString();
      setMessages((current) => current.map((message) => message.id === `${retryState.userId}-a` ? { ...message, text: result.reply, provider: result.provider, createdAt: now } : message));
      onReplaceConversationAssistant(retryState.originalMessage, result.reply, result.provider);
      setLast((current) => current ? { ...current, text: result.reply, choices: [], showAction: false, showCircle: false } : current);
      setLastSafety(result.safety === true);
      setRetryState(null);
      setChatError(null);
      onTrack('conversation_response_received', { provider: result.provider, ...(result.responseTimeMs !== undefined ? { response_time_ms: result.responseTimeMs } : {}) });
    } catch (error) {
      const category = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
      setChatError(category);
      onTrack('conversation_error', { provider: 'gemini', error_category: category });
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
    invalid_request: 'うまく送れなかったみたい。入力を確認してみてください。',
  };

  return (
    <main className="screen camellia">
      <header><div><p className="eyebrow">答えを急がないパートナー</p><h1>Camellia</h1></div><span className="avatar-flower">✿</span></header>
      {!messages.length && <section className="ai-context"><p>今日はどんなことがありましたか？聞いてほしいだけでも大丈夫です。</p></section>}
      {treeContext && <section className="panel"><p>{treeContext.name}さんについて話しています。この人についての会話では、My Treeに残した記録を端末内で参照します。</p><button className="text-button" onClick={onClearTreeContext}>この人の参照を終える</button></section>}

      <div className="chat" role="log" aria-label="Camelliaとの会話" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => <div className={`bubble ${message.role}`} key={message.id}>{message.text}</div>)}
        {sending && <div className="bubble assistant chat-loading" aria-label="返答を受信中">…</div>}
      </div>
      {chatError && <output className="chat-error" aria-live="polite"><p>{errorCopy[chatError]}</p>{retryState && !treeContext && availability === 'enabled' && <button className="text-button" disabled={retrying || sending} onClick={() => void retryLast()}>{retrying ? '…' : 'もう一度試す'}</button>}</output>}
      {lastSafety && <p className="chat-safety-note" role="alert">緊急時はCamelliaだけで対応せず、身近な人や地域の緊急窓口につながってください。</p>}
      {last?.showAction && last.action && <div className="conversation-action"><p className="eyebrow">よければ、こんな選択も</p><button onClick={() => { const recommendation = recommendations.find((item) => item.action.id === last.action?.id); onOpenAction(recommendation ?? { action: last.action!, score: 0, reasons: [] }); }}>{last.action.title}<span>詳しく見る →</span></button><button onClick={() => onNavigate('discover')}>ほかの選択を見る<span>Discover →</span></button></div>}
      {!!last?.choices?.length && <div className="quick-inputs conversation-choices">{last.choices.map((choice) => <button type="button" key={choice} onClick={() => void send(choice)}>{choice}</button>)}</div>}
      {last?.showCircle && <div className="conversation-action"><button onClick={() => onNavigate('circle')}><MessageCircle/>安心して話せるCircleを見る</button></div>}
      {last?.topics.some((topic) => ['RELATIONSHIP', 'FAMILY', 'FRIEND', 'LOVE'].includes(topic)) && <button className="text-button" onClick={onTree}>この人とのこと、My Treeに残しておく？</button>}
      {memoryCandidate && <section className="panel"><h2>次の会話のために覚えておく？</h2><p>{memoryCandidate}</p><p className="meta">Myから確認・削除できます。会話のすべてをMemoryにはしません。</p><button className="secondary-button" onClick={() => { onRemember(memoryCandidate); setMemoryCandidate(''); }}>この一言を覚えておく</button><button className="text-button" onClick={() => setMemoryCandidate('')}>今は保存しない</button></section>}
      <div className="conversation-entry">
        <p className="meta">話し始めに迷ったら、ここから。</p>
        <div className="quick-inputs" aria-label="会話のきっかけ">{starters.map((starter) => <button type="button" key={starter.id} disabled={sending || retrying || availability === 'checking'} onClick={() => { onTrack('conversation_starter_selected', { starter_id: starter.id }); void send(starter.text); }}>{starter.text}</button>)}</div>
        {check && <p className="today-check-chip">今日のCheck：<span aria-hidden="true">{moodMeta(check.mood).emoji}</span> {moodMeta(check.mood).label}</p>}
        <div className="composer"><input aria-label="Camelliaへのメッセージ" maxLength={1000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void send(); }} placeholder="今の気持ちを話してね…" disabled={sending || retrying || availability === 'checking'} /><button type="button" disabled={!input.trim() || sending || retrying || availability === 'checking'} onClick={() => void send()} aria-label="送信"><Send size={18}/></button></div>
      </div>
    </main>
  );
}
