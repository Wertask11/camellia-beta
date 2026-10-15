'use client';
import {useState,type ComponentProps} from 'react';
import {ArrowLeft,MessageCircle,Plus} from 'lucide-react';
import {CamelliaScreen} from './CamelliaScreen';
import {conversationTitle} from '@/lib/conversation/threads';
type Base=ComponentProps<typeof CamelliaScreen>;
type Props=Omit<Base,'conversationId'|'onSaveConversation'|'onReplaceConversationAssistant'>&{
 onSaveConversation:(...args:[...Parameters<Base['onSaveConversation']>,string?])=>void;
 onReplaceConversationAssistant:(...args:[...Parameters<Base['onReplaceConversationAssistant']>,string?])=>void;
};
export function ConversationWorkspace(props:Props){
 const [selectedId,setSelectedId]=useState<string|null>(()=>props.treeContext?crypto.randomUUID():null);
 const [search,setSearch]=useState('');
 const conversations=[...props.state.aiConversations].filter(item=>item.messages.length).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const selected=conversations.find(item=>item.id===selectedId);
 const newChat=()=>{props.onClearTreeContext();setSelectedId(crypto.randomUUID());};
 if(selectedId)return <section className="conversation-workspace conversation-workspace--open" aria-label="Camelliaとの会話">
  <div className="conversation-toolbar"><button onClick={()=>{setSelectedId(null);props.onClearTreeContext();}} aria-label="会話一覧へ戻る"><ArrowLeft size={18}/>会話一覧</button><span>{conversationTitle(selected)}</span><button onClick={newChat} aria-label="新しい会話を始める"><Plus size={18}/></button></div>
  <CamelliaScreen {...props} key={`${selectedId}:${props.treeContext?.id??''}`} conversationId={selectedId}
   onSaveConversation={(u,a,intent,topics,provider)=>props.onSaveConversation(u,a,intent,topics,provider,selectedId)}
   onReplaceConversationAssistant={(u,a,provider)=>props.onReplaceConversationAssistant(u,a,provider,selectedId)}/>
 </section>;
 const filtered=conversations.filter(item=>conversationTitle(item).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <main className="screen conversation-library"><header><div><p className="eyebrow">言葉にしたいことから、少しずつ</p><h1>Camelliaに話す</h1></div></header>
  <button className="conversation-new" onClick={newChat}><Plus size={20}/><span><strong>新しい会話を始める</strong><small>今の気持ちから、まっさらな会話を。</small></span></button>
  <section aria-labelledby="conversation-history"><h2 id="conversation-history">これまでの会話</h2>
   {conversations.length>0&&<label className="conversation-search">会話を探す<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="最初に話した言葉で検索"/></label>}
   <div className="conversation-list">{filtered.map(item=><button className="conversation-preview" key={item.id} onClick={()=>setSelectedId(item.id)}><MessageCircle size={20}/><span><strong>{conversationTitle(item)}</strong><small>{item.messages.filter(message=>message.role==='user').length}回のやりとり · {new Date(item.updatedAt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric'})}</small></span><span aria-hidden="true">→</span></button>)}</div>
   {!filtered.length&&<p className="empty">{conversations.length?'見つかりませんでした。別の言葉で探してみてください。':'まだ会話はありません。今日あったことや、ふと思ったことから。'}</p>}
  </section>
 </main>;
}
