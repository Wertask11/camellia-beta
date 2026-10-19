export type FortuneReflection = 'yes' | 'some' | 'no';
const PREFIX='camellia-fortune-reflect:';
const value=(v:unknown):v is FortuneReflection=>v==='yes'||v==='some'||v==='no';
const key=(profileId:string,date:string)=>`${PREFIX}profile:${encodeURIComponent(profileId)}:${date}`;

/** Legacy date-only answers have no proven owner: quarantine, never assign them to the current person. */
export function quarantineLegacyFortuneReflections() {
  try {
    for(const legacyKey of Object.keys(localStorage)){
      const date=legacyKey.slice(PREFIX.length);
      if(!legacyKey.startsWith(PREFIX)||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
      const destination=`${PREFIX}unassigned:${date}`;
      if(localStorage.getItem(destination)!==null)continue;
      localStorage.setItem(destination,localStorage.getItem(legacyKey)??'');localStorage.removeItem(legacyKey);
    }
  } catch { /* Leave originals intact if the quarantine cannot be saved. */ }
}
export function readFortuneReflection(profileId:string,date:string):FortuneReflection|undefined {
  try {const answer=localStorage.getItem(key(profileId,date));return value(answer)?answer:undefined;}catch{return undefined;}
}
export function saveFortuneReflection(profileId:string,date:string,answer:FortuneReflection) {
  try{localStorage.setItem(key(profileId,date),answer);}catch{/* Optional device-only reflection. */}
}
/** Called only inside the existing, ownership-checked personal deletion callback. */
export function clearFortuneReflections() {
  for(const k of Object.keys(localStorage))if(k.startsWith(PREFIX))localStorage.removeItem(k);
}
