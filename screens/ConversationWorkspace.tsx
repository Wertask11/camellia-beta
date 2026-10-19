'use client';
import {useState,type ComponentProps} from 'react';
import {ArrowLeft,MessageCircle,Plus} from 'lucide-react';
import {CamelliaScreen} from './CamelliaScreen';
import {conversationTitle,conversationModelSummary} from '@/lib/conversation/threads';
import {defaultConversationModel,conversationModelName} from '@/lib/conversation/models';
import type {useCamelliaStore} from '@/hooks/useCamelliaStore';
type Base=ComponentProps<typeof CamelliaScreen>;
type Store=ReturnType<typeof useCamelliaStore>;
type Props=Omit<Base,'conversationId'|'onSaveConversation'|'onReplaceConversationAssistant'|'initialModel'|'onSelectModel'>&{
 onSaveConversation:Store['addConversation'];
 onReplaceConversationAssistant:Store['replaceConversationAssistant'];
 onSelectConversationModel?:Store['selectConversationModel'];
};
export function ConversationWorkspace(props:Props){
 const [selectedId,setSelectedId]=useState<string|null>(()=>props.treeContext?crypto.randomUUID():null);
 const [search,setSearch]=useState('');
 const [visibleCount,setVisibleCount]=useState(30);
 const conversations=[...props.state.aiConversations].filter(item=>item.messages.some(message=>message.role!=='system')).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const selected=conversations.find(item=>item.id===selectedId);
 const newChat=()=>{props.onClearTreeContext();setSelectedId(crypto.randomUUID());};
 if(selectedId)return <section className="conversation-workspace conversation-workspace--open" aria-label="Camelliaとの会話">
  <div className="conversation-toolbar"><button onClick={()=>{setSelectedId(null);props.onClearTreeContext();}} aria-label="会話一覧へ戻る"><ArrowLeft size={18}/>会話一覧</button><span>{conversationTitle(selected)}</span><button onClick={newChat} aria-label="新しい会話を始める"><Plus size={18}/></button></div>
  <CamelliaScreen {...props} key={`${selectedId}:${props.treeContext?.id??''}`} conversationId={selectedId}
   initialModel={selected?defaultConversationModel(selected.activeModel):defaultConversationModel(props.state.profile.lastConversationModel)}
   onSelectModel={(modelId,markerId)=>props.onSelectConversationModel?.(selectedId,modelId,markerId)}
   onSaveConversation={(u,a,intent,topics,provider,assistantModel,requestModel)=>props.onSaveConversation(u,a,intent,topics,provider,selectedId,assistantModel,requestModel)}
   onReplaceConversationAssistant={(u,a,provider,assistantModel)=>props.onReplaceConversationAssistant(u,a,provider,selectedId,assistantModel)}/>
 </section>;
 const filtered=conversations.filter(item=>conversationTitle(item).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <main className="screen conversation-library"><header><div><p className="eyebrow">言葉にしたいことから、少しずつ</p><h1>Camelliaに話す</h1></div></header>
  {!conversations.length&&<p className="conversation-style-intro">Camelliaには、2つの話し方があります。<br/>YURA：話して、ほどく。<br/>Lactone：整えて、選ぶ。</p>}
  <button className="conversation-new" onClick={newChat}><Plus size={20}/><span><strong>新しい会話を始める</strong><small>{conversationModelName(defaultConversationModel(props.state.profile.lastConversationModel))}で、まっさらな会話から。</small></span></button>
  <section aria-labelledby="conversation-history"><h2 id="conversation-history">これまでの会話</h2>
   {conversations.length>0&&<label className="conversation-search">会話を探す<input type="search" value={search} onChange={event=>{setSearch(event.target.value);setVisibleCount(30);}} placeholder="最初に話した言葉で検索"/></label>}
   <div className="conversation-list">{filtered.slice(0,visibleCount).map(item=><button className="conversation-preview" key={item.id} onClick={()=>setSelectedId(item.id)}><MessageCircle size={20}/><span><strong>{conversationTitle(item)}</strong>{conversationModelSummary(item)&&<span className="conversation-model-badge">{conversationModelSummary(item)}</span>}<small>{item.messages.filter(message=>message.role==='user').length}回のやりとり · {new Date(item.updatedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span><span aria-hidden="true">→</span></button>)}</div>
   {filtered.length>visibleCount&&<button className="secondary-button" onClick={()=>setVisibleCount(count=>count+30)}>さらに過去の会話を見る</button>}
   {!filtered.length&&<p className="empty">{conversations.length?'見つかりませんでした。別の言葉で探してみてください。':'まだ会話はありません。今日あったことや、ふと思ったことから。'}</p>}
  </section>
 </main>;
}
