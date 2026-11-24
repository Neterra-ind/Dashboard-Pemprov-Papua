import { MessageCircle, Newspaper } from 'lucide-react'
import type { JenisSumber } from '@/types'
import { cn } from '@/lib/utils'

export function PlatformBadge({ platform, size = 'md' }: { platform: JenisSumber; size?: 'sm' | 'md' }) {
  const isSosial = platform === 'Media Sosial'
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-bold',
        isSosial ? 'bg-amber-100 text-amber-600' : 'bg-primary-soft text-primary',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
      )}
      title={platform}
    >
      {isSosial ? (
        <MessageCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      ) : (
        <Newspaper className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      )}
    </span>
  )
}
