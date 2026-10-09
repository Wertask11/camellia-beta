import posthog from 'posthog-js';
import { sanitizeAttribution } from './attribution';
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  CamelliaState,
} from '@/types';

const SAFE_PROPERTIES: Record<AnalyticsEventName, readonly string[]> = {
  session_start: [],
  welcome_view: ['period'],
  welcome_continue: ['period'],
  login_view: ['authenticated'],
  login_success: ['method'],
  login_skip: [],
  profile_complete: [],
  auth_method_selected: ['auth_method'],
  conversation_starter_selected: ['starter_id'],
  account_link_started: ['auth_method'],
  account_link_success: ['auth_method'],
  check_view: [],
  check_start: [],
  check_complete: ['hasDetails'],
  daily_reflection_view: ['reflection_stage', 'history_days'],
  weekly_insight_view: ['history_days'],
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
let identifiedId = '';
const PUBLIC_PROJECT_TOKEN = 'phc_C7uHQF9QnDo497kex9cdZqwKx53hDBiVU54sBSDHPaks';
/** PostHog adds page URLs on its own ($current_url, $session_entry_url, …). A login return carries a
 * one-time LINE code or Passport ticket in the query, so keep only origin and path. */
export function scrubUrlProperties<T extends { properties?: Record<string, unknown> } | null>(result: T): T {
  const properties = result?.properties;
  if (!properties) return result;
  for (const [key, value] of Object.entries(properties))
    if (typeof value === 'string' && /^https?:\/\//.test(value)) properties[key] = value.split(/[?#]/)[0];
  return result;
}
export function initAnalytics(distinctId: string) {
  if (typeof window === 'undefined') return initialized;
  if(initialized){if(identifiedId!==distinctId){posthog.identify(`camellia_${distinctId}`);identifiedId=distinctId;}return true;}
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
    save_campaign_params: false,
    before_send: scrubUrlProperties,
  });
  posthog.identify(`camellia_${distinctId}`);
  identifiedId=distinctId;
  initialized = true;
  return true;
}
export function resetAnalyticsIdentity() {
  if (typeof window === 'undefined' || !initialized) return;
  posthog.reset();
  initialized = false;
}
export function sanitizeEventProperties(
  event: AnalyticsEvent,
  state: CamelliaState,
) {
  const allowed = SAFE_PROPERTIES[event.name];
  const source = event.properties ?? {};
  const safe: Record<string, string | number | boolean> = {};
  for (const key of allowed) {
    const value = source[key];
    if (event.name === 'conversation_starter_selected' && !['today', 'vent', 'organize', 'check'].includes(String(value))) continue;
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
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    ...sanitizeAttribution(source),
    $insert_id: event.id,
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
