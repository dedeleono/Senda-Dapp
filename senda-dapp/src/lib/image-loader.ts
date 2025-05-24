export default function cloudFrontLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL
  return `${baseUrl}/images/${src}?w=${width}&q=${quality || 75}`
} 