import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/** Calcula o deadline de votação: quinta-feira 23:59:59 BRT da semana da partida */
export function getVotingDeadline(matchDateStr: string): Date {
  // Parse the date as local noon to avoid UTC-shift issues
  const d = new Date(matchDateStr + 'T12:00:00')
  const dow = d.getDay() // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  let daysUntilThursday = (4 - dow + 7) % 7
  if (daysUntilThursday === 0) daysUntilThursday = 7
  const thursday = new Date(d)
  thursday.setDate(d.getDate() + daysUntilThursday)
  // 23:59:59 in BRT (UTC-3) = 02:59:59 next day UTC
  thursday.setHours(23, 59, 59, 0)
  // Adjust for BRT offset (+3h to convert BRT→UTC)
  return new Date(thursday.getTime() + 3 * 60 * 60 * 1000)
}

/** Retorna diferença formatada: "2d 14h 33min" ou "45min" ou "Encerrada" */
export function formatCountdown(targetDate: Date): string {
  const diff = targetDate.getTime() - Date.now()
  if (diff <= 0) return 'Encerrada'
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}

/** Retorna o nome do dia da semana em pt-BR para uma data de partida */
export function formatMatchDay(matchDateStr: string): string {
  return new Date(matchDateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}
