import {createRoot} from 'react-dom/client';
import {CircleScreen} from '@/screens/CircleScreen';
import '@/app/globals.css';
const noop=()=>{};
createRoot(document.getElementById('root')!).render(<div className="app-shell"><aside>Component fixture · no live auth/API verification</aside><CircleScreen onBack={noop} onTrack={noop}/></div>);
