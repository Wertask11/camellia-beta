import { useState } from 'react';
import { currentAge, MIN_AGE, MAX_AGE } from '@/lib/profile';
import type { Profile } from '@/types';
/** existing: someone who already used Camellia (β) and is asked once for what v1 requires; their records stay. */
export function ProfileScreen({profile,onSave,onBack,existing=false}:{profile:Profile;onSave:(patch:Partial<Profile>)=>void;onBack?:()=>void;existing?:boolean}) {
  const [name,setName]=useState(profile.name),[birthDate,setBirthDate]=useState(profile.birthDate??''),[women,setWomen]=useState(profile.womenServiceAcknowledged??false),[agreed,setAgreed]=useState(Boolean(profile.agreedAt));
  const [region,setRegion]=useState(profile.region??''),[lifestyle,setLifestyle]=useState(profile.lifestyle),[living,setLiving]=useState(profile.livingSituation??''),[sleep,setSleep]=useState(String(profile.usualSleep??'')),[concerns,setConcerns]=useState(profile.concerns??''),[purposes,setPurposes]=useState(profile.purposes??[]),[period,setPeriod]=useState(profile.periodEnabled),[minutes,setMinutes]=useState(String(profile.availableMinutes??''));
  const age=currentAge(birthDate),valid=Boolean(name.trim()&&age!==undefined&&age>=MIN_AGE&&age<=MAX_AGE&&women&&agreed);
  return <main className="screen profile-screen">
    {onBack&&<button className="back" onClick={onBack}>← Myへ</button>}
    <header><div><p className="eyebrow">あなたのCamellia</p><h1>{onBack?'プロフィール':existing?'少しだけ、確認させてください。':'はじめに、少しだけ。'}</h1></div></header>
    {!onBack&&existing&&<p className="meta">これまでの記録は、そのまま残っています。続けるために、生年月日と、利用規約・プライバシーポリシーへの同意を確認させてください。</p>}
    <form onSubmit={e=>{e.preventDefault();if(!valid)return;onSave({name:name.trim(),birthDate,womenServiceAcknowledged:women,agreedAt:profile.agreedAt||new Date().toISOString(),agreedVersion:profile.agreedVersion||'2026-10-06',region,lifestyle,livingSituation:living,usualSleep:sleep?Number(sleep):undefined,concerns,purposes,periodEnabled:period,availableMinutes:minutes?Number(minutes):undefined});}}>
      <label>名前／ニックネーム<input required autoComplete="off" maxLength={30} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>生年月日<input required type="date" autoComplete="bday" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label>
      {age!==undefined&&<p className="meta">現在 {age}歳（生年月日から自動計算）</p>}
      {birthDate&&!valid&&(age===undefined||age<MIN_AGE||age>MAX_AGE)&&<p role="alert">Camelliaは18〜45歳の女性向けサービスです。生年月日を確認してください。</p>}
      <label className="profile-check"><input type="checkbox" checked={women} onChange={e=>setWomen(e.target.checked)}/>女性向けウェルビーイングサービスであることを確認しました（自己申告）</label>
      <label className="profile-check"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span><a href="/terms.html" target="_blank" rel="noopener">利用規約</a>・<a href="/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>に同意します。</span></label>
      <p className="meta">記録はこの端末とFirestoreに保存され、運営が内容を確認することがあります。</p>
      <details><summary>もう少し自分のことを添える（任意）</summary>
        <label>居住地域（都道府県程度）<input maxLength={20} value={region} onChange={e=>setRegion(e.target.value)}/></label>
        <label>職業／生活スタイル<input maxLength={60} value={lifestyle} onChange={e=>setLifestyle(e.target.value)}/></label>
        <label>同居状況<input maxLength={60} value={living} onChange={e=>setLiving(e.target.value)}/></label>
        <label>普段の睡眠（時間）<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={e=>setSleep(e.target.value)}/></label>
        <label>過ごし方に使える時間（分）<input type="number" min="1" max="1440" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>
        <label>今気になっていること<textarea maxLength={200} value={concerns} onChange={e=>setConcerns(e.target.value)}/></label>
        <fieldset><legend>使う目的（複数選択可）</legend>{['心を整えたい','身体を整えたい','生活を整えたい','自分を知りたい','人間関係','仕事','恋愛','その他'].map(value=><label className="profile-check" key={value}><input type="checkbox" checked={purposes.includes(value)} onChange={()=>setPurposes(items=>items.includes(value)?items.filter(x=>x!==value):[...items,value])}/>{value}</label>)}</fieldset>
        <label className="profile-check"><input type="checkbox" checked={period} onChange={e=>setPeriod(e.target.checked)}/>月経関連の記録を提案に使う</label>
      </details>
      <button className="primary" disabled={!valid} type="submit">{onBack?'変更を保存する':'今日の私をCheckする'}</button>
    </form>
  </main>;
}
