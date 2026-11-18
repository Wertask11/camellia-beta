'use client';
import {identityEvent} from '@/lib/analytics/identity';
import {useState} from 'react';
import {emailIdService,emailIdError} from '@/lib/auth/email-id';
export function EmailIdSettings(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 return <section className="panel"><h2>メールでも引き継ぐ</h2><p>今のCamellia IDにメールを追加します。LINE・Googleの記録やPlusの権利はそのままです。</p><form onSubmit={e=>{e.preventDefault();if(busy)return;identityEvent('camellia_id_start','email',true);setBusy(true);setError('');void emailIdService().request(email,location.origin,'link').then(()=>setSent(true)).catch(e=>{identityEvent('camellia_id_error','email',true);setError(emailIdError(e));}).finally(()=>setBusy(false));}}><label>引き継ぎに使うメールアドレス<input type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><button className="secondary-button" disabled={busy||!email.trim()}>{busy?'確認しています…':'今のIDへ確認メールを送る'}</button></form>{sent&&<output>確認メールの送信を受け付けました。同じIDでログインした状態で、メールのリンクを開いてください。</output>}{error&&<p role="alert">{error}</p>}</section>;
}
