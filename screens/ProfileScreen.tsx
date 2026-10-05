'use client';

import { useMemo, useState } from 'react';
import type { Profile } from '@/types';

const POLICY_VERSION = '2026-10-05';

function ageOf(dateOfBirth: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth.toLocaleDateString('sv-SE') !== dateOfBirth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age <= 120 ? age : null;
}

export function ProfileScreen({
  profile,
  mode,
  onSave,
  onBack,
}: {
  profile: Profile;
  mode: 'initial' | 'edit';
  onSave: (next: Partial<Profile>) => void;
  onBack?: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? '');
  const [womenConfirmed, setWomenConfirmed] = useState(Boolean(profile.womenWellbeingConfirmedAt));
  const [policyConfirmed, setPolicyConfirmed] = useState(profile.policyVersion === POLICY_VERSION);
  const [dataConsent, setDataConsent] = useState(profile.policyVersion === POLICY_VERSION && Boolean(profile.sensitiveDataConsentAt));
  const [residencePrefecture, setResidencePrefecture] = useState(profile.residencePrefecture ?? '');
  const [lifestyle, setLifestyle] = useState(profile.lifestyle);
  const [livingSituation, setLivingSituation] = useState(profile.livingSituation ?? '');
  const [periodEnabled, setPeriodEnabled] = useState(profile.periodEnabled);
  const [baselineSleepHours, setBaselineSleepHours] = useState(profile.baselineSleepHours?.toString() ?? '');
  const [concerns, setConcerns] = useState(profile.concerns ?? []);
  const [goals, setGoals] = useState(profile.goals ?? []);
  const [error, setError] = useState('');
  const age = useMemo(() => ageOf(dateOfBirth), [dateOfBirth]);
  const toggle = (value: string, current: string[], set: (next: string[]) => void) =>
    set(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const save = () => {
    if (!name.trim()) return setError('呼ばれたい名前を入力してください。');
    if (!dateOfBirth || age === null) return setError('生年月日を正しく入力してください。');
    if (age < 18 || age > 45) return setError('Camelliaは18〜45歳の女性向けサービスです。');
    if (!womenConfirmed) return setError('Camelliaが女性向けサービスであることを確認してください。');
    if (!policyConfirmed) return setError('利用規約とプライバシーポリシーを確認してください。');
    if (!dataConsent) return setError('健康や気分などの記録と運営による閲覧について確認してください。');
    const now = new Date().toISOString();
    const currentPolicyAccepted = profile.policyVersion === POLICY_VERSION;
    onSave({
      name: name.trim().slice(0, 80),
      dateOfBirth,
      age: `${age}歳`,
      womenWellbeingConfirmedAt: profile.womenWellbeingConfirmedAt ?? now,
      policyConfirmedAt: currentPolicyAccepted ? (profile.policyConfirmedAt ?? now) : now,
      termsAcceptedAt: currentPolicyAccepted ? (profile.termsAcceptedAt ?? now) : now,
      privacyAcknowledgedAt: currentPolicyAccepted ? (profile.privacyAcknowledgedAt ?? now) : now,
      sensitiveDataConsentAt: currentPolicyAccepted ? (profile.sensitiveDataConsentAt ?? now) : now,
      policyVersion: POLICY_VERSION,
      profileCompletedAt: profile.profileCompletedAt ?? now,
      residencePrefecture,
      lifestyle,
      livingSituation,
      periodEnabled,
      baselineSleepHours: baselineSleepHours ? Number(baselineSleepHours) : undefined,
      concerns,
      goals,
    });
  };

  return <main className="screen profile-setup">
    {onBack && <button className="back-link" onClick={onBack}>← Myへ戻る</button>}
    <p className="eyebrow">{mode === 'initial' ? 'はじめに、あなたのことを少し' : 'プロフィール'}</p>
    <h1>{mode === 'initial' ? 'Camelliaを、あなたのための場所に' : 'あなたのプロフィール'}</h1>
    <p className="empty">必須なのは、呼ばれたい名前と生年月日、2つの確認だけです。ほかはあとから変更できます。</p>
    <label>呼ばれたい名前 <span aria-hidden="true">＊</span>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例：さくら" autoComplete="nickname" />
    </label>
    <label>生年月日 <span aria-hidden="true">＊</span>
      <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} max={new Date().toLocaleDateString('sv-SE')} autoComplete="bday" />
      {age !== null && <small>現在 {age}歳</small>}
    </label>
    <label className="toggle"><input type="checkbox" checked={womenConfirmed} onChange={(event) => setWomenConfirmed(event.target.checked)} />
      Camelliaは女性のためのウェルネス・ウェルビーイングサービスであることを確認しました。
    </label>
    <div className="policy-consent"><label className="toggle"><input type="checkbox" checked={policyConfirmed} onChange={(event) => setPolicyConfirmed(event.target.checked)} required />
      利用規約とプライバシーポリシーを確認し、同意します。
    </label><p><a href="/terms.html" target="_blank" rel="noopener noreferrer">Camellia利用規約</a> ・ <a href="/privacy.html" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a></p></div>
    <label className="toggle"><input type="checkbox" checked={dataConsent} onChange={(event) => setDataConsent(event.target.checked)} required />
      気分・睡眠・身体などの記録を保存し、権限を持つ運営者が管理画面で閲覧する場合があることを確認しました。
    </label>
    <details>
      <summary>任意で設定する</summary>
      <label>居住地域（都道府県）<input value={residencePrefecture} onChange={(event) => setResidencePrefecture(event.target.value)} placeholder="例：福岡県" /></label>
      <label>生活スタイル<select value={lifestyle} onChange={(event) => setLifestyle(event.target.value)}>
        <option value="">選ばない</option><option>仕事中心</option><option>仕事と育児</option><option>学業中心</option><option>家事・ケア中心</option><option>シフト勤務</option>
      </select></label>
      <label>同居状況<select value={livingSituation} onChange={(event) => setLivingSituation(event.target.value)}>
        <option value="">選ばない</option><option>ひとり暮らし</option><option>家族と暮らしている</option><option>パートナーと暮らしている</option><option>その他</option>
      </select></label>
      <label>普段の睡眠時間<input type="number" inputMode="decimal" min="0" max="24" step="0.5" value={baselineSleepHours} onChange={(event) => setBaselineSleepHours(event.target.value)} placeholder="例：7" /></label>
      <fieldset><legend>今気になっていること</legend><div className="chips">{['身体','気分','睡眠','ストレス','仕事','人間関係','恋愛','生活'].map((value) => <button type="button" className={concerns.includes(value) ? 'selected' : ''} key={value} onClick={() => toggle(value, concerns, setConcerns)}>{value}</button>)}</div></fieldset>
      <fieldset><legend>Camelliaを使う目的</legend><div className="chips">{['心を整えたい','身体を整えたい','生活を整えたい','自分を知りたい','人間関係','仕事','恋愛','その他'].map((value) => <button type="button" className={goals.includes(value) ? 'selected' : ''} key={value} onClick={() => toggle(value, goals, setGoals)}>{value}</button>)}</div></fieldset>
      <label className="toggle"><input type="checkbox" checked={periodEnabled} onChange={(event) => setPeriodEnabled(event.target.checked)} />月経に関する入力を使う</label>
    </details>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="primary" onClick={save}>{mode === 'initial' ? 'Todayをはじめる' : '保存する'}</button>
  </main>;
}
