import posthog from 'posthog-js';
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  CamelliaState,
} from '@/types';

const SAFE_PROPERTIES: Record<AnalyticsEventName, readonly string[]> = {
  session_start: [],
  check_start: [],
  check_complete: ['hasDetails'],
  fortune_open: [],
  fortune_draw: ['cardId'],
  fortune_complete: ['cardId'],
  fortune_action_selected: ['actionId'],
  fortune_skip: ['cardId'],
  tree_open: [],
  tree_add_start: [],
  tree_add_complete: ['category', 'tagCount'],
  tree_leaf_open: ['leafAgeDays'],
  tree_leaf_edit: [],
  tree_reflection_add: [],
  tree_archive: [],
};
let initialized = false;
const PUBLIC_PROJECT_TOKEN = 'phc_C7uHQF9QnDo497kex9cdZqwKx53hDBiVU54sBSDHPaks';
export function initAnalytics(distinctId: string) {
  if (initialized || typeof window === 'undefined') return initialized;
  const key = import.meta.env.VITE_POSTHOG_KEY || PUBLIC_PROJECT_TOKEN;
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    person_profiles: 'never',
    respect_dnt: true,
    persistence: 'localStorage',
  });
  posthog.identify(`camellia_${distinctId}`);
  initialized = true;
  return true;
}
export function sanitizeEventProperties(event: AnalyticsEvent, state: CamelliaState) {
  const allowed = SAFE_PROPERTIES[event.name];
  const source = event.properties ?? {};
  const safe: Record<string, string | number | boolean> = {};
  for (const key of allowed) {
    const value = source[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
      safe[key] = value;
  }
  const names = new Set(state.analyticsEvents.map((x) => x.name));
  const check = names.has('check_complete'),
    fortune = names.has('fortune_draw'),
    tree = names.has('tree_add_complete');
  return {
    ...safe,
    event_schema: 1,
    app_version: 'beta-v3',
    usage_cohort: check
      ? fortune
        ? tree
          ? 'check_fortune_tree'
          : 'check_fortune'
        : tree
          ? 'check_tree'
          : 'check_only'
      : 'not_checked',
    has_used_fortune: fortune,
    has_used_tree: tree,
    has_completed_check: check,
    $process_person_profile: false,
  };
}
export function forwardEvent(event: AnalyticsEvent, state: CamelliaState) {
  if (!initAnalytics(state.profile.id)) return false;
  return Boolean(
    posthog.capture(event.name, sanitizeEventProperties(event, state), {
      send_instantly: true,
    }),
  );
}
