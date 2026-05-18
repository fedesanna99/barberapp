import { supabase, IS_DEMO } from '../lib/supabase'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const AVATAR_MAX_DIM = 400
const POST_MAX_DIM = 1920
const JPEG_QUALITY = 0.85
// Hard cap before compression — refuses oversized uploads that would burn
// CPU/memory on low-end mobile (e.g. a 50 MB HEIC pretending to be JPG).
const MAX_INPUT_SIZE = 10 * 1024 * 1024

export function validateImageType(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Unsupported file type. Please use JPG, PNG, or WebP.')
  }
}

function validateImageSize(file: File): void {
  if (file.size > MAX_INPUT_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`Immagine troppo grande: ${mb} MB (massimo 10 MB).`)
  }
}

function compressImage(file: File, maxDim: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round(height * maxDim / width)
          width = maxDim
        } else {
          width = Math.round(width * maxDim / height)
          height = maxDim
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Image compression failed')); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  validateImageType(file)
  validateImageSize(file)
  const compressed = await compressImage(file, AVATAR_MAX_DIM)
  if (IS_DEMO) return URL.createObjectURL(compressed)
  const path = `${userId}/avatar.jpg`
  const { data: existing } = await supabase.storage.from('avatars').list(userId)
  if (existing?.length) {
    await supabase.storage.from('avatars').remove(existing.map(f => `${userId}/${f.name}`))
  }
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  // Task 6 — cache-bust. The path is always `{uid}/avatar.jpg`, so the public URL
  // is byte-identical across uploads and the browser kept showing the old image
  // until a hard reload. Appending `?v=<timestamp>` forces a fresh fetch and the
  // stored value (with the suffix) survives reload, so other surfaces that read
  // `profiles.avatar_url` (Feed avatars, BarberProfileSheet, etc.) all update too.
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

export async function uploadPostPhoto(file: File, barberId: string): Promise<string> {
  validateImageType(file)
  validateImageSize(file)
  const compressed = await compressImage(file, POST_MAX_DIM)
  if (IS_DEMO) return URL.createObjectURL(compressed)
  const path = `${barberId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('posts')
    .upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  // Cache-bust suffix parallels the avatar upload — same path can be re-uploaded
  // (e.g. an edit flow in future) and the CDN would otherwise serve the stale image.
  return `${supabase.storage.from('posts').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

export async function uploadUserPostPhoto(file: File, userId: string): Promise<string> {
  validateImageType(file)
  validateImageSize(file)
  const compressed = await compressImage(file, POST_MAX_DIM)
  if (IS_DEMO) return URL.createObjectURL(compressed)
  const path = `users/${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('posts')
    .upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  return `${supabase.storage.from('posts').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}
