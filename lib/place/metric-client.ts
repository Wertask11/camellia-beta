import type {PlaceMetric} from './metrics';
/** No auth, Check, recipient, state, location or text is attached to the external destination. */
export function recordPublicPlaceMetric(slug:string,kind:PlaceMetric,eventId=crypto.randomUUID()){
 const body=JSON.stringify({operation:'metric',slug,kind,eventId});void fetch('/api/camellia/place',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',signal:AbortSignal.timeout(5000)}).catch(()=>{});
}
