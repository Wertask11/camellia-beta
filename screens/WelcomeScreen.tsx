'use client';
import { useMemo } from 'react';
import { welcomeTheme } from '@/lib/welcome/time';
export function WelcomeScreen({onContinue}:{onContinue:()=>void}) {
  const theme=useMemo(()=>welcomeTheme(),[]);
  return <main className={`welcome welcome--${theme.period}`}><div className="welcome-glow" aria-hidden="true"/><div className="welcome-petal petal-one" aria-hidden="true"/><div className="welcome-petal petal-two" aria-hidden="true"/><section className="welcome-content" aria-labelledby="welcome-title"><p className="welcome-time">{theme.label}</p><div className="camellia-bloom" aria-hidden="true"><i/><i/><i/><i/><i/><b/></div><p className="welcome-brand">Camellia</p><h1 id="welcome-title">{theme.greeting}</h1><p className="welcome-prompt">今日は、自分のために何する？</p><p className="welcome-value">1分のCheckから、今日の自分を知る。<br/>昨日との違いと、今日の過ごし方を<br/>Camelliaが一緒に考えます。</p><button className="welcome-primary" onClick={onContinue}>今日のわたしに会いにいく</button><small>Camellia β2 · 気分をひとつ選ぶことから。</small></section></main>;
}
