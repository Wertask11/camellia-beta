/** LINE, Instagram, X, TikTok and Facebook open links in their own in-app browser. Google refuses sign-in there. */
export function inAppBrowser(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return /\bLine\/|FBAN|FBAV|Instagram|Twitter|TikTok|BytedanceWebview|musical_ly/i.test(userAgent);
}
export const IN_APP_GOOGLE_NOTE = 'LINEなどのアプリ内ブラウザでは、Googleでのログイン・連携ができません。右上のメニューから「Safari（ブラウザ）で開く」を選んでからお試しください。';
