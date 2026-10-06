import type { Checkin } from '@/types';
export function checkInputError(check: Pick<Checkin,'mood'|'sleep'|'body'|'stress'|'periodDays'>) {
  if(![1,2,3,4,5].includes(check.mood))return '今の気分に近いものをひとつ選んでください。';
  if(check.sleep!==undefined&&(!Number.isFinite(check.sleep)||check.sleep<0||check.sleep>14))return '睡眠は0〜14時間の範囲で入力してください。';
  if(check.periodDays!==undefined&&(!Number.isInteger(check.periodDays)||check.periodDays<0||check.periodDays>365))return '生理予定までの日数は0〜365の整数で入力してください。';
  return '';
}
