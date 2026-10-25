export type Category =
  | 'REST'
  | 'BODY'
  | 'BEAUTY'
  | 'PLAY'
  | 'LEARN'
  | 'CONNECT';
export type TimeBand = '朝' | '昼' | '夕方' | '夜';
export type Mood = 1 | 2 | 3 | 4 | 5;
export type ConversationModelId = 'yura' | 'lactone';
export type ActionStatus = 'started' | 'completed' | 'skipped';
export type FeedbackRating = 'great' | 'okay' | 'same' | 'bad';
export type ConversationIntent =
  | 'LISTEN'
  | 'REFLECT'
  | 'ADVICE'
  | 'ACTION'
  | 'CONNECT';
export type ConversationTopic =
  | 'WORK'
  | 'RELATIONSHIP'
  | 'LOVE'
  | 'FAMILY'
  | 'FRIEND'
  | 'BEAUTY'
  | 'HEALTH'
  | 'SLEEP'
  | 'FOOD'
  | 'EXERCISE'
  | 'STUDY'
  | 'MONEY'
  | 'HOBBY'
  | 'FUN'
  | 'LONELINESS'
  | 'ANXIETY'
  | 'HAPPINESS'
  | 'ANGER'
  | 'SADNESS'
  | 'OTHER';
export type DismissReason =
  | 'no_time'
  | 'not_now'
  | 'not_needed'
  | 'dislike'
  | 'other';
export type SaveTiming = 'later_today' | 'holiday' | 'when_free' | 'save_only';
export interface Profile {
  lastConversationModel?: ConversationModelId;
  /** The name she gave Camellia's character; null or absent means the default メリィ. */
  characterName?: string | null;
  id: string;
  name: string;
  age: string;
  birthDate?: string;
  /** Older wording: "this is a service for women". Kept for records saved before 2026-10-24. */
  womenServiceAcknowledged?: boolean;
  /** "I am a woman" (self-declared). Required from 2026-10-24; Camellia is for women only. */
  womanSelfDeclared?: boolean;
  womanSelfDeclaredAt?: string;
  agreedAt?: string;
  agreedVersion?: string;
  region?: string;
  livingSituation?: string;
  usualSleep?: number;
  concerns?: string;
  purposes?: string[];
  interests: string[];
  lifestyle: string;
  availableMinutes?: number;
  priority: string;
  periodEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Checkin {
  id: string;
  mood: Mood;
  sleep?: number;
  body?: '良い' | '普通' | '疲れ気味' | '悪い';
  stress?: '低い' | '普通' | 'やや高い' | '高い';
  periodDays?: number;
  createdAt: string;
  updatedAt: string;
}
export interface ActionRecord {
  id: string;
  actionId: string;
  title: string;
  category: Category;
  status: ActionStatus;
  dismissReason?: DismissReason;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ActionFeedback {
  id: string;
  actionRecordId: string;
  actionId: string;
  rating: FeedbackRating;
  createdAt: string;
  updatedAt: string;
}
export interface SavedAction {
  id: string;
  actionId: string;
  timing: SaveTiming;
  createdAt: string;
  updatedAt: string;
}
export interface AIMessage {
  /** Only the user message can be pending; partial assistant output is never persisted. */
  pending?: boolean;
  /** On a user message: the reaction YURA / Lactone put on it (lib/conversation/reactions.ts). */
  reaction?: import('@/lib/conversation/reactions').ConversationReaction;
  requestModel?: ConversationModelId;
  id: string;
  role: 'user' | 'assistant' | 'system';
  type?: 'system_model_switch';
  from?: ConversationModelId;
  to?: ConversationModelId;
  assistantModel?: ConversationModelId | null;
  text: string;
  provider?: 'gemini' | 'fallback';
  intent?: ConversationIntent;
  topics?: ConversationTopic[];
  createdAt: string;
}
export interface AIConversation {
  activeModel?: ConversationModelId;
  id: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}
export interface ActionContext {
  mood?: Mood;
  sleep?: number;
  body?: Checkin['body'];
  stress?: Checkin['stress'];
  periodDays?: number;
  timeBand: TimeBand;
  weekday: number;
  lifestyle: string;
  availableMinutes?: number;
}
export interface ContextualActionMemory {
  id: string;
  actionId: string;
  event:
    | 'proposed'
    | 'saved'
    | 'dismissed'
    | 'started'
    | 'completed'
    | 'feedback';
  context: ActionContext;
  feedback?: FeedbackRating;
  dismissReason?: DismissReason;
  saveTiming?: SaveTiming;
  createdAt: string;
}
export interface Insight {
  fact?:string; hypothesis?:string; periodStart?:string; periodEnd?:string;
  id: string;
  key: string;
  text: string;
  confidence: number;
  sampleSize: number;
  createdAt: string;
  updatedAt: string;
}
export interface InsightFeedback {
  id: string;
  insightKey: string;
  verdict: 'correct' | 'incorrect';
  createdAt: string;
  updatedAt: string;
}
export type TreeCategory =
  | 'family'
  | 'friend'
  | 'love'
  | 'work'
  | 'learning'
  | 'other';
export type TreeMeaningTag =
  | 'precious'
  | 'energizing'
  | 'calming'
  | 'grow_together'
  | 'admire'
  | 'supportive'
  | 'curious'
  | 'fun';
export interface TreeReflection {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}
export interface TreeLeaf {
  id: string;
  name: string;
  category: TreeCategory;
  meaningTags: TreeMeaningTag[];
  note: string;
  /** removed: deleted by the person; name, note, tags and reflections are erased (the empty record keeps the deletion synced). */
  status: 'active' | 'memory' | 'removed';
  reflections: TreeReflection[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}
export interface DailyFortune {
  date: string;
  cardId: string;
  orientation: 'upright' | 'reversed';
  status: 'drawn' | 'skipped';
  actionId?: string;
  createdAt: string;
  updatedAt: string;
}
export type ReflectionStage =
  | 'first_day'
  | 'yesterday_compare'
  | 'recent'
  | 'weekly';
export type AnalyticsEventName =
  | 'place_view' | 'place_save' | 'place_external_open' | 'place_booking_open' | 'place_map_open'
  | 'session_start'
  | 'welcome_view'
  | 'welcome_continue'
  | 'login_view'
  | 'login_success'
  | 'login_skip'
  | 'profile_view'
  | 'profile_complete'
  | 'auth_method_selected'
  | 'auth_returned'
  | 'login_failure'
  | 'conversation_starter_selected'
  | 'circle_view' | 'circle_join' | 'circle_leave' | 'circle_post_create' | 'circle_comment_create' | 'circle_reaction' | 'circle_report' | 'circle_block'
  | 'conversation_open'
  | 'conversation_model_selected'
  | 'conversation_model_switched'
  | 'conversation_message_sent'
  | 'conversation_response_received'
  | 'conversation_error'
  | 'account_link_started'
  | 'account_link_success'
  | 'discover_view'
  | 'check_view'
  | 'check_start'
  | 'check_complete'
  | 'daily_reflection_view'
  | 'weekly_insight_view'
  | 'fortune_open'
  | 'fortune_draw'
  | 'fortune_complete'
  | 'fortune_action_selected'
  | 'fortune_skip'
  | 'fortune_reflect'
  | 'tree_open'
  | 'tree_add_start'
  | 'tree_add_complete'
  | 'tree_leaf_open'
  | 'tree_leaf_edit'
  | 'tree_reflection_add'
  | 'tree_archive'
  | 'conversation_reaction_shown'
  | 'invite_view' | 'invite_submit' | 'invite_accepted' | 'access_suspended_view' | 'member_invite_open' | 'member_invite_share';
export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
  /** Set only after HTTP acceptance. Restored legacy records use the existing no-replay convention. */
  forwardedAt?: string;
  sessionId?: string;
  deliverySuppressed?: 'dnt' | 'opt_out' | 'expired' | 'invalid_event' | 'restored';
}
export interface CamelliaState {
  version: 3;
  profile: Profile;
  checkins: Checkin[];
  actions: ActionRecord[];
  actionFeedback: ActionFeedback[];
  savedActions: SavedAction[];
  aiConversations: AIConversation[];
  contextualMemory: ContextualActionMemory[];
  personalMemories?: Array<{id:string;text:string;createdAt:string;updatedAt:string;source:'explicit_conversation';status?:'removed'}>;
  insights: Insight[];
  insightFeedback: InsightFeedback[];
  fortunes: DailyFortune[];
  treeLeaves: TreeLeaf[];
  analyticsEvents: AnalyticsEvent[];
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ActionDefinition {
  steps?: string[];
  id: string;
  title: string;
  category: Category;
  discoverCategory: string;
  minutes: number;
  image: string;
  description: string;
  tags: string[];
  destination?: 'circle' | 'place';
  /** Only possible inside that place (not recommended until it is live). */
  requires?: 'circle' | 'place';
  /** Choosing it opens this screen instead of starting an action. */
  opens?: 'camellia';
}
export interface Recommendation {
  action: ActionDefinition;
  score: number;
  reasons: string[];
}
