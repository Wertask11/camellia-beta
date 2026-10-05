export type WelcomePeriod = 'morning' | 'day' | 'evening' | 'night';
export interface WelcomeTheme { period: WelcomePeriod; label: string; greeting: string; prompt: string }
export function welcomeTheme(date = new Date()): WelcomeTheme {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return {period:'morning',label:'朝のCamellia',greeting:'おはよう。',prompt:'今日のわたしは、どんな感じ？'};
  if (hour >= 11 && hour < 17) return {period:'day',label:'昼のCamellia',greeting:'ちょっとだけ、自分の時間。',prompt:'今のわたしは、どんな感じ？'};
  if (hour >= 17 && hour < 21) return {period:'evening',label:'夕方のCamellia',greeting:'今日も、ここまでおつかれさま。',prompt:'今のわたしを、少し見てみる？'};
  return {period:'night',label:'夜のCamellia',greeting:'おつかれさま。',prompt:'今日は、どんな一日だった？'};
}
