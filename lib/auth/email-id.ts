import {EmailAuthProvider,isSignInWithEmailLink,linkWithCredential,sendSignInLinkToEmail,signInWithEmailLink,type User} from 'firebase/auth';
import {schoolParkAuth} from '../schoolpark/firebase';
export const EMAIL_PENDING_KEY='camellia-email-id-pending-v1';
export const EMAIL_VERIFIED_KEY='camellia-email-id-verified-v1';
export const EMAIL_INTENT_TTL=10*60*1000;
export type EmailPurpose='records'|'billing';
type Pending={version:1;nonce:string;email:string;mode:'signin'|'link';uid?:string;at:number;expiresAt:number;targetAcknowledged:boolean;purpose?:EmailPurpose};
export type EmailDriver={ready:()=>Promise<void>;current:()=>User|null;send:(email:string,url:string)=>Promise<void>;isLink:(url:string)=>boolean;signin:(email:string,url:string)=>Promise<User>;link:(user:User,email:string,url:string)=>Promise<User>};
const validEmail=(v:unknown):v is string=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export function readEmailIntent(storage:Storage,now=Date.now()):Pending|undefined{
 try{const p=JSON.parse(storage.getItem(EMAIL_PENDING_KEY)||'null');if(p?.version===1&&typeof p.nonce==='string'&&validEmail(p.email)&&['signin','link'].includes(p.mode)&&(p.purpose===undefined||p.purpose==='records'||p.purpose==='billing')&&typeof p.at==='number'&&typeof p.expiresAt==='number'&&p.at<=now&&p.expiresAt>now&&p.expiresAt<=p.at+EMAIL_INTENT_TTL&&(p.mode!=='link'||typeof p.uid==='string'))return p;}catch{/* Discard transient auth metadata only. */}
 storage.removeItem(EMAIL_PENDING_KEY);
}
export function readVerifiedEmailIntent(uid:string,storage:Storage,now=Date.now()):{uid:string;targetAcknowledged:true;agreedAt:string}|undefined{
 try{const p=JSON.parse(storage.getItem(EMAIL_VERIFIED_KEY)||'null');if(p?.uid===uid&&p.targetAcknowledged===true&&typeof p.agreedAt==='string'&&Number.isFinite(Date.parse(p.agreedAt))&&p.expiresAt>now&&p.expiresAt<=now+EMAIL_INTENT_TTL)return p;}catch{/* No inferred consent. */}
}
export function createEmailIdService(driver:EmailDriver,storage:Storage,now=Date.now){
 return {
  pending:()=>readEmailIntent(storage,now()),
  isLink:driver.isLink,
  async request(email:string,origin:string,mode:'signin'|'link',targetAcknowledged=false,purpose:EmailPurpose='records'){
   const address=email.trim();if(!validEmail(address))throw new Error('EMAIL_INVALID');const site=new URL(origin);if(site.protocol!=='https:'&&site.hostname!=='localhost'&&site.hostname!=='127.0.0.1')throw new Error('EMAIL_ORIGIN_INVALID');
   if(!['records','billing'].includes(purpose)||purpose==='billing'&&mode!=='signin')throw new Error('EMAIL_PURPOSE_MISMATCH');
   await driver.ready();const user=driver.current();if(mode==='link'&&(!user||user.isAnonymous))throw new Error('EMAIL_AUTH_CHANGED');if(mode==='signin'&&user&&!user.isAnonymous)throw new Error('EMAIL_AUTH_CHANGED');if(mode==='signin'&&purpose==='records'&&!targetAcknowledged)throw new Error('EMAIL_CONSENT_REQUIRED');
   const at=now(),p:Pending={version:1,nonce:crypto.randomUUID(),email:address,mode,...(mode==='link'?{uid:user!.uid}:{}),at,expiresAt:at+EMAIL_INTENT_TTL,targetAcknowledged:purpose==='records'&&targetAcknowledged,purpose};
   storage.setItem(EMAIL_PENDING_KEY,JSON.stringify(p));
   try{await driver.send(address,`${site.origin}/?auth=email${purpose==='billing'?'&open=billing':''}`);}catch(error){if(readEmailIntent(storage,now())?.nonce===p.nonce)storage.removeItem(EMAIL_PENDING_KEY);throw error;}
   return {expiresAt:p.expiresAt};
  },
  async complete(url:string,email?:string,targetAcknowledged=false,purpose:EmailPurpose='records'){
   if(!driver.isLink(url))throw new Error('EMAIL_LINK_INVALID');await driver.ready();const p=readEmailIntent(storage,now()),address=email?.trim()||p?.email;if(!validEmail(address))throw new Error('EMAIL_REQUIRED');
   if(!['records','billing'].includes(purpose)||p&&(p.purpose??'records')!==purpose||purpose==='billing'&&new URL(url).searchParams.get('open')!=='billing')throw new Error('EMAIL_PURPOSE_MISMATCH');
   if(p&&email?.trim()&&email.trim()!==p.email)throw new Error('EMAIL_LINK_INVALID');
   const user=driver.current();if(p?.mode==='link'&&(!user||user.isAnonymous||user.uid!==p.uid))throw new Error('EMAIL_AUTH_CHANGED');if(p?.mode!=='link'&&user&&!user.isAnonymous)throw new Error('EMAIL_AUTH_CHANGED');
   const acknowledged=p?.targetAcknowledged===true||targetAcknowledged;if(purpose==='records'&&p?.mode!=='link'&&!acknowledged)throw new Error('EMAIL_CONSENT_REQUIRED');
   const result=p?.mode==='link'?await driver.link(user!,address,url):await driver.signin(address,url);
   if(p?.mode==='link'&&result.uid!==p.uid)throw new Error('EMAIL_AUTH_CHANGED');
   await result.reload();await result.getIdToken(true);if(driver.current()?.uid!==result.uid||!result.emailVerified)throw new Error('EMAIL_UNVERIFIED');
   if(purpose==='records'&&p?.mode!=='link')storage.setItem(EMAIL_VERIFIED_KEY,JSON.stringify({uid:result.uid,targetAcknowledged:true,agreedAt:new Date(now()).toISOString(),expiresAt:now()+EMAIL_INTENT_TTL}));
   if(!p||readEmailIntent(storage,now())?.nonce===p.nonce)storage.removeItem(EMAIL_PENDING_KEY);
   return {uid:result.uid,linked:p?.mode==='link',purpose};
  }
 };
}
export function emailIdService(){return createEmailIdService({ready:()=>schoolParkAuth.authStateReady(),current:()=>schoolParkAuth.currentUser,
 send:(email,url)=>sendSignInLinkToEmail(schoolParkAuth,email,{url,handleCodeInApp:true}),isLink:url=>isSignInWithEmailLink(schoolParkAuth,url),
 signin:async(email,url)=>(await signInWithEmailLink(schoolParkAuth,email,url)).user,
 link:async(user,email,url)=>(await linkWithCredential(user,EmailAuthProvider.credentialWithLink(email,url))).user},localStorage);}
export function stripEmailCallback(url:URL){for(const key of ['oobCode','mode','apiKey','continueUrl','lang','auth'])url.searchParams.delete(key);return url.pathname+url.search+url.hash;}
export function emailIdError(error:unknown){
 const code=error&&typeof error==='object'&&'code'in error?String(error.code):error instanceof Error?error.message:'';
 if(code==='EMAIL_INVALID'||code==='auth/invalid-email')return 'メールアドレスを確認してください。';
 if(code==='EMAIL_REQUIRED')return '確認メールを受け取ったメールアドレスを入力してください。';
 if(code==='EMAIL_CONSENT_REQUIRED')return 'サービスの対象と利用規約を確認してください。';
 if(code==='EMAIL_PURPOSE_MISMATCH')return '別の手続き用の確認メールです。元の画面から、新しい確認メールをお送りください。';
 if(code==='EMAIL_AUTH_CHANGED')return '別のIDが使われているため、記録をつなぐ操作を止めました。以前使った方法で入り直してください。';
 if(['auth/credential-already-in-use','auth/email-already-in-use','auth/account-exists-with-different-credential'].includes(code))return '別のIDで使われているメールです。自動ではまとめません。以前使ったLINEやGoogleからお入りください。';
 if(['auth/expired-action-code','auth/invalid-action-code','EMAIL_LINK_INVALID'].includes(code))return 'この確認リンクは使えません。新しい確認メールをお送りください。';
 if(code==='auth/too-many-requests')return 'いまは確認メールを送れません。少し時間をおいてお試しください。';
 if(code==='auth/operation-not-allowed'||code==='auth/unauthorized-continue-uri')return 'メールでの引き継ぎをいま受け付けられません。端末の記録は残っています。';
 return '確認を完了できませんでした。通信を確認して、もう一度お試しください。端末の記録は残っています。';
}
