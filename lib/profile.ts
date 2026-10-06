import { jstDate } from '@/lib/fortune/engine';
import type { Profile } from '@/types';
export const MIN_AGE = 18, MAX_AGE = 45;
export function currentAge(birthDate: string | undefined, now = new Date()) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return undefined;
  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== birthDate) return undefined;
  const today = jstDate(now);
  if (birthDate > today) return undefined;
  return Number(today.slice(0,4)) - Number(birthDate.slice(0,4)) - (today.slice(5) < birthDate.slice(5) ? 1 : 0);
}
export function profileComplete(profile: Profile, now = new Date()) {
  const age = currentAge(profile.birthDate, now);
  return Boolean(profile.name.trim() && age !== undefined && age >= MIN_AGE && age <= MAX_AGE && profile.womenServiceAcknowledged && profile.agreedAt);
}
