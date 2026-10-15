import { ACTIONS } from '../../data/actions.js';
import { getTodayJstDate } from './gemini-server.js';
const stages: Record<string, string> = {
  unchecked: 'Check前',
  checked: 'Check後',
  action_selected: '今日の過ごし方を選択済み',
  reflected: '今日の一枚まで確認済み',
};
export function safeTodayContext(value: {
  stage?: unknown;
  actionId?: unknown;
}) {
  const stage =
    typeof value.stage === 'string' ? stages[value.stage] : undefined;
  const action = ACTIONS.find(
    (item) => item.id === value.actionId && !item.destination,
  );
  return stage || action
    ? `\nCurrent Camellia context（参考・状態を決めつけない）:\n${stage ? `Today stage: ${stage}\n` : ''}${action ? `今日選択した過ごし方: ${action.title}\n` : ''}`
    : '';
}
export async function getSafeTodayContext(uid: string, token: string) {
  const url = `https://firestore.googleapis.com/v1/projects/emusch-2a111/databases/(default)/documents/camellia_users/${encodeURIComponent(uid)}/daily_context/${getTodayJstDate()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return '';
  const result = (await response.json()) as {
    fields?: Record<string, { stringValue?: unknown }>;
  };
  return safeTodayContext({
    stage: result.fields?.stage?.stringValue,
    actionId: result.fields?.actionId?.stringValue,
  });
}
