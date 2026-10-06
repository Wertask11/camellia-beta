import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ configFile: false, root, resolve: { alias: { '@': root } }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { generateInsightCandidates, selectDisplayableInsight } = await server.ssrLoadModule('/lib/insight/candidates.ts');
  const { generateInsights } = await server.ssrLoadModule('/lib/insight/engine.ts');
  const { buildCamelliaContext } = await server.ssrLoadModule('/lib/conversation/context.ts');
  const { RuleBasedProcessor } = await server.ssrLoadModule('/lib/conversation/engine.ts');
  const now = new Date('2026-10-06T12:00:00+09:00');
  const record = (daysAgo, mood, extra = {}) => ({ id: `check-${daysAgo}`, mood, ...extra, createdAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(), updatedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString() });
  const blank = { version: 3, profile: { id: 'p', name: 'Private Name', age: '30', birthDate: '1996-01-01', concerns: 'private concern', interests: ['読書'], availableMinutes: 10, periodEnabled: true }, checkins: [], actions: [], actionFeedback: [], savedActions: [], aiConversations: [], contextualMemory: [], insights: [], insightFeedback: [], fortunes: [], treeLeaves: [], analyticsEvents: [], onboardingComplete: true, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  const types = (state, at = now) => generateInsightCandidates(state, at);

  assert.deepEqual(types(blank), [], 'zero observations produce no insight');
  assert.deepEqual(types({ ...blank, checkins: [record(0, 4)] }), [], 'one observation produces no insight');
  assert.deepEqual(types({ ...blank, checkins: [record(0, 4), record(1, 3), record(2, 2)] }), [], 'below-threshold history stays quiet');
  assert.equal(selectDisplayableInsight([{ type: 'mood_trend', observations: 6, confidence: 0.599, text: '', key: '', summaryData: {} }]), undefined, 'confidence below 0.6 is hidden');
  assert.equal(selectDisplayableInsight([{ type: 'mood_trend', observations: 3, confidence: 0.9, text: '', key: '', summaryData: {} }]), undefined, 'fewer than four observations is hidden');
  assert.ok(selectDisplayableInsight([{ type: 'mood_trend', observations: 4, confidence: 0.6, text: '', key: '', summaryData: {} }]), 'confidence 0.6 with four observations can be shown');
  assert.deepEqual(generateInsights({ ...blank, checkins: [record(0, 4), record(1, 2)] }, now), [], 'My insights also hides a two-point comparison');

  const upYesterday = types({ ...blank, checkins: [record(0, 4), record(1, 2)] });
  assert.equal(upYesterday[0].type, 'yesterday_difference');
  assert.match(upYesterday[0].text, /上向いて/);
  const downYesterday = types({ ...blank, checkins: [record(0, 2), record(1, 4)] });
  assert.match(downYesterday[0].text, /重め/);

  const risingWeek = [2, 2, 2, 4, 4, 4, 4].map((mood, i) => record(6 - i, mood));
  const rising = types({ ...blank, checkins: risingWeek });
  assert.ok(rising.some((candidate) => candidate.type === 'mood_trend' && candidate.summaryData.delta > 0));
  const fallingWeek = [5, 5, 5, 3, 3, 3, 3].map((mood, i) => record(6 - i, mood));
  const falling = types({ ...blank, checkins: fallingWeek });
  assert.ok(falling.some((candidate) => candidate.type === 'mood_trend' && candidate.summaryData.delta < 0));
  assert.ok(generateInsights({ ...blank, checkins: risingWeek }, now).some((item) => item.confidence >= 0.6 && item.sampleSize >= 4), 'My insights uses the same minimum display threshold');

  const weekComparison = [
    ...Array.from({ length: 7 }, (_, i) => record(i, 5)),
    ...Array.from({ length: 7 }, (_, i) => record(i + 7, 2)),
  ];
  const weekly = types({ ...blank, checkins: weekComparison });
  assert.ok(weekly.some((candidate) => candidate.type === 'weekly_average' && candidate.observations === 14));
  assert.ok(weekly.every((candidate) => candidate.confidence >= 0 && candidate.confidence <= 1));

  const pairedActions = [2, 4, 6, 8].map((daysAgo) => ({ id: `memory-${daysAgo}`, actionId: 'walk', event: 'started', context: { mood: 2, timeBand: '夕方', weekday: 1, lifestyle: '仕事' }, createdAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString() }));
  const pairedChecks = [2, 4, 6, 8].map((daysAgo) => record(daysAgo, 2)).concat([1, 3, 5, 7].map((daysAgo) => record(daysAgo, 4)));
  const actionInsight = types({ ...blank, contextualMemory: pairedActions, checkins: pairedChecks }).find((item) => item.type === 'action_following_check');
  assert.ok(actionInsight && actionInsight.observations === 4, 'Check before Action and next-day Check require four paired days');
  assert.match(actionInsight.text, /記録上の並び/);
  assert.ok(!/散歩したから|回復しました|原因/.test(actionInsight.text), 'correlation is not turned into causation');
  const noBaseline = types({ ...blank, contextualMemory: pairedActions, checkins: pairedChecks.filter((check) => ![2, 4, 6, 8].includes(Number(check.id.slice(6)))) });
  assert.ok(!noBaseline.some((item) => item.type === 'action_following_check'), 'Action without a prior same-day Check is not paired');

  const repeatedMemory = [1, 2, 3, 4].flatMap((daysAgo) => [
    { id: `start-${daysAgo}`, actionId: 'walk', event: 'started', context: { mood: 3, timeBand: '昼', weekday: 1, lifestyle: '仕事' }, createdAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString() },
    { id: `done-${daysAgo}`, actionId: 'walk', event: 'completed', context: { mood: 3, timeBand: '昼', weekday: 1, lifestyle: '仕事' }, createdAt: new Date(now.getTime() - daysAgo * 86_400_000 + 1000).toISOString() },
  ]);
  const repeated = types({ ...blank, contextualMemory: repeatedMemory }).find((item) => item.type === 'repeated_choice');
  assert.equal(repeated.observations, 4, 'start+complete on one day count as one repeated-choice observation');
  assert.equal(repeated.summaryData.distinctDays, 4);
  assert.ok(!/あなたは|必ず|原因/.test(repeated.text));
  const futureAction = { id: 'future', actionId: 'walk', event: 'started', context: { mood: 3, timeBand: '昼', weekday: 1, lifestyle: '仕事' }, createdAt: new Date(now.getTime() + 86_400_000).toISOString() };
  assert.ok(!types({ ...blank, contextualMemory: [futureAction] }).some((item) => item.type === 'repeated_choice'), 'future actions do not enter patterns');
  const savedMemory = [1, 2, 3].map((daysAgo) => ({ id: `saved-${daysAgo}`, actionId: 'walk', event: 'saved', context: { timeBand: '昼', weekday: 1, lifestyle: '仕事' }, createdAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString() }));
  assert.ok(!generateInsights({ ...blank, contextualMemory: [...savedMemory, { ...futureAction, event: 'saved' }] }, now).some((item) => item.key === 'saved-not-done-walk'), 'future saved actions do not satisfy the minimum sample count');

  const jstNow = new Date('2026-10-05T15:01:00.000Z'); // 2026-10-06 00:01 JST
  const jstState = {
    ...blank,
    checkins: [
      { ...record(0, 2), id: 'yesterday-start', createdAt: '2026-10-04T15:00:00.000Z' },
      { ...record(0, 3), id: 'yesterday-end', createdAt: '2026-10-05T14:59:00.000Z' },
      { ...record(0, 5), id: 'today-start', createdAt: '2026-10-05T15:00:00.000Z' },
      { ...record(0, 1), id: 'future-today', createdAt: '2026-10-05T15:02:00.000Z' },
    ],
  };
  const boundary = types(jstState, jstNow).find((item) => item.type === 'yesterday_difference');
  assert.equal(boundary.summaryData.today, 5, 'JST midnight is the date boundary and a later same-day duplicate is deduplicated');
  assert.equal(boundary.summaryData.yesterday, 3);
  assert.equal(boundary.summaryData.difference, 2, 'future Check from the same JST date is excluded');

  const contextHistory = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `message-${i}-` + '🍀'.repeat(300), id: String(i), createdAt: new Date(now.getTime() - (9 - i) * 1000).toISOString() }));
  const stateForContext = {
    ...blank,
    checkins: [record(1, 2), record(0, 4, { periodDays: 3, body: undefined, sleep: undefined, stress: undefined })],
    contextualMemory: [futureAction, repeatedMemory[0]],
  };
  const context = buildCamelliaContext(stateForContext, [], contextHistory, now);
  assert.ok(context.recentPatterns.length > 0);
  assert.equal(context.conversationHistory.length, 4, 'only four recent messages reach the processor');
  assert.ok(context.conversationHistory.every((message) => [...message.text].length <= 280), 'each conversation item is capped at 280 Unicode characters');
  assert.equal(context.conversationHistory[0].text.includes('message-5-'), true);
  assert.equal(context.conversationHistory[0].text.includes('message-4-'), false);
  assert.equal(JSON.stringify(context).includes('Private Name'), false, 'profile name is excluded');
  assert.equal(JSON.stringify(context).includes('private concern'), false, 'profile free text is excluded');
  assert.equal(JSON.stringify(context).includes('periodDays'), false, 'menstrual data is excluded');
  assert.equal(context.today.mood, 4);
  assert.equal(context.today.sleep, undefined, 'missing check fields remain absent');
  assert.equal(context.recentChoices.length, 1, 'future action data does not enter context');
  assert.equal(context.recentChoices[0].title, 'walk');

  const response = RuleBasedProcessor.respond('最近の傾向を教えて', context);
  assert.ok(response.text.length > 0);
  assert.ok(!/だから回復|原因です|あなたは/.test(response.text));
  assert.equal(RuleBasedProcessor.respond.length, 2, 'processor receives only input and bounded context, not raw full history');
  console.log('gentle insights/context: PASS (0/1/threshold, confidence, up/down, weekly, JST/future boundaries, action pairs/repeats, missing fields, non-causal language, PII minimization, bounded processor input)');
} finally { await server.close(); }
