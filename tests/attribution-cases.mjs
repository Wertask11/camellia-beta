import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({configFile:false, root, resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom'});
try {
  const {sanitizeAttribution, sessionAttribution} = await server.ssrLoadModule('/lib/analytics/attribution.ts');
  const {sanitizeEventProperties} = await server.ssrLoadModule('/lib/analytics/posthog.ts');
  assert.deepEqual(sanitizeAttribution({utm_source:'TikTok',utm_medium:'social',utm_campaign:'beta_202610',utm_content:'video-a',note:'private'}), {utm_source:'tiktok',utm_medium:'social',utm_campaign:'beta_202610',utm_content:'video-a'});
  for (const value of ['a@example.com','https://example.com','09012345678','hello world','秘密', 'a123456789']) assert.deepEqual(sanitizeAttribution({utm_content:value}),{});
  const data = new Map();
  globalThis.window = {location:{search:'?utm_source=x&utm_campaign=launch'}};
  globalThis.sessionStorage = {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const entry = sessionAttribution();
  window.location.search = '';
  assert.deepEqual(sessionAttribution(),entry);
  for(const name of ['session_start','check_view','check_start','check_complete']) {
    const event = {id:name,name,properties:{...entry,note:'private'}};
    const props = sanitizeEventProperties(event,{analyticsEvents:[]});
    assert.equal(props.utm_source,'x'); assert.equal(props.$insert_id,name);
    assert.equal(props.note,undefined);
  }
  data.clear();
  assert.deepEqual(sessionAttribution(),{});
  console.log('attribution: PASS (entry retention, funnel, new session, privacy, stable event ID)');
} finally {delete globalThis.window;delete globalThis.sessionStorage;await server.close();}
