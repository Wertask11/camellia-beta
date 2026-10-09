import { dailyCheckins } from '@/lib/reflection/engine';
import { jstDate } from '@/lib/fortune/engine';
import type { CamelliaState } from '@/types';

export const STARTERS = {
  today: '今日あったことを話したい',
  vent: 'ちょっと愚痴りたい',
  organize: '頭の中を整理したい',
  check: '今日のCheckについて話したい',
} as const;

/** Use only the existence of today's structured record, never infer a sensitive state. */
export function conversationStarters(state: CamelliaState, now = new Date(), relationship = false) {
  const checked = dailyCheckins(state.checkins, now).some(check => jstDate(new Date(check.createdAt)) === jstDate(now));
  const ids: Array<keyof typeof STARTERS> = checked && !relationship ? ['check', 'today', 'organize'] : ['today', 'vent', 'organize'];
  return ids.map(id => ({ id, text: STARTERS[id] }));
}
