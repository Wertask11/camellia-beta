import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {emptyState,STORAGE_KEY,useCamelliaStore} from '@/hooks/useCamelliaStore';
import {StorageRecovery} from '@/components/StorageRecovery';
import {MyScreen} from '@/screens/MyScreen';
import {TreeScreen} from '@/screens/TreeScreen';
import {FortuneScreen} from '@/screens/FortuneScreen';
import {drawFortune,jstDate} from '@/lib/fortune/engine';
import '@/app/globals.css';
const noop=()=>{};
const params=new URLSearchParams(location.search),mode=params.get('case');
const seeded=emptyState();seeded.profile.id='local-profile-A';seeded.profile.name='画面検証用';
seeded.checkins=[{id:'local-check',mood:3,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
if(mode==='storage'&&!location.hash){const broken=params.get('broken');localStorage.setItem(STORAGE_KEY,broken==='json'?'{broken':JSON.stringify({...seeded,...(broken?{[broken]:{invalid:true}}:{})}));}
function Storage(){
 const store=useCamelliaStore();
 useEffect(()=>{Object.assign(window,{alphaFixture:{update:()=>store.updateProfile({name:'保存前の変更'}),repair:()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded)),reset:store.reset}});});
 return store.storageError?<StorageRecovery state={store.state} error={store.storageError} onRetry={store.retryStorage}/>:<><output>記録を表示できます</output><TreeScreen leaves={store.state.treeLeaves} onBack={noop} onAdd={noop} onUpdate={noop} onRemove={noop} onTrack={noop} onTalk={noop} onReflect={noop}/></>;
}
function Personal(){return <MyScreen state={seeded} devNight={false} onEditProfile={noop} onForget={noop} onReset={noop} onInsight={noop} onPrivacy={noop} onTree={noop} onDevNight={noop}/>;}
function Fortune(){const[state,setState]=useState(seeded);
 useEffect(()=>{Object.assign(window,{alphaFixture:{switchProfile:()=>setState(s=>({...s,profile:{...s.profile,id:'local-profile-B'}})),draw:()=>setState(s=>({...s,fortunes:[{date:jstDate(),cardId:drawFortune(s.profile.id,jstDate()).card.id,orientation:'upright',status:'drawn',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]}))}});});
 return <FortuneScreen state={state} recommendations={[]} onBack={noop} onSave={f=>setState(s=>({...s,fortunes:[f]}))} onTrack={noop} onAction={noop}/>;
}
createRoot(document.getElementById('root')!).render(<div className="app-shell"><aside>LOCAL SYNTHETIC FIXTURE · 実認証・同期検証ではありません</aside>{mode==='dialog'?<Personal/>:mode==='fortune'?<Fortune/>:<Storage/>}</div>);
