'use client';
import {useState} from 'react';
import {safeAnalyticsDiagnostic} from '@/lib/analytics/posthog';
import {previewAnalyticsDiagnosticEnabled} from '@/lib/analytics/diagnostics';
/** Explicit Preview-only support view, separate from normal product flows. Read-only. */
export function AnalyticsPreviewDiagnostic(){
 const [result,setResult]=useState(''),[notice,setNotice]=useState('');
 if(!previewAnalyticsDiagnosticEnabled())return null;
 return <section className="panel"><h2>動作確認</h2><p className="meta">確認用Previewの計測状態だけを表示します。本文・メール・記録のID・キーは含めません。利用者の計測停止設定は変更しません。</p><button className="secondary-button" onClick={()=>{setResult(JSON.stringify(safeAnalyticsDiagnostic(),null,2));setNotice('');}}>状態を確認する</button>{result&&<><pre className="analytics-support-result" aria-label="計測の確認結果">{result}</pre><button className="secondary-button" onClick={()=>{if(!navigator.clipboard?.writeText){setNotice('表示された確認結果を選んでコピーできます。');return;}void navigator.clipboard.writeText(result).then(()=>setNotice('確認結果をコピーしました。')).catch(()=>setNotice('コピーできませんでした。表示された確認結果を選んでコピーできます。'));}}>確認結果をコピーする</button></>}{notice&&<output>{notice}</output>}</section>;
}
