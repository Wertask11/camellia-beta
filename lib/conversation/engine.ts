import type { CamelliaState,ConversationIntent,Recommendation } from '@/types';
export function classifyIntent(text:string):ConversationIntent{
 const t=text.toLowerCase();
 if(/誰か|人と話|つなが|circle|コミュニティ/.test(t))return'CONNECT';
 if(/何かしたい|気分.*変え|今でき|行動|やってみ/.test(t))return'ACTION';
 if(/どうしたら|どうすれば|アドバイス|おすすめ|教えて/.test(t))return'ADVICE';
 if(/整理|振り返|考えたい|なぜ|もやもや/.test(t))return'REFLECT';
 return'LISTEN';
}
export function respond(state:CamelliaState,recs:Recommendation[],text:string){
 const intent=classifyIntent(text);const name=state.profile.name?`${state.profile.name}さん、`:'';
 if(intent==='LISTEN')return{intent,text:`${name}そっか。今日はそんなことがあったんだね。話したかったら、ここでゆっくり聞くよ。`,showAction:false};
 if(intent==='REFLECT')return{intent,text:`${name}いま一番引っかかっているのは、出来事そのものと、そのとき感じたことのどちらに近いかな。急いで答えを出さなくて大丈夫です。`,showAction:false};
 if(intent==='CONNECT')return{intent,text:`${name}ひとりで抱えず、誰かと話したい気持ちがあるのかもしれないね。安心できるつながり方を選べます。`,showAction:false,showCircle:true};
 const action=recs[0]?.action;return{intent,text:`${name}${intent==='ADVICE'?'どうしたらいいか一緒に考えよう。':'今できることを探しているんだね。'}入力してくれた状態を手がかりに、無理の少ない選択をひとつ置いておきます。合わなければ選ばなくて大丈夫です。`,showAction:Boolean(action),action};
}
