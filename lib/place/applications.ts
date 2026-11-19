import{createHash}from'node:crypto';
import{FieldPath,type Firestore}from'firebase-admin/firestore';
import type{Auth}from'firebase-admin/auth';
import{SERVER_ROOT}from'../server/admin.js';
import{PLACE_CATEGORIES,safePlaceUrl,validatePlace,validSlug}from'./model.js';
import{placeScopePath}from'./operator.js';
export type ApplicationActor={uid:string;identityCreatedAt:string;operator:boolean};
export class ApplicationError extends Error{constructor(readonly status:number,readonly code:string){super(code);}}
export type ApplicationFields={name:string;category:string;region:string;area:string;address:string;officialUrl:string;experience:string;contactName:string;contactEmail:string;notes:string;consent:true};
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function requireValue(ok:unknown,code:string,status=409):asserts ok{if(!ok)throw new ApplicationError(status,code);}
export function applicationFields(value:unknown):ApplicationFields{
 requireValue(value&&typeof value==='object'&&!Array.isArray(value),'INVALID_APPLICATION',400);const v=value as Record<string,unknown>;
 const lengths={name:100,category:40,region:60,area:60,address:200,officialUrl:1000,experience:600,contactName:80,contactEmail:254,notes:500};
 requireValue(Object.keys(v).every(k=>k==='consent'||Object.hasOwn(lengths,k))&&v.consent===true,'INVALID_APPLICATION',400);
 const out:Record<string,string>={};for(const[k,max]of Object.entries(lengths)){const text=v[k]??'';requireValue(typeof text==='string'&&text.length<=max&&(k==='notes'||text.trim().length>0),'INVALID_APPLICATION',400);out[k]=(text as string).trim();}
 requireValue(PLACE_CATEGORIES.includes(out.category as typeof PLACE_CATEGORIES[number])&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.contactEmail),'INVALID_APPLICATION',400);
 try{out.officialUrl=safePlaceUrl(out.officialUrl,true);const u=new URL(out.officialUrl);requireValue(!u.hash&&![...u.searchParams.keys()].some(k=>/^(code|token|access_token|email|auth)$/i.test(k)),'INVALID_APPLICATION',400);}catch{throw new ApplicationError(400,'INVALID_APPLICATION');}
 return{...out,consent:true}as ApplicationFields;
}
function approvedPolicy(v:Record<string,unknown>|undefined){return v?.approved===true&&typeof v.approvedBy==='string'&&v.approvedBy.length>0&&typeof v.approvedAt==='string'&&Number.isFinite(Date.parse(v.approvedAt));}
function intakeConfigured(cfg:Record<string,unknown>|undefined,retention:Record<string,unknown>|undefined){
 const policies=retention?.collections as Record<string,Record<string,unknown>>|undefined;
 return Boolean(approvedPolicy(cfg)&&cfg?.enabled===true&&cfg.privacyReviewed===true&&policies?.place_applications?.mode==='closed_only'&&['place_applications','place_application_audit'].every(k=>{const policy=policies?.[k];return approvedPolicy(policy)&&Number.isSafeInteger(policy?.retentionMs)&&Number(policy?.retentionMs)>0;}));
}
export async function applicationIntakeReady(db:Firestore,env:Record<string,string|undefined>=process.env){
 if(env.CAMELLIA_PLACE_APPLICATIONS_ENABLED!=='true')return false;
 const[c,p]=await Promise.all([db.doc(`${SERVER_ROOT}/config/place_application_intake`).get(),db.doc(`${SERVER_ROOT}/config/retention`).get()]);return intakeConfigured(c.data(),p.data());
}
const projection=(id:string,v:Record<string,unknown>)=>({id,status:v.status,revision:v.revision,fields:v.fields,createdAt:v.createdAt,updatedAt:v.updatedAt,...(v.placeSlug?{placeSlug:v.placeSlug,scopeGranted:v.scopeGranted===true}:{})});
export class PlaceApplicationService{
 constructor(private db:Firestore,private auth:Pick<Auth,'getUser'>){}
 private applications(){return this.db.collection(`${SERVER_ROOT}/place_applications`);}
 private audit(tx:FirebaseFirestore.Transaction,actor:ApplicationActor,id:string,operation:string,policy?:Record<string,unknown>){tx.create(this.db.collection(`${SERVER_ROOT}/place_application_audit`).doc(),{actorHash:hash(actor.uid),applicationId:id,operation,createdAt:new Date(),...(approvedPolicy(policy)&&Number(policy?.retentionMs)>0?{expiresAt:new Date(Date.now()+Number(policy?.retentionMs))}:{})});}
 async submit(actor:ApplicationActor,requestId:unknown,value:unknown){
  requireValue(uuid(requestId),'INVALID_APPLICATION',400);const fields=applicationFields(value);requireValue(await applicationIntakeReady(this.db),'INTAKE_NOT_READY',503);
  const id=hash(`${actor.uid}:${new Date(actor.identityCreatedAt).toISOString()}:${requestId}`),ref=this.applications().doc(id),digest=hash(JSON.stringify(fields)),now=new Date().toISOString();
  await this.db.runTransaction(async tx=>{const [old,config,retention]=await Promise.all([tx.get(ref),tx.get(this.db.doc(`${SERVER_ROOT}/config/place_application_intake`)),tx.get(this.db.doc(`${SERVER_ROOT}/config/retention`))]);requireValue(process.env.CAMELLIA_PLACE_APPLICATIONS_ENABLED==='true'&&intakeConfigured(config.data(),retention.data()),'INTAKE_NOT_READY',503);if(old.exists){requireValue(old.data()?.ownerUid===actor.uid&&old.data()?.digest===digest,'APPLICATION_CONFLICT');return;}
   tx.create(ref,{ownerUid:actor.uid,identityCreatedAt:actor.identityCreatedAt,fields,digest,status:'submitted',revision:1,createdAt:now,updatedAt:now});this.audit(tx,actor,id,'submit',retention.data()?.collections?.place_application_audit);});
  return projection(id,(await ref.get()).data()!);
 }
 async list(actor:ApplicationActor,review=false,status='submitted',after?:string){
  requireValue(!review||actor.operator,'OPERATOR_REQUIRED',403);requireValue(['submitted','reviewing','approved','declined','withdrawn','archived'].includes(status),'INVALID_APPLICATION',400);
  requireValue(after===undefined||/^[a-f0-9]{64}$/.test(after),'INVALID_CURSOR',400);
  let query=this.applications().where(review?'status':'ownerUid','==',review?status:actor.uid).orderBy(FieldPath.documentId()).limit(20);if(after)query=query.startAfter(after);
  const rows=await query.get();return{applications:rows.docs.filter(d=>review||Date.parse(d.data().identityCreatedAt)===Date.parse(actor.identityCreatedAt)).map(d=>projection(d.id,d.data())),nextCursor:rows.size===20?rows.docs.at(-1)!.id:null};
 }
 async change(actor:ApplicationActor,id:unknown,expectedRevision:unknown,operation:unknown,slug?:unknown){
  requireValue(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id)&&Number.isSafeInteger(expectedRevision),'INVALID_APPLICATION',400);
  requireValue(['review','decline','approve','withdraw','grantScope','revokeScope','archive'].includes(String(operation)),'INVALID_APPLICATION',400);
  requireValue(operation==='withdraw'||actor.operator,'OPERATOR_REQUIRED',403);
  const ref=this.applications().doc(id as string),snapshot=await ref.get(),before=snapshot.data();requireValue(before,'APPLICATION_NOT_FOUND',404);
  if(operation==='approve'||operation==='grantScope'){
   const owner=await this.auth.getUser(before!.ownerUid);requireValue(!owner.disabled&&Date.parse(owner.metadata.creationTime)===Date.parse(before!.identityCreatedAt),'APPLICATION_IDENTITY_CHANGED');
  }
  await this.db.runTransaction(async tx=>{
   const [row,retention]=await Promise.all([tx.get(ref),tx.get(this.db.doc(`${SERVER_ROOT}/config/retention`))]),v=row.data();requireValue(v,'APPLICATION_NOT_FOUND',404);requireValue(v!.revision===expectedRevision,'APPLICATION_CONFLICT');
   const at=new Date().toISOString(),revision=Number(expectedRevision)+1,policy=retention.data()?.collections?.place_applications;
   const closed={closedAt:at,...(approvedPolicy(policy)&&policy?.mode==='closed_only'&&Number(policy.retentionMs)>0?{expiresAt:new Date(Date.now()+Number(policy.retentionMs))}:{})};
   if(operation==='withdraw'){
    requireValue(v!.ownerUid===actor.uid&&Date.parse(v!.identityCreatedAt)===Date.parse(actor.identityCreatedAt),'APPLICATION_NOT_FOUND',404);requireValue(['submitted','reviewing','declined'].includes(v!.status),'ASSIGNED_APPLICATION_REVIEW_REQUIRED');tx.update(ref,{status:'withdrawn',fields:{},digest:'',revision,updatedAt:at,...closed});
   }else if(operation==='archive'){requireValue(v!.status==='approved'&&v!.scopeGranted===false,'INVALID_TRANSITION');tx.update(ref,{status:'archived',revision,updatedAt:at,...closed});
   }else if(operation==='review'||operation==='decline'){
    requireValue(operation==='review'?v!.status==='submitted':['submitted','reviewing'].includes(v!.status),'INVALID_TRANSITION');tx.update(ref,{status:operation==='review'?'reviewing':'declined',revision,updatedAt:at,...(operation==='decline'?closed:{})});
   }else{
    requireValue(operation==='approve'?v!.status==='reviewing':v!.status==='approved','INVALID_TRANSITION');
    const placeSlug=operation==='approve'?slug:v!.placeSlug;requireValue(validSlug(placeSlug),'INVALID_APPLICATION',400);
    const placeRef=this.db.doc(`${SERVER_ROOT}/places/${placeSlug}`),scopeRef=this.db.doc(placeScopePath(v!.ownerUid));const[place,scope]=await Promise.all([tx.get(placeRef),tx.get(scopeRef)]);
    const slugs=Array.isArray(scope.data()?.slugs)?scope.data()!.slugs.filter(validSlug):[];
    if(operation==='approve'){
     requireValue(!place.exists,'PLACE_EXISTS');const f=v!.fields as ApplicationFields;
     const draft=validatePlace({slug:placeSlug,name:f.name,category:f.category,region:f.region,area:f.area,address:f.address,experience:f.experience,description:f.experience,shortDescription:f.experience.slice(0,180).replace(/[\uD800-\uDBFF]$/,''),officialUrl:f.officialUrl,partnerStatus:'none',sponsored:false,imageUrls:[],recommendedFor:[]});
     tx.create(placeRef,{...draft,status:'draft',createdAt:at,updatedAt:at});
     tx.create(this.db.collection(`${SERVER_ROOT}/place_audit`).doc(),{operatorUid:actor.uid,slug:placeSlug,operation:'application_draft',createdAt:at,before:null,after:draft});
    }else requireValue(place.exists,'PLACE_NOT_FOUND');
    const next=operation==='revokeScope'?slugs.filter((s:string)=>s!==placeSlug):[...new Set([...slugs,placeSlug])];requireValue(next.length<=100,'SCOPE_LIMIT');
    tx.set(scopeRef,{slugs:next,updatedAt:at},{merge:true});tx.update(ref,{status:'approved',placeSlug,scopeGranted:operation!=='revokeScope',revision,updatedAt:at});
   }
   this.audit(tx,actor,id as string,String(operation),retention.data()?.collections?.place_application_audit);
  });
  return projection(id as string,(await ref.get()).data()!);
 }
}
