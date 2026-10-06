import type { AIMessage, CamelliaState, Recommendation, TreeLeaf } from '@/types';
import { generateInsightCandidates } from '@/lib/insight/candidates';
import { jstDate } from '@/lib/fortune/engine';
import { dailyCheckins } from '@/lib/reflection/engine';

export interface CamelliaContext {
  remembered:string[];
  relationship?: {note:string;reflections:string[]};
  today?: { mood: number; sleep?: number; body?: string; stress?: string };
  recentPatterns: Array<{ type: string; confidence: number; observations: number; text: string }>;
  recentChoices: Array<{ title: string; event: string; timeBand: string }>;
  availableRecommendations: Recommendation[];
  preferences: { interests: string[]; availableMinutes?: number };
  conversationHistory: Array<Pick<AIMessage, 'id'|'role'|'text'|'topics'|'createdAt'>>;
}

/** Build a small, in-memory context. This never sends data to a network API. */
export function buildCamelliaContext(
  state: CamelliaState,
  recommendations: Recommendation[] = [],
  history: AIMessage[] = [],
  now = new Date(),
  selectedLeaf?:TreeLeaf,
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
    remembered:(state.personalMemories??[]).filter(item=>item.status!=='removed').slice(-3).map(item=>item.text.slice(0,500)),
    relationship:selectedLeaf?{note:selectedLeaf.note.slice(0,160),reflections:selectedLeaf.reflections.slice(-3).map(item=>item.text.slice(0,200))}:undefined,
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
    conversationHistory: history.slice(-4).map(({ id, role, text, topics, createdAt }) => ({ id, role, text: Array.from(new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text),item=>item.segment).slice(0,280).join(''), topics, createdAt })),
  };
}
