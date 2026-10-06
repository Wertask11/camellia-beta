import {useEffect,useState} from 'react';
/** Refresh time when the app returns to view and across a JST date boundary. */
export function useCurrentTime(refreshKey?:unknown){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const refresh=()=>setNow(new Date());refresh();const timer=window.setInterval(refresh,30000);document.addEventListener('visibilitychange',refresh);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[refreshKey]);
  return now;
}
