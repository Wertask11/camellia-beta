export type Category =
  | 'REST'
  | 'BODY'
  | 'BEAUTY'
  | 'PLAY'
  | 'LEARN'
  | 'CONNECT';
export type TimeBand = '朝' | '昼' | '夕方' | '夜';
export type Mood = 1 | 2 | 3 | 4 | 5;
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
  id: string;
  name: string;
  age: string;
  birthDate?: string;
  womenServiceAcknowledged?: boolean;
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
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: ConversationIntent;
  topics?: ConversationTopic[];
  createdAt: string;
}
export interface AIConversation {
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
  | 'session_start'
  | 'welcome_view'
  | 'welcome_continue'
  | 'login_view'
  | 'login_success'
  | 'login_skip'
  | 'profile_view'
  | 'profile_complete'
  | 'auth_method_selected'
  | 'conversation_starter_selected'
  | 'account_link_started'
  | 'account_link_success'
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
  | 'tree_archive';
export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
  forwardedAt?: string;
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
