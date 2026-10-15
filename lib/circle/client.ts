import type { CirclePost } from './catalog';
import { schoolParkAuth } from '../schoolpark/firebase';
export async function circleRequest(
  query = '',
  body?: Record<string, unknown>,
) {
  const user = schoolParkAuth.currentUser;
  if (!user) throw new Error('ログインしてください。');
  const token = await user.getIdToken();
  const response = await fetch(`/api/camellia/circle${query}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  const data = (await response.json()) as {
    error?: string;
    circles: Array<{
      id: string;
      name: string;
      description: string;
      joined: boolean;
    }>;
    moderator: boolean;
    posts: CirclePost[];
    comments: CirclePost[];
    own: Array<CirclePost & { kind: 'post' | 'comment' }>;
    blocks: string[];
    reports: Array<{
      id: string;
      reason: string;
      status: string;
      targetId: string;
      text: string;
    }>;
  };
  if (!response.ok) {
    const errors: Record<string, string> = {
      MEMBERSHIP_REQUIRED: '参加してから利用できます。',
      GUIDELINES_REQUIRED: 'ガイドラインを確認してください。',
      CONTENT_NOT_ALLOWED:
        '個人情報や危険な表現を含んでいないか、文章を確認してください。',
      SLOW_DOWN: '少し時間をあけて、また試してみてください。',
      RESERVED_NAME: '運営と誤解されない表示名を選んでください。',
      INVALID_INPUT: '入力内容を確認してください。',
      NOT_OWNER: 'この操作はできません。',
      MODERATOR_REQUIRED: '運営担当者のみ利用できます。',
    };
    throw new Error(
      errors[data.error ?? ''] ??
        '今はつながりにくいようです。少し時間をおいて試してください。',
    );
  }
  return data;
}
