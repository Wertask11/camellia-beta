/** Additive deployment migration. No content, Rules, IAM, claims or existing index changes. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {cert} from 'firebase-admin/app';
import {parseServiceAccountJson} from '../lib/server/credential-json.js';
const PROJECT='emusch-2a111';
const GROUPS=new Set(['circle_posts','circle_comments','circle_reports','circle_memberships']);
const FIELDS=new Set(['circleId','createdAt','uid','postId','status','active']);
const shape=index=>{const fields=index.fields.map(({fieldPath,order})=>({fieldPath,order}));if(fields.at(-1)?.fieldPath!=='__name__')fields.push({fieldPath:'__name__',order:fields.at(-1)?.order});return JSON.stringify({queryScope:index.queryScope,fields});};
export async function ensureCircleIndexes({env=process.env,request=fetch,getToken,definitions}={}){
 if(env.VERCEL_ENV!=='production'||env.CAMELLIA_CIRCLE_ENABLED!=='true')return {status:'skipped',indexes:[]};
 const results=[];
 let stage='credential';
 try{
  const account=parseServiceAccountJson(env.FIREBASE_SERVICE_ACCOUNT_JSON??'');
  if(account.project_id!==PROJECT)throw new Error('PROJECT_MISMATCH');
  const source=definitions??JSON.parse(await readFile(new URL('../security/firestore.indexes.json',import.meta.url),'utf8')).indexes;
  const specs=source.filter(index=>GROUPS.has(index.collectionGroup));
  if(specs.length!==6||specs.some(index=>index.queryScope!=='COLLECTION'||!Array.isArray(index.fields)||index.fields.some(field=>!FIELDS.has(field.fieldPath)||!['ASCENDING','DESCENDING'].includes(field.order))))throw new Error('INVALID_INDEX_DEFINITION');
  const token=getToken?await getToken(): (await cert({projectId:PROJECT,clientEmail:account.client_email,privateKey:account.private_key?.replace(/\\r\\n|\\n/g,'\n')}).getAccessToken()).access_token;
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const existing=new Map();
  for(const spec of specs){
   const url=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/collectionGroups/${spec.collectionGroup}/indexes`;
   stage='list';
   if(!existing.has(spec.collectionGroup)){
    const indexes=[];let next;
    do{
     const response=await request(url+(next?'?pageToken='+encodeURIComponent(next):''),{headers,signal:AbortSignal.timeout(10000)});
     if(!response.ok)return {status:'setup_failed',stage,httpStatus:response.status,indexes:results};
     const data=await response.json();indexes.push(...(data.indexes??[]));next=data.nextPageToken;
    }while(next);
    existing.set(spec.collectionGroup,indexes);
   }
   const match=existing.get(spec.collectionGroup).find(index=>shape(index)===shape(spec));
   if(match){results.push({collectionGroup:spec.collectionGroup,fields:spec.fields,state:match.state??'UNKNOWN'});continue;}
   stage='create';
   const response=await request(url,{method:'POST',headers,signal:AbortSignal.timeout(10000),body:JSON.stringify({queryScope:'COLLECTION',fields:spec.fields})});
   if(!response.ok&&response.status!==409)return {status:'setup_failed',stage,httpStatus:response.status,indexes:results};
   await response.body?.cancel();
   results.push({collectionGroup:spec.collectionGroup,fields:spec.fields,state:'CREATING'});
   existing.get(spec.collectionGroup).push({...spec,state:'CREATING'});
  }
  return {status:results.every(index=>index.state==='READY')?'ready':'building',indexes:results};
 }catch{return {status:'setup_failed',stage,indexes:results};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await ensureCircleIndexes();
 // Fixed operational metadata only. Never write credentials, user data or upstream errors.
 await writeFile(new URL('../dist/client/circle-setup-status.json',import.meta.url),JSON.stringify(result));
 console.log('Circle index setup:',JSON.stringify(result));
}
