'use client';
import { useMemo } from 'react';
import { welcomeTheme } from '@/lib/welcome/time';
export function WelcomeScreen({onContinue}:{onContinue:()=>void}) {
  const theme=useMemo(()=>welcomeTheme(),[]);
  return <main className={`welcome welcome--${theme.period}`}><div className="welcome-glow" aria-hidden="true"/><div className="welcome-petal petal-one" aria-hidden="true"/><div className="welcome-petal petal-two" aria-hidden="true"/><section className="welcome-content" aria-labelledby="welcome-title"><p className="welcome-time">{theme.label}</p><div className="camellia-bloom" aria-hidden="true"><i/><i/><i/><i/><i/><b/></div><p className="welcome-brand">Camellia</p><h1 id="welcome-title">{theme.greeting}</h1><p className="welcome-prompt">{theme.prompt}</p><button className="welcome-primary" onClick={onContinue}>今日のわたしに会いにいく</button><small>30秒のCheckから、すぐに始められます。</small></section></main>;
}
