import type { CamelliaState } from '@/types';

type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const text = (v: unknown): v is string => typeof v === 'string';
const strings = (v: unknown) => Array.isArray(v) && v.every(text);
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
const oneOf = (v: unknown, values: readonly unknown[]) => values.includes(v);
const optional = (r: Row, key: string, check: (v: unknown) => boolean) => r[key] === undefined || check(r[key]);
const category = (v: unknown) => oneOf(v, ['REST','BODY','BEAUTY','PLAY','LEARN','CONNECT']);
const record = (v: unknown): v is Row => object(v) && text(v.id) && date(v.createdAt) && optional(v,'updatedAt',date);
const message = (v: unknown) => record(v) && text(v.text) && oneOf(v.role,['user','assistant']) && optional(v,'topics',strings);
const reflection = (v: unknown) => record(v) && text(v.text);
const checks: Record<string, (v: unknown) => boolean> = {
  checkins: v => record(v) && oneOf(v.mood,[1,2,3,4,5]) && optional(v,'sleep',x=>typeof x==='number'&&Number.isFinite(x)) && optional(v,'body',x=>oneOf(x,['良い','普通','疲れ気味','悪い'])) && optional(v,'stress',x=>oneOf(x,['低い','普通','やや高い','高い'])),
  actions: v => record(v) && text(v.actionId) && text(v.title) && category(v.category) && oneOf(v.status,['started','completed','skipped']),
  actionFeedback: v => record(v) && text(v.actionRecordId) && text(v.actionId) && oneOf(v.rating,['great','okay','same','bad']),
  savedActions: v => record(v) && text(v.actionId) && oneOf(v.timing,['later_today','holiday','when_free','save_only']),
  aiConversations: v => record(v) && Array.isArray(v.messages) && v.messages.every(message),
  contextualMemory: v => record(v) && text(v.actionId) && oneOf(v.event,['proposed','saved','dismissed','started','completed','feedback']) && object(v.context) && text(v.context.timeBand) && typeof v.context.weekday==='number' && text(v.context.lifestyle),
  personalMemories: v => record(v) && text(v.text) && v.source==='explicit_conversation',
  insights: v => record(v) && text(v.key) && text(v.text) && typeof v.confidence==='number' && typeof v.sampleSize==='number',
  insightFeedback: v => record(v) && text(v.insightKey) && oneOf(v.verdict,['correct','incorrect']),
  fortunes: v => object(v) && date(v.date) && date(v.createdAt) && text(v.cardId) && oneOf(v.orientation,['upright','reversed']) && oneOf(v.status,['drawn','skipped']),
  treeLeaves: v => record(v) && text(v.name) && text(v.note) && oneOf(v.category,['family','friend','love','work','learning','other']) && strings(v.meaningTags) && oneOf(v.status,['active','memory','removed']) && Array.isArray(v.reflections) && v.reflections.every(reflection),
  analyticsEvents: v => record(v) && text(v.name) && optional(v,'properties',x=>object(x)&&Object.values(x).every(y=>text(y)||typeof y==='boolean'||typeof y==='number')),
};

/** Keep the source blob untouched. A recovered projection must never overwrite or sync the source. */
export function validateStoredState(raw: unknown, base: CamelliaState, legacy = false) {
  if (!object(raw)) throw new Error('LOCAL_DATA_UNREADABLE');
  const issues: string[] = [];
  // Preserve unrecognized root fields from older/newer clients without rendering or syncing them.
  // Known fields are initialized safely, then validated below.
  const state = { ...raw, ...base };
  if (!legacy && raw.version !== 3) issues.push('version');
  const p = raw.profile;
  if (object(p) && text(p.id) && text(p.name) && strings(p.interests)
    && ['age','birthDate','lifestyle','priority','region','livingSituation','concerns','agreedAt','agreedVersion','createdAt','updatedAt'].every(k=>optional(p,k,text))
    && optional(p,'purposes',strings) && optional(p,'periodEnabled',x=>typeof x==='boolean')) {
    state.profile = { ...base.profile, ...p } as CamelliaState['profile'];
  } else issues.push('profile');
  for (const [field, check] of Object.entries(checks)) {
    let values = raw[field];
    if (values === undefined) continue; // Earlier versions did not contain all collections.
    if (!Array.isArray(values)) { issues.push(field); continue; }
    if (legacy && field==='savedActions') values = values.map(v=>object(v)?{...v,timing:v.timing??'save_only'}:v);
    const safe = (values as unknown[]).filter(check);
    if (safe.length !== (values as unknown[]).length) issues.push(field);
    // Only this validated in-memory projection omits invalid records; originals remain exportable.
    (state as unknown as Row)[field] = safe;
  }
  state.onboardingComplete = raw.onboardingComplete === true;
  if(raw.onboardingComplete!==undefined&&typeof raw.onboardingComplete!=='boolean')issues.push('onboardingComplete');
  if(raw.createdAt!==undefined&&!date(raw.createdAt))issues.push('createdAt');
  if(raw.updatedAt!==undefined&&!date(raw.updatedAt))issues.push('updatedAt');
  if (date(raw.createdAt)) state.createdAt = raw.createdAt as string;
  if (date(raw.updatedAt)) state.updatedAt = raw.updatedAt as string;
  return { state, issues };
}

export class LocalDataRecoveryError extends Error {
  constructor(public readonly recovered: CamelliaState, public readonly issues: string[]) {
    super('LOCAL_DATA_UNREADABLE');
  }
}
