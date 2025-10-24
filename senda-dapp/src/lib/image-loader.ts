export default function cloudFrontLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL
  const normalizedQuality = quality || 75

  // Let Next serve local assets directly so logos in /public still work.
  const isAbsolute = /^https?:\/\//i.test(src)
  if (!isAbsolute && src.startsWith('/')) {
    return `${src}?w=${width}&q=${normalizedQuality}`
  }

  if (!baseUrl) {
    return src
  }

  const cleanBase = baseUrl.replace(/\/+$/, '')
  const cleanSrc = src.replace(/^\/+/, '')

  return `${cleanBase}/images/${cleanSrc}?w=${width}&q=${normalizedQuality}`
}
