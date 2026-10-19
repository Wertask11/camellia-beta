import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=process.cwd();
const loader=await createServer({configFile:false,root,server:{middlewareMode:true,hmr:false}});
let circleBuildEnabled;
try{({circleBuildEnabled}=await loader.ssrLoadModule('/lib/build/features.ts'));}finally{await loader.close();}
const cases=[
 {label:'published API and missing client flag',env:{CAMELLIA_CIRCLE_ENABLED:'true'},expected:true},
 {label:'published API and stale false client flag',env:{CAMELLIA_CIRCLE_ENABLED:'true',VITE_CIRCLE_ENABLED:'false'},expected:true},
 {label:'explicit API OFF overrides stale client ON',env:{CAMELLIA_CIRCLE_ENABLED:'false',VITE_CIRCLE_ENABLED:'true'},expected:false},
 {label:'unconfigured stays closed',env:{},expected:false},
 {label:'legacy local client-only fixture',env:{VITE_CIRCLE_ENABLED:'true'},expected:true},
];
for(const scenario of cases){
 const enabled=circleBuildEnabled(scenario.env);assert.equal(enabled,scenario.expected);
 const server=await createServer({configFile:false,root,resolve:{alias:{'@':root}},define:{__CAMELLIA_CIRCLE_ENABLED__:JSON.stringify(enabled)},server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {LIVE_DESTINATIONS}=await server.ssrLoadModule('/lib/features.ts');
  assert.equal(LIVE_DESTINATIONS.has('circle'),enabled);assert.equal(LIVE_DESTINATIONS.has('place'),false);
  const {DiscoverScreen}=await server.ssrLoadModule('/screens/DiscoverScreen.tsx');
  const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');const noop=()=>{};
  const html=renderToStaticMarkup(createElement(DiscoverScreen,{state:emptyState(),onCategory:noop,onOpenAction:noop,onOpenSecondary:noop}));
  assert.equal(html.includes('のぞいてみる'),enabled);assert.equal(html.includes('Circleは公開準備中です'),!enabled);
  assert.ok(html.includes('デモを見る'),'Place must remain a demo');
  console.log('PASS Circle publication: '+scenario.label);
 }finally{await server.close();}
}
assert.equal(circleBuildEnabled({CAMELLIA_CIRCLE_ENABLED:'false',FIREBASE_SERVICE_ACCOUNT_JSON:'private-placeholder'}),false);
console.log('Circle published UI regression PASS (synthetic build flags; no live authentication).');
