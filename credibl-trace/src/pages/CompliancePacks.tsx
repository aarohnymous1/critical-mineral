import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Icon } from '../ui/Icon'
import { Chart } from '../ui/Chart'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  CardTitle,
  ConfidenceBadge,
  KpiCard,
  PageHeader,
  Progress,
  SectionTitle,
} from '../ui/kit'
import { useStore } from '../data/store'
import { TODAY } from '../data/seed'
import type { CompliancePack } from '../data/types'

const STATUS: Record<CompliancePack['status'], { tone: 'green' | 'blue' | 'amber' | 'red' | 'grey'; label: string }> = {
  ready: { tone: 'green', label: 'Ready to file' },
  in_progress: { tone: 'blue', label: 'In progress' },
  blocked: { tone: 'amber', label: 'Blocked' },
  urgent: { tone: 'red', label: 'Urgent' },
  submitted: { tone: 'grey', label: 'Submitted' },
}

const JURIS: Record<CompliancePack['jurisdiction'], string> = { EU: '🇪🇺 EU', US: '🇺🇸 US', CN: '🇨🇳 China', Global: '🌐 Global' }

export function CompliancePacks() {
  const { packs, findings, selectedPackId, selectPack, generatePack, pushToast, go, selectFinding, openVera } = useStore()
  const pack = packs.find((p) => p.id === selectedPackId) ?? packs[0]

  const days = Math.round((new Date(pack.dueOn).getTime() - TODAY.getTime()) / 86_400_000)
  const met = pack.requirements.filter((r) => r.status === 'met').length
  const gaps = pack.requirements.filter((r) => r.status === 'gap').length
  const blockers = findings.filter((f) => f.blocksPacks.includes(pack.id) && f.status !== 'resolved' && f.status !== 'dismissed')

  const reqOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c} requirement(s)' },
      legend: { orient: 'vertical', right: 0, top: 'middle', itemGap: 10 },
      series: [
        {
          type: 'pie',
          radius: ['62%', '84%'],
          center: ['32%', '50%'],
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          data: [
            { name: 'Fully evidenced', value: met, itemStyle: { color: '#16A34A' } },
            { name: 'Partial', value: pack.requirements.filter((r) => r.status === 'partial').length, itemStyle: { color: '#D97706' } },
            { name: 'Gap', value: gaps, itemStyle: { color: '#DC2626' } },
          ].filter((d) => d.value > 0),
        },
      ],
    }),
    [pack, met, gaps],
  )

  return (
    <>
      <PageHeader
        title="Compliance packs"
        description="One evidence base compiling outward. Every regulation is a pack generated from the same graph — never a separate data-collection exercise."
        context={
          <>
            <span className="chip bg-muted text-slate-700">{packs.length} regimes live</span>
            <span className="chip bg-soft-blue text-[#1D4ED8]">Trade + ESG on one evidence base</span>
            <AiTag label="Narratives drafted by Regime Reconciler" />
          </>
        }
        actions={
          <button onClick={() => openVera('Can we clear the UFLPA detention in time?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Ask about a deadline
          </button>
        }
      />

      {/* ---- pack grid ---- */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {packs.map((p) => {
          const active = p.id === pack.id
          const d = Math.round((new Date(p.dueOn).getTime() - TODAY.getTime()) / 86_400_000)
          const st = STATUS[p.status]
          return (
            <button
              key={p.id}
              onClick={() => selectPack(p.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active ? 'border-primary bg-soft-blue shadow-xs' : 'border-border-base bg-white hover:border-border-strong'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold leading-snug text-foreground">{p.shortName}</span>
                <Badge tone={st.tone} dot>
                  {st.label}
                </Badge>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="num text-[22px] font-bold leading-none text-foreground">{p.readiness}</span>
                <span className="text-[12px] text-muted-fg">% ready</span>
              </div>
              <div className="mt-2">
                <Progress
                  value={p.readiness}
                  tone={p.readiness >= 90 ? 'green' : p.readiness >= 65 ? 'blue' : p.readiness >= 40 ? 'amber' : 'red'}
                  height={4}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-fg">
                <span>{JURIS[p.jurisdiction]}</span>
                <span className={`num font-semibold ${d < 30 ? 'text-status-error' : ''}`}>{d < 0 ? 'passed' : `${d}d`}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ---- selected pack ---- */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS[pack.status].tone} dot>
                {STATUS[pack.status].label}
              </Badge>
              <Badge tone="grey">{JURIS[pack.jurisdiction]}</Badge>
              <Badge tone={days < 30 ? 'red' : 'blue'} icon="clock">
                {pack.dueLabel} · {pack.dueOn} ({days}d)
              </Badge>
            </div>
            <h2 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-foreground">{pack.regime}</h2>
            <p className="mt-1 text-[13px] text-muted-fg">{pack.scope}</p>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-body">{pack.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-fg">
              <Icon name="users" className="h-3.5 w-3.5" />
              Owned by {pack.owner} · {pack.ownerRole}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={() => {
                generatePack(pack.id)
                pushToast({
                  kind: 'success',
                  title: 'Pack generated',
                  detail: `${pack.shortName} compiled from the graph with a drafted narrative.`,
                })
              }}
              className="btn btn-md btn-primary"
            >
              <Icon name="sparkles" className="h-4 w-4" />
              Generate pack
            </button>
            <button
              onClick={() => pushToast({ kind: 'info', title: 'Export queued', detail: 'Evidence bundle prepared with per-claim provenance.' })}
              className="btn btn-md btn-outline"
            >
              <Icon name="download" className="h-4 w-4" />
              Export evidence
            </button>
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Readiness" value={pack.readiness} unit="%" icon="gauge" tone="blue" sub={`${met} of ${pack.requirements.length} requirements met`} />
        <KpiCard label="Open gaps" value={gaps} icon="alert" tone={gaps > 0 ? 'amber' : 'green'} sub="Requirements with no usable evidence" />
        <KpiCard label="Blocking findings" value={blockers.length} icon="sparkles" tone="violet" sub="Verification issues holding this pack" onClick={() => go('verification')} />
        <KpiCard
          label="Days remaining"
          value={days}
          icon="clock"
          tone={days < 30 ? 'red' : days < 200 ? 'amber' : 'green'}
          sub={pack.dueLabel}
        />
      </div>

      {pack.id === 'pk-uflpa' && (
        <div className="mb-5">
          <Banner
            tone="error"
            icon="alert"
            title="Live detention — respond by 28 July 2026"
            body="1,240 cell modules held at Long Beach, $4.1M of goods. Anode graphite origin is the single remaining gap; the supplier has committed to shipment records by 25 July."
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-5">
          <Card pad={false}>
            <div className="border-b border-border-base p-5">
              <CardTitle icon="clipboard" sub="Each requirement traces to named evidence and a named owner — so remediation is assignable, not exploratory.">
                Requirements
              </CardTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>Status</th>
                    <th>Evidence rung</th>
                    <th className="text-right">Documents</th>
                    <th>Blocked by</th>
                  </tr>
                </thead>
                <tbody>
                  {pack.requirements.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="font-medium text-foreground">{r.label}</div>
                        <div className="mt-0.5 text-[11.5px] text-muted-fg">{r.detail}</div>
                      </td>
                      <td>
                        <Badge tone={r.status === 'met' ? 'green' : r.status === 'partial' ? 'amber' : 'red'} dot>
                          {r.status === 'met' ? 'Met' : r.status === 'partial' ? 'Partial' : 'Gap'}
                        </Badge>
                      </td>
                      <td>
                        <ConfidenceBadge c={r.confidence} showHelp />
                      </td>
                      <td className="num text-right text-muted-fg">{r.evidenceCount}</td>
                      <td>
                        {r.blockingFindings.length === 0 ? (
                          <span className="text-[12px] text-muted-fg">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.blockingFindings.map((fid) => {
                              const f = findings.find((x) => x.id === fid)
                              if (!f) return null
                              return (
                                <button
                                  key={fid}
                                  onClick={() => {
                                    selectFinding(fid)
                                    go('verification')
                                  }}
                                  className="chip border border-ai-border bg-ai-soft text-ai-deep hover:bg-[#EDE9FE]"
                                  title={f.title}
                                >
                                  <Icon name="sparkles" className="h-3 w-3" />
                                  {f.agent}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {pack.narrative && (
            <Card className="border-ai-border bg-ai-soft/40">
              <CardTitle icon="sparkles" sub={`Drafted by Regime Reconciler · ${pack.lastGenerated}`}>
                Submission narrative
              </CardTitle>
              <div className="space-y-3 rounded-lg border border-border-base bg-white p-4">
                {pack.narrative.split('\n\n').map((p, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-body">
                    {p}
                  </p>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ai-deep">
                Drafted, not filed. Nothing leaves this platform without a person approving it.
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle icon="target" sub="Requirement status across this pack">
              Coverage
            </CardTitle>
            <Chart option={reqOption} height={180} />
          </Card>

          {blockers.length > 0 && (
            <Card>
              <CardTitle icon="sparkles" sub="Resolve these and readiness moves">
                What is holding this pack
              </CardTitle>
              <ul className="space-y-2">
                {blockers.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => {
                        selectFinding(f.id)
                        go('verification')
                      }}
                      className="w-full rounded-lg border border-border-base px-3 py-2.5 text-left hover:border-primary"
                    >
                      <div className="text-[12.5px] font-semibold leading-snug text-foreground">{f.title}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-fg">
                        <span className="text-ai-deep">{f.agent}</span>
                        <span>·</span>
                        <span className="num">{Math.round(f.aiConfidence * 100)}% confidence</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardTitle icon="link" sub="The same facts, compiled for a different regulator">
              Shared evidence
            </CardTitle>
            <p className="mb-3 text-[12.5px] leading-relaxed text-muted-fg">
              This pack draws on evidence also used by {packs.filter((p) => p.id !== pack.id).length} other regimes. Collecting
              a smelter identity once serves the passport, the CMRT, the UFLPA dossier and the FEOC worksheet at the same time.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {packs
                .filter((p) => p.id !== pack.id)
                .map((p) => (
                  <button key={p.id} onClick={() => selectPack(p.id)} className="chip bg-muted text-slate-700 hover:bg-border-base">
                    {p.shortName}
                  </button>
                ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle sub="Each regulation becomes a SKU on the same evidence base, not a rebuild">All regimes at a glance</SectionTitle>
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Regime</th>
                  <th>Scope</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Readiness</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => {
                  const d = Math.round((new Date(p.dueOn).getTime() - TODAY.getTime()) / 86_400_000)
                  return (
                    <tr key={p.id} className="cursor-pointer" onClick={() => selectPack(p.id)}>
                      <td className="font-medium text-foreground">{p.shortName}</td>
                      <td className="text-muted-fg">{p.scope}</td>
                      <td className="text-muted-fg">{p.owner}</td>
                      <td className={`num ${d < 30 ? 'font-semibold text-status-error' : 'text-muted-fg'}`}>
                        {p.dueOn} ({d}d)
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="w-20">
                            <Progress
                              value={p.readiness}
                              tone={p.readiness >= 90 ? 'green' : p.readiness >= 65 ? 'blue' : p.readiness >= 40 ? 'amber' : 'red'}
                              height={4}
                            />
                          </span>
                          <span className="num text-[12px] font-semibold text-slate-700">{p.readiness}%</span>
                        </span>
                      </td>
                      <td>
                        <Badge tone={STATUS[p.status].tone} dot>
                          {STATUS[p.status].label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
