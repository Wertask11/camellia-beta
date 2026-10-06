import type { AIMessage, CamelliaState, ConversationIntent, ConversationTopic, Recommendation,TreeLeaf } from '@/types';
import { buildCamelliaContext, type CamelliaContext } from '@/lib/conversation/context';
export function classifyIntent(t:string):ConversationIntent {
  if (/アドバイス.*いらない|聞いてほしい|ただ聞/.test(t)) return 'LISTEN';
  if (/誰か|人と話|つなが|寂し/.test(t)) return 'CONNECT';
  if (/何かしたい|運動したい|気分.*変え|何着て|暇|できること(?:って)?ある|行動を考え|行動したい/.test(t)) return 'ACTION';
  if (/どうしたら|どうすれば|どう思う|迷って|教えて|一緒に考え/.test(t)) return 'ADVICE';
  if (/整理|振り返|私も悪|もやもや/.test(t)) return 'REFLECT';
  return 'LISTEN';
}
const rules:[ConversationTopic,RegExp][]=[['WORK',/仕事|会社|上司|職場|辞め/],['RELATIONSHIP',/関係|うまくいって/],['LOVE',/彼氏|彼女|恋愛|デート|好きな人/],['FAMILY',/家族|親|母|父|子ども|夫|妻/],['FRIEND',/友達|友人|喧嘩/],['BEAUTY',/肌|美容|メイク|服|何着/],['HEALTH',/体調|具合|痛|疲れ/],['SLEEP',/眠|睡眠|寝/],['FOOD',/お腹|食べ|ごはん|料理/],['EXERCISE',/運動|散歩|ストレッチ/],['STUDY',/勉強|試験|学/],['MONEY',/お金|給料|貯金|支払/],['HOBBY',/趣味|推し|音楽|映画|本/],['FUN',/暇|楽しい|遊び/],['LONELINESS',/寂し|孤独|ひとり/],['ANXIETY',/不安|心配|迷って|将来/],['HAPPINESS',/嬉しい|うれしい|最高|幸せ/],['ANGER',/怒|最悪|むかつ|イライラ/],['SADNESS',/悲しい|つらい|泣|嫌なこと/]];
export function classifyTopics(t:string):ConversationTopic[]{const found=rules.filter(([,r])=>r.test(t)).map(([k])=>k);return found.length?found:['OTHER']}
const previousUser=(h:CamelliaContext['conversationHistory'])=>[...h].reverse().find(m=>m.role==='user');
function listen(topics:ConversationTopic[],text:string,previous?:AIMessage){
  if (/さっき|その話/.test(text)&&previous) return `うん、さっきの「${previous.text.slice(0,28)}」の話だね。続き、聞かせて。`;
  if (/何もしたくない/.test(text)) return '今日は何もしたくないんだね。何もしないまま、ここにいるだけでも大丈夫。';
  if (topics.includes('HAPPINESS')) return 'それはいい一日だったんだね。うれしさがこちらにも伝わってくるよ。';
  if (topics.includes('ANGER')) return 'それは嫌だったね。すぐに整理しなくていいから、話したいところから聞かせて。';
  if (topics.includes('SADNESS')) return '今日はつらいことがあったんだね。ここでは無理に元気にならなくて大丈夫。';
  if (topics.includes('ANXIETY')) return '将来のことを考えると、不安が膨らむこともあるよね。今は答えを出さず、その不安をここに置いてもいいよ。';
  if (topics.includes('SLEEP')) return '眠れないんだね。時計を気にするほど焦ることもあるよね。今は話していたい？';
  if (topics.includes('BEAUTY')) return '肌の変化が気になっているんだね。いつ頃から気になり始めたのか、話したければ聞くよ。';
  if (topics.includes('STUDY')) return 'やらなきゃと思うほど、動き出しにくくなる日もあるよね。今日はその気持ちを話すだけでも大丈夫。';
  if (topics.includes('FRIEND')) return '友達との喧嘩って、怒りだけじゃなく寂しさも残ることがあるよね。どんなことがあったの？';
  if (topics.includes('LOVE')) return '大切な人とうまくいかない感じがあるんだね。簡単に割り切れないよね。';
  if (topics.includes('FOOD')) return 'お腹すいたんだね。今食べたいもの、何か浮かんでる？';
  if (topics.includes('FUN')) return 'ぽっかり時間が空いた感じかな。何も決めずに話すだけでもいいよ。';
  return 'うん、聞いてるよ。もう少し話したくなったら、そのまま続けて。';
}
export interface CamelliaProcessor {
  respond(input: string, context: CamelliaContext): ReturnType<typeof buildRuleResponse>;
}

function buildRuleResponse(input:string,recs:Recommendation[],context:CamelliaContext){
  const intent=classifyIntent(input),topics=classifyTopics(input),previous=previousUser(context.conversationHistory);let text='';
  /* 選択肢のカードを出すかを先に決める。返事が「置いておきます」と言うのはカードが出るときだけ。
     食べ物の話では提案を出さない（空腹の人に行動を勧めない）。提案が無いときも出さない。 */
  const action=(intent==='ADVICE'||intent==='ACTION')&&!topics.includes('FOOD')?recs[0]?.action:undefined;
  const showAction=Boolean(action);
  const asksAboutPattern=/最近|傾向|前と比|変化/.test(input);
  if(/覚えてる|覚えている/.test(input))text=context.remembered.length?`あなたが覚えておくことを選んだ一言は「${context.remembered.at(-1)}」です。変わったらMyから外せます。`:'まだ、覚えておくことを選んだ一言はありません。';
  else if(asksAboutPattern&&context.recentPatterns[0]) text=`記録からは、${context.recentPatterns[0].text} そういう日もある、という傾向として受け取ってください。`;
  else if(context.relationship&&/この人|前は|以前|関係/.test(input)&&context.relationship.reflections.at(-1))text=`この人について、あなたは最近「${context.relationship.reflections.at(-1)}」と残していました。今の気持ちと重なるところはありますか？`;
  else if(intent==='LISTEN') text=listen(topics,input,previous);
  else if(intent==='REFLECT') text=topics.includes('WORK')||previous?.topics?.includes('WORK')?'自分にも悪いところがあったと思うことと、怒られてつらかったことは、分けて考えてもよさそう。どちらも本当でいいと思う。':'いくつかの気持ちが重なっていそうだね。まず一番大きいものだけ、言葉にしてみてもいいかも。';
  else if(intent==='CONNECT') text='誰かと話したいんだね。ここで私と話し続けることも、同じ関心の人が集まる場所を見ることもできます。';
  else if(topics.includes('LOVE')&&topics.includes('BEAUTY')) text='明日のデート、楽しみと少し迷う気持ちがありそうだね。相手にどう見えるかより、自分が落ち着ける服を軸に選んでみるのはどうかな。';
  else if(topics.includes('WORK')&&topics.includes('ANXIETY')) text='辞めるかどうかは大きな決断だね。今日は結論を急がず、「続けてつらいこと」と「変われば続けられそうなこと」を分けてみると考えやすくなります。';
  else if(topics.includes('EXERCISE')&&topics.includes('HEALTH')) text=showAction?'動きたい気持ちと、今日は疲れている感覚の両方を大事にしてよさそう。負担の小さい選択をひとつ置いておきます。':'動きたい気持ちと、今日は疲れている感覚の両方を大事にしてよさそう。今日は負担の小さいことから考えてみよう。';
  else if(intent==='ADVICE') text=showAction?'すぐに正解を決めず、今いちばん困っていることから一緒に考えよう。必要なら小さな選択肢も置いておきます。':'すぐに正解を決めず、今いちばん困っていることから一緒に考えよう。';
  else if(topics.includes('FOOD')) text='お腹がすいていると、ほかのことも考えにくいよね。まずは何か食べて、ひと息ついてからでも大丈夫。';
  else text=showAction?'今の気分に合いそうな、小さな選択をひとつだけ置いておきます。':'今は無理に決めなくても大丈夫。気になることがあれば、そのまま話してね。';
  return {intent,topics,text,showAction,action,showCircle:intent==='CONNECT'};
}

/** The current processor is deterministic and local. Future processors can implement the same boundary. */
export const RuleBasedProcessor:CamelliaProcessor={
  respond:(input,context)=>buildRuleResponse(input,context.availableRecommendations,context),
};

export function respond(state:CamelliaState,recs:Recommendation[],input:string,history:AIMessage[]=[],selectedLeaf?:TreeLeaf){
  const context=buildCamelliaContext(state,recs,history,new Date(),selectedLeaf);
  return RuleBasedProcessor.respond(input,context);
}
