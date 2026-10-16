import { ACTIONS } from '../../data/actions.js';
export const IDS = [
  'breathing',
  'window-pause',
  'question-note',
  'desk-reset',
  'music',
  'draft-message',
];
export const CONVERSATION_ACTIONS = ACTIONS.filter((action) =>
  IDS.includes(action.id),
);
