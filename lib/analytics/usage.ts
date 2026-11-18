export type UsageProperties={experience_version:'free_id_v1';plan?:'free'|'plus';id_state?:'none'|'obtained'|'legacy_external'};
/** Event-time metadata. No email/UID/provider identifier or retrospective reclassification. */
export function usageProperties(deviceOnly:boolean,user:{isAnonymous?:boolean;emailVerified?:boolean;providerData:{providerId:string}[]}|null,plan?:'free'|'plus'):UsageProperties{
 if(deviceOnly)return {experience_version:'free_id_v1',plan:'free',id_state:'none'};
 if(!user||user.isAnonymous)return {experience_version:'free_id_v1'};
 const email=user.emailVerified===true&&user.providerData.some(p=>p.providerId==='password');
 return {experience_version:'free_id_v1',...(plan?{plan}:{}),id_state:email?'obtained':'legacy_external'};
}
