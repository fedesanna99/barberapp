export const TEXT_LIMITS = {
  profileName: 60,
  profileBio: 240,
  shopName: 80,
  city: 60,
  address: 160,
  phone: 32,
  socialLink: 200,
  specialties: 160,
  postCaption: 500,
  postLabel: 60,
  comment: 500,
  review: 500,
  directMessage: 2000,
  supportMessage: 2000,
  notificationTitle: 120,
  notificationBody: 1000,
} as const

export function limitText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}
