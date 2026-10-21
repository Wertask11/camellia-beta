import { useEffect, useRef } from 'react';
import { ANALYTICS_SESSION_CHANGED, currentAnalyticsSession } from '@/lib/analytics/session';
/** A new Today visit counts once; staying on Today across a session/day boundary counts a new view. */
export function useCheckView(onView: () => void) {
  const sent = useRef<string | undefined>(undefined);
  useEffect(() => {
    const send = () => {
      const session = currentAnalyticsSession();
      if (sent.current === session || document.visibilityState === 'hidden') return;
      sent.current = session; onView();
    };
    const timer = window.setTimeout(send, 0);
    window.addEventListener(ANALYTICS_SESSION_CHANGED, send);
    return () => { window.clearTimeout(timer); window.removeEventListener(ANALYTICS_SESSION_CHANGED, send); };
  }, [onView]);
}
