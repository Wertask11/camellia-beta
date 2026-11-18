import type { Metadata } from 'next';
import {CAMELLIA_MESSAGE} from '@/lib/brand';
import { Geist } from 'next/font/google';
import './globals.css';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
export const metadata: Metadata = { title: 'Camellia — 今日は、自分のために何する？', referrer: 'no-referrer', description: CAMELLIA_MESSAGE, openGraph: { title: 'Camellia', description: CAMELLIA_MESSAGE, images: ['/og.png'] }, twitter: { card: 'summary_large_image', title: 'Camellia', description: CAMELLIA_MESSAGE, images: ['/og.png'] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body className={geist.variable}>{children}</body></html>; }
