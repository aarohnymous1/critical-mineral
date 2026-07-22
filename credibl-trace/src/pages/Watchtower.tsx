import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { Icon } from '../ui/Icon'
import { Chart } from '../ui/Chart'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  CardTitle,
  EmptyState,
  Flag,
  KpiCard,
  PageHeader,
  SeverityBadge,
  Tabs,
} from '../ui/kit'
import { useStore } from '../data/store'
import type { RiskEvent } from '../data/types'

const CATEGORY: Record<RiskEvent['category'], { label: string; icon: 'ban' | 'shield' | 'globe' | 'factory' | 'clipboard' | 'trend' }> = {
  export_control: { label: 'Export control', icon: 'ban' },
  enforcement: { label: 'Enforcement', icon: 'shield' },
  sanctions: { label: 'Sanctions', icon: 'globe' },
  operational: { label: 'Operational', icon: 'factory' },
  regulatory: { label: 'Regulatory', icon: 'clipboard' },
  price: { label: 'Price', icon: 'trend' },
}

export function Watchtower() {
  const { events, nodes, assessEvent, pushToast, go, selectNode, openVera } = useStore()
  const [tab, setTab] = useState<'all' | 'new' | 'critical'>('all')
  const [openId, setOpenId] = useState<string | null>(events[0]?.id ?? null)

  const list = useMemo(() => {
    if (tab === 'new') return events.filter((e) => e.status === 'new')
    if (tab === 'critical') return events.filter((e) => e.severity === 'critical' || e.severity === 'high')
    return events
  }, [events, tab])

  // Which of our own entities are exposed, by country — the "does this touch us" view.
  const exposureOption: EChartsOption = useMemo(() => {
    const counts = new Map<string, number>()
    events.forEach((e) =>
      e.exposure.nodeIds.forEach((id) => {
        const n = nodes.find((x) => x.id === id)
        if (n) counts.set(n.country, (counts.get(n.country) ?? 0) + 1)
      }),
    )
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return {
      grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/><b>{c}</b> exposed entities' },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: entries.map((e) => e[0]).reverse(), axisLabel: { fontSize: 11 } },
      series: [
        {
          type: 'bar',
          barWidth: 13,
          label: { show: true, position: 'right', fontSize: 10.5, color: '#6B7280' },
          data: entries
            .reverse()
            .map(([, v]) => ({ value: v, itemStyle: { color: v >= 3 ? '#DC2626' : v >= 2 ? '#D97706' : '#0A7AEB', borderRadius: [0, 4, 4, 0] } })),
        },
      ],
    }
  }, [events, nodes])

  const newCount = events.filter((e) => e.status === 'new').length

  return (
    <>
      <PageHeader
        title="Risk watchtower"
        description="Regulators, schemes and enforcement feeds are watched continuously — but the value is the second step: each event is mapped onto your own graph, so you see whether it actually touches you."
        context={
          <>
            <span className="chip bg-muted text-slate-700">{events.length} events tracked</span>
            <AiTag label="Regulatory Horizon agent" title="Watches feeds continuously and maps each event to your entities" />
            <span className="chip bg-soft-green text-status-success">Mapped to your entities, not a news feed</span>
          </>
        }
        actions={
          <button onClick={() => openVera('What events affect our magnet chain?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Assess exposure
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Unassessed events" value={newCount} icon="alert" tone={newCount > 0 ? 'amber' : 'green'} sub="Awaiting a human read" />
        <KpiCard
          label="Critical exposure"
          value={events.filter((e) => e.severity === 'critical').length}
          icon="shield"
          tone="red"
          sub="Live enforcement or export-control action"
        />
        <KpiCard
          label="Entities affected"
          value={new Set(events.flatMap((e) => e.exposure.nodeIds)).size}
          icon="network"
          tone="blue"
          sub="Nodes in your own chain touched by an event"
          onClick={() => go('chain')}
        />
        <KpiCard label="Feeds monitored" value="2,140" icon="radar" tone="violet" sub="Items screened by Regulatory Horizon today" />
      </div>

      <div className="mb-4">
        <Banner
          tone="info"
          icon="globe"
          title="Physical-world signals live in Earth watch"
          body="This screen tracks human-world events: regulatory, enforcement, export controls, sanctions. Weather, natural events, anomalies and fire are monitored separately — two ledgers, never one number."
          action={
            <button onClick={() => go('earth')} className="btn btn-sm btn-neutral">
              Open Earth watch
            </button>
          }
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'All events', count: events.length },
            { id: 'new', label: 'Unassessed', count: newCount },
            { id: 'critical', label: 'High & critical', count: events.filter((e) => e.severity === 'critical' || e.severity === 'high').length },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {list.length === 0 ? (
            <Card>
              <EmptyState icon="radar" title="Nothing to review" body="No events match this filter." />
            </Card>
          ) : (
            list.map((e) => {
              const expanded = openId === e.id
              return (
                <Card key={e.id} pad={false}>
                  <button
                    onClick={() => setOpenId(expanded ? null : e.id)}
                    className="flex w-full items-start gap-3.5 p-5 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        e.severity === 'critical' ? 'bg-soft-red text-status-error' : e.severity === 'high' ? 'bg-soft-amber text-amber-text' : 'bg-soft-blue text-primary'
                      }`}
                    >
                      <Icon name={CATEGORY[e.category].icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <SeverityBadge s={e.severity} />
                        <Badge tone="grey">{CATEGORY[e.category].label}</Badge>
                        {e.status === 'new' && <Badge tone="amber" dot>Unassessed</Badge>}
                        {e.status === 'actioned' && <Badge tone="green" icon="check">Actioned</Badge>}
                      </span>
                      <span className="block text-[14px] font-semibold leading-snug text-foreground">{e.title}</span>
                      <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-fg">{e.summary}</span>
                      <span className="mt-1.5 block text-[11.5px] text-slate-400">
                        {e.source} · detected {e.detectedOn}
                      </span>
                    </span>
                    <Icon name={expanded ? 'chevronDown' : 'chevronRight'} className="mt-1 h-4 w-4 shrink-0 text-muted-fg" />
                  </button>

                  {expanded && (
                    <div className="border-t border-border-base px-5 py-4">
                      <div className="mb-4 rounded-lg border border-ai-border bg-ai-soft p-4">
                        <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-ai-deep">
                          <Icon name="bot" className="h-3.5 w-3.5" />
                          What this means for you
                        </div>
                        <p className="text-[13px] leading-relaxed text-body">{e.aiAssessment}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">
                            Entities in your chain
                          </h4>
                          {e.exposure.nodeIds.length === 0 ? (
                            <p className="text-[12.5px] text-muted-fg">No direct entity exposure.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {e.exposure.nodeIds.map((id) => {
                                const n = nodes.find((x) => x.id === id)
                                if (!n) return null
                                return (
                                  <button
                                    key={id}
                                    onClick={() => {
                                      selectNode(id)
                                      go('chain')
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-white px-2 py-1 text-[12px] text-slate-700 hover:border-primary hover:text-primary"
                                  >
                                    <Flag code={n.countryCode} />
                                    {n.name}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">
                            Products affected
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {e.exposure.products.map((p) => (
                              <span key={p} className="chip bg-soft-blue text-[#1D4ED8]">
                                {p}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2.5 text-[12.5px] leading-relaxed text-body">{e.exposure.assessment}</p>
                        </div>
                      </div>

                      {e.status === 'new' && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => {
                              assessEvent(e.id)
                              pushToast({ kind: 'success', title: 'Event assessed', detail: 'Recorded against the CRMA risk register.' })
                            }}
                            className="btn btn-sm btn-primary"
                          >
                            Mark as assessed
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle icon="globe" sub="Where your event exposure concentrates">
              Exposure by country
            </CardTitle>
            <Chart option={exposureOption} height={210} />
          </Card>

          <Card>
            <CardTitle icon="radar" sub="What the horizon agent watches">
              Monitored sources
            </CardTitle>
            <ul className="space-y-2 text-[12.5px]">
              {[
                'CBP detention notices & UFLPA entity list',
                'MOFCOM export-control announcements',
                'RMI conformant-list refreshes',
                'ARECOMS quota circulars (DRC)',
                'Federal Register — Section 232',
                'EU Official Journal & delegated acts',
                'IRMA / Copper Mark / LME registers',
                'SIMBARA (Indonesia) reporting changes',
                'OFAC & EU sanctions designations',
                'NGO investigations (Global Witness, HRW)',
              ].map((s) => (
                <li key={s} className="flex items-start gap-2 text-muted-fg">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
