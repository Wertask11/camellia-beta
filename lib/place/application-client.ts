import{schoolParkAuth}from'../schoolpark/firebase';
import type{ApplicationFields}from'./applications';
export type ApplicationView={id:string;status:'submitted'|'reviewing'|'approved'|'declined'|'withdrawn'|'archived';revision:number;fields:Partial<ApplicationFields>;createdAt:string;updatedAt:string;placeSlug?:string;scopeGranted?:boolean};
class ApplicationUiError extends Error{}
export const applicationMessage=(e:unknown)=>e instanceof ApplicationUiError?e.message:'申請の状態を確認できませんでした。入力を控えてから、通信を確認してお試しください。';
export async function applicationRequest(body?:Record<string,unknown>,query=''){
 const user=schoolParkAuth.currentUser;if(!user||user.isAnonymous)throw new ApplicationUiError('申請にはLINE・Googleなどの本人確認が必要です。Camelliaの個人記録を作る必要はありません。');
 const r=await fetch(`/api/camellia/place?applications=1${query}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(schoolParkAuth.currentUser?.uid!==user.uid)throw new ApplicationUiError('アカウントが変わりました。画面を開き直してください。');
 const v=await r.json() as{error?:string;applications:ApplicationView[];application:ApplicationView;nextCursor?:string|null};
 if(!r.ok)throw new ApplicationUiError(v.error==='INTAKE_NOT_READY'?'申請受付は準備中です。入力内容は送っていません。':v.error==='APPLICATION_CONFLICT'?'別の操作で申請が更新されています。一覧を確認してからお試しください。':v.error==='PLACE_EXISTS'?'この公開URL名は使われています。別の名前を選んでください。':v.error==='ASSIGNED_APPLICATION_REVIEW_REQUIRED'?'担当割当済みの申請は運営の確認が必要です。自動で削除していません。':'申請の手続きを確認できませんでした。入力を控え、一覧で受付状況を確認してください。');
 return v;
}
export async function applicationStatus(){try{const r=await fetch('/api/camellia/place?applications=1&status=1',{cache:'no-store',signal:AbortSignal.timeout(8000)});const v=await r.json() as{enabled?:unknown};return r.ok&&v?.enabled===true;}catch{return false;}}
