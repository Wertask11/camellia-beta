import posthog from 'posthog-js';
import {PERFORMANCE_KEYS} from '@/lib/conversation/performance';
import { analyticsTimestamp } from './session';
import { analyticsDiagnostic } from './diagnostics';
import { sanitizeAttribution } from './attribution';
import { createDeliveryQueue, MAX_DELIVERY_AGE, type DeliveryResult } from './delivery';
import { ACTIONS } from '@/data/actions';
import { TAROT_CARDS } from '@/data/tarot';
import { isConversationModel } from '@/lib/conversation/models';
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  CamelliaState,
} from '@/types';

const SAFE_PROPERTIES: Record<AnalyticsEventName, readonly string[]> = {
  place_view:['place_id'], place_save:['place_id'], place_external_open:['place_id'], place_booking_open:['place_id'], place_map_open:['place_id'],
  circle_view: ['circle_id', 'days_since_join'], circle_join: ['circle_id'], circle_leave: ['circle_id'], circle_post_create: ['circle_id'], circle_comment_create: ['circle_id'], circle_reaction: ['circle_id'], circle_report: ['circle_id'], circle_block: [],
  session_start: [],
  welcome_view: ['period', 'entry_flow', 'entry_session'],
  welcome_continue: ['period', 'entry_flow', 'entry_session'],
  login_view: ['authenticated', 'entry_flow', 'entry_session'],
  login_success: ['method', 'needs_profile', 'entry_flow', 'entry_session'],
  login_skip: [],
  profile_view: ['entry_flow', 'entry_session'],
  profile_complete: ['entry_flow', 'entry_session'],
  auth_method_selected: ['method', 'auth_method', 'entry_flow', 'entry_session'],
  auth_returned: ['method', 'auth_flow', 'entry_flow', 'entry_session'],
  login_failure: ['method', 'stage', 'reason', 'entry_flow', 'entry_session'],
  save_prompt_view: ['entry_flow', 'entry_session'],
  guest_check_saved: ['entry_flow', 'entry_session', 'storage'],
  today_flow_resume: ['entry_flow', 'entry_session'],
  conversation_starter_selected: ['starter_id'],
  conversation_open: ['provider','model_id'],
  conversation_message_sent: ['provider','model_id'],
  conversation_response_received: ['provider', 'response_time_ms','model_id','transport',...PERFORMANCE_KEYS],
  conversation_error: ['provider', 'error_category','model_id',...PERFORMANCE_KEYS],
  conversation_model_selected: ['model_id'],
  /** Which of the four reactions YURA / Lactone put on her message. Never the message. */
  conversation_reaction_shown: ['reaction', 'model_id'],
  /** Opening the character's profile, and renaming her. Never the name itself, only whether it is a custom one. */
  character_profile_open: ['model_id'],
  character_renamed: ['custom_name'],
  conversation_model_switched: ['model_id','from_model','to_model'],
  account_link_started: ['auth_method'],
  account_link_success: ['auth_method'],
  discover_view: [],
  check_view: ['entry_flow', 'entry_session'],
  check_start: ['entry_flow', 'entry_session'],
  check_complete: ['hasDetails', 'entry_flow', 'entry_session'],
  daily_reflection_view: ['reflection_stage', 'history_days', 'entry_flow', 'entry_session'],
  weekly_insight_view: ['history_days'],
  fortune_open: [],
  fortune_draw: ['cardId'],
  fortune_complete: ['cardId'],
  fortune_action_selected: ['actionId'],
  fortune_skip: ['cardId'],
  /** yes / some / no only. The person's own words never leave the device. */
  fortune_reflect: ['value'],
  tree_open: [],
  tree_add_start: [],
  tree_add_complete: ['category', 'tagCount'],
  tree_leaf_open: ['leafAgeDays'],
  tree_leaf_edit: [],
  tree_reflection_add: [],
  tree_archive: [],
  /** Invites. Never the code itself: only the result, whether it came from a link, and the channel name
   *  the operator chose (instagram_1027). Member invites carry no channel. */
  invite_view: ['from_link'],
  invite_submit: ['result', 'from_link'],
  invite_accepted: ['invite_kind', 'invite_channel'],
  access_suspended_view: [],
  member_invite_open: [],
  member_invite_share: ['share_method'],
};
let initialized = false;
let identifiedId = '';
const PUBLIC_PROJECT_TOKEN = 'phc_C7uHQF9QnDo497kex9cdZqwKx53hDBiVU54sBSDHPaks';
/** SDK-added URL metadata must not include auth callback query/hash, including nested metadata. */
export function scrubUrlProperties<T extends { properties?: Record<string, unknown> } | null>(result: T): T {
  function scrub(value: unknown): unknown {
    if (typeof value === 'string' && /^https?:\/\//.test(value)) return value.split(/[?#]/)[0];
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, scrub(child)]));
    return value;
  }
  if (result?.properties) result.properties = scrub(result.properties) as Record<string, unknown>;
  return result;
}
let prepared: Record<string, unknown> | undefined;
let preparing: { id: string; name: string; keys: Set<string> } | undefined;
// Only documented, non-content SDK metadata. Never send arbitrary registered/super/person properties.
const SDK_PROPERTIES = new Set(['distinct_id','$device_id','$user_id','$session_id','$window_id','$lib','$lib_version',
  '$os','$os_version','$browser','$browser_version','$device_type','$screen_height','$screen_width',
  '$viewport_height','$viewport_width','$current_url','$host','$pathname','$referrer','$referring_domain',
  '$session_entry_url','$session_entry_host','$session_entry_pathname','$session_entry_referrer','$session_entry_referring_domain',
  '$is_identified','$time']);
function permitted() {
  if (typeof navigator === 'undefined' || !initialized) return false;
  const flags = [navigator.doNotTrack, (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack,
    (window as Window & { doNotTrack?: string }).doNotTrack];
  return !flags.some(value => value === '1' || value === 'yes') && !posthog.has_opted_out_capturing();
}
const queue = createDeliveryQueue({
  storage: () => localStorage,
  permitted,
  async send(packet) {
    // Check again at transport time. Account changes never retag pending events.
    if (!permitted() || packet.profileKey !== identifiedId || packet.destination !== destination()) return 0;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${host()}/batch/`, {
        method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: token(), batch: [packet.payload] }), signal: controller.signal,
      });
      if (!response.ok) { analyticsDiagnostic(packet.event, `http_${response.status}`); return response.status; }
      // Some ingestion errors explicitly return status:0 even when the HTTP status is 200.
      const body = await response.json().catch(() => null) as { status?: unknown } | null;
      if (body?.status === 0) { analyticsDiagnostic(packet.event, 'transport_rejected'); return 400; }
      return response.status;
    } catch { analyticsDiagnostic(packet.event, 'network_pending'); return 0; } finally { clearTimeout(timeout); }
  },
});
const token = () => import.meta.env.VITE_POSTHOG_KEY || PUBLIC_PROJECT_TOKEN;
const host = () => (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '');
const destination = () => `${host()}|${token()}`;
export function initAnalytics(distinctId: string) {
  if (typeof window === 'undefined') return false;
  if (!initialized) {
    posthog.init(token(), {
      api_host: host(), autocapture: false, capture_pageview: false, capture_pageleave: false,
      disable_session_recording: true, person_profiles: 'never', respect_dnt: true,
      persistence: 'localStorage', save_campaign_params: false,
      advanced_disable_flags: true, disable_surveys: true,
      before_send(result) {
        // Public SDK hook: prepare the SDK envelope; our durable sender owns delivery and HTTP receipts.
        // Dropping here intentionally disables the SDK's separate in-memory retry queue.
        if (preparing && result && result.event === preparing.name && result.properties.$insert_id === preparing.id) {
          const clean = scrubUrlProperties(result);
          const properties = Object.fromEntries(Object.entries(clean.properties).filter(([key]) => preparing!.keys.has(key) || SDK_PROPERTIES.has(key)));
          properties.distinct_id = `camellia_${identifiedId}`;
          prepared = { event: clean.event, properties, timestamp: clean.timestamp, uuid: clean.uuid };
        }
        return null;
      },
    });
    initialized = true;
    const retry = () => { if (document.visibilityState !== 'hidden') queue.retry(); };
    window.addEventListener('online', retry); window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', retry);
  }
  if (identifiedId !== distinctId) {
    if (identifiedId) posthog.reset(); // unrelated accounts must not be aliased together
    identifiedId = distinctId;
    posthog.identify(`camellia_${distinctId}`);
  }
  queue.activate(distinctId, destination());
  return true;
}
/** Logout pauses old-account events; personal-record deletion also erases this device's pending queue. */
export function resetAnalyticsIdentity(options: { clearPending?: boolean } = { clearPending: true }) {
  if (typeof window === 'undefined') return;
  if (options.clearPending !== false) queue.clear(); else queue.pause();
  if (initialized) posthog.reset();
  identifiedId = '';
}
export function setAnalyticsDeliveryAllowed(allowed: boolean) { queue.allow(allowed); }
function captureDurably(event: AnalyticsEvent, properties: Record<string, unknown>, callback?: (result: DeliveryResult) => void) {
  let reason: 'dnt' | 'opt_out' | 'expired' | 'invalid_event' | undefined;
  if (!permitted()) reason = navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes' ? 'dnt' : 'opt_out';
  else if (!Number.isFinite(Date.parse(event.createdAt))) reason = 'invalid_event';
  else if (Date.parse(event.createdAt) < Date.now() - MAX_DELIVERY_AGE) reason = 'expired';
  if (reason) { analyticsDiagnostic(event.name, `suppressed_${reason}`, host()); callback?.({ status: 'suppressed', reason }); return true; }
  prepared = undefined;
  preparing = { id: event.id, name: event.name, keys: new Set(Object.keys(properties)) };
  try {
    posthog.capture(event.name, properties, {
      send_instantly: true, timestamp: new Date(event.createdAt),
      ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.id) ? { uuid: event.id } : {}),
    });
  } finally { preparing = undefined; }
  if (!prepared) return false; // e.g. SDK bot filtering; not a network success
  const queued = queue.enqueue({ id: event.id, event: event.name, createdAt: event.createdAt,
    profileKey: identifiedId, destination: destination(), payload: prepared }, result => {
      analyticsDiagnostic(event.name, result.status === 'accepted' ? 'http_accepted' : `suppressed_${result.reason}`, host());
      callback?.(result);
    });
  analyticsDiagnostic(event.name, queued ? 'queued' : 'queue_unavailable', host());
  return queued;
}
export function sanitizeEventProperties(
  event: AnalyticsEvent,
  state: CamelliaState,
) {
  const allowed = Object.hasOwn(SAFE_PROPERTIES, event.name) ? SAFE_PROPERTIES[event.name] : [];
  const source = event.properties ?? {};
  const safe: Record<string, string | number | boolean> = {};
  for (const key of allowed ?? []) {
    const value = source[key];
    if (!validProperty(key, value)) continue;
    if (['model_id','from_model','to_model'].includes(key) && !isConversationModel(value)) continue;
    if (key === 'days_since_join' && (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 36500)) continue;
    if (key === 'place_id' && (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value))) continue;
    if (key === 'circle_id' && !['tired','alone-time','working','self','rest','interests'].includes(String(value))) continue;
    if (event.name === 'conversation_starter_selected' && !['today', 'vent', 'organize', 'check'].includes(String(value))) continue;
    if (key === 'provider' && !['gemini', 'fallback'].includes(String(value))) continue;
    if (key === 'error_category' && !['rate_limited', 'timeout', 'network', 'provider_error', 'disabled', 'invalid_request', 'safety_block', 'invalid_response'].includes(String(value))) continue;
    if(key==='transport'&&!['sse','json'].includes(String(value)))continue;
    if((PERFORMANCE_KEYS as readonly string[]).includes(key)&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>120000))continue;
    if (key === 'response_time_ms' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 120_000)) continue;
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
/** true means durably queued (or intentionally suppressed), never HTTP success. */
export function forwardEvent(event: AnalyticsEvent, state: CamelliaState, onDelivery?: (result: DeliveryResult) => void) {
  if (!Object.hasOwn(SAFE_PROPERTIES, event.name) || !initAnalytics(state.profile.id)) return false;
  return captureDurably(event, sanitizeEventProperties(event, state), onDelivery);
}

const AUTH_EVENT_PROPERTIES = {
  login_view: ['authenticated', 'entry_flow', 'entry_session'],
  auth_method_selected: ['method', 'auth_method', 'entry_flow', 'entry_session'],
  auth_returned: ['method', 'auth_flow', 'entry_flow', 'entry_session'],
  login_success: ['method', 'needs_profile', 'entry_flow', 'entry_session'],
  login_failure: ['method', 'stage', 'reason', 'entry_flow', 'entry_session'],
  account_link_started: ['auth_method'],
  account_link_success: ['auth_method'],
} as const;

const AUTH_METHODS = ['line', 'google', 'schoolpark'] as const;
const AUTH_FLOWS = ['redirect', 'popup'] as const;
const AUTH_STAGES = ['provider_open', 'provider_return', 'firebase_signin', 'callback', 'account_conflict', 'cancelled'] as const;
const AUTH_REASONS = ['user_cancelled', 'popup_blocked', 'provider_error', 'account_conflict', 'network', 'unknown'] as const;

export function sanitizeAuthEventProperties(
  name: keyof typeof AUTH_EVENT_PROPERTIES,
  properties: Record<string, string | number | boolean>,
) {
  const safe: Record<string, string | number | boolean> = {};
  for (const key of AUTH_EVENT_PROPERTIES[name]) {
    const value = properties[key];
    if (typeof value === 'boolean' && (key === 'authenticated' || key === 'needs_profile')) safe[key] = value;
    if (typeof value !== 'string') continue;
    if ((key === 'entry_flow' || key === 'entry_session') && validProperty(key, value)) safe[key] = value;
    if ((key === 'method' || key === 'auth_method') && AUTH_METHODS.includes(value as (typeof AUTH_METHODS)[number])) safe[key] = value;
    if (key === 'auth_flow' && AUTH_FLOWS.includes(value as (typeof AUTH_FLOWS)[number])) safe[key] = value;
    if (key === 'stage' && AUTH_STAGES.includes(value as (typeof AUTH_STAGES)[number])) safe[key] = value;
    if (key === 'reason' && AUTH_REASONS.includes(value as (typeof AUTH_REASONS)[number])) safe[key] = value;
  }
  return safe;
}

export function captureAuthEvent(
  name: keyof typeof AUTH_EVENT_PROPERTIES,
  properties: Record<string, string | number | boolean>,
  distinctId: string,
) {
  if (!initAnalytics(distinctId)) return false;
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const event: AnalyticsEvent = { id, name, createdAt: analyticsTimestamp() };
  return captureDurably(event, {
    ...sanitizeAuthEventProperties(name, properties), ...sanitizeAttribution(properties),
    $insert_id: id, event_schema: 1, app_version: 'beta-v3', $process_person_profile: false,
  });
}

const ENUMS: Record<string, readonly string[]> = {
  entry_flow: ['check_first', 'login_first'], storage: ['device'],
  period: ['morning','day','evening','night'], method: AUTH_METHODS, auth_method: AUTH_METHODS,
  auth_flow: AUTH_FLOWS, stage: AUTH_STAGES, reason: AUTH_REASONS,
  reflection_stage: ['first_day','yesterday_compare','recent','weekly'],
  value: ['yes','some','no'], category: ['family','friend','love','work','learning','other'],
  result: ['accepted','already','not_found','used_up','expired','revoked','own','invalid','rate_limited','suspended','error'],
  invite_kind: ['operator','member'], share_method: ['share','copy'],
  reaction: ['heart','smile','clap','thumbs','cry'],
};
const COUNTS: Record<string, number> = { history_days: 36500, leafAgeDays: 36500, tagCount: 8 };
function validProperty(key: string, value: unknown) {
  // Reuse the existing random per-tab analytics session across a verified onboarding handoff; never a UID or Check ID.
  if (key === 'entry_session') return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (ENUMS[key]) return typeof value === 'string' && ENUMS[key].includes(value);
  if (key in COUNTS) return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= COUNTS[key];
  if (['hasDetails','authenticated','needs_profile','from_link','custom_name'].includes(key)) return typeof value === 'boolean';
  // Same shape as a campaign label (attribution.ts): no prose, URLs, e-mail addresses or phone numbers.
  if (key === 'invite_channel') return typeof value === 'string' && /^[a-z][a-z0-9_-]{0,31}$/.test(value) && !/\d{7}/.test(value);
  if (key === 'cardId') return TAROT_CARDS.some(card => card.id === value);
  if (key === 'actionId') return ACTIONS.some(action => action.id === value);
  return true;
}
