import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useRole } from '@/lib/role'
import {
  Building2,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  Newspaper,
  ShieldAlert,
  Upload,
  UserRound,
} from 'lucide-react'
import type { Role } from '@/types'
import logoNeterra from '@/assets/logo-neterra.png'
import logoPapua from '@/assets/logo-papua.png'

const ALL_ROLES: Role[] = ['Eksekutif', 'Admin OPD', 'Super Admin']

const NAV_ITEMS: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; roles: Role[] }[] = [
  { to: '/', label: 'Executive Summary', icon: LayoutDashboard, end: true, roles: ['Eksekutif', 'Admin OPD', 'Super Admin'] },
  { to: '/isu-provinsi', label: 'Isu Provinsi Papua', icon: MapPin, roles: ['Eksekutif', 'Super Admin'] },
  { to: '/isu-pimpinan', label: 'Isu Gubernur & Wakil Gubernur', icon: UserRound, roles: ['Eksekutif', 'Super Admin'] },
  { to: '/pemberitaan-opd', label: 'Pemberitaan OPD', icon: Building2, roles: ['Eksekutif', 'Super Admin'] },
  { to: '/early-warning', label: 'Isu Negatif', icon: ShieldAlert, roles: ['Eksekutif', 'Super Admin'] },
  { to: '/tindak-lanjut', label: 'Tindak Lanjut', icon: ClipboardCheck, roles: ['Admin OPD', 'Super Admin'] },
  { to: '/data-sumber', label: 'Data Sumber', icon: Newspaper, roles: ['Eksekutif', 'Super Admin'] },
  { to: '/upload-data', label: 'Upload Data Excel', icon: Upload, roles: ['Super Admin'] },
]

function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-2">
      <img src={logoPapua} alt="Logo Pemprov Papua" className="h-11 w-11 shrink-0 object-contain" />
      <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-slate-900">
        Pemerintah Provinsi
        <br />
        Papua
      </p>
    </div>
  )
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-accent-soft text-accent-pressed'
      : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800',
  )
}

function UserProfile() {
  const { role, setRole } = useRole()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-left transition hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {role === 'Super Admin' ? 'SA' : role === 'Admin OPD' ? 'OPD' : 'EK'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">admin</p>
          <p className="truncate text-xs text-slate-400">{role}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ganti Role</p>
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-slate-50',
                r === role ? 'font-semibold text-accent-pressed' : 'text-slate-600',
              )}
            >
              {r === role && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              {r !== role && <span className="h-1.5 w-1.5" />}
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PoweredByNeterra() {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[13px] text-slate-400">Powered by</span>
      <img src={logoNeterra} alt="Neterra Indonesia" className="h-5 w-auto object-contain" />
    </div>
  )
}

export function AppLayout() {
  const { role } = useRole()
  const navUntukRole = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="mb-3">
          <BrandMark />
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {navUntukRole.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent-pressed'
                    : 'text-slate-500 hover:bg-slate-100',
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-[var(--color-border)] bg-white px-4 py-6 md:flex">
        <BrandMark />
        <div className="my-6 h-px bg-[var(--color-border)]" />
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        <nav className="space-y-1">
          {navUntukRole.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 pt-6">
          <PoweredByNeterra />
          <UserProfile />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
