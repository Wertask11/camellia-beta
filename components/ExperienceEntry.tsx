'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import {FREE_BASIC_USAGE} from '@/lib/features';
import {FreeExperience} from '@/screens/FreeExperience';

/** Keep legacy authentication/callback/account recovery intact, with a separate local-only entry. */
export function ExperienceEntry({account}:{account:ReactNode}){
 const [signedIn,setSignedIn]=useState<boolean|null>(null),[identity,setIdentity]=useState(false);
 const [callback,setCallback]=useState(()=>{if(typeof location==='undefined')return false;const q=new URL(location.href).searchParams;return q.has('code')||q.has('camellia_passport_ticket')||q.has('oobCode')||q.get('open')==='partner-share';});
 useEffect(()=>onAuthStateChanged(schoolParkAuth,user=>{const known=Boolean(user&&!user.isAnonymous);setSignedIn(known);if(known){setIdentity(false);setCallback(false);}}),[]);
 useEffect(()=>{const back=()=>{setIdentity(false);setCallback(false);};window.addEventListener('camellia-free-return',back);return()=>window.removeEventListener('camellia-free-return',back);},[]);
 if(signedIn===null)return <output className="loading">Camelliaを開いています…</output>;
 if(!FREE_BASIC_USAGE||signedIn||identity||callback)return account;
 return <FreeExperience onIdentity={()=>{sessionStorage.setItem('camellia-id-entry','1');setIdentity(true);}}/>;
}
