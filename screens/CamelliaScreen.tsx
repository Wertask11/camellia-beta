'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { firstInSession } from '@/lib/analytics/once';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { respond, classifyIntent, classifyTopics } from '@/lib/conversation/engine';
import { immediateSafetyReply } from '@/lib/conversation/safety';
import { redactKnownNames } from '@/lib/conversation/privacy';
import { conversationStarters } from '@/lib/conversation/starters';
import { moodMeta, todayCheck } from '@/lib/today/flow';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import type { AIMessage, AnalyticsEventName, CamelliaState, ConversationIntent, ConversationTopic, Recommendation, TreeLeaf } from '@/types';

type Provider = 'gemini' | 'fallback';
type Consent = 'unknown' | 'accepted' | 'declined';
type ChatError = 'rate_limited' | 'timeout' | 'network' | 'provider_error' | 'disabled' | 'invalid_request';
type ChatResponse = { reply: string; provider: Provider; responseTimeMs?: number; safety?: boolean };
type RetryState = { userId: string; message: string; history: Array<{ role: 'user' | 'assistant'; text: string }> };
const CONSENT_KEY = 'camellia-gemini-chat-consent-v1';
const wallClockNow = () => Date.now();
const createMessageId = () => globalThis.crypto.randomUUID();

function readConsent(): Consent {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    return saved === 'accepted' || saved === 'declined' ? saved : 'unknown';
  } catch { return 'unknown'; }
}

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
  const [freeTier, setFreeTier] = useState(false);
  const [consent, setConsent] = useState<Consent>(readConsent);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  useEffect(() => {
    void fetch('/api/camellia/chat', { method: 'GET', cache: 'no-store', credentials: 'same-origin' })
      .then(async (response): Promise<{ enabled?: boolean; freeTier?: boolean }> => response.ok ? await response.json() : {})
      .then((status) => {
        setAvailability(status.enabled ? 'enabled' : 'disabled');
        setFreeTier(status.freeTier === true);
      })
      .catch(() => setAvailability('disabled'));
  }, []);

  useEffect(() => {
    if (availability === 'checking' || !firstInSession('camellia-conversation-open')) return;
    onTrack('conversation_open', { provider: availability === 'enabled' && consent === 'accepted' ? 'gemini' : 'fallback' });
  }, [availability, consent, onTrack]);

  const setConsentChoice = (choice: Exclude<Consent, 'unknown'>) => {
    setConsent(choice);
    try { localStorage.setItem(CONSENT_KEY, choice); } catch { /* A failed local write keeps this choice in memory only. */ }
  };

  const savePair = (userText: string, assistantText: string, provider: Provider) => {
    const intent = classifyIntent(userText);
    const topics = classifyTopics(userText);
    onSaveConversation(userText, assistantText, intent, topics, provider);
    return { intent, topics };
  };

  const send = async (value = input) => {
    const clean = value.trim();
    if (!clean || sending || availability === 'checking' || (availability === 'enabled' && consent === 'unknown')) return;
    const previousHistory = messages.slice(-8).map(({ role, text }) => ({ role, text: redactKnownNamesForState(text, state) }));
    const geminiMessage = redactKnownNamesForState(clean, state);
    const userId = createMessageId();
    const local = respond(state, recommendations, clean, messages, treeContext);
    const urgentReply = immediateSafetyReply(clean);
    const useGemini = availability === 'enabled' && consent === 'accepted';
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
        setChatError(failedCategory);
        if (failedCategory !== 'disabled') setRetryState({ userId, message: geminiMessage, history: previousHistory });
        onTrack('conversation_error', { provider: 'gemini', error_category: failedCategory });
      }
    }

    const now = new Date().toISOString();
    const userMessage: AIMessage = { id: userId, role: 'user', text: clean, intent: local.intent, topics: local.topics, createdAt: now };
    const assistantMessage: AIMessage = { id: `${userId}-a`, role: 'assistant', text: reply, provider, intent: local.intent, topics: local.topics, createdAt: now };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    const { intent, topics } = savePair(clean, reply, provider);
    setLast({ ...local, text: reply, intent, topics });
    setLastSafety(safety);
    if (/覚えておいて|覚えてて/.test(clean)) setMemoryCandidate(clean);
    if (provider === 'gemini' || safety) {
      onTrack('conversation_response_received', { provider, ...(responseTimeMs !== undefined ? { response_time_ms: responseTimeMs } : {}) });
    }
    setSending(false);
  };

  const retryLast = async () => {
    if (!retryState || retrying || consent !== 'accepted' || availability !== 'enabled') return;
    setRetrying(true);
    setChatError(null);
    try {
      const result = await requestGemini(retryState.message, retryState.history);
      const now = new Date().toISOString();
      setMessages((current) => current.map((message) => message.id === `${retryState.userId}-a` ? { ...message, text: result.reply, provider: result.provider, createdAt: now } : message));
      onReplaceConversationAssistant(retryState.message, result.reply, result.provider);
      setLast((current) => current ? { ...current, text: result.reply } : current);
      setLastSafety(false);
      setRetryState(null);
      setChatError(null);
      onTrack('conversation_response_received', { provider: result.provider, ...(result.responseTimeMs !== undefined ? { response_time_ms: result.responseTimeMs } : {}) });
    } catch (error) {
      const category = (error && typeof error === 'object' && 'category' in error ? (error as { category?: ChatError }).category : undefined) || 'provider_error';
      setChatError(category);
      onTrack('conversation_error', { provider: 'gemini', error_category: category });
    } finally {
      setRetrying(false);
    }
  };

  const consentNeeded = availability === 'enabled' && consent === 'unknown';
  const errorCopy: Record<ChatError, string> = {
    rate_limited: '今は利用が集中しているみたい。従来の返答を表示しました。少し時間をおいてから再試行できます。',
    timeout: '返答に時間がかかったため、従来の返答を表示しました。少し時間をおいてから再試行できます。',
    network: '通信が安定しなかったため、従来の返答を表示しました。通信を確認して再試行できます。',
    provider_error: 'Geminiから返答を受け取れなかったため、従来の返答を表示しました。時間をおいて再試行できます。',
    disabled: 'Geminiは現在利用できないため、従来の返答を表示しました。',
    invalid_request: '入力を送れなかったため、従来の返答を表示しました。',
  };

  return (
    <main className="screen camellia">
      <header><div><p className="eyebrow">答えを急がないパートナー</p><h1>Camellia</h1></div><span className="avatar-flower">✿</span></header>
      {!messages.length && <section className="ai-context"><p>今日はどんなことがありましたか？聞いてほしいだけでも大丈夫です。</p></section>}
      {treeContext && <section className="panel"><p>{treeContext.name}さんについて話しています。My Treeの記録はGeminiへ送信しません。</p><button className="text-button" onClick={onClearTreeContext}>この人の参照を終える</button></section>}
      {consentNeeded && <dialog open className="panel gemini-consent" aria-labelledby="gemini-consent-title" aria-describedby="gemini-consent-copy">
        <p className="eyebrow">会話の外部送信について</p><h2 id="gemini-consent-title">Geminiを使って話す</h2>
        <p id="gemini-consent-copy">返答を作るため、今回のメッセージと直近最大8件の会話、今日のCheckの気分（記録がある場合）をGoogleのGemini APIへ送ります。プロフィール名とMy Treeに登録した名前は送信前に伏字にし、メール・電話番号・郵便番号・URLも伏字にします。Memoryや生理情報は送りません。本文に含まれるその他の個人名は自動検出できないため、入力しないでください。</p>
        {freeTier && <p className="gemini-free-tier">PreviewではGemini API Free Tierを使います。Google側で送信内容がサービス改善に利用される可能性があります。</p>}
        <div className="sheet-actions"><button className="secondary-button" onClick={() => setConsentChoice('declined')}>Geminiを使わない</button><button className="primary" onClick={() => setConsentChoice('accepted')}>内容を確認して使う</button></div>
      </dialog>}
      <div className="chat" role="log" aria-label="Camelliaとの会話" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => <div className={`bubble ${message.role}`} key={message.id}>{message.text}</div>)}
        {sending && <div className="bubble assistant chat-loading" aria-label="返答を受信中">…</div>}
      </div>
      {chatError && <output className="chat-error" aria-live="polite"><p>{errorCopy[chatError]}</p>{retryState && consent === 'accepted' && availability === 'enabled' && <button className="text-button" disabled={retrying || sending} onClick={() => void retryLast()}>{retrying ? '…' : 'Geminiでもう一度試す'}</button>}</output>}
      {lastSafety && <p className="chat-safety-note" role="alert">緊急時はCamelliaだけで対応せず、身近な人や地域の緊急窓口につながってください。</p>}
      {last?.showAction && last.action && <div className="conversation-action"><p className="eyebrow">よければ、こんな選択も</p><button onClick={() => { const recommendation = recommendations.find((item) => item.action.id === last.action?.id); onOpenAction(recommendation ?? { action: last.action!, score: 0, reasons: [] }); }}>{last.action.title}<span>詳しく見る →</span></button><button onClick={() => onNavigate('discover')}>ほかの選択を見る<span>Discover →</span></button></div>}
      {!!last?.choices?.length && <div className="quick-inputs conversation-choices">{last.choices.map((choice) => <button type="button" key={choice} onClick={() => void send(choice)}>{choice}</button>)}</div>}
      {last?.showCircle && <div className="conversation-action"><button onClick={() => onNavigate('circle')}><MessageCircle/>安心して話せるCircleを見る</button></div>}
      {last?.topics.some((topic) => ['RELATIONSHIP', 'FAMILY', 'FRIEND', 'LOVE'].includes(topic)) && <button className="text-button" onClick={onTree}>この人とのこと、My Treeに残しておく？</button>}
      {memoryCandidate && <section className="panel"><h2>次の会話のために覚えておく？</h2><p>{memoryCandidate}</p><p className="meta">Myから確認・削除できます。会話のすべてをMemoryにはしません。</p><button className="secondary-button" onClick={() => { onRemember(memoryCandidate); setMemoryCandidate(''); }}>この一言を覚えておく</button><button className="text-button" onClick={() => setMemoryCandidate('')}>今は保存しない</button></section>}
      <div className="conversation-entry">
        <p className="meta">話し始めに迷ったら、ここから。</p>
        <div className="quick-inputs" aria-label="会話のきっかけ">{starters.map((starter) => <button type="button" key={starter.id} disabled={sending || retrying || consentNeeded || availability === 'checking'} onClick={() => { onTrack('conversation_starter_selected', { starter_id: starter.id }); void send(starter.text); }}>{starter.text}</button>)}</div>
        {check && <p className="today-check-chip">今日のCheck：<span aria-hidden="true">{moodMeta(check.mood).emoji}</span> {moodMeta(check.mood).label}</p>}
        <div className="composer"><input aria-label="Camelliaへのメッセージ" maxLength={1000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void send(); }} placeholder="今の気持ちを話してね…" disabled={sending || retrying || consentNeeded || availability === 'checking'} /><button type="button" disabled={!input.trim() || sending || retrying || consentNeeded || availability === 'checking'} onClick={() => void send()} aria-label="送信"><Send size={18}/></button></div>
      </div>
    </main>
  );
}
