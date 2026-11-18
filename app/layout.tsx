import type { Metadata } from 'next';
import {CAMELLIA_MESSAGE} from '@/lib/brand';
import { Geist } from 'next/font/google';
import './globals.css';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Camellia — 今日は、自分のために何する？',
  referrer: 'no-referrer',
  description: CAMELLIA_MESSAGE,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/camellia-icon-192.png', type: 'image/png', sizes: '192x192' }],
    apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Camellia', statusBarStyle: 'default' },
  openGraph: { title: 'Camellia', description: CAMELLIA_MESSAGE, images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: 'Camellia', description: CAMELLIA_MESSAGE, images: ['/og.png'] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body className={geist.variable}>{children}</body></html>; }
