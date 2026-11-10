export const NOTIFICATION_TOPICS={place:'場所・体験との出会い',circle:'Circleの新しい動き',reflection:'自分の体験を振り返るきっかけ'} as const;
export type NotificationPreferences={requested:boolean;topics:Array<keyof typeof NOTIFICATION_TOPICS>;frequency:'daily'|'weekly'|'monthly';updatedAt:string};
export const NOTIFICATION_DELIVERY_READY=false;
export function validNotificationPreferences(v:unknown):v is NotificationPreferences{if(!v||typeof v!=='object')return false;const p=v as Record<string,unknown>;return Object.keys(p).every(k=>['requested','topics','frequency','updatedAt'].includes(k))&&typeof p.requested==='boolean'&&Array.isArray(p.topics)&&p.topics.length<=3&&new Set(p.topics).size===p.topics.length&&(!p.requested||p.topics.length>0)&&p.topics.every(t=>typeof t==='string'&&Object.hasOwn(NOTIFICATION_TOPICS,t))&&typeof p.frequency==='string'&&['daily','weekly','monthly'].includes(p.frequency)&&typeof p.updatedAt==='string'&&Number.isFinite(Date.parse(p.updatedAt));}
/** A lock-screen preview never includes a Check, a person's name, a circle theme or private text. */
export function safeNotificationPreview(){return {title:'Camellia',body:'今日は、自分のために何する？選択肢を見にいく。'};}
export function notificationCanSend(_preferences:NotificationPreferences){return NOTIFICATION_DELIVERY_READY;}
