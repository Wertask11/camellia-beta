'use client';
import {useEffect,useRef} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {schoolParkAuth} from '@/lib/schoolpark/firebase';
import {requestMembership} from '@/lib/membership/client';
import {usageProperties} from '@/lib/analytics/usage';
/** Unknown paid status is omitted, never mislabeled Free. Server entitlements stay authoritative. */
export function useUsageAnalytics(deviceOnly:boolean,ready:boolean){
 const value=useRef(usageProperties(deviceOnly,null));
 useEffect(()=>{
  if(deviceOnly){value.current=usageProperties(true,null);return;}
  let revision=0;const off=onAuthStateChanged(schoolParkAuth,user=>{const stamp=++revision;value.current=usageProperties(false,user);if(ready&&user&&!user.isAnonymous)void requestMembership().then(member=>{if(revision===stamp&&schoolParkAuth.currentUser?.uid===user.uid)value.current=usageProperties(false,user,member.plan);}).catch(()=>{/* Keep unknown, do not downgrade paid rights or misclassify. */});});
  return()=>{revision++;off();};
 },[deviceOnly,ready]);
 return value;
}
