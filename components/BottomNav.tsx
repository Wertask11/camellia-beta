import { Compass, Flower2, Home, UserRound } from 'lucide-react';
export type MainTab = 'today'|'camellia'|'discover'|'my';
const items:[MainTab,string,typeof Home][]=[['today','Today',Home],['camellia','Camellia',Flower2],['discover','Discover',Compass],['my','My',UserRound]];
export function BottomNav({ active, onChange }:{ active:MainTab; onChange:(tab:MainTab)=>void }) { return <nav className="bottom-nav">{items.map(([id,label,Icon])=><button key={id} className={active===id?'active':''} onClick={()=>onChange(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>; }
