export const PLACE_CATEGORIES = [
  'カフェ',
  '本屋',
  '美容',
  'ヘッドスパ',
  'リラクゼーション',
  'ヨガ / フィットネス',
  'ワークショップ',
  '学び',
  'コワーキング',
  '公園 / 自然',
  '文化施設',
  'その他',
] as const;
export const PLACE_INTENTS = {
  quiet: '静かに過ごす',
  rest: 'ゆっくり過ごす',
  try: '新しいことに触れる',
  move: '軽く動く',
} as const;
export type PlaceStatus = 'draft' | 'review' | 'published' | 'suspended';
export type Place = {
  saved?: boolean;
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  region: string;
  area: string;
  address: string;
  priceRange: string;
  duration: string;
  openingHours: string;
  officialUrl: string;
  instagramUrl: string;
  bookingUrl: string;
  mapUrl: string;
  imageUrls: string[];
  tags: string[];
  recommendedFor: string[];
  partnerStatus: 'none' | 'partner';
  sponsored: boolean;
  specialOffer: string;
  status: PlaceStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
export function validSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}
export function safePlaceUrl(value: unknown, required = false) {
  if (value === '' || value === undefined) {
    if (required) throw new Error('INVALID_PLACE');
    return '';
  }
  if (typeof value !== 'string' || value.length > 1000)
    throw new Error('INVALID_PLACE');
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ||
      /\.(local|internal)$/.test(url.hostname)
    )
      throw new Error();
    return url.toString();
  } catch {
    throw new Error('INVALID_PLACE');
  }
}
export function validatePlace(value: Record<string, unknown>) {
  const text = (key: string, max: number, required = false) => {
    const v = value[key] ?? '';
    if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
      throw new Error('INVALID_PLACE');
    return v.trim();
  };
  const slug = text('slug', 80, true);
  if (!validSlug(slug)) throw new Error('INVALID_PLACE');
  const category = text('category', 40, true);
  if (!PLACE_CATEGORIES.includes(category as (typeof PLACE_CATEGORIES)[number]))
    throw new Error('INVALID_PLACE');
  const list = (key: string, max: number) => {
    const values = value[key] ?? [];
    if (
      !Array.isArray(values) ||
      values.length > max ||
      values.some((v) => typeof v !== 'string' || v.length > 80)
    )
      throw new Error('INVALID_PLACE');
    return values as string[];
  };
  const imageUrls = value.imageUrls ?? [];
  if (!Array.isArray(imageUrls) || imageUrls.length > 5)
    throw new Error('INVALID_PLACE');
  const description = text('description', 1500);
  if (/必ず(治る|改善)|治療効果を保証/.test(description))
    throw new Error('INVALID_PLACE');
  const recommendedFor = list('recommendedFor', 4);
  if (recommendedFor.some((key) => !Object.hasOwn(PLACE_INTENTS, key)))
    throw new Error('INVALID_PLACE');
  return {
    slug,
    name: text('name', 100, true),
    category,
    shortDescription: text('shortDescription', 180),
    description,
    region: text('region', 60, true),
    area: text('area', 60, true),
    address: text('address', 200),
    priceRange: text('priceRange', 80),
    duration: text('duration', 80),
    openingHours: text('openingHours', 300),
    officialUrl: safePlaceUrl(value.officialUrl),
    instagramUrl: safePlaceUrl(value.instagramUrl),
    bookingUrl: safePlaceUrl(value.bookingUrl),
    mapUrl: safePlaceUrl(value.mapUrl),
    imageUrls: imageUrls.map((url) => safePlaceUrl(url, true)),
    tags: list('tags', 8),
    recommendedFor,
    partnerStatus:
      value.partnerStatus === 'partner'
        ? ('partner' as const)
        : ('none' as const),
    sponsored: value.sponsored === true,
    specialOffer: text('specialOffer', 200),
  };
}
