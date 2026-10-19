import { useState } from 'react';
import type { CamelliaState } from '@/types';

export function StorageRecovery({state,error,onRetry}:{state:CamelliaState;error:string;onRetry:()=>void}) {
  const [exportFailed,setExportFailed]=useState(false);
  const saving=error==='LOCAL_SAVE_FAILED';
  const download=()=>{
    try {
      const originals:Record<string,string|null>={};
      for(const key of ['camellia-prototype-v3','camellia-prototype-v2','camellia-prototype-v1']) {
        try { originals[key]=localStorage.getItem(key); } catch { originals[key]=null; }
      }
      const {analyticsEvents:_events,...personal}=state;
      const url=URL.createObjectURL(new Blob([JSON.stringify({scope:'個人記録の保護用控え。元の保存内容と読み取れた記録を含みます。共有しないでください。',originals,recovered:personal},null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='camellia-protected-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportFailed(false);
    } catch { setExportFailed(true); }
  };
  return <main className="screen" aria-labelledby="storage-recovery-title">
    <h1 id="storage-recovery-title">記録を守るため、確認が必要です</h1>
    <p role="alert">{saving?'記録を端末に保存できませんでした。この画面を閉じる前に、記録の控えを保存してください。':'記録の一部を読み込めませんでした。保存されている内容は消さずに保護しています。'}</p>
    <p>{saving?'空き容量やブラウザの保存設定を確認した後、もう一度保存できます。':'読み取れた記録は別に保ち、元の記録の上書きとアカウントへの同期を止めています。自動で初期化しません。'}</p>
    <button className="primary" onClick={download}>記録の控えをファイルに保存する</button>
    <p className="meta">控えには会話や人物の記録を含みます。ほかの人に共有しないでください。</p>
    {exportFailed&&<p role="alert">控えを保存できませんでした。この画面を閉じず、もう一度お試しください。</p>}
    <button className="secondary-button" onClick={onRetry}>{saving?'もう一度保存する':'もう一度読み込む'}</button>
    {!saving&&<p>再確認しても戻れない場合は、控えを手元に残して運営へお問い合わせください。</p>}
  </main>;
}
