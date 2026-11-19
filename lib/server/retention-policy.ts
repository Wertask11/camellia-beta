/** A configured duration is an approval, not evidence that a deletion job has run. */
export function approvedRetention(value:unknown,names:readonly string[]){
 const v=value as {collections?:Record<string,Record<string,unknown>>}|undefined;
 return names.every(name=>{const p=v?.collections?.[name];return p?.approved===true&&typeof p.approvedBy==='string'&&p.approvedBy.length>0&&typeof p.approvedAt==='string'&&Number.isFinite(Date.parse(p.approvedAt))&&Number.isSafeInteger(p.retentionMs)&&Number(p.retentionMs)>0;});
}
