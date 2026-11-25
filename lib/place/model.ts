import {validatePlaceDetails,type PlaceDetails} from './details.js';
export const PLACE_CATEGORIES = [
  'カフェ',
  '飲食店',
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
  together: '誰かと過ごす',
} as const;
export type PlaceStatus = 'draft' | 'review' | 'published' | 'suspended';
/**
 * listing: the place agreed to be listed (permission + photo rights required).
 * introduction: Camellia introduces the place from its own public information,
 * like a guidebook. No shop agreement, no photos, no partnership/ads/benefits.
 */
export type PlaceListingType = 'listing' | 'introduction';
/** Where shops and facilities ask Camellia to correct or remove a listing. Same contact as the Terms. */
export const PLACE_CORRECTION_EMAIL = 'takakiasaka1@gmail.com';
export function placeCorrectionMailto(place: { name: string; slug: string }) {
  const subject = `【Camellia Place】掲載内容の訂正・削除のご依頼（${place.slug}）`;
  const body = `掲載名：${place.name}\nご依頼の内容（訂正・削除）：\n正しい情報や理由：\nご連絡先（お名前・店舗との関係）：\n`;
  return `mailto:${PLACE_CORRECTION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
/**
 * Medical institutions and medical/therapeutic claims are not listed (medical advertising rules apply to
 * anyone who advertises). The operator review must also exclude them; this check is a safety net.
 */
export const MEDICAL_TERMS =
  /クリニック|医院|病院|診療所|歯科|皮膚科|婦人科|産婦人科|心療内科|精神科|美容外科|美容皮膚科|形成外科|整形|整骨院|接骨院|鍼灸|はり・きゅう|薬局|処方|診療|診断|治療|治る|治ります|完治|効能|効果を保証|医学的に|clinic|hospital/i;
export const INTRODUCTION_NOTICE =
  'Camelliaが公開情報をもとに紹介している場所です。提携・広告ではありません。最新の営業情報は公式サイトでご確認ください。';
export type Place = PlaceDetails & {
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
  listingType: PlaceListingType;
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
  const listed = [value.name, value.shortDescription, description, value.experience, ...(Array.isArray(value.services) ? value.services : []), ...(Array.isArray(value.tags) ? value.tags : [])];
  if (listed.some((v) => typeof v === 'string' && MEDICAL_TERMS.test(v)))
    throw new Error('INVALID_PLACE');
  const listingType: PlaceListingType =
    value.listingType === 'introduction' ? 'introduction' : 'listing';
  const details = validatePlaceDetails(value);
  if (
    listingType === 'introduction' &&
    (imageUrls.length > 0 ||
      value.partnerStatus === 'partner' ||
      value.sponsored === true ||
      (typeof value.specialOffer === 'string' && value.specialOffer.trim()) ||
      (details.benefits?.length ?? 0) > 0)
  )
    throw new Error('INVALID_PLACE');
  const recommendedFor = list('recommendedFor', 4);
  if (recommendedFor.some((key) => !Object.hasOwn(PLACE_INTENTS, key)))
    throw new Error('INVALID_PLACE');
  return {
    ...details,
    listingType,
    contactUrl:safePlaceUrl(value.contactUrl),
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
