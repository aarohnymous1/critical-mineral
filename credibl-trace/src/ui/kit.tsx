import { useEffect, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { CONFIDENCE_META, SEVERITY_META, type Confidence, type Severity } from '../data/types'
import { useStore } from '../data/store'

// ---------------------------------------------------------------------------
// Page scaffolding — Essentials §23: title, one-line description, then content.
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  context,
  actions,
}: {
  title: string
  description: string
  context?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-foreground">{title}</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted-fg">{description}</p>
          {context && <div className="mt-2.5 flex flex-wrap items-center gap-2">{context}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function SectionTitle({
  children,
  sub,
  right,
}: {
  children: ReactNode
  sub?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold leading-snug text-foreground">{children}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-muted-fg">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({
  children,
  className = '',
  pad = true,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return <div className={`card ${pad ? 'p-5' : ''} ${className}`}>{children}</div>
}

export function CardTitle({ children, sub, right, icon }: { children: ReactNode; sub?: string; right?: ReactNode; icon?: IconName }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-soft-blue text-primary">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <div>
          <h3 className="text-[14.5px] font-semibold leading-snug text-foreground">{children}</h3>
          {sub && <p className="mt-0.5 text-[12.5px] leading-normal text-muted-fg">{sub}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI card — Essentials §29: tinted soft surface, big tabular number, icon chip.
// ---------------------------------------------------------------------------
const KPI_TONES = {
  blue: { bg: 'bg-soft-blue', border: 'border-[#DBEAFE]', chip: 'bg-white text-primary' },
  green: { bg: 'bg-soft-green', border: 'border-[#BBF7D0]', chip: 'bg-white text-status-success' },
  amber: { bg: 'bg-soft-amber', border: 'border-amber-border', chip: 'bg-white text-amber-text' },
  red: { bg: 'bg-soft-red', border: 'border-[#FECACA]', chip: 'bg-white text-status-error' },
  violet: { bg: 'bg-ai-soft', border: 'border-ai-border', chip: 'bg-white text-ai' },
  plain: { bg: 'bg-white', border: 'border-border-base', chip: 'bg-muted text-muted-fg' },
} as const

export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
  tone = 'blue',
  onClick,
  children,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: ReactNode
  icon?: IconName
  tone?: keyof typeof KPI_TONES
  onClick?: () => void
  children?: ReactNode
}) {
  const t = KPI_TONES[tone]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`${t.bg} ${t.border} block w-full rounded-xl border p-4 text-left transition-shadow ${
        onClick ? 'hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.chip}`}>
            <Icon name={icon} className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[27px] font-bold leading-none tracking-[-0.02em] text-foreground">{value}</span>
        {unit && <span className="text-[13px] font-medium text-muted-fg">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[12px] leading-normal text-muted-fg">{sub}</div>}
      {children && <div className="mt-3">{children}</div>}
    </Tag>
  )
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
const BADGE_TONES = {
  blue: 'bg-soft-blue text-[#1D4ED8]',
  green: 'bg-soft-green text-status-success',
  amber: 'bg-soft-amber text-amber-deep',
  red: 'bg-soft-red text-status-error',
  violet: 'bg-ai-soft text-ai-deep',
  grey: 'bg-muted text-slate-700',
} as const

export function Badge({
  children,
  tone = 'grey',
  dot,
  icon,
}: {
  children: ReactNode
  tone?: keyof typeof BADGE_TONES
  dot?: boolean
  icon?: IconName
}) {
  return (
    <span className={`chip ${BADGE_TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon && <Icon name={icon} className="h-3 w-3" />}
      {children}
    </span>
  )
}

/** The product's most-used control: a fact's rung on the verification ladder. */
export function ConfidenceBadge({ c, showHelp = false }: { c: Confidence; showHelp?: boolean }) {
  const meta = CONFIDENCE_META[c]
  return (
    <span
      className="chip"
      style={{ backgroundColor: meta.tint, color: meta.color }}
      title={showHelp ? meta.help : meta.label}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.short}
    </span>
  )
}

export function SeverityBadge({ s }: { s: Severity }) {
  const meta = SEVERITY_META[s]
  return (
    <span className="chip border" style={{ backgroundColor: meta.tint, color: meta.color, borderColor: meta.border }}>
      {meta.label}
    </span>
  )
}

/** Purple = machine-generated. Used wherever AI produced or proposed something. */
export function AiTag({ label = 'AI', title }: { label?: string; title?: string }) {
  return (
    <span
      className="chip border border-ai-border bg-ai-soft text-ai-deep"
      title={title ?? 'Generated by an AI agent — review before relying on it'}
    >
      <Icon name="sparkles" className="h-3 w-3" />
      {label}
    </span>
  )
}

export function Avatar({ initials, tone = 'blue' }: { initials: string; tone?: 'blue' | 'violet' | 'green' }) {
  const tones = {
    blue: 'bg-soft-blue text-primary',
    violet: 'bg-ai-soft text-ai-deep',
    green: 'bg-soft-green text-status-success',
  }
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${tones[tone]}`}>
      {initials}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Progress + distribution
// ---------------------------------------------------------------------------
export function Progress({ value, tone = 'blue', height = 6 }: { value: number; tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet'; height?: number }) {
  const colors = { blue: '#0A7AEB', green: '#16A34A', amber: '#F59E0B', red: '#EF4444', violet: '#7C3AED' }
  return (
    <div className="w-full overflow-hidden rounded-full bg-border-base" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: colors[tone] }}
      />
    </div>
  )
}

/** Stacked bar of the confidence ladder — the "what can we actually prove" view. */
export function ConfidenceBar({ counts, height = 8 }: { counts: Record<Confidence, number>; height?: number }) {
  const order: Confidence[] = ['attested', 'crosschecked', 'document', 'declared', 'missing']
  const total = order.reduce((a, k) => a + counts[k], 0) || 1
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height }}>
      {order.map((k) =>
        counts[k] > 0 ? (
          <div
            key={k}
            style={{ width: `${(counts[k] / total) * 100}%`, backgroundColor: CONFIDENCE_META[k].color }}
            title={`${CONFIDENCE_META[k].label}: ${counts[k]}`}
          />
        ) : null,
      )}
    </div>
  )
}

export function ConfidenceLegend({ counts }: { counts?: Record<Confidence, number> }) {
  const order: Confidence[] = ['attested', 'crosschecked', 'document', 'declared', 'missing']
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {order.map((k) => (
        <span key={k} className="flex items-center gap-1.5 text-[11.5px] text-muted-fg" title={CONFIDENCE_META[k].help}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CONFIDENCE_META[k].color }} />
          {CONFIDENCE_META[k].short}
          {counts && <span className="num font-semibold text-slate-700">{counts[k]}</span>}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state — Essentials §31
// ---------------------------------------------------------------------------
export function EmptyState({
  icon = 'folder',
  title,
  body,
  action,
}: {
  icon?: IconName
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-fg">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-fg">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal — Essentials §30. Confirm before anything irreversible.
// ---------------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.4)]" onClick={onClose} />
      <div className={`relative w-full ${width} animate-fade-up rounded-xl bg-white p-6 shadow-md`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-[13px] leading-relaxed text-muted-fg">{description}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost h-7 w-7 rounded-full p-0" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Right-side drawer for entity / finding / document detail
// ---------------------------------------------------------------------------
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = 'w-[560px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  badge?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.28)]" onClick={onClose} />
      <aside className={`relative flex ${width} max-w-full animate-slide-in flex-col bg-white shadow-lg`}>
        <header className="flex items-start justify-between gap-4 border-b border-border-base px-5 py-4">
          <div className="min-w-0">
            {badge && <div className="mb-1.5 flex flex-wrap items-center gap-1.5">{badge}</div>}
            <h2 className="text-[16px] font-semibold leading-snug text-foreground">{title}</h2>
            {subtitle && <div className="mt-1 text-[12.5px] text-muted-fg">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="btn btn-ghost h-7 w-7 shrink-0 rounded-full p-0" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-border-base px-5 py-3.5">{footer}</footer>}
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs & segmented control — Essentials §39
// ---------------------------------------------------------------------------
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (v: T) => void
  items: { id: T; label: string; count?: number }[]
}) {
  return (
    <div className="flex gap-1 border-b border-border-base">
      {items.map((it) => {
        const active = it.id === value
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors ${
              active ? 'border-primary text-primary' : 'border-transparent text-muted-fg hover:text-slate-800'
            }`}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={`num rounded-full px-1.5 py-px text-[10.5px] font-semibold ${active ? 'bg-soft-blue text-primary' : 'bg-muted text-muted-fg'}`}>
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (v: T) => void
  items: { id: T; label: string }[]
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-muted p-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors ${
            it.id === value ? 'bg-white text-slate-900 shadow-xs' : 'text-muted-fg hover:text-slate-700'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status banner — Essentials §49
// ---------------------------------------------------------------------------
export function Banner({
  tone = 'info',
  icon = 'info',
  title,
  body,
  action,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success' | 'ai'
  icon?: IconName
  title: string
  body?: ReactNode
  action?: ReactNode
}) {
  const tones = {
    info: 'bg-soft-blue border-[#DBEAFE] text-status-info',
    warning: 'bg-soft-amber border-amber-border text-amber-deep',
    error: 'bg-soft-red border-[#FECACA] text-status-error',
    success: 'bg-soft-green border-[#BBF7D0] text-status-success',
    ai: 'bg-ai-soft border-ai-border text-ai-deep',
  }
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon name={icon} className="mt-px h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-snug">{title}</div>
          {body && <div className="mt-0.5 text-[12.5px] leading-relaxed opacity-90">{body}</div>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toasts — Essentials §44
// ---------------------------------------------------------------------------
export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  const tones = {
    success: { bar: '#16A34A', icon: 'checkCircle' as IconName, color: 'text-status-success' },
    info: { bar: '#0A7AEB', icon: 'info' as IconName, color: 'text-primary' },
    warning: { bar: '#F59E0B', icon: 'alert' as IconName, color: 'text-amber-text' },
    error: { bar: '#EF4444', icon: 'alert' as IconName, color: 'text-status-error' },
  }
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[360px] flex-col gap-2">
      {toasts.map((t) => {
        const tone = tones[t.kind]
        return (
          <div
            key={t.id}
            className="pointer-events-auto animate-fade-up overflow-hidden rounded-lg border border-border-base bg-white shadow-md"
            style={{ borderLeft: `3px solid ${tone.bar}` }}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <Icon name={tone.icon} className={`mt-px h-4 w-4 shrink-0 ${tone.color}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground">{t.title}</div>
                {t.detail && <div className="mt-0.5 text-[12.5px] leading-normal text-muted-fg">{t.detail}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-muted-fg hover:text-slate-700" aria-label="Dismiss">
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
export function MetaRow({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map((it, i) => (
        <div key={i}>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">{it.label}</dt>
          <dd className="mt-0.5 text-[13px] text-body">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Flag({ code }: { code: string }) {
  const cp = code
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0))
  return <span className="text-[13px] leading-none">{String.fromCodePoint(...cp)}</span>
}

export function InfoDot({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex cursor-help text-muted-fg hover:text-primary">
      <Icon name="helpCircle" className="h-3.5 w-3.5" />
    </span>
  )
}
