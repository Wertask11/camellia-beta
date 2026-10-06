'use client';
import { signInAnonymously, signInWithCustomToken, signOut } from 'firebase/auth';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
const API='https://emu-realtime.onrender.com/api/camellia-auth',LINE_STATE='camellia-line-state',LINE_NONCE='camellia-line-nonce',LOGGED_OUT='camellia-session-logged-out',LINE_PENDING='camellia-line-login',LINE_TTL_MS=10*60*1000;
let guestSession:Promise<unknown>|null=null;
function randomValue(){const b=crypto.getRandomValues(new Uint8Array(24));return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
// A login return reloads the page; until the saved session is restored, currentUser is null and the server would
// log into the method's own account instead of linking it to the signed-in one.
async function headers():Promise<Record<string,string>>{await schoolParkAuth.authStateReady();const u=schoolParkAuth.currentUser;return u?{Authorization:`Bearer ${await u.getIdToken()}`}:{}}
export function startLineLogin(){const id=(import.meta.env.VITE_LINE_CHANNEL_ID as string|undefined)||'2010802922';const state=randomValue(),nonce=randomValue();localStorage.setItem(LINE_PENDING,JSON.stringify({state,nonce,at:Date.now()}));const redirectUri=`${location.origin}/`,url=new URL('https://access.line.me/oauth2/v2.1/authorize');url.search=new URLSearchParams({response_type:'code',client_id:id,redirect_uri:redirectUri,state,nonce,scope:'profile openid'}).toString();location.assign(url.toString())}
export function startSchoolParkLogin(){location.assign(`https://schoolpark-emu.vercel.app/camellia-connect.html?return=${encodeURIComponent(`${location.origin}/`)}`)}
async function exchange(path:string,body:object):Promise<{firebaseToken:string;linked?:boolean}>{const r=await fetch(`${API}/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(await headers())},body:JSON.stringify(body)}),data=await r.json().catch(()=>({})) as {firebaseToken?:string;linked?:boolean;error?:string};if(!r.ok||!data.firebaseToken)throw new Error(data.error||'AUTH_FAILED');await signInWithCustomToken(schoolParkAuth,data.firebaseToken);localStorage.removeItem(LOGGED_OUT);return{firebaseToken:data.firebaseToken,linked:data.linked}}
export async function ensureGuestSession(options:{explicit?:boolean}={}){await schoolParkAuth.authStateReady();if(schoolParkAuth.currentUser)return schoolParkAuth.currentUser;if(!options.explicit&&localStorage.getItem(LOGGED_OUT)==='1')return null;if(options.explicit)localStorage.removeItem(LOGGED_OUT);if(!guestSession)guestSession=signInAnonymously(schoolParkAuth).then(result=>result.user).finally(()=>{guestSession=null});return guestSession}
// The LINE app often returns in another tab, so the pending login lives in localStorage (same origin), not per tab.
function pendingLineLogin():{state:string;nonce:string}|null{try{const v=JSON.parse(localStorage.getItem(LINE_PENDING)||'null') as {state?:unknown;nonce?:unknown;at?:unknown}|null;if(v&&typeof v.state==='string'&&typeof v.nonce==='string'&&typeof v.at==='number'&&Date.now()-v.at<LINE_TTL_MS)return{state:v.state,nonce:v.nonce};}catch{/* unreadable: start over */}return null}
async function exchangeAuthCallback(){const url=new URL(location.href),ticket=url.searchParams.get('camellia_passport_ticket'),code=url.searchParams.get('code'),state=url.searchParams.get('state');if(!ticket&&!code)return null;try{if(ticket)return await exchange('passport/exchange',{ticket});const pending=pendingLineLogin(),expected=pending?.state,nonce=pending?.nonce;if(!state||!expected||state!==expected||!nonce)throw new Error('STATE_MISMATCH');return await exchange('line',{code,nonce,redirectUri:`${location.origin}/`})}finally{localStorage.removeItem(LINE_PENDING);sessionStorage.removeItem(LINE_STATE);sessionStorage.removeItem(LINE_NONCE);['code','state','camellia_passport_ticket','error','error_description'].forEach(k=>url.searchParams.delete(k));history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)}}
export async function logoutCamellia(){localStorage.setItem(LOGGED_OUT,'1');await signOut(schoolParkAuth)}

let callbackPromise: ReturnType<typeof exchangeAuthCallback> | null = null;
export function finishAuthCallback(){return callbackPromise ??= exchangeAuthCallback();}

export type LinkedCamelliaMethods = { line: boolean; schoolpark: boolean };
export async function getLinkedCamelliaMethods(): Promise<LinkedCamelliaMethods> {
  const response = await fetch(`${API}/identities`, { headers: await headers() });
  const data = await response.json().catch(() => ({})) as Partial<LinkedCamelliaMethods> & { error?: string };
  if (!response.ok) throw new Error(data.error || 'IDENTITIES_FAILED');
  return { line: data.line === true, schoolpark: data.schoolpark === true };
}
