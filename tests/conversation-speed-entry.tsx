import {useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {useCamelliaStore} from '@/hooks/useCamelliaStore';import {ConversationWorkspace} from '@/screens/ConversationWorkspace';
import '@/app/globals.css';
const audit={state:undefined as ReturnType<typeof useCamelliaStore>['state']|undefined};
(window as unknown as {speedAudit:typeof audit}).speedAudit=audit;
const noop=()=>{};
function Fixture(){const store=useCamelliaStore();useEffect(()=>{audit.state=store.state;},[store.state]);return <div className="app-shell"><small>LOCAL SYNTHETIC LATENCY BENCHMARK — NO CLOUD</small>{store.ready&&<ConversationWorkspace state={store.state} recommendations={[]} onSaveConversation={store.addConversation} onPendingConversation={store.pendingConversation} onReplaceConversationAssistant={store.replaceConversationAssistant} onSelectConversationModel={store.selectConversationModel} onRemember={store.remember} onTrack={store.track} onClearTreeContext={noop} onOpenAction={noop} onNavigate={noop} onTree={noop}/>}</div>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
