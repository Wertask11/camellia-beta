import type {
  CirclePost,
  CircleSummary,
  CircleReport,
  CircleAudit,
} from './catalog';
import { schoolParkAuth } from '../schoolpark/firebase';
export async function circleRequest(
  query = '',
  body?: Record<string, unknown>,
) {
  const user = schoolParkAuth.currentUser;
  if (!user) throw new Error('ログインしてください。');
  const token = await user.getIdToken().catch(() => {
    throw new Error('もう一度ログインしてください。');
  });
  const response = await fetch(`/api/camellia/circle${query}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  }).catch(() => {
    throw new Error(
      '今はつながりにくいようです。少し時間をおいて試してください。',
    );
  });
  const data = (await response.json().catch(() => {
    throw new Error(
      '今はつながりにくいようです。少し時間をおいて試してください。',
    );
  })) as {
    error?: string;
    version?: number;
    circles: CircleSummary[];
    nextCursor?: string;
    nextOwnCursor?: string;
    nextReportCursor?: string;
    nextAuditCursor?: string;
    audits: CircleAudit[];
    moderator: boolean;
    reaction?: string | null;
    posts: CirclePost[];
    comments: CirclePost[];
    own: Array<CirclePost & { kind: 'post' | 'comment' }>;
    blocks: string[];
    reports: CircleReport[];
  };
  if (!response.ok) {
    const errors: Record<string, string> = {
      LOGIN_REQUIRED: 'もう一度ログインしてください。',
      PROFILE_REQUIRED: 'Myで利用開始時の設定を確認してください。',
      NOT_FOUND: 'この文章は削除されたか、今は表示できません。',
      NOT_AVAILABLE: 'この文章は今は表示できません。',
      MEMBERSHIP_REQUIRED: '参加してから利用できます。',
      GUIDELINES_REQUIRED: 'ガイドラインを確認してください。',
      CONTENT_NOT_ALLOWED:
        '個人情報や危険な表現を含んでいないか、文章を確認してください。',
      SLOW_DOWN: '少し時間をあけて、また試してみてください。',
      RESERVED_NAME: '運営と誤解されない表示名を選んでください。',
      INVALID_INPUT: '入力内容を確認してください。',
      INVALID_CURSOR: '一覧を読み直してください。',
      ALREADY_REVIEWED: '別の担当者が対応済みです。一覧を読み直してください。',
      NOT_OWNER: 'この操作はできません。',
      MODERATOR_REQUIRED: '運営担当者のみ利用できます。',
    };
    throw Object.assign(new Error(
      errors[data.error ?? ''] ??
        '今はつながりにくいようです。少し時間をおいて試してください。',
    ), { code: data.error });
  }
  return data;
}
