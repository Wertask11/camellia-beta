import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import type {PublicShare,ShareInput} from './model';
export type OwnShare={id:string;kind:ShareInput['kind'];title:string;createdAt:string;expiresAt:string;revoked:boolean};
export async function shareRequest(body:Record<string,unknown>,publicRead=false){
 const user=schoolParkAuth.currentUser,headers:Record<string,string>={'Content-Type':'application/json'};
 if(!publicRead){if(!user||user.isAnonymous)throw new Error('共有を作成・管理するにはCamellia IDが必要です。');headers.Authorization=`Bearer ${await user.getIdToken()}`;}
 try{
  const r=await fetch('/api/camellia/share',{method:'POST',headers,cache:'no-store',credentials:'same-origin',body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const raw=await r.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error();const v=raw as Record<string,unknown>;if(!publicRead&&schoolParkAuth.currentUser?.uid!==user?.uid)throw new Error();
  if(!r.ok)throw new Error(v.error==='SHARE_NOT_FOUND'?'この共有は今は見られません。期限切れ、または取り消された可能性があります。':v.error==='PLUS_REQUIRED'?'継続して共有するにはCamellia Plusが必要です。':v.error==='SHARE_LIMIT'?'今は共有の操作が多くなっています。時間をおいてお試しください。':'今は共有を利用できません。通信を確かめてお試しください。');
  return v as {token:string;id:string;content:PublicShare;share:PublicShare;shares:OwnShare[];ok:boolean};
 }catch(e){if(e instanceof Error&&e.name==='Error'&&e.message)throw e;throw new Error('今は共有を利用できません。通信を確かめてお試しください。');}
}
export function partnerUrl(token:string){if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('共有を確認できませんでした。');return `${location.origin}/?open=partner-share#${token}`;}
