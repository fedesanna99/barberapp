import { supabase, IS_DEMO } from '../lib/supabase'

function fileExt(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (IS_DEMO) return URL.createObjectURL(file)
  const path = `${userId}.${fileExt(file)}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export async function uploadPostPhoto(file: File, barberId: string): Promise<string> {
  if (IS_DEMO) return URL.createObjectURL(file)
  const path = `${barberId}/${crypto.randomUUID()}.${fileExt(file)}`
  const { error } = await supabase.storage
    .from('posts')
    .upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('posts').getPublicUrl(path).data.publicUrl
}
