import { schoolParkAuth } from '../schoolpark/firebase';
import type { Place } from './model';
export async function placeRequest(
  query = '',
  body?: Record<string, unknown>,
  operator = false,
) {
  const headers: Record<string, string> = {};
  if (body || operator || schoolParkAuth.currentUser) {
    const user = schoolParkAuth.currentUser;
    if (!user) throw new Error('ログインしてください。');
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  if (body) headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`/api/camellia/place${query}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = (await response.json()) as {
      places: Place[];
      place: Place;
      nextCursor?: string;
      operator?: boolean;
      error?: string;
    };
    if (!response.ok)
      throw new Error(
        data.error === 'NOT_FOUND'
          ? 'この場所は今は公開されていません。'
          : data.error === 'OPERATOR_REQUIRED'
            ? '運営担当者のみ利用できます。'
            : data.error === 'REVIEW_REQUIRED'
              ? '実在情報と掲載内容を確認してから公開してください。'
              : data.error === 'INVALID_TRANSITION'
                ? '掲載状態が変わっています。一覧を確認してください。'
                : '今はつながりにくいようです。少し時間をおいて試してください。',
      );
    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      !['TypeError', 'TimeoutError', 'AbortError', 'SyntaxError'].includes(
        error.name,
      )
    )
      throw error;
    throw new Error(
      '今はつながりにくいようです。少し時間をおいて試してください。',
    );
  }
}
