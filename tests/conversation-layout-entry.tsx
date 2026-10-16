/** Real conversation components with local fixture records only. No authentication/API mock. */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ConversationWorkspace} from '@/screens/ConversationWorkspace';
import {emptyState} from '@/hooks/useCamelliaStore';
import '@/app/globals.css';
const noop=()=>{};
function Layout(){
 const [state]=useState(()=>{const value=emptyState(),now=new Date().toISOString();value.aiConversations=[{id:'long',createdAt:now,updatedAt:now,messages:Array.from({length:80},(_,i)=>({id:String(i),role:i%2?'assistant':'user',text:i%2?'仕事のことがまだ気になっているんだね。ここで少し話していこう。':i===0?'仕事で気になっていること':'今日はこんなことがあったよ。',createdAt:now,provider:i%2?'gemini':undefined}))},{id:'other',createdAt:now,updatedAt:now,messages:[{id:'other-u',role:'user',text:'週末の楽しみを考えたい',createdAt:now}]}];return value;});
 return <div className="app-shell"><ConversationWorkspace state={state} recommendations={[]} onSaveConversation={noop} onReplaceConversationAssistant={noop} onOpenAction={noop} onNavigate={noop} onClearTreeContext={noop} onTree={noop} onRemember={noop} onTrack={noop}/><nav className="bottom-nav"><button>Today</button><button className="active">Camellia</button><button>Discover</button><button>My</button></nav></div>;
}
createRoot(document.getElementById('root')!).render(<Layout/>);
