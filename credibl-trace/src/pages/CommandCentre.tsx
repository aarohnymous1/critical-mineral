import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Icon } from '../ui/Icon'
import { Chart } from '../ui/Chart'
import {
  AiTag,
  Banner,
  Card,
  CardTitle,
  ConfidenceBar,
  KpiCard,
  PageHeader,
  Progress,
  SectionTitle,
  SeverityBadge,
} from '../ui/kit'
import { useConfidence, useMetrics, useStore } from '../data/store'
import { CONFIDENCE_META, FINDING_KIND_META } from '../data/types'
import { ORG, TODAY } from '../data/seed'

const daysBetween = (iso: string) => Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86_400_000)

const CLOCK = [
  { label: 'UFLPA response', date: '2026-07-28', regime: 'US', pack: 'pk-uflpa' },
  { label: 'MOFCOM licence renewal', date: '2026-11-30', regime: 'CN', pack: 'pk-china' },
  { label: 'FEOC tax year', date: '2026-12-31', regime: 'US', pack: 'pk-feoc' },
  { label: 'Battery passport go-live', date: '2027-02-18', regime: 'EU', pack: 'pk-passport' },
  { label: 'Form SD filing', date: '2027-06-01', regime: 'US', pack: 'pk-cmrt' },
  { label: 'EU battery due diligence', date: '2027-08-18', regime: 'EU', pack: 'pk-duedil' },
  { label: 'EU Forced Labour Reg.', date: '2027-12-14', regime: 'EU', pack: null },
  { label: 'Recycled-content docs', date: '2028-08-18', regime: 'EU', pack: 'pk-recycled' },
]

export function CommandCentre() {
  const store = useStore()
  const m = useMetrics()
  const counts = useConfidence()
  const { go, selectFinding, selectPack, openVera, packs, findings, activity, nodes } = store

  const recentFindings = useMemo(
    () =>
      findings
        .filter((f) => f.status === 'open' || f.status === 'in_review')
        .sort((a, b) => (a.severity === b.severity ? b.detectedOn.localeCompare(a.detectedOn) : rank(b.severity) - rank(a.severity)))
        .slice(0, 5),
    [findings],
  )

  // Visibility falls off with distance from the buyer — the core market fact.
  const tierVisibility = useMemo(() => {
    const tiers = [0, 1, 2, 3, 4, 5]
    return tiers.map((t) => {
      const inTier = nodes.filter((n) => n.tier === t)
      const avg = inTier.length ? Math.round(inTier.reduce((a, n) => a + n.coverage, 0) / inTier.length) : 0
      return { tier: t, avg, count: inTier.length }
    })
  }, [nodes])

  const visibilityOption: EChartsOption = useMemo(
    () => ({
      grid: { left: 8, right: 16, top: 24, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: unknown) => {
          const arr = p as { name: string; value: number; dataIndex: number }[]
          const d = tierVisibility[arr[0].dataIndex]
          return `<b>${arr[0].name}</b><br/>Evidence coverage: <b>${d.avg}%</b><br/>${d.count} entities mapped`
        },
      },
      xAxis: {
        type: 'category',
        data: tierVisibility.map((t) => (t.tier === 0 ? 'Own ops' : `T${t.tier}`)),
        axisLabel: { interval: 0 },
      },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          type: 'bar',
          barWidth: '52%',
          data: tierVisibility.map((t) => ({
            value: t.avg,
            itemStyle: {
              color: t.avg >= 75 ? '#0A7AEB' : t.avg >= 50 ? '#3398DB' : t.avg >= 35 ? '#D97706' : '#DC2626',
              borderRadius: [4, 4, 0, 0],
            },
          })),
        },
      ],
    }),
    [tierVisibility],
  )

  const packOption: EChartsOption = useMemo(() => {
    const sorted = [...packs].sort((a, b) => a.readiness - b.readiness)
    return {
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>Readiness: <b>{c}%</b>' },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: sorted.map((p) => p.shortName), axisLabel: { fontSize: 11 } },
      series: [
        {
          type: 'bar',
          barWidth: 14,
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11, color: '#6B7280' },
          data: sorted.map((p) => ({
            value: p.readiness,
            itemStyle: {
              color: p.readiness >= 90 ? '#16A34A' : p.readiness >= 65 ? '#0A7AEB' : p.readiness >= 40 ? '#D97706' : '#DC2626',
              borderRadius: [0, 4, 4, 0],
            },
          })),
        },
      ],
    }
  }, [packs])

  const uflpa = packs.find((p) => p.id === 'pk-uflpa')!

  return (
    <>
      <PageHeader
        title={`Good morning, ${ORG.user.name.split(' ')[0]}`}
        description={`${ORG.legalName} · ${ORG.role}. One evidence graph, ${packs.length} regimes, ${m.totalNodes} mapped entities across five tiers.`}
        context={
          <>
            <span className="chip border border-indigo-soft bg-white text-indigo-brand">
              <Icon name="calendar" className="h-3 w-3" />
              21 July 2026
            </span>
            <span className="chip bg-muted text-slate-700">CY 2026 reporting period</span>
            <AiTag label={`${store.agents.length} agents active`} title="Agents running continuously across the graph" />
          </>
        }
        actions={
          <>
            <button onClick={() => go('agents')} className="btn btn-md btn-neutral">
              <Icon name="bot" className="h-4 w-4" />
              Agent console
            </button>
            <button onClick={() => openVera('What is blocking the battery passport?')} className="btn btn-md btn-primary">
              <Icon name="sparkles" className="h-4 w-4" />
              Ask VERA
            </button>
          </>
        }
      />

      <div className="mb-5">
        <Banner
          tone="error"
          icon="alert"
          title={`Shipment SHP-4471 is detained at Long Beach — ${m.daysToUflpa} days to respond`}
          body={
            <>
              $4.1M of NW-7 cell modules held under the UFLPA rebuttable presumption. The rebuttal dossier is at{' '}
              <b>{uflpa.readiness}%</b>; anode graphite origin is the one remaining gap.
            </>
          }
          action={
            <button
              onClick={() => {
                selectPack('pk-uflpa')
                go('packs')
              }}
              className="btn btn-sm btn-danger"
            >
              Open dossier
            </button>
          }
        />
      </div>

      {/* ---- KPI row ---- */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Evidence coverage"
          value={m.totalCoverage}
          unit="%"
          icon="shield"
          tone="blue"
          sub={`${m.verifiedNodes} of ${m.totalNodes} entities at cross-checked or better`}
        >
          <ConfidenceBar counts={counts} />
        </KpiCard>
        <KpiCard
          label="Sub-tier visibility"
          value={m.subTierVisibility}
          unit="%"
          icon="network"
          tone="amber"
          sub="Beyond tier 1 — the industry average is 42%"
          onClick={() => go('chain')}
        />
        <KpiCard
          label="Open AI findings"
          value={m.openFindings}
          icon="sparkles"
          tone="violet"
          sub={`${m.critical} critical · ${m.agentFindingsToday} raised in the last 7 days`}
          onClick={() => go('verification')}
        />
        <KpiCard
          label="Days to battery passport"
          value={m.daysToPassport}
          icon="clock"
          tone="green"
          sub={`NW-7 pack at ${packs.find((p) => p.id === 'pk-passport')?.readiness}% readiness`}
          onClick={() => go('passport')}
        />
      </div>

      {/* ---- compliance clock ---- */}
      <Card className="mb-6">
        <CardTitle icon="clock" sub="Every dated obligation this evidence graph feeds. Distance is proportional to time.">
          Compliance clock
        </CardTitle>
        <div className="relative pb-1 pt-6">
          <div className="absolute left-0 right-0 top-[52px] h-px bg-border-base" />
          <div className="flex items-start justify-between gap-1">
            {CLOCK.map((c) => {
              const d = daysBetween(c.date)
              const urgent = d <= 30
              const soon = d <= 240
              const color = urgent ? '#DC2626' : soon ? '#0A7AEB' : '#9CA3AF'
              return (
                <button
                  key={c.label}
                  onClick={() => c.pack && (selectPack(c.pack), go('packs'))}
                  className="group flex flex-1 flex-col items-center text-center"
                >
                  <span
                    className="num text-[11.5px] font-bold"
                    style={{ color }}
                  >
                    {d < 0 ? 'passed' : `${d}d`}
                  </span>
                  <span className="my-1.5 flex h-3 w-3 items-center justify-center">
                    <span
                      className="h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125"
                      style={{ backgroundColor: color, boxShadow: `0 0 0 3.5px ${color}26` }}
                    />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-slate-700 group-hover:text-primary">{c.label}</span>
                  <span className="mt-0.5 text-[10.5px] text-muted-fg">
                    {new Date(c.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} · {c.regime}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* ---- AI findings + charts ---- */}
      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card pad={false}>
            <div className="flex items-start justify-between gap-4 border-b border-border-base p-5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-ai-soft text-ai">
                  <Icon name="sparkles" className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-[14.5px] font-semibold text-foreground">What verification found</h3>
                  <p className="mt-0.5 text-[12.5px] text-muted-fg">
                    Agents check every claim against registers, capacity maths, document forensics and trade data. You decide.
                  </p>
                </div>
              </div>
              <button onClick={() => go('verification')} className="btn btn-sm btn-neutral">
                View all {m.openFindings}
              </button>
            </div>
            <ul>
              {recentFindings.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => {
                      selectFinding(f.id)
                      go('verification')
                    }}
                    className="flex w-full items-start gap-3 border-b border-border-base px-5 py-3.5 text-left last:border-b-0 hover:bg-[#FAFAFA]"
                  >
                    <span className="mt-1 shrink-0">
                      <SeverityBadge s={f.severity} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold leading-snug text-foreground">{f.title}</span>
                      <span className="mt-0.5 block line-clamp-2 text-[12.5px] leading-relaxed text-muted-fg">{f.summary}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-fg">
                        <span className="flex items-center gap-1 font-medium text-ai-deep">
                          <Icon name="bot" className="h-3 w-3" />
                          {f.agent}
                        </span>
                        <span>{Math.round(f.aiConfidence * 100)}% confidence</span>
                        <span>{FINDING_KIND_META[f.kind].label}</span>
                        {f.blocksPacks.length > 0 && (
                          <span className="text-status-error">blocks {f.blocksPacks.length} pack{f.blocksPacks.length > 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </span>
                    <Icon name="chevronRight" className="mt-1 h-4 w-4 shrink-0 text-muted-fg" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle icon="network" sub="Average evidence coverage by distance from the buyer">
              Where visibility breaks
            </CardTitle>
            <Chart option={visibilityOption} height={180} />
            <p className="mt-2 text-[12px] leading-relaxed text-muted-fg">
              Coverage collapses at tier 3–5, exactly where refining concentrates and origin is physically destroyed.
            </p>
          </Card>

          <Card>
            <CardTitle icon="shield" sub="How well each entity's facts are backed">
              Evidence quality
            </CardTitle>
            <div className="space-y-2.5">
              {(Object.keys(CONFIDENCE_META) as (keyof typeof CONFIDENCE_META)[])
                .sort((a, b) => CONFIDENCE_META[b].rank - CONFIDENCE_META[a].rank)
                .map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CONFIDENCE_META[k].color }} />
                    <span className="w-[104px] shrink-0 text-[12px] text-slate-700" title={CONFIDENCE_META[k].help}>
                      {CONFIDENCE_META[k].short}
                    </span>
                    <div className="flex-1">
                      <Progress value={(counts[k] / m.totalNodes) * 100} tone={k === 'missing' ? 'red' : k === 'declared' ? 'amber' : 'blue'} height={5} />
                    </div>
                    <span className="num w-6 shrink-0 text-right text-[12px] font-semibold text-slate-700">{counts[k]}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ---- packs + activity ---- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardTitle
              icon="clipboard"
              sub="One evidence base compiling outward. Each regulation is a pack, not a rebuild."
              right={
                <button onClick={() => go('packs')} className="btn btn-sm btn-neutral">
                  Open packs
                </button>
              }
            >
              Regime readiness
            </CardTitle>
            <Chart option={packOption} height={250} />
          </Card>
        </div>

        <Card pad={false}>
          <div className="border-b border-border-base p-5">
            <SectionTitle sub="Agents and people, one audit trail">Recent activity</SectionTitle>
          </div>
          <ul className="max-h-[300px] overflow-y-auto">
            {activity.slice(0, 10).map((a) => (
              <li key={a.id} className="flex gap-3 border-b border-border-base px-5 py-3 last:border-b-0">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    a.actorKind === 'agent' ? 'bg-ai-soft text-ai' : 'bg-soft-blue text-primary'
                  }`}
                >
                  <Icon name={a.actorKind === 'agent' ? 'bot' : 'users'} className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium leading-snug text-slate-800">
                    {a.actor} <span className="font-normal text-muted-fg">{a.action.toLowerCase()}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-muted-fg">{a.detail}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{a.on}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

function rank(s: string) {
  return { critical: 3, high: 2, medium: 1, low: 0 }[s] ?? 0
}
