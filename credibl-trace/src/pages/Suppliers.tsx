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
  Drawer,
  EmptyState,
  Flag,
  KpiCard,
  Modal,
  PageHeader,
  Progress,
  SectionTitle,
  Tabs,
} from '../ui/kit'
import { useStore } from '../data/store'
import { MINERAL_META } from '../data/seed'
import type { SupplierRequest } from '../data/types'

const STATUS_TONE: Record<SupplierRequest['status'], { tone: 'green' | 'amber' | 'red' | 'blue' | 'grey'; label: string }> = {
  responded: { tone: 'green', label: 'Responded' },
  pending: { tone: 'blue', label: 'Pending' },
  chasing: { tone: 'amber', label: 'Chasing' },
  overdue: { tone: 'red', label: 'Overdue' },
  declined: { tone: 'grey', label: 'Declined' },
}

export function Suppliers() {
  const { campaigns, requests, nodes, chaseSupplier, pushToast, openVera } = useStore()
  const [tab, setTab] = useState<'all' | 'open' | 'gaps'>('all')
  const [detail, setDetail] = useState<string | null>(null)
  const [drafting, setDrafting] = useState<SupplierRequest | null>(null)

  const list = useMemo(() => {
    if (tab === 'open') return requests.filter((r) => r.status !== 'responded')
    if (tab === 'gaps') return requests.filter((r) => r.gaps.length > 0)
    return requests
  }, [requests, tab])

  const selected = requests.find((r) => r.id === detail) ?? null
  const responded = requests.filter((r) => r.status === 'responded').length
  const totalChases = requests.reduce((a, r) => a + r.chases.length, 0)

  const responseOption: EChartsOption = useMemo(
    () => ({
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { show: true, top: 0, right: 0 },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: campaigns.map((c) => c.name).reverse(), axisLabel: { fontSize: 10.5, width: 130, overflow: 'break' } },
      series: [
        {
          name: 'Response rate',
          type: 'bar',
          barWidth: 13,
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10.5, color: '#6B7280' },
          data: [...campaigns]
            .reverse()
            .map((c) => {
              const pct = Math.round((c.responded / c.suppliersInvited) * 100)
              return {
                value: pct,
                itemStyle: { color: pct >= 80 ? '#16A34A' : pct >= 60 ? '#0A7AEB' : '#D97706', borderRadius: [0, 4, 4, 0] },
              }
            }),
        },
      ],
    }),
    [campaigns],
  )

  return (
    <>
      <PageHeader
        title="Suppliers & campaigns"
        description="Cascades walk the chain tier by tier. Suppliers answer once and the answer is reused across every customer and every regime — the only workable response to questionnaire fatigue."
        context={
          <>
            <span className="chip bg-muted text-slate-700">{campaigns.length} campaigns</span>
            <span className="chip bg-soft-green text-status-success">Answer once, reuse everywhere</span>
            <AiTag label="Auto-chase on" title="Supplier Chase drafts gap-specific follow-ups and escalates on a schedule" />
          </>
        }
        actions={
          <button onClick={() => openVera('Which suppliers should I chase first?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Prioritise for me
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Requests responded"
          value={`${responded}/${requests.length}`}
          icon="checkCircle"
          tone="green"
          sub="Across all live campaigns"
        />
        <KpiCard
          label="Open gaps"
          value={requests.reduce((a, r) => a + r.gaps.length, 0)}
          icon="alert"
          tone="amber"
          sub="Specific missing fields, not whole questionnaires"
        />
        <KpiCard label="AI chases sent" value={totalChases} icon="send" tone="violet" sub="Each targeting only its own gap" />
        <KpiCard
          label="Deepest tier reached"
          value={Math.max(...campaigns.map((c) => c.tiersReached))}
          icon="layers"
          tone="blue"
          sub="Cascade depth from tier 1 outward"
        />
      </div>

      <div className="mb-5">
        <Banner
          tone="info"
          icon="info"
          title="Selective disclosure is offered to every supplier"
          body="Suppliers can attest a fact — “no Xinjiang nexus”, “this smelter is in my chain” — without exposing customers, volumes or counterparties. It is the direct answer to the three reasons suppliers give for withholding data: burden, disintermediation risk and commercial confidentiality."
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionTitle sub="Each cascade targets one regime and walks outward from tier 1">Active campaigns</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campaigns.map((c) => {
              const pct = Math.round((c.responded / c.suppliersInvited) * 100)
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold leading-snug text-foreground">{c.name}</div>
                      <div className="mt-0.5 text-[12px] text-muted-fg">{c.regime}</div>
                    </div>
                    <Badge tone={c.status === 'active' ? 'blue' : 'grey'} dot>
                      {c.status === 'active' ? 'Active' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.minerals.map((mn) => (
                      <span
                        key={mn}
                        className="chip"
                        style={{ backgroundColor: `${MINERAL_META[mn]?.color}14`, color: MINERAL_META[mn]?.color }}
                      >
                        {MINERAL_META[mn]?.label ?? mn}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3.5">
                    <div className="mb-1 flex items-center justify-between text-[11.5px] text-muted-fg">
                      <span>
                        <b className="num text-slate-800">{c.responded}</b> of {c.suppliersInvited} responded
                      </span>
                      <span className="num font-semibold text-slate-700">{pct}%</span>
                    </div>
                    <Progress value={pct} tone={pct >= 80 ? 'green' : pct >= 60 ? 'blue' : 'amber'} height={5} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border-base pt-3 text-[11.5px] text-muted-fg">
                    <span>Tier {c.tiersReached} reached · due {c.dueOn}</span>
                    {c.autoChase && (
                      <span className="flex items-center gap-1 font-medium text-ai-deep">
                        <Icon name="bot" className="h-3 w-3" />
                        Auto-chase
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        <Card>
          <CardTitle icon="trend" sub="Response rate by campaign">
            Where the cascade stalls
          </CardTitle>
          <Chart option={responseOption} height={220} />
          <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
            The magnet campaign lags badly at 35%. That is not indifference — Chinese magnet suppliers face their own
            licensing disclosure to MOFCOM and treat chain data as sensitive.
          </p>
        </Card>
      </div>

      <SectionTitle sub="Every request, its gaps, and what the chase agent has done about it">Supplier requests</SectionTitle>
      <div className="mb-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'All', count: requests.length },
            { id: 'open', label: 'Awaiting response', count: requests.filter((r) => r.status !== 'responded').length },
            { id: 'gaps', label: 'With open gaps', count: requests.filter((r) => r.gaps.length > 0).length },
          ]}
        />
      </div>

      <Card pad={false}>
        {list.length === 0 ? (
          <EmptyState icon="users" title="No requests here" body="Nothing matches this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Response quality</th>
                  <th>Open gaps</th>
                  <th>Chases</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const node = nodes.find((n) => n.id === r.nodeId)
                  const st = STATUS_TONE[r.status]
                  return (
                    <tr key={r.id} className="cursor-pointer" onClick={() => setDetail(r.id)}>
                      <td className="font-medium text-foreground">
                        <span className="flex items-center gap-2">
                          {node && <Flag code={node.countryCode} />}
                          {r.supplier}
                        </span>
                      </td>
                      <td className="text-muted-fg">Tier {r.tier}</td>
                      <td>
                        <Badge tone={st.tone} dot>
                          {st.label}
                        </Badge>
                      </td>
                      <td>
                        {r.responseQuality !== undefined ? (
                          <span className="flex items-center gap-2">
                            <span className="w-16">
                              <Progress
                                value={r.responseQuality}
                                tone={r.responseQuality >= 80 ? 'green' : r.responseQuality >= 50 ? 'amber' : 'red'}
                                height={4}
                              />
                            </span>
                            <span className="num text-[12px] text-muted-fg">{r.responseQuality}%</span>
                          </span>
                        ) : (
                          <span className="text-muted-fg">—</span>
                        )}
                      </td>
                      <td>
                        {r.gaps.length === 0 ? (
                          <span className="text-status-success">None</span>
                        ) : (
                          <span className="text-[12.5px] text-muted-fg">{r.gaps.join(' · ')}</span>
                        )}
                      </td>
                      <td className="num text-muted-fg">{r.chases.length}</td>
                      <td className="text-right">
                        {r.gaps.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDrafting(r)
                            }}
                            className="btn btn-xs btn-ai-soft"
                          >
                            <Icon name="sparkles" className="h-3 w-3" />
                            Draft chase
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- request detail ---- */}
      <Drawer
        open={!!selected}
        onClose={() => setDetail(null)}
        title={selected?.supplier ?? ''}
        badge={selected && <Badge tone={STATUS_TONE[selected.status].tone} dot>{STATUS_TONE[selected.status].label}</Badge>}
        subtitle={selected && `Tier ${selected.tier} · requested ${selected.requestedOn} · due ${selected.dueOn}`}
        footer={
          selected &&
          selected.gaps.length > 0 && (
            <button onClick={() => setDrafting(selected)} className="btn btn-md btn-ai w-full">
              <Icon name="sparkles" className="h-4 w-4" />
              Draft a gap-specific chase
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {selected.gaps.length > 0 && (
              <div>
                <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">What is still missing</h4>
                <ul className="space-y-1.5">
                  {selected.gaps.map((g) => (
                    <li key={g} className="flex items-center gap-2 rounded-md border border-amber-border bg-soft-amber px-3 py-2 text-[12.5px] text-amber-deep">
                      <Icon name="alert" className="h-3.5 w-3.5 shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Chase history</h4>
              {selected.chases.length === 0 ? (
                <p className="text-[12.5px] text-muted-fg">No chases yet — the request is still within its response window.</p>
              ) : (
                <ol className="relative space-y-3.5 pl-6">
                  <span className="absolute bottom-1 left-[7px] top-1 w-px bg-border-base" />
                  {selected.chases.map((c, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-ai" />
                      <div className="text-[12.5px] font-medium text-foreground">
                        {c.channel} · {c.on}
                      </div>
                      <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-fg">{c.note}</div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-ai-deep">
                        <Icon name="bot" className="h-3 w-3" />
                        {c.agent}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {selected.status === 'declined' && (
              <Banner
                tone="ai"
                icon="sparkles"
                title="Selective disclosure was offered"
                body="Rather than escalating, the agent offered an attestation route: the trader confirms origin to Credibl without revealing counterparties to you. This is usually the only way a trading desk will co-operate."
              />
            )}
          </div>
        )}
      </Drawer>

      {/* ---- AI draft modal ---- */}
      <Modal
        open={!!drafting}
        onClose={() => setDrafting(null)}
        title="AI-drafted supplier request"
        description="Targeted at the specific missing fields, not a resend of the whole questionnaire. Review before it goes out."
        width="max-w-2xl"
        footer={
          <>
            <button onClick={() => setDrafting(null)} className="btn btn-md btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => {
                if (drafting) {
                  chaseSupplier(drafting.id)
                  pushToast({
                    kind: 'success',
                    title: 'Request sent',
                    detail: `${drafting.supplier} asked for ${drafting.gaps.length} specific field${drafting.gaps.length > 1 ? 's' : ''}.`,
                  })
                }
                setDrafting(null)
              }}
              className="btn btn-md btn-primary"
            >
              Send request
            </button>
          </>
        }
      >
        {drafting && (
          <div className="space-y-4">
            <div className="rounded-lg border border-ai-border bg-ai-soft px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ai-deep">
                <Icon name="bot" className="h-3.5 w-3.5" />
                Supplier Chase · drafted from {drafting.gaps.length} open gap
                {drafting.gaps.length > 1 ? 's' : ''} and {drafting.chases.length} prior contact
                {drafting.chases.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="rounded-lg border border-border-base bg-white p-4 text-[13px] leading-relaxed text-body">
              <p className="mb-3 text-[12px] text-muted-fg">
                To: {drafting.supplier} · Subject: {drafting.gaps[0]} — specific data request
              </p>
              <p>Hello,</p>
              <p className="mt-2.5">
                We are completing supply-chain evidence for products placed on the EU and US markets. Rather than asking you to
                re-submit a full questionnaire, we need {drafting.gaps.length === 1 ? 'one specific item' : `${drafting.gaps.length} specific items`}:
              </p>
              <ul className="mt-2.5 list-inside list-disc space-y-1 text-[12.5px]">
                {drafting.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p className="mt-2.5">
                If any of this is commercially sensitive, you can attest it to Credibl directly under selective disclosure — we
                receive confirmation of the fact without seeing your counterparties or volumes.
              </p>
              <p className="mt-2.5">
                Your previous submission remains valid for every other field; this request will not be repeated by other customers
                using the same platform.
              </p>
              <p className="mt-2.5">Thank you,<br />Northwind Mobility — Responsible Sourcing</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
