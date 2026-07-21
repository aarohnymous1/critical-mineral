import type { ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { BrandLockup } from '../ui/Logo'
import { useMetrics, useStore } from '../data/store'
import { ORG } from '../data/seed'
import type { PageId } from '../data/types'
import { Toasts } from '../ui/kit'

const NAV: { id: PageId; label: string; icon: IconName; group?: string }[] = [
  { id: 'command', label: 'Command centre', icon: 'home' },
  { id: 'products', label: 'Products & BOM', icon: 'package', group: 'Evidence graph' },
  { id: 'chain', label: 'Supply chain map', icon: 'network', group: 'Evidence graph' },
  { id: 'suppliers', label: 'Suppliers & campaigns', icon: 'users', group: 'Evidence graph' },
  { id: 'evidence', label: 'Evidence vault', icon: 'folder', group: 'Evidence graph' },
  { id: 'verification', label: 'AI verification', icon: 'sparkles', group: 'Verify' },
  { id: 'agents', label: 'Agent console', icon: 'bot', group: 'Verify' },
  { id: 'packs', label: 'Compliance packs', icon: 'clipboard', group: 'Comply' },
  { id: 'passport', label: 'Battery passport', icon: 'battery', group: 'Comply' },
  { id: 'watchtower', label: 'Risk watchtower', icon: 'radar', group: 'Comply' },
]

export function Shell({ children }: { children: ReactNode }) {
  const { page, go, sidebarOpen, toggleSidebar, openVera } = useStore()
  const metrics = useMetrics()

  const grouped: { group?: string; items: typeof NAV }[] = []
  NAV.forEach((item) => {
    const last = grouped[grouped.length - 1]
    if (last && last.group === item.group) last.items.push(item)
    else grouped.push({ group: item.group, items: [item] })
  })

  return (
    <div className="flex h-full bg-white">
      {/* ---- sidebar (Essentials §24) ---- */}
      <nav
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-base bg-white transition-[width] duration-200 ${
          sidebarOpen ? 'w-[268px]' : 'w-[68px]'
        }`}
      >
        <div className={`flex items-start justify-between gap-2 px-4 pb-3 pt-4 ${sidebarOpen ? '' : 'flex-col items-center'}`}>
          {sidebarOpen ? <BrandLockup /> : <BrandLockup collapsed />}
          <button
            onClick={toggleSidebar}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-border-base text-muted-fg hover:bg-muted"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Icon name={sidebarOpen ? 'chevronsLeft' : 'chevronsRight'} className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {grouped.map((g, gi) => (
            <div key={gi} className="mb-1">
              {g.group && sidebarOpen && (
                <div className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  {g.group}
                </div>
              )}
              {g.group && !sidebarOpen && <div className="mx-2 my-2 border-t border-border-base" />}
              {g.items.map((item) => {
                const active = page === item.id
                const badge =
                  item.id === 'verification' ? metrics.openFindings : item.id === 'watchtower' ? metrics.critical : 0
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    title={sidebarOpen ? undefined : item.label}
                    className={`relative mb-0.5 flex h-9 w-full items-center gap-3 rounded-md px-3 text-[13px] transition-colors ${
                      active ? 'bg-soft-blue font-semibold text-primary' : 'font-medium text-slate-700 hover:bg-muted'
                    } ${sidebarOpen ? '' : 'justify-center px-0'}`}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-primary" />}
                    <Icon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
                    {sidebarOpen && <span className="flex-1 truncate text-left">{item.label}</span>}
                    {sidebarOpen && badge > 0 && (
                      <span
                        className={`num rounded-full px-1.5 py-px text-[10.5px] font-semibold ${
                          item.id === 'verification' ? 'bg-ai-soft text-ai-deep' : 'bg-soft-red text-status-error'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-border-base px-3 py-3">
          <button
            onClick={() => openVera()}
            className={`mb-2 flex h-9 w-full items-center gap-2.5 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai-deep hover:bg-[#EDE9FE] ${
              sidebarOpen ? '' : 'justify-center px-0'
            }`}
            title="Ask VERA"
          >
            <Icon name="sparkles" className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Ask VERA</span>}
          </button>
          <div className={`flex items-center gap-2.5 rounded-md px-1 py-1.5 ${sidebarOpen ? '' : 'justify-center'}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft-blue text-[11.5px] font-semibold text-primary">
              {ORG.user.initials}
            </span>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-slate-800">{ORG.user.name}</div>
                <div className="truncate text-[11px] text-muted-fg">{ORG.user.role}</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ---- content ---- */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1440px] px-8 py-6">{children}</div>
      </main>

      <Toasts />
    </div>
  )
}
