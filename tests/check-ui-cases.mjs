import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try {
  const {TodayScreen} = await server.ssrLoadModule('/screens/TodayScreen.tsx');
  const {emptyState} = await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
  const noop = ()=>{};
  const props={state:emptyState(),recommendations:[],onCheckView:noop,onCheckStart:noop,onCheckin:noop,onOpenAction:noop,onIntent:noop,onTalk:noop,onFortune:noop,onTree:noop,onComplete:noop,onFeedback:noop,onProposals:noop,onTrack:noop};
  const html=renderToStaticMarkup(createElement(TodayScreen,props));
  assert.match(html,/<legend[^>]*>今の気分は？/);
  assert.equal((html.match(/aria-pressed="false"/g)||[]).length,5);
  assert.ok(!html.includes('今日の私を見てみる'));
  assert.ok(!html.includes('睡眠や身体のことも添える'));
  assert.match(html,/気分だけでも大丈夫/);
  assert.match(html,/Checkのあとに/);
  console.log('check UI: PASS (five existing moods, clear question, no competing completion/details before first tap)');
} finally {await server.close();}
