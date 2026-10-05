import { jstParts } from '@/lib/memory/engine';
import type { AnalyticsEvent, CamelliaState, Checkin } from '@/types';

export interface SchoolParkDocument {
  path: string;
  data: Record<string, unknown>;
}

const moodText = {
  1: '😢 とてもつらい',
  2: '😟 すこしつらい',
  3: '😶 ふつう',
  4: '🙂 よい',
  5: '😄 とてもよい',
} as const;
const stressValue = { 低い: 2, 普通: 5, やや高い: 7, 高い: 9 } as const;
const fatigueValue = { 良い: 2, 普通: 4, 疲れ気味: 7, 悪い: 9 } as const;
const energyValue = { 良い: 8, 普通: 6, 疲れ気味: 3, 悪い: 1 } as const;

function menstrualDate(createdAt: string, periodDays: number) {
  const date = new Date(createdAt);
  date.setUTCDate(date.getUTCDate() - periodDays);
  return jstParts(date).date;
}

export function mapCheckin(checkin: Checkin) {
  const date = jstParts(new Date(checkin.createdAt)).date;
  const data: Record<string, unknown> = {
    mood: moodText[checkin.mood],
    date,
    savedAt: checkin.createdAt,
    updatedAt: checkin.updatedAt,
  };
  if (checkin.sleep !== undefined) data.sleep = checkin.sleep;
  if (checkin.stress !== undefined) data.stress = stressValue[checkin.stress];
  if (checkin.body !== undefined) {
    data.fatigue = fatigueValue[checkin.body];
    data.energy = energyValue[checkin.body];
  }
  if (checkin.periodDays !== undefined) {
    data.cycle = `月経${checkin.periodDays}日目`;
    data.lastMenstrualDate = menstrualDate(
      checkin.createdAt,
      checkin.periodDays,
    );
  }
  return { date, data };
}

function pageFor(event: AnalyticsEvent) {
  if (event.name === 'session_start') return 'today';
  if (event.name === 'check_view') return 'check';
  if (event.name === 'fortune_open') return 'fortune';
  if (event.name === 'tree_open') return 'tree';
  return null;
}

function mapActivity(state: CamelliaState) {
  const events: Array<{ kind: string; at: string; page?: string }> = [];
  state.analyticsEvents.forEach((event) => {
    const page = pageFor(event);
    if (page) events.push({ kind: 'open', page, at: event.createdAt });
  });
  state.contextualMemory.forEach((memory) => {
    if (memory.event === 'proposed')
      events.push({ kind: 'nudge-shown', at: memory.createdAt });
    if (memory.event === 'started')
      events.push({ kind: 'nudge-click', at: memory.createdAt });
  });
  const recent = events
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-300);
  return { events: recent, total: recent.length };
}

function mapChat(state: CamelliaState) {
  const messages = state.aiConversations
    .flatMap((conversation) => conversation.messages)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-200)
    .map((message) => ({
      role: message.role,
      text: message.text,
      at: message.createdAt,
    }));
  return { messages, total: messages.length };
}


function safeImportId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180);
}

function importDocument(kind: string, id: string, value: unknown, importedAt: string): SchoolParkDocument {
  const content = JSON.stringify(value);
  return {
    path: `imports/${kind}-${safeImportId(id)}`,
    data: {
      name: `Camellia β ${kind}`,
      source: 'camellia-beta-localStorage',
      kind,
      characters: content.length,
      importedAt,
      content,
      truncated: false,
    },
  };
}

function mapLocalStorageArchive(state: CamelliaState): SchoolParkDocument[] {
  const documents: SchoolParkDocument[] = [
    importDocument('meta', 'state', {
      version: state.version,
      onboardingComplete: state.onboardingComplete,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    }, state.updatedAt),
    importDocument('profile', 'current', state.profile, state.profile.updatedAt),
  ];
  const groups: Array<[string, Array<{ id?: string; date?: string; createdAt?: string; updatedAt?: string }>]> = [
    ['checkin', state.checkins],
    ['action', state.actions],
    ['action-feedback', state.actionFeedback],
    ['saved-action', state.savedActions],
    ['conversation', state.aiConversations],
    ['context-memory', state.contextualMemory],
    ['insight', state.insights],
    ['insight-feedback', state.insightFeedback],
    ['fortune', state.fortunes],
    ['tree-leaf', state.treeLeaves],
    ['analytics', state.analyticsEvents],
  ];
  groups.forEach(([kind, items]) => items.forEach((item, index) => {
    const id = item.id || item.date || String(index);
    const at = item.updatedAt || item.createdAt || state.updatedAt;
    documents.push(importDocument(kind, id, item, at));
  }));
  return documents;
}

export function mapCamelliaState(
  state: CamelliaState,
  passport?: string,
): SchoolParkDocument[] {
  const timestamps = [
    state.updatedAt,
    state.profile.updatedAt,
    ...state.checkins.map((item) => item.updatedAt),
    ...state.aiConversations.map((item) => item.updatedAt),
    ...state.treeLeaves.map((item) => item.updatedAt),
    ...state.insights.map((item) => item.updatedAt),
  ].filter(Boolean);
  const root: Record<string, unknown> = {
    updatedAt: timestamps.sort().at(-1) || state.createdAt,
    accountCreatedAt: state.profile.createdAt,
    profileCompletedAt: state.profile.profileCompletedAt || null,
    profileComplete: Boolean(state.profile.profileCompletedAt),
    birthDate: state.profile.dateOfBirth || '',
  };
  if (passport) root.passport = passport;
  const profile = state.profile;
  const basic: Record<string, unknown> = {
    displayName: profile.name,
    occupation: profile.lifestyle,
    goal: profile.priority,
    birthYear: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 4) : profile.age,
    dateOfBirth: profile.dateOfBirth || null,
    age: profile.dateOfBirth ? profile.age : null,
    interests: profile.interests,
    periodEnabled: profile.periodEnabled,
    residencePrefecture: profile.residencePrefecture || null,
    livingSituation: profile.livingSituation || null,
    baselineSleepHours: profile.baselineSleepHours ?? null,
    concerns: profile.concerns || [],
    goals: profile.goals || [],
    womenWellbeingConfirmedAt: profile.womenWellbeingConfirmedAt || null,
    policyConfirmedAt: profile.policyConfirmedAt || null,
    termsAcceptedAt: profile.termsAcceptedAt || null,
    privacyAcknowledgedAt: profile.privacyAcknowledgedAt || null,
    policyVersion: profile.policyVersion || null,
  };
  if (profile.availableMinutes !== undefined)
    basic.availableMinutes = profile.availableMinutes;

  const latestByDate = new Map<string, Checkin>();
  state.checkins.forEach((checkin) => {
    const { date } = mapCheckin(checkin);
    const previous = latestByDate.get(date);
    if (!previous || previous.createdAt < checkin.createdAt)
      latestByDate.set(date, checkin);
  });

  return [
    { path: '', data: root },
    { path: 'profile/basic', data: basic },
    {
      path: 'profile/settings',
      data: {
        saveData: true,
        allowLocation: false,
        useImported: false,
        externalLlm: false,
        aiModel: 'camellia-beta-rule-based',
      },
    },
    { path: 'profile/chat', data: mapChat(state) },
    { path: 'profile/activity', data: mapActivity(state) },
    ...[...latestByDate.values()].map((checkin) => {
      const mapped = mapCheckin(checkin);
      return { path: `daily/${mapped.date}`, data: mapped.data };
    }),
    ...mapLocalStorageArchive(state),
  ];
}
