export const CIRCLES = [
  {
    id: 'tired',
    name: '今日はちょっと疲れた',
    description: '答えを急がず、今日の一言を置ける場所。',
  },
  {
    id: 'alone-time',
    name: '一人の時間がほしい',
    description: '自分のための余白や距離感について。',
  },
  {
    id: 'working',
    name: '働く日々のこと',
    description: '仕事や家事など、日々の役割について少し話す場所。',
  },
  {
    id: 'self',
    name: '自分のことを知りたい',
    description: '正解を決めず、自分の感じ方を見つける場所。',
  },
  {
    id: 'rest',
    name: '休み方を見つけたい',
    description: '自分に合う休み方を持ち寄る場所。',
  },
  {
    id: 'interests',
    name: '好きなことを見つけたい',
    description: '小さな楽しみや関心を分かち合う場所。',
  },
] as const;
export const REACTIONS = ['わかる', 'そっと応援', '参考になった'] as const;
export type CircleReactionCounts = Record<(typeof REACTIONS)[number], number>;
export const REPORT_REASONS = [
  '嫌がらせ',
  '個人情報',
  '危険な内容',
  'スパム',
  '不適切',
  'その他',
] as const;
export const GUIDELINES_VERSION = '2026-10-16';
export type CirclePost = {
  id: string;
  circleId: string;
  authorId: string;
  displayName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
  myReaction?: string | null;
  receivedReactions?: CircleReactionCounts;
};

export type CircleSummary = {
  id: string;
  name: string;
  description: string;
  joined: boolean;
  memberCount: number;
  daysSinceJoin?: number;
};
export type CircleReport = {
  id: string;
  reason: string;
  status: string;
  targetId: string;
  targetKind: 'post' | 'comment';
  circleId: string;
  authorId: string;
  createdAt: string;
  text: string;
};
export type CircleAudit = {
  id: string;
  action: 'remove' | 'dismiss';
  note: string;
  targetId: string;
  targetKind: 'post' | 'comment';
  authorId: string;
  createdAt: string;
  moderatorId: string;
};
