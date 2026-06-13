'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Menu, X, Trophy, Calendar, Users, LayoutDashboard, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile.role === 'admin'

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/rankings', label: 'Rankings', icon: Trophy },
    { href: '/matches', label: 'Partidas', icon: Calendar },
    ...(isAdmin ? [
      { href: '/admin/players', label: 'Jogadores', icon: Users },
    ] : []),
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-2xl">⚽</span>
            <span className="text-green-400">Pelada</span>
            <span>SNSB</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-green-500/10 text-green-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* User info + logout */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors group"
              title="Configurações"
            >
              <Avatar name={profile.name} avatarUrl={profile.avatar_url} size="sm" />
              <div className="text-right">
                <p className="text-sm font-medium text-white leading-none">{profile.nickname}</p>
                {isAdmin && (
                  <p className="text-xs text-green-400 leading-none mt-0.5">Admin</p>
                )}
              </div>
              <Settings size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar name={profile.name} avatarUrl={profile.avatar_url} size="sm" />
              <div>
                <span className="text-sm text-white block leading-none">{profile.nickname}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Settings size={10} /> Configurações
                </span>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
