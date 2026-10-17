/** Explicit component fixture only. No user, token, Firebase session, or live API. */
import {CIRCLES} from '@/lib/circle/catalog';
const now=new Date().toISOString();
let joined=false, reaction:string|null=null;
let version=0, ownFailures=0;
export const stats={revisionReads:0,feedReads:0};
const post={id:'fixture-post',circleId:'tired',authorId:'a'.repeat(32),displayName:'テスト表示名',text:'今日は短い一言から。',createdAt:now,updatedAt:now,mine:false};
let reports=[{id:'fixture-report',targetId:post.id,targetKind:'post',circleId:'tired',authorId:post.authorId,createdAt:now,text:post.text,reason:'その他',status:'open'}];
const audits:unknown[]=[];
const comments=[{...post,id:'fixture-comment',text:'そっと読んでいます。'}];
let own=[{...post,id:'own-post',text:'自分の投稿です。',mine:true,kind:'post'},{...post,id:'own-comment',text:'自分のコメントです。',mine:true,kind:'comment'}];
window.addEventListener('fixture:new-comment',()=>{comments.push({...post,id:'incoming-comment',text:'別の利用者から届いたコメントです。'});version++;});
window.addEventListener('fixture:remove-post',()=>{version++;removed=true;});
let removed=false;
export async function circleRequest(query='',body?:Record<string,unknown>) {
 await new Promise(resolve=>setTimeout(resolve,20));
 const params=new URLSearchParams(query);
 if(body){
  if(body.operation==='join')joined=true;
  if(body.operation==='leave')joined=false;
  if(body.operation==='react'){reaction=reaction===body.reaction?null:String(body.reaction);return {reaction};}
  if(body.operation==='delete')own=own.filter(item=>item.id!==body.id);
  if(body.operation==='moderate'){audits.push({...reports[0],action:body.action,note:body.note,moderatorId:'b'.repeat(32)});reports=[];}
  return {ok:true};
 }
 if(params.has('moderation'))return {reports};
 if(params.has('audit'))return {audits};
 if(params.has('own')){
  if(location.hash==='#own-error'&&ownFailures++===0)throw new Error('文章を読み込めませんでした。');
  return {own:own.filter(item=>item.kind===(params.get('kind')??'post'))};
 }
 if(params.has('blocks'))return {blocks:[]};
 if(params.has('circle')&&location.hash==='#feed-error')throw new Error('投稿を読み込めませんでした。');
 if(params.has('version')){stats.revisionReads++;return {version};}
 if(params.has('post')&&removed)throw Object.assign(new Error('この文章は削除されています。'),{code:'NOT_FOUND'});
 if(params.has('circle')){stats.feedReads++;return {version,posts:removed?[]:[{...post,id:params.has('post')||!params.has('cursor')?post.id:'fixture-older-post',myReaction:reaction}],comments:params.has('post')?comments:[],nextCursor:params.has('post')||params.has('cursor')?undefined:'fixture-next'};}
 return {circles:CIRCLES.map(c=>({...c,joined:c.id==='tired'&&joined,memberCount:2,daysSinceJoin:1})),moderator:true};
}
