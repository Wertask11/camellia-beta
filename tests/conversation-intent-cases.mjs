import{createServer}from'vite';import{fileURLToPath}from'node:url';const root=fileURLToPath(new URL('..',import.meta.url));const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});const con=await server.ssrLoadModule('/lib/conversation/engine.ts');
const state={profile:{},checkins:[],actions:[],actionFeedback:[],savedActions:[],aiConversations:[],contextualMemory:[],insights:[],insightFeedback:[]};const recs=[{action:{id:'breathing',title:'4回だけ深呼吸'},score:1,reasons:[]}];const say=input=>con.respond(state,recs,input,[]);const result=[];
// The quick input on the Camellia screen asks for something to do now; it must reach the Action path and show a choice.
for(const input of['今できることある？','今できることある?','何かできることある？','今できることってある？']){const r=say(input);result.push([input,r.intent==='ACTION'&&r.showAction&&r.action?.id==='breathing',{intent:r.intent,card:r.showAction}])}
// Existing intents keep their meaning.
for(const[input,intent]of[['話を聞いてほしい','LISTEN'],['別にアドバイスはいらない、話聞いてほしい','LISTEN'],['気持ちを整理したい','REFLECT'],['どうしたらいいと思う？','ADVICE'],['誰かと話したい','CONNECT'],['なんか暇','ACTION']])result.push([input,con.classifyIntent(input)===intent,con.classifyIntent(input)]);
// Wanting to think it through together is advice; wanting to think about what to do is an action request.
for(const[input,intent]of[['一緒に考えたい','ADVICE'],['行動を考えたい','ACTION'],['何か行動したい','ACTION']]){const r=say(input);result.push([input,r.intent===intent&&r.showAction&&r.action?.id==='breathing',{intent:r.intent,card:r.showAction}])}
// A reply never promises a choice that the screen does not show (food talk shows no card; neither does an empty recommendation list).
const none=input=>con.respond(state,[],input,[]);
const corpus=['今できることある？','一緒に考えたい','行動を考えたい','どうしたらいいと思う？','なんか暇','運動したいけど体調が悪くて疲れてる','お腹すいた、今できることある？','お腹すいたけどどうしたらいい？','話を聞いてほしい','気持ちを整理したい','明日デートなんだけど何着ていこうかな','仕事辞めようか迷ってる'];
for(const input of corpus)for(const[label,r]of[['recs',say(input)],['no recs',none(input)]]){const promises=/置いておきます/.test(r.text);result.push([`${input} (${label})`,!promises||Boolean(r.showAction&&r.action),{promises,card:Boolean(r.showAction&&r.action),text:r.text}])}
result.push(['お腹すいた、今できることある？ has no card',!say('お腹すいた、今できることある？').showAction,say('お腹すいた、今できることある？').text]);
// Saying there is nothing one can do is not a request for an action.
for(const input of['自分にできることなんてない','今できることなんて何もない','私にできることはない'])result.push([input,say(input).intent!=='ACTION'&&!say(input).showAction,say(input).intent]);
// An explicit wish to be listened to, or to connect, still wins over the action question.
result.push(['聞いてほしいだけ。今できることある？',say('聞いてほしいだけ。今できることある？').intent==='LISTEN',say('聞いてほしいだけ。今できることある？').intent]);result.push(['寂しい。今できることある？',say('寂しい。今できることある？').intent==='CONNECT',say('寂しい。今できることある？').intent]);
for(const[x,ok,detail]of result)console.log(`${x}: ${ok?'PASS':'FAIL'}`,JSON.stringify(detail));await server.close();if(result.some(x=>!x[1]))process.exitCode=1;
