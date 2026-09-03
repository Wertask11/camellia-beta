export type Category = 'REST' | 'BODY' | 'BEAUTY' | 'PLAY' | 'LEARN' | 'CONNECT';
export type TimeBand = '朝' | '昼' | '夕方' | '夜';
export type Mood = 1 | 2 | 3 | 4 | 5;
export type ActionStatus = 'started' | 'completed' | 'skipped';
export type FeedbackRating = 'great' | 'okay' | 'same' | 'bad';
export type ConversationIntent = 'LISTEN' | 'REFLECT' | 'ADVICE' | 'ACTION' | 'CONNECT';
export type DismissReason = 'no_time' | 'not_now' | 'not_needed' | 'dislike' | 'other';
export type SaveTiming = 'later_today' | 'holiday' | 'when_free' | 'save_only';
export interface Profile { id:string; name:string; age:string; interests:string[]; lifestyle:string; availableMinutes?:number; priority:string; periodEnabled:boolean; createdAt:string; updatedAt:string }
export interface Checkin { id:string; mood:Mood; sleep?:number; body?:'良い'|'普通'|'疲れ気味'|'悪い'; stress?:'低い'|'普通'|'やや高い'|'高い'; periodDays?:number; createdAt:string; updatedAt:string }
export interface ActionRecord { id:string; actionId:string; title:string; category:Category; status:ActionStatus; dismissReason?:DismissReason; startedAt?:string; completedAt?:string; createdAt:string; updatedAt:string }
export interface ActionFeedback { id:string; actionRecordId:string; actionId:string; rating:FeedbackRating; createdAt:string; updatedAt:string }
export interface SavedAction { id:string; actionId:string; timing:SaveTiming; createdAt:string; updatedAt:string }
export interface AIMessage { id:string; role:'user'|'assistant'; text:string; intent?:ConversationIntent; createdAt:string }
export interface AIConversation { id:string; messages:AIMessage[]; createdAt:string; updatedAt:string }
export interface ActionContext { mood?:Mood; sleep?:number; body?:Checkin['body']; stress?:Checkin['stress']; periodDays?:number; timeBand:TimeBand; weekday:number; lifestyle:string; availableMinutes?:number }
export interface ContextualActionMemory { id:string; actionId:string; event:'proposed'|'saved'|'dismissed'|'started'|'completed'|'feedback'; context:ActionContext; feedback?:FeedbackRating; dismissReason?:DismissReason; saveTiming?:SaveTiming; createdAt:string }
export interface Insight { id:string; key:string; text:string; confidence:number; sampleSize:number; createdAt:string; updatedAt:string }
export interface InsightFeedback { id:string; insightKey:string; verdict:'correct'|'incorrect'; createdAt:string; updatedAt:string }
export interface CamelliaState { version:3; profile:Profile; checkins:Checkin[]; actions:ActionRecord[]; actionFeedback:ActionFeedback[]; savedActions:SavedAction[]; aiConversations:AIConversation[]; contextualMemory:ContextualActionMemory[]; insights:Insight[]; insightFeedback:InsightFeedback[]; onboardingComplete:boolean; createdAt:string; updatedAt:string }
export interface ActionDefinition { id:string; title:string; category:Category; discoverCategory:string; minutes:number; image:string; description:string; tags:string[]; destination?:'circle'|'place' }
export interface Recommendation { action:ActionDefinition; score:number; reasons:string[] }
