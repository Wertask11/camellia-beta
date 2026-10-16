import type { ActionDefinition, Category } from '@/types';
import { EXPANDED_ACTIONS } from './expanded-actions.js';
export const CATEGORY_LABELS:Record<Category,string>={REST:'休む',BODY:'整える',BEAUTY:'美容',PLAY:'楽しむ',LEARN:'学ぶ',CONNECT:'つながる'};
export const ACTIONS:ActionDefinition[]=[...EXPANDED_ACTIONS,
{id:'breathing',title:'4回だけ深呼吸',category:'REST',discoverCategory:'休む',minutes:2,image:'/actions/illustrations/rest.webp',description:'目を閉じて、吐く息を少し長く。何もしないための2分です。',tags:['stress','night']},
{id:'early-bed',title:'今夜は30分早く休む',category:'REST',discoverCategory:'休む',minutes:30,image:'/actions/illustrations/rest.webp',description:'通知を閉じて、いつもより少し早く布団へ。',tags:['sleep','night']},
{id:'do-nothing',title:'今日は何もしない',category:'REST',discoverCategory:'休む',minutes:0,image:'/actions/illustrations/rest.webp',description:'予定を足さないことも、自分を大切にする選択です。',tags:['stress','period','rest']},
{steps:['楽な姿勢になる','痛みのない範囲で肩や背中を小さく動かす','違和感があればやめて、続けるか自分で選ぶ'],id:'gentle-stretch',title:'5分のやさしいストレッチ',category:'BODY',discoverCategory:'整える',minutes:5,image:'/actions/illustrations/body.webp',description:'呼吸に合わせて肩と背中をゆっくりほぐします。',tags:['body','period']},
{id:'walk',title:'光を感じる15分散歩',category:'BODY',discoverCategory:'整える',minutes:15,image:'/actions/illustrations/body.webp',description:'速さは気にせず、外の空気を感じる短い散歩です。',tags:['stress','mood','morning']},
{id:'warm-bath',title:'ゆっくり温かいお風呂',category:'BODY',discoverCategory:'整える',minutes:20,image:'/actions/illustrations/body.webp',description:'体を温め、今日の緊張をほどく時間です。',tags:['period','night']},
{steps:['使い慣れた保湿剤を用意する','普段と同じ方法で少量なじませる','違和感がなければ、今日はここで終える'],id:'skin-care',title:'保湿だけのシンプルケア',category:'BEAUTY',discoverCategory:'美容',minutes:5,image:'/actions/illustrations/beauty.webp',description:'頑張る美容ではなく、今日の肌をいたわるケア。',tags:['beauty','night']},
{id:'head-spa',title:'近くのヘッドスパを探す',category:'BEAUTY',discoverCategory:'美容',minutes:60,image:'/actions/illustrations/beauty.webp',description:'プロに任せて頭と首を休ませる選択肢です。',tags:['beauty','stress'],destination:'place'},
{steps:['好きな曲を一つ選ぶ','心地よい音量で聴く','曲が終わったら、続けるか静かに過ごすか選ぶ'],id:'music',title:'好きな曲を1曲だけ聴く',category:'PLAY',discoverCategory:'楽しむ',minutes:5,image:'/actions/illustrations/play.webp',description:'ほかのことをせず、お気に入りの一曲だけ。',tags:['mood','play']},
{id:'cafe',title:'気になっていたカフェへ',category:'PLAY',discoverCategory:'楽しむ',minutes:45,image:'/actions/illustrations/play.webp',description:'いつもの場所から少し離れて気分転換。',tags:['play'],destination:'place'},
{id:'three-lines',title:'気になることを3行メモ',category:'LEARN',discoverCategory:'学ぶ',minutes:10,image:'/actions/illustrations/learn.webp',description:'気になっていたテーマを調べ、3行だけ残します。',tags:['learn']},
{id:'read',title:'本を10分だけ読む',category:'LEARN',discoverCategory:'学ぶ',minutes:10,image:'/actions/illustrations/learn.webp',description:'読み切らなくて大丈夫。数ページだけの学びです。',tags:['learn','night']},
{id:'talk-ai',title:'Camelliaに話す',category:'CONNECT',discoverCategory:'つながる',opens:'camellia',minutes:5,image:'/actions/illustrations/connect.webp',description:'言葉にならない気持ちも、そのまま話してください。',tags:['stress','mood']},
{id:'circle',title:'同じ気持ちのCircleを見る',category:'CONNECT',discoverCategory:'つながる',requires:'circle',minutes:10,image:'/actions/illustrations/connect.webp',description:'目的の近い小さなコミュニティをのぞきます。',tags:['connect'],destination:'circle'}];
