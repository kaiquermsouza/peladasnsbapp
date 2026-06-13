import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: { className: 'h-8 w-8 text-xs', px: 32 },
  md: { className: 'h-10 w-10 text-sm', px: 40 },
  lg: { className: 'h-12 w-12 text-base', px: 48 },
  xl: { className: 'h-16 w-16 text-xl', px: 64 },
}

export default function Avatar({ name, avatarUrl, size = 'md', className }: AvatarProps) {
  const s = sizeMap[size]

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={s.px}
        height={s.px}
        className={cn('rounded-full object-cover flex-shrink-0', s.className, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center font-bold text-green-400 flex-shrink-0',
        s.className,
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
