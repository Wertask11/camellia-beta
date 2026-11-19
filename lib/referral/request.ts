import {schoolParkAuth} from '../schoolpark/firebase';
export async function referralStatus(){
 const r=await fetch('/api/camellia/referral',{cache:'no-store',signal:AbortSignal.timeout(8000)});const v=await r.json();
 return r.ok&&Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&(v as Record<string,unknown>).enabled===true);
}
export async function issueReferral(){
 const user=schoolParkAuth.currentUser;if(!user||user.isAnonymous)throw new Error('紹介リンクを作るには無料のCamellia IDが必要です。');
 const r=await fetch('/api/camellia/referral',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({operation:'issue'}),cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(schoolParkAuth.currentUser?.uid!==user.uid)throw new Error('アカウントが変わりました。画面を開き直してください。');
 const v=await r.json();if(!r.ok||!v||typeof v!=='object'||Array.isArray(v)||!/^[-A-Za-z0-9_]{43}$/.test(String((v as Record<string,unknown>).token)))throw new Error('今は紹介リンクを作れません。通常の無料機能はそのまま使えます。');
 const url=new URL('/',location.origin);url.searchParams.set('referral',String((v as Record<string,unknown>).token));return url.href;
}
