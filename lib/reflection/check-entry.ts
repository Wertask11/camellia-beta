import { dailyCheckins, jstDayOffset } from '@/lib/reflection/engine';
import { jstDate } from '@/lib/fortune/engine';
import type { Checkin } from '@/types';

export function checkEntryCopy(checkins: Checkin[], now: Date) {
  const checks = dailyCheckins(checkins, now);
  const today = jstDate(now);
  const prior = checks.filter(
    (check) => jstDate(new Date(check.createdAt)) !== today,
  );

  if (checks.some((check) => jstDate(new Date(check.createdAt)) === today))
    return {
      title: '今日のあなたを、もう少し見てみる？',
      prompt: '今の気分が変わったら、ここからもう一度選べます。',
    };
  if (prior.length >= 7)
    return {
      title: '最近のあなたに、どんな変化がある？',
      prompt: '今の気分をひとつ。直近7回の記録と一緒に見てみましょう。',
    };
  if (prior.length >= 2)
    return {
      title: '最近の私、どんな感じ？',
      prompt: '今の気分をひとつ。これまでの記録と一緒に見てみましょう。',
    };
  if (
    prior.some(
      (check) =>
        jstDate(new Date(check.createdAt)) === jstDayOffset(now, -1),
    )
  )
    return {
      title: '昨日と今日、何が違う？',
      prompt: '今の気分をひとつ。昨日との違いも見えてきます。',
    };
  return {
    title: '今日の私は、どんな感じ？',
    prompt: 'Checkすると、今日のあなたが少し見えてきます。',
  };
}
