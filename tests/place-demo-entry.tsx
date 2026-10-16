import { createRoot } from 'react-dom/client';
import Page from '@/app/page';
import '@/app/globals.css';
// Actual public app entry. No auth replacement or API fixtures.
createRoot(document.getElementById('root')!).render(<Page />);
