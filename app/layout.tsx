import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
export const metadata: Metadata = { title: 'Camellia — 今日は、自分のために何する？', referrer: 'no-referrer', description: '知るだけで終わらない。今日の自分に合う選択肢を見つけ、選び、行動する。Camelliaはあなたの選択と行動を応援します。', openGraph: { title: 'Camellia', description: '今日は、自分のために何する？ 毎日をやさしく整えるウェルビーイングアプリ', images: ['/og.png'] }, twitter: { card: 'summary_large_image', title: 'Camellia', description: '今日は、自分のために何する？', images: ['/og.png'] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body className={geist.variable}>{children}</body></html>; }
