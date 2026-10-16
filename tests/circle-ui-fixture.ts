/** Explicit component fixture only. No user, token, Firebase session, or live API. */
import {CIRCLES} from '@/lib/circle/catalog';
const now=new Date().toISOString();
let joined=false, reaction:string|null=null;
const post={id:'fixture-post',circleId:'tired',authorId:'a'.repeat(32),displayName:'テスト表示名',text:'今日は短い一言から。',createdAt:now,updatedAt:now,mine:false};
let reports=[{id:'fixture-report',targetId:post.id,targetKind:'post',circleId:'tired',authorId:post.authorId,createdAt:now,text:post.text,reason:'その他',status:'open'}];
const audits:unknown[]=[];
export async function circleRequest(query='',body?:Record<string,unknown>) {
 await new Promise(resolve=>setTimeout(resolve,20));
 const params=new URLSearchParams(query);
 if(body){
  if(body.operation==='join')joined=true;
  if(body.operation==='leave')joined=false;
  if(body.operation==='react'){reaction=reaction===body.reaction?null:String(body.reaction);return {reaction};}
  if(body.operation==='moderate'){audits.push({...reports[0],action:body.action,note:body.note,moderatorId:'b'.repeat(32)});reports=[];}
  return {ok:true};
 }
 if(params.has('moderation'))return {reports};
 if(params.has('audit'))return {audits};
 if(params.has('own'))return {own:[]};
 if(params.has('blocks'))return {blocks:[]};
 if(params.has('circle')&&location.hash==='#feed-error')throw new Error('投稿を読み込めませんでした。');
 if(params.has('circle'))return {posts:[{...post,myReaction:reaction}],comments:params.has('post')?[{...post,id:'fixture-comment',text:'そっと読んでいます。'}]:[],nextCursor:params.has('cursor')?undefined:'fixture-next'};
 return {circles:CIRCLES.map(c=>({...c,joined:c.id==='tired'&&joined,memberCount:2,daysSinceJoin:1})),moderator:true};
}
