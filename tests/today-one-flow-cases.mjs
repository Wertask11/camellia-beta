/* β2 Today one flow: the four record stages (mock state only), stage-accurate copy, one 何もしない,
   today's actions only, Fortune actions reordered, analytics allowlist and profile_view once. */
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {createElement,StrictMode,act,useEffect} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const dom=new Window({url:'http://localhost/'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
const result=[];
try{
  const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
  const {recommend}=await server.ssrLoadModule('/lib/recommendation/engine.ts');
  const {buildDailyReflection}=await server.ssrLoadModule('/lib/reflection/engine.ts');
  const {TodayScreen}=await server.ssrLoadModule('/screens/TodayScreen.tsx');
  const {fortuneActions}=await server.ssrLoadModule('/screens/FortuneScreen.tsx');
  const {TAROT_CARDS}=await server.ssrLoadModule('/data/tarot.ts');
  const {tomorrowCopy,actionTitle,splitActiveActions}=await server.ssrLoadModule('/lib/today/flow.ts');
  const {sanitizeEventProperties}=await server.ssrLoadModule('/lib/analytics/posthog.ts');
  const {firstInSession}=await server.ssrLoadModule('/lib/analytics/once.ts');
  // Browser globals only after the modules load (posthog-js reads `location` when it sees a window).
  for(const key of ['window','document','HTMLElement','Event','MouseEvent','localStorage','sessionStorage'])globalThis[key]=key==='window'?dom:dom[key];
  const now=new Date();
  const at=days=>new Date(now.getTime()+days*86400000-60000).toISOString();
  const check=(days,mood=3,extra={})=>({id:`c${days}`,mood,...extra,createdAt:at(days),updatedAt:at(days)});
  const stateWith=checkins=>{const s=emptyState();s.profile={...s.profile,name:'テスト',availableMinutes:20};s.onboardingComplete=true;s.checkins=checkins;return s};
  const noop=()=>{};
  const render=state=>renderToStaticMarkup(createElement(TodayScreen,{state,recommendations:recommend(state,now),onCheckView:noop,onCheckStart:noop,onCheckin:noop,onOpenAction:noop,onChoose:noop,onIntent:noop,onTalk:noop,onFortune:noop,onTree:noop,onMy:noop,onComplete:noop,onFeedback:noop,onProposals:noop,onTrack:noop}));
  const text=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  const heading=html=>/<h2[^>]*tabindex="-1"[^>]*>([^<]*)<\/h2>/.exec(html)?.[1];

  // Before Check: only the Check is the hero; the rest is a quiet, non-clickable preview.
  const fresh=render(stateWith([]));
  result.push(['未Check: 予告は押せない3行',fresh.includes('Checkすると、ここに返ってきます')&&!/<ol>[^]*<button/.test(fresh.split('flow-preview')[1]??''),'']);
  result.push(['未Check: 今日どうする？・一枚・過ごし方は出さない',!fresh.includes('今日どうする？')&&!fresh.includes('fortune-entry')&&!fresh.includes('plan-main'),'']);
  result.push(['初日: 昨日を捏造しない',!fresh.includes('yesterday-pill')&&!text(fresh).includes('昨日は「'),'']);
  const before=render(stateWith([check(-1,3)]));
  result.push(['翌日: 昨日の気分を添える',text(before).includes('昨日は「普通」でした。今日は？')&&text(before).includes('昨日と今日、何が違う？'),text(before).slice(0,200)]);
  const gap=render(stateWith([check(-3,4)]));
  result.push(['昨日が無い日は添えない',!gap.includes('yesterday-pill'),'']);

  // After Check: four stages from mock records only.
  const stages=[
    {stage:'first_day',checkins:[check(0,4,{sleep:7})],title:'今日のあなた',tomorrow:'明日またCheckすると、今日との違いが見えてきます。'},
    {stage:'yesterday_compare',checkins:[check(-1,3),check(0,4,{sleep:7})],title:'昨日との違い',tomorrow:'明日でCheckが3回に。最近のあなたの流れが見えてきます。'},
    {stage:'recent',checkins:[check(-2,3),check(-1,3),check(0,4)],title:'最近のあなた',tomorrow:'明日Checkすると、今日との違いと最近の流れが見えてきます。7回分のふり返りまで、あと4回です。'},
    {stage:'weekly',checkins:[-6,-5,-4,-3,-2,-1,0].map(d=>check(d,d===0?4:3)),title:'今週のあなた',tomorrow:'明日Checkすると、今日との違いと、直近7回の流れが見えてきます。'},
  ];
  for(const {stage,checkins,title,tomorrow} of stages){
    const state=stateWith(checkins);
    const reflection=buildDailyReflection(state,now);
    const html=render(state);
    result.push([`${stage}: 段階`,reflection.stage===stage,reflection.stage]);
    result.push([`${stage}: 見出し「${title}」`,heading(html)===title,heading(html)]);
    result.push([`${stage}: 明日のCamellia`,text(html).includes(tomorrow)&&tomorrowCopy(reflection.stage,reflection.historyDays)===tomorrow,tomorrowCopy(reflection.stage,reflection.historyDays)]);
    result.push([`${stage}: 1/3→2/3→3/3 の順`,html.indexOf('1 / 3')<html.indexOf('2 / 3')&&html.indexOf('2 / 3')<html.indexOf('3 / 3')&&html.indexOf('3 / 3')<html.indexOf('今日どうする？'),'']);
    result.push([`${stage}: 1/3は済み（文字とaria-current）`,text(html).includes('✓ 済み')&&html.includes('aria-current="step"'),'']);
    result.push([`${stage}: 1/3と明日のCamelliaで同じ予告を繰り返さない`,text(html).split('明日またCheckすると').length<=2,'']);
    result.push([`${stage}: 今日は何もしないは1回`,html.split('今日は何もしない').length-1===1,html.split('今日は何もしない').length-1]);
    result.push([`${stage}: 主役は1件＋1行2件`,html.split('class="plan-main"').length-1===1&&html.split('<li>').length-1===2,'']);
    result.push([`${stage}: Discoverへの動作は「過ごし方を見る」`,html.includes('aria-label="休む過ごし方を見る"'),'']);
    result.push([`${stage}: 改善・悪化と断定しない`,!/改善|悪化|良くなった|悪くなった/.test(text(html)),'']);
    result.push([`${stage}: 折りたたみの要約`,new RegExp(`今日のCheck · \\d\\d:\\d\\d · ${reflection.historyDays}日目`).test(text(html)),'']);
  }
  // 「今週のあなた」 only when the seven records really fall within seven days.
  const spread=stateWith([-20,-15,-10,-6,-3,-1,0].map(d=>check(d)));
  result.push(['7回が1週間を超えると「最近7回のあなた」',heading(render(spread))==='最近7回のあなた',heading(render(spread))]);
  // A missing optional field never breaks the screen (older records).
  const old=stateWith([{id:'o',mood:3,createdAt:at(-1),updatedAt:at(-1)},{id:'t',mood:4,createdAt:at(0)}]);
  result.push(['古い記録（updatedAt無し）でも表示できる',render(old).includes('today-result'),'']);

  // やってみていること: today's only; earlier ones are kept and pointed to My.
  const busy=stateWith([check(0,4)]);
  busy.actions=[
    {id:'a1',actionId:'talk-ai',title:'AI Camelliaに話す',category:'CONNECT',status:'started',startedAt:at(-3),createdAt:at(-3),updatedAt:at(-3)},
    {id:'a2',actionId:'walk',title:'10分だけ散歩',category:'BODY',status:'started',startedAt:at(-2),createdAt:at(-2),updatedAt:at(-2)},
    {id:'a3',actionId:'music',title:'好きな曲を1曲だけ聴く',category:'PLAY',status:'started',startedAt:at(0),createdAt:at(0),updatedAt:at(0)},
  ];
  const busyHtml=render(busy);
  result.push(['今日の分だけ表示し、以前の2件はMyに',text(busyHtml).includes('以前の2件はMyに')&&!text(busyHtml).includes('10分だけ散歩'),'']);
  result.push(['旧表記は表示時だけ「Camelliaに話す」',actionTitle(busy.actions[0])==='Camelliaに話す'&&busy.actions[0].title==='AI Camelliaに話す','']);
  result.push(['記録は消さない',splitActiveActions(busy.actions,now).earlier.length===2&&busy.actions.length===3,'']);

  // Fortune: the existing recommendations, reordered by the card's themes (no new judgement).
  const tower=TAROT_CARDS.find(c=>c.id==='tower');
  const recs=recommend(stateWith([check(0,4)]),now,undefined,6);
  const picked=fortuneActions(tower,recs);
  result.push(['一枚: 既存の推薦から2件',picked.length===2&&picked.every(r=>recs.includes(r))&&!picked.some(r=>r.action.id==='do-nothing'),picked.map(r=>r.action.id)]);
  const restFirst=recs.some(r=>r.action.category==='REST'&&r.action.id!=='do-nothing');
  result.push(['一枚: カードのテーマ（休む）が先',!restFirst||picked[0].action.category==='REST',picked.map(r=>r.action.category)]);

  // Analytics: only allowlisted values; no free text.
  const safe=sanitizeEventProperties({id:'e',name:'fortune_reflect',properties:{value:'some',text:'PRIVATE'}},stateWith([]));
  result.push(['fortune_reflect は value だけ',safe.value==='some'&&!JSON.stringify(safe).includes('PRIVATE')&&!('text' in safe),safe]);
  const pv=sanitizeEventProperties({id:'e',name:'profile_view',properties:{name:'PRIVATE_NAME',birthDate:'2000-01-01'}},stateWith([]));
  result.push(['profile_view に個人情報なし',!/PRIVATE|2000/.test(JSON.stringify(pv)),pv]);

  // profile_view: once, even with StrictMode's double effects and a re-render.
  let sent=0;
  function Profile(){useEffect(()=>{if(firstInSession('camellia-profile-view'))sent++;});return null;}
  const host=document.createElement('div');document.body.append(host);const app=createRoot(host);
  await act(async()=>{app.render(createElement(StrictMode,null,createElement(Profile)));});
  await act(async()=>{app.render(createElement(StrictMode,null,createElement(Profile)));});
  await act(async()=>app.unmount());
  result.push(['profile_view は1回だけ（StrictMode）',sent===1,sent]);
}finally{await server.close();await dom.happyDOM.close();}
for(const [name,ok,detail] of result)console.log(`${name}: ${ok?'PASS':'FAIL'}${ok?'':` ${JSON.stringify(detail)}`}`);
const failed=result.filter(([,ok])=>!ok);
if(failed.length){console.error(`${failed.length} FAIL`);process.exit(1);}
console.log(`Today one flow: PASS (${result.length} cases)`);
