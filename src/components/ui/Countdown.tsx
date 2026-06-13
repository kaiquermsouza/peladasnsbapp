'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatCountdown } from '@/lib/utils'
import { Timer } from 'lucide-react'

interface CountdownProps {
  targetDate: string | Date
  prefix?: string
  className?: string
}

export default function Countdown({ targetDate, prefix = 'Fecha em', className }: CountdownProps) {
  const target = useMemo(
    () => (typeof targetDate === 'string' ? new Date(targetDate) : targetDate),
    [targetDate]
  )
  const [text, setText] = useState(formatCountdown(target))

  useEffect(() => {
    setText(formatCountdown(target))
    const interval = setInterval(() => {
      setText(formatCountdown(target))
    }, 30_000) // update every 30s
    return () => clearInterval(interval)
  }, [target])

  const expired = text === 'Encerrada'

  return (
    <span className={className}>
      <Timer size={13} className="inline mr-1 opacity-70" />
      {expired ? 'Encerrada' : `${prefix} ${text}`}
    </span>
  )
}
