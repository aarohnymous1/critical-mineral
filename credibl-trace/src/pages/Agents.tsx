import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { Icon } from '../ui/Icon'
import { Chart } from '../ui/Chart'
import { AiTag, Badge, Banner, Card, CardTitle, KpiCard, PageHeader, Progress, SectionTitle } from '../ui/kit'
import { useMetrics, useStore } from '../data/store'

const ROLE_ORDER = ['Acquisition', 'Verification', 'Risk', 'Compliance'] as const

const ROLE_META: Record<string, { blurb: string; tone: 'blue' | 'violet' | 'amber' | 'green' }> = {
  Acquisition: { blurb: 'Get evidence in without exhausting suppliers', tone: 'blue' },
  Verification: { blurb: 'Test whether a claim survives contact with reality', tone: 'violet' },
  Risk: { blurb: 'Watch the outside world and map it onto your chain', tone: 'amber' },
  Compliance: { blurb: 'Turn verified evidence into regime-shaped output', tone: 'green' },
}

export function Agents() {
  const { agents, activity, runAgent, pushToast, findings, go, selectFinding } = useStore()
  const m = useMetrics()
  const [running, setRunning] = useState<string | null>(null)

  const byRole = useMemo(
    () => ROLE_ORDER.map((role) => ({ role, items: agents.filter((a) => a.role === role) })),
    [agents],
  )

  const precisionOption: EChartsOption = useMemo(
    () => ({
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>Precision: <b>{c}%</b>' },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: {
        type: 'category',
        data: [...agents].sort((a, b) => a.precision - b.precision).map((a) => a.name),
        axisLabel: { fontSize: 10.5 },
      },
      series: [
        {
          type: 'bar',
          barWidth: 10,
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10, color: '#6B7280' },
          data: [...agents]
            .sort((a, b) => a.precision - b.precision)
            .map((a) => ({
              value: Math.round(a.precision * 100),
              itemStyle: {
                color: a.precision >= 0.9 ? '#16A34A' : a.precision >= 0.8 ? '#7C3AED' : '#D97706',
                borderRadius: [0, 3, 3, 0],
              },
            })),
        },
      ],
    }),
    [agents],
  )

  const run = (id: string, name: string) => {
    setRunning(id)
    setTimeout(() => {
      runAgent(id)
      setRunning(null)
      pushToast({ kind: 'success', title: `${name} finished`, detail: 'Graph re-scanned. Any new findings are queued for your review.' })
    }, 1200)
  }

  return (
    <>
      <PageHeader
        title="Agent console"
        description={`${agents.length} agents run across the evidence graph. The verifiers interrogate claims; the two Earth Watch observers watch the world. None of them decides anything.`}
        context={
          <>
            <AiTag label={`${agents.length} agents`} />
            <span className="chip bg-muted text-slate-700">{m.itemsProcessed.toLocaleString()} items processed</span>
            <span className="chip bg-soft-green text-status-success">Human-in-the-loop by design</span>
          </>
        }
      />

      <div className="mb-5">
        <Banner
          tone="ai"
          icon="sparkles"
          title="Why the verification layer is the moat, not the tracking layer"
          body="Entity resolution and event detection are mature across the market. What almost nobody does is verification: forged-certificate detection, mass-balance plausibility maths, and origin-claim anomaly detection. Those are the checks that catch what declaration-based compliance structurally cannot."
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Agents active" value={agents.filter((a) => a.status === 'active').length} icon="bot" tone="violet" sub={`of ${agents.length} configured`} />
        <KpiCard label="Runs today" value={agents.reduce((a, g) => a + g.runsToday, 0)} icon="refresh" tone="blue" sub="Scheduled and on-demand" />
        <KpiCard label="Open findings" value={m.openFindings} icon="alert" tone="amber" sub="Every one needs a human decision" onClick={() => go('verification')} />
        <KpiCard
          label="Mean precision"
          value={Math.round((agents.reduce((a, g) => a + g.precision, 0) / agents.length) * 100)}
          unit="%"
          icon="target"
          tone="green"
          sub="Measured against accepted human decisions"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {byRole.map(({ role, items }) => (
            <div key={role}>
              <SectionTitle sub={ROLE_META[role].blurb}>{role}</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {items.map((a) => (
                  <Card key={a.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai-soft text-ai">
                          <Icon name="bot" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold leading-snug text-foreground">{a.name}</div>
                          <div className="mt-0.5 text-[11.5px] text-muted-fg">{a.cadence}</div>
                        </div>
                      </div>
                      {a.findingsOpen > 0 && <Badge tone="violet">{a.findingsOpen} open</Badge>}
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-fg">{a.description}</p>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11.5px]">
                        <span className="text-muted-fg">Precision</span>
                        <span className="num font-semibold text-slate-700">{Math.round(a.precision * 100)}%</span>
                      </div>
                      <Progress value={a.precision * 100} tone={a.precision >= 0.9 ? 'green' : a.precision >= 0.8 ? 'violet' : 'amber'} height={4} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border-base pt-3">
                      <div className="text-[11.5px] text-muted-fg">
                        <span className="num font-semibold text-slate-700">{a.itemsProcessed.toLocaleString()}</span> processed ·{' '}
                        {a.lastRun}
                      </div>
                      <button
                        onClick={() => run(a.id, a.name)}
                        disabled={running === a.id}
                        className="btn btn-xs btn-ai-soft"
                      >
                        {running === a.id ? (
                          <Icon name="refresh" className="h-3 w-3 animate-spin" />
                        ) : (
                          <Icon name="play" className="h-3 w-3" />
                        )}
                        {running === a.id ? 'Running' : 'Run now'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle icon="target" sub="Share of findings a human ultimately accepted">
              Agent precision
            </CardTitle>
            <Chart option={precisionOption} height={380} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-fg">
              Inference agents sit lowest by design — proposing a probable chain link is meant to be speculative, which is exactly
              why it never publishes without confirmation.
            </p>
          </Card>

          <Card pad={false}>
            <div className="border-b border-border-base p-5">
              <CardTitle icon="list" sub="Agents and people, one trail">
                Activity log
              </CardTitle>
            </div>
            <ul className="max-h-[360px] overflow-y-auto">
              {activity.map((a) => (
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
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{a.on}</span>
                      {a.entity?.startsWith('fi-') && findings.some((f) => f.id === a.entity) && (
                        <button
                          onClick={() => {
                            selectFinding(a.entity!)
                            go('verification')
                          }}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          View finding
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
