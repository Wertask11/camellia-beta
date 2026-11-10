import type { AnalyticsEventName } from '@/types';
/** Instrumentation definitions, not approved business thresholds or measured release results. */
export const QUALITY_KPIS = {
  primary: {
    event: 'experience_feedback',
    positive: 'helpful',
    responses: ['helpful', 'okay', 'not_for_me'],
    meaning:
      '本人が選んだ体験価値。無回答を否定評価にしない。自己申告の体験と検証済み来店を区別。',
  },
  retention: {
    start: 'session_start',
    return: 'session_start',
    days: [7, 30],
    period: 'JST calendar day',
    meaning:
      '同じ識別子の再利用。登録済みID・匿名体験・端末変更を区別し、匿名Cookieだけの継続をアカウント継続と断定しない。',
  },
  discovery: [
    'session_start',
    'discover_view',
    'discover_action_selected',
    'place_view',
    'place_selected',
    'my_view',
  ],
  checkOptional: [
    'session_start',
    'check_complete',
    'conversation_message_sent',
    'discover_action_selected',
    'place_view',
    'place_selected',
    'my_view',
  ],
  circleToPlace: [
    'circle_view',
    'circle_place_open',
    'place_view',
    'place_selected',
  ],
  saveWithoutCheck: [
    'save_prompt_view',
    'auth_method_selected',
    'login_success',
    'guest_choices_saved',
  ],
  saveWithCheck: [
    'save_prompt_view',
    'auth_method_selected',
    'login_success',
    'guest_check_saved',
  ],
  plus: ['plus_offer_view', 'plus_start', 'plus_complete'],
} as const satisfies {
  primary: {
    event: AnalyticsEventName;
    positive: string;
    responses: readonly string[];
    meaning: string;
  };
  retention: {
    start: AnalyticsEventName;
    return: AnalyticsEventName;
    days: readonly number[];
    period: string;
    meaning: string;
  };
  discovery: readonly AnalyticsEventName[];
  checkOptional: readonly AnalyticsEventName[];
  circleToPlace: readonly AnalyticsEventName[];
  saveWithoutCheck: readonly AnalyticsEventName[];
  saveWithCheck: readonly AnalyticsEventName[];
  plus: readonly AnalyticsEventName[];
};
