import { SOFT_PHOTO_FILTER } from '../lib/photoTone'

type PhotoTone = 'natural' | 'soft'

interface Props {
  src: string
  alt?: string
  fit?: React.CSSProperties['objectFit']
  position?: React.CSSProperties['objectPosition']
  loading?: 'lazy' | 'eager'
  tone?: PhotoTone
  style?: React.CSSProperties
  onLoad?: (img: HTMLImageElement) => void
}

export function PhotoImage({
  src,
  alt = '',
  fit = 'cover',
  position = 'center',
  loading = 'lazy',
  tone = 'natural',
  style,
  onLoad,
}: Props) {
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={e => onLoad?.(e.currentTarget)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        objectPosition: position,
        filter: tone === 'soft' ? SOFT_PHOTO_FILTER : undefined,
        display: 'block',
        ...style,
      }}
    />
  )
}
