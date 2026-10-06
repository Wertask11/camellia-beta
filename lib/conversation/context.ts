import type { AIMessage, CamelliaState, ConversationTopic, Recommendation } from '@/types';
import { generateInsightCandidates } from '@/lib/insight/candidates';
import { jstDate } from '@/lib/fortune/engine';
import { dailyCheckins } from '@/lib/reflection/engine';

export interface CamelliaContext {
  today?: { mood: number; sleep?: number; body?: string; stress?: string };
  recentPatterns: Array<{ type: string; confidence: number; observations: number; text: string }>;
  recentChoices: Array<{ title: string; event: string; timeBand: string }>;
  availableRecommendations: Recommendation[];
  preferences: { interests: string[]; availableMinutes?: number };
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string; topics?: ConversationTopic[] }>;
}

/** Build a small, in-memory context. This never sends data to a network API. */
export function buildCamelliaContext(
  state: CamelliaState,
  recommendations: Recommendation[] = [],
  history: AIMessage[] = [],
  now = new Date(),
): CamelliaContext {
  const todayKey = jstDate(now);
  const notFromFuture = state.checkins.filter((check) => Number.isFinite(Date.parse(check.createdAt)) && Date.parse(check.createdAt) <= now.getTime());
  const today = dailyCheckins(notFromFuture, now)
    .find((check) => jstDate(new Date(check.createdAt)) === todayKey);
  const recentChoices = [...state.contextualMemory]
    .filter((item) => ['started', 'completed', 'feedback'].includes(item.event))
    .filter((item) => Number.isFinite(Date.parse(item.createdAt)) && Date.parse(item.createdAt) <= now.getTime())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((item) => ({
      title: state.actions.find((action) => action.actionId === item.actionId)?.title || item.actionId,
      event: item.event,
      timeBand: item.context.timeBand,
    }));
  return {
    today: today ? { mood: today.mood, sleep: today.sleep, body: today.body, stress: today.stress } : undefined,
    recentPatterns: generateInsightCandidates(state, now)
      .filter((item) => item.confidence >= 0.6)
      .slice(0, 3)
      .map(({ type, confidence, observations, text }) => ({ type, confidence, observations, text })),
    recentChoices,
    availableRecommendations: recommendations.slice(0, 3),
    preferences: {
      interests: (state.profile.interests || []).slice(0, 5),
      availableMinutes: state.profile.availableMinutes,
    },
    conversationHistory: history.slice(-4).map(({ role, text, topics }) => ({ role, text: Array.from(text).slice(0, 280).join(''), topics })),
  };
}
