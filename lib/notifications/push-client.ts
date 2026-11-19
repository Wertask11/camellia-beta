import{schoolParkAuth}from'../schoolpark/firebase';
import{requestNotificationPermission}from'./permission';
export class PushUiError extends Error{}
export const pushErrorMessage=(e:unknown)=>e instanceof PushUiError?e.message:'通知を確認できませんでした。端末の通知設定と通信を確認してください。基本機能は使えます。';
export type PushStatus={ready:boolean;preferencesRequested?:boolean;stopped?:boolean;accountRegistered?:boolean;registrationId?:string|null;publicKey?:string;registered:boolean;revision:number;checkedAt?:number;ownerKey?:string;lastDelivery?:{state:'push_service_accepted'|'rejected'|'unknown';at:string}|null};
async function request(method:'GET'|'POST'|'DELETE',body?:unknown){
 const user=schoolParkAuth.currentUser;if(!user||user.isAnonymous)throw new PushUiError('通知をこの端末へ届けるには、先に無料のCamellia IDで引き継いでください。');
 const response=await fetch('/api/camellia/notification-settings?push=1',{method,headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(body?{'Content-Type':'application/json'}:{})},...(body&&method!=='GET'?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(schoolParkAuth.currentUser?.uid!==user.uid)throw new PushUiError('アカウントが変わりました。通知は登録していません。');
 if(!response.ok)throw new PushUiError('通知の状態を確認できませんでした。希望の保存や他の機能はそのまま使えます。');return response.json();
}
export async function readPushStatus():Promise<PushStatus>{const ownerKey=schoolParkAuth.currentUser?.uid;const v=await request('GET') as PushStatus;if(typeof v.ready!=='boolean'||typeof v.registered!=='boolean'||!Number.isSafeInteger(v.revision))throw new PushUiError('通知の状態を確認できませんでした。');let currentDevice=false;
 if(v.registered&&typeof v.registrationId==='string'&&'serviceWorker'in navigator){try{const registration=await navigator.serviceWorker.getRegistration('/'),sub=await registration?.pushManager.getSubscription();if(sub){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint));currentDevice=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')===v.registrationId;}}catch{/* Status reads do not request permission. */}}
 if(schoolParkAuth.currentUser?.uid!==ownerKey)throw new PushUiError('アカウントが変わりました。');
 return {...v,accountRegistered:v.registered,registered:currentDevice,checkedAt:Date.now(),ownerKey};}
export async function enableThisDevicePush(status:PushStatus){
 const user=schoolParkAuth.currentUser;if(!user||user.isAnonymous)throw new PushUiError('無料のCamellia IDが必要です。');
 if(!window.isSecureContext||!('serviceWorker'in navigator)||!('PushManager'in window))throw new PushUiError('このブラウザでは通知を使えません。通知なしでもCamelliaは利用できます。');
 if(status.ownerKey!==user.uid||!status.checkedAt||Date.now()-status.checkedAt>60000)throw new PushUiError('通知の状態を確認し直してから、許可を選んでください。');
 if(status.preferencesRequested!==true)throw new PushUiError('先に通知の好みで希望・種類・頻度を保存してください。');
 if(!status.ready||typeof status.publicKey!=='string'||!/^[-A-Za-z0-9_]{87}$/.test(status.publicKey))throw new PushUiError('通知の配信は準備中です。');
 const permission=await requestNotificationPermission({deliveryReady:true,userInitiated:true});if(permission!=='granted')throw new PushUiError('通知は許可されていません。基本機能はそのまま使えます。');
 if(schoolParkAuth.currentUser?.uid!==user.uid)throw new PushUiError('アカウントが変わりました。');
 const registration=await navigator.serviceWorker.register('/camellia-push-sw.js',{scope:'/',updateViaCache:'none'});let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new PushUiError('通知の準備に時間がかかっています。通信を確認して、もう一度お試しください。')),10000);})]);}finally{clearTimeout(timer);}
 const raw=atob(status.publicKey.replace(/-/g,'+').replace(/_/g,'/')),key=Uint8Array.from(raw,c=>c.charCodeAt(0));
 let subscription=await registration.pushManager.getSubscription();
 // A saved subscription may use another VAPID key; do not silently attach it to a new identity.
 if(subscription){await subscription.unsubscribe();subscription=null;}
 subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 if(schoolParkAuth.currentUser?.uid!==user.uid){await subscription.unsubscribe();throw new PushUiError('アカウントが変わりました。');}
 try{await request('POST',{subscription:subscription.toJSON(),consent:true,expectedRevision:status.revision});}catch(error){await subscription.unsubscribe();throw error;}
 return readPushStatus();
}
export async function stopThisDevicePush(){
 await request('DELETE');
 const registration=await navigator.serviceWorker?.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();await subscription?.unsubscribe();return {ready:false,registered:false,revision:0,stopped:true};
}
