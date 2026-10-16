import {createRoot} from 'react-dom/client';
import {PlaceScreen} from '@/screens/PlaceScreen';
import '@/app/globals.css';
const noop=()=>{};
createRoot(document.getElementById('root')!).render(<div className="app-shell"><aside>Local fixture · fictional place · no live auth/API</aside><PlaceScreen onBack={noop} onTrack={noop}/></div>);
