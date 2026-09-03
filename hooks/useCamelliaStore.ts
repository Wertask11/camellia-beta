/* oxlint-disable react/EffectSetState -- hydration must load browser-local persisted state after mount */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ActionDefinition, CamelliaState, Checkin, FeedbackRating, Mood, Profile } from '@/types';

export const STORAGE_KEY = 'camellia-prototype-v2';
const LEGACY_KEY = 'camellia-prototype-v1';
const stamp = () => new Date().toISOString();
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function emptyState(): CamelliaState {
  const now = stamp();
  return {
    version: 2,
    profile: { id: uid(), name: '', age: '', interests: [], lifestyle: '', priority: '', periodEnabled: false, createdAt: now, updatedAt: now },
    checkins: [], actions: [], actionFeedback: [], savedActions: [], aiConversations: [], onboardingComplete: false, createdAt: now, updatedAt: now,
  };
}

function migrateLegacy(raw: unknown): CamelliaState {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;
  const old = raw as Record<string, unknown>;
  const legacyProfile = (old.profile && typeof old.profile === 'object') ? old.profile as Record<string, unknown> : {};
  state.profile = {
    ...state.profile,
    name: typeof legacyProfile.name === 'string' ? legacyProfile.name : '',
    age: typeof legacyProfile.age === 'string' ? legacyProfile.age : '',
    interests: Array.isArray(legacyProfile.interests) ? legacyProfile.interests.filter((x): x is string => typeof x === 'string') : [],
    lifestyle: typeof legacyProfile.lifestyle === 'string' ? legacyProfile.lifestyle : '',
    priority: typeof legacyProfile.priority === 'string' ? legacyProfile.priority : '',
    periodEnabled: Boolean(legacyProfile.periodEnabled),
    updatedAt: stamp(),
  };
  state.onboardingComplete = Boolean(old.onboarded || old.onboardingComplete);
  return state;
}

function loadInitial(): CamelliaState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as CamelliaState;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return migrateLegacy(JSON.parse(legacy));
  } catch { /* damaged demo data starts cleanly */ }
  return emptyState();
}

export function useCamelliaStore() {
  const [state, setState] = useState<CamelliaState>(() => emptyState());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler -- initialize from the browser-only persistence boundary
    setState(loadInitial()); setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: stamp() })); }, [state, ready]);

  const updateProfile = useCallback((values: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...values, updatedAt: stamp() } })), []);
  const completeOnboarding = useCallback(() => setState((s) => ({ ...s, onboardingComplete: true })), []);
  const addCheckin = useCallback((values: { mood: Mood } & Partial<Omit<Checkin, 'id'|'mood'|'createdAt'|'updatedAt'>>) => {
    const now = stamp();
    setState((s) => ({ ...s, checkins: [...s.checkins, { id: uid(), ...values, createdAt: now, updatedAt: now }] }));
  }, []);
  const startAction = useCallback((action: ActionDefinition) => {
    const now = stamp();
    setState((s) => ({ ...s, actions: [...s.actions, { id: uid(), actionId: action.id, title: action.title, category: action.category, status: 'started', startedAt: now, createdAt: now, updatedAt: now }] }));
  }, []);
  const completeAction = useCallback((recordId: string) => setState((s) => ({ ...s, actions: s.actions.map((a) => a.id === recordId ? { ...a, status: 'completed', completedAt: stamp(), updatedAt: stamp() } : a) })), []);
  const skipAction = useCallback((action: ActionDefinition) => {
    const now = stamp();
    setState((s) => ({ ...s, actions: [...s.actions, { id: uid(), actionId: action.id, title: action.title, category: action.category, status: 'skipped', createdAt: now, updatedAt: now }] }));
  }, []);
  const saveAction = useCallback((action: ActionDefinition) => setState((s) => {
    if (s.savedActions.some((x) => x.actionId === action.id)) return s;
    const now = stamp();
    return { ...s, savedActions: [...s.savedActions, { id: uid(), actionId: action.id, createdAt: now, updatedAt: now }] };
  }), []);
  const addFeedback = useCallback((actionRecordId: string, actionId: string, rating: FeedbackRating) => {
    const now = stamp();
    setState((s) => ({ ...s, actionFeedback: [...s.actionFeedback, { id: uid(), actionRecordId, actionId, rating, createdAt: now, updatedAt: now }] }));
  }, []);
  const addConversation = useCallback((userText: string, assistantText: string) => {
    const now = stamp();
    setState((s) => {
      const current = s.aiConversations[0] ?? { id: uid(), messages: [], createdAt: now, updatedAt: now };
      const messages = [...current.messages, { id: uid(), role: 'user' as const, text: userText, createdAt: now }, { id: uid(), role: 'assistant' as const, text: assistantText, createdAt: now }];
      return { ...s, aiConversations: [{ ...current, messages, updatedAt: now }, ...s.aiConversations.slice(1)] };
    });
  }, []);
  const reset = useCallback(() => setState(emptyState()), []);

  return { state, ready, updateProfile, completeOnboarding, addCheckin, startAction, completeAction, skipAction, saveAction, addFeedback, addConversation, reset };
}
