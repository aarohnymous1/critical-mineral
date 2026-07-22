import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  CardTitle,
  ConfidenceBadge,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
  Progress,
  SeverityBadge,
  Tabs,
} from '../ui/kit'
import { useStore } from '../data/store'
import { FINDING_KIND_META, type Finding, type Severity } from '../data/types'

type Filter = 'all' | 'critical' | 'open' | 'resolved'

export function Verification() {
  const { findings, nodes, docs, packs, selectedFindingId, selectFinding, resolveFinding, pushToast, go, selectPack, openVera } =
    useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [pending, setPending] = useState<{ finding: Finding; actionId: string } | null>(null)
  const [note, setNote] = useState('')

  const list = useMemo(() => {
    const open = (f: Finding) => f.status === 'open' || f.status === 'in_review'
    const base = findings.filter((f) =>
      filter === 'all' ? true : filter === 'critical' ? f.severity === 'critical' && open(f) : filter === 'open' ? open(f) : !open(f),
    )
    return [...base].sort((a, b) => {
      const openDiff = Number(open(b)) - Number(open(a))
      if (openDiff) return openDiff
      const sev = rank(b.severity) - rank(a.severity)
      return sev || b.detectedOn.localeCompare(a.detectedOn)
    })
  }, [findings, filter])

  const selected = findings.find((f) => f.id === selectedFindingId) ?? list[0] ?? null

  const openCount = findings.filter((f) => f.status === 'open' || f.status === 'in_review').length
  const criticalCount = findings.filter((f) => f.severity === 'critical' && (f.status === 'open' || f.status === 'in_review')).length
  const resolvedCount = findings.filter((f) => f.status === 'resolved' || f.status === 'dismissed').length
  const avgConfidence = Math.round((findings.reduce((a, f) => a + f.aiConfidence, 0) / findings.length) * 100)

  const submit = () => {
    if (!pending) return
    resolveFinding(pending.finding.id, pending.actionId, note || 'No note added.')
    const label = pending.finding.actions.find((a) => a.id === pending.actionId)?.label ?? 'Action'
    pushToast({
      kind: pending.actionId === 'dismiss' ? 'info' : 'success',
      title: `${label} recorded`,
      detail:
        pending.actionId === 'dismiss'
          ? 'Finding dismissed. The reasoning stays on file for the auditor.'
          : 'Graph updated, affected packs re-scored, audit trail written.',
    })
    setPending(null)
    setNote('')
  }

  return (
    <>
      <PageHeader
        title="AI verification"
        description="Agents test every claim in the graph against registers, capacity maths, document forensics and independent trade data. Each finding shows its reasoning; a person decides what happens next."
        context={
          <>
            <AiTag label="16 agents" title="Extraction, verification, risk and compliance agents" />
            <span className="chip bg-muted text-slate-700">Average confidence {avgConfidence}%</span>
            <span className="chip bg-soft-green text-status-success">Human decision required on every finding</span>
          </>
        }
        actions={
          <button onClick={() => openVera('How do the verification agents work?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Explain the agents
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open findings" value={openCount} icon="alert" tone="violet" sub="Awaiting a human decision" />
        <KpiCard label="Critical" value={criticalCount} icon="alert" tone="red" sub="Blocking a live obligation" />
        <KpiCard label="Resolved" value={resolvedCount} icon="checkCircle" tone="green" sub="Decision written to the audit trail" />
        <KpiCard
          label="Mean AI confidence"
          value={avgConfidence}
          unit="%"
          icon="gauge"
          tone="blue"
          sub="Findings below 75% are marked for closer review"
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { id: 'all', label: 'All findings', count: findings.length },
            { id: 'open', label: 'Open', count: openCount },
            { id: 'critical', label: 'Critical', count: criticalCount },
            { id: 'resolved', label: 'Decided', count: resolvedCount },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,400px)_1fr]">
        {/* ---- list ---- */}
        <Card pad={false} className="h-fit overflow-hidden">
          {list.length === 0 ? (
            <EmptyState icon="checkCircle" title="Nothing here" body="No findings match this filter. Try another tab." />
          ) : (
            <ul className="max-h-[720px] overflow-y-auto">
              {list.map((f) => {
                const active = selected?.id === f.id
                const decided = f.status === 'resolved' || f.status === 'dismissed'
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => selectFinding(f.id)}
                      className={`relative w-full border-b border-border-base px-4 py-3.5 text-left transition-colors last:border-b-0 ${
                        active ? 'bg-soft-blue' : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary" />}
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <SeverityBadge s={f.severity} />
                        {decided && (
                          <Badge tone={f.status === 'dismissed' ? 'grey' : 'green'} icon={f.status === 'dismissed' ? 'ban' : 'check'}>
                            {f.status === 'dismissed' ? 'Dismissed' : 'Resolved'}
                          </Badge>
                        )}
                        {f.status === 'in_review' && <Badge tone="amber">In review</Badge>}
                      </div>
                      <div className={`text-[13px] font-semibold leading-snug ${decided ? 'text-muted-fg' : 'text-foreground'}`}>
                        {f.title}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-muted-fg">
                        <span className="flex items-center gap-1 text-ai-deep">
                          <Icon name="bot" className="h-3 w-3" />
                          {f.agent}
                        </span>
                        <span>·</span>
                        <span className="num">{Math.round(f.aiConfidence * 100)}%</span>
                        <span>·</span>
                        <span>{f.detectedOn.slice(5)}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* ---- detail ---- */}
        {selected ? (
          <div className="space-y-5">
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <SeverityBadge s={selected.severity} />
                <Badge tone="violet" icon="bot">
                  {FINDING_KIND_META[selected.kind].label}
                </Badge>
                <Badge tone="grey" icon="clock">
                  Detected {selected.detectedOn}
                </Badge>
                {selected.status === 'resolved' && (
                  <Badge tone="green" icon="check">
                    Resolved
                  </Badge>
                )}
                {selected.status === 'dismissed' && (
                  <Badge tone="grey" icon="ban">
                    Dismissed
                  </Badge>
                )}
              </div>
              <h2 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-foreground">{selected.title}</h2>
              <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-body">{selected.summary}</p>

              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-ai-border bg-ai-soft px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ai">
                    <Icon name="bot" className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-[12.5px] font-semibold text-ai-deep">{selected.agent}</div>
                    <div className="text-[11px] text-ai-deep/75">Agent that raised this finding</div>
                  </div>
                </div>
                <div className="min-w-[150px] flex-1">
                  <div className="mb-1 flex items-center justify-between text-[11.5px] font-semibold text-ai-deep">
                    <span>Model confidence</span>
                    <span className="num">{Math.round(selected.aiConfidence * 100)}%</span>
                  </div>
                  <Progress value={selected.aiConfidence * 100} tone="violet" height={5} />
                </div>
              </div>
            </Card>

            {/* ---- reasoning ---- */}
            <Card>
              <CardTitle icon="route" sub="Shown in full so a person — or an auditor — can check the logic, not just the conclusion.">
                How the agent reached this
              </CardTitle>
              <ol className="relative space-y-4 pl-7">
                <span className="absolute bottom-2 left-[11px] top-2 w-px bg-border-base" />
                {selected.reasoning.map((r, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-7 top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-ai-border bg-white text-[10.5px] font-bold text-ai-deep">
                      {i + 1}
                    </span>
                    <div className="text-[13px] font-semibold leading-snug text-foreground">{r.step}</div>
                    <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-fg">{r.detail}</div>
                    {r.source && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-slate-600">
                        <Icon name="file" className="h-3 w-3" />
                        {r.source}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </Card>

            {/* ---- impact ---- */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <CardTitle icon="network" sub="Entities and evidence this finding touches">
                  What it affects
                </CardTitle>
                <div className="space-y-3">
                  {selected.nodeIds.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">Entities</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.nodeIds.map((id) => {
                          const n = nodes.find((x) => x.id === id)
                          if (!n) return null
                          return (
                            <button
                              key={id}
                              onClick={() => go('chain')}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-white px-2 py-1 text-[12px] text-slate-700 hover:border-primary hover:text-primary"
                            >
                              <Icon name="building" className="h-3 w-3" />
                              {n.name}
                              <ConfidenceBadge c={n.confidence} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {selected.docIds.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">Documents</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.docIds.map((id) => {
                          const d = docs.find((x) => x.id === id)
                          if (!d) return null
                          return (
                            <button
                              key={id}
                              onClick={() => go('evidence')}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-white px-2 py-1 text-[12px] text-slate-700 hover:border-primary hover:text-primary"
                            >
                              <Icon name="file" className="h-3 w-3" />
                              {d.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {selected.flowIds.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">Material flows</div>
                      <div className="text-[12.5px] text-muted-fg">
                        {selected.flowIds.length} chain link{selected.flowIds.length > 1 ? 's' : ''} in scope
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <CardTitle icon="clipboard" sub="Regime packs held back while this is open">
                  What it blocks
                </CardTitle>
                {selected.blocksPacks.length === 0 ? (
                  <p className="text-[13px] text-muted-fg">Nothing. This finding is informational.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.blocksPacks.map((pid) => {
                      const p = packs.find((x) => x.id === pid)
                      if (!p) return null
                      return (
                        <li key={pid}>
                          <button
                            onClick={() => {
                              selectPack(pid)
                              go('packs')
                            }}
                            className="flex w-full items-center gap-3 rounded-lg border border-border-base px-3 py-2.5 text-left hover:border-primary"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-soft-blue text-primary">
                              <Icon name="clipboard" className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-foreground">{p.shortName}</span>
                              <span className="block text-[11.5px] text-muted-fg">Due {p.dueOn} · {p.readiness}% ready</span>
                            </span>
                            <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-muted-fg" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </div>

            {/* ---- recommendation + decision ---- */}
            <Card className="border-primary/25 bg-soft-blue">
              <CardTitle icon="target" sub="What the agent suggests. It cannot act on this by itself.">
                Recommendation
              </CardTitle>
              <p className="text-[13.5px] leading-relaxed text-body">{selected.recommendation}</p>

              {selected.resolution ? (
                <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-status-success">
                    <Icon name="checkCircle" className="h-4 w-4" />
                    {selected.resolution.action} — {selected.resolution.by}, {selected.resolution.on}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-fg">{selected.resolution.note}</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.actions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setPending({ finding: selected, actionId: a.id })
                        setNote('')
                      }}
                      className={`btn btn-md ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'warn' ? 'btn-warn' : 'btn-neutral'}`}
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setPending({ finding: selected, actionId: 'dismiss' })}
                    className="btn btn-md btn-ghost"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <EmptyState icon="sparkles" title="No finding selected" body="Pick a finding from the list to see how the agent reached it." />
          </Card>
        )}
      </div>

      {/* ---- decision modal ---- */}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.finding.actions.find((a) => a.id === pending.actionId)?.label ?? 'Dismiss finding'}
        description={
          pending?.actionId === 'dismiss'
            ? 'The finding will be closed without changing the graph. The agent’s reasoning stays on file so an auditor can see what was considered and rejected.'
            : 'Your decision writes back to the evidence graph, re-scores every affected regime pack and is recorded in the audit trail.'
        }
        footer={
          <>
            <button onClick={() => setPending(null)} className="btn btn-md btn-ghost">
              Cancel
            </button>
            <button
              onClick={submit}
              className={`btn btn-md ${pending?.actionId === 'dismiss' ? 'btn-warn' : 'btn-primary'}`}
            >
              {pending?.actionId === 'dismiss' ? 'Dismiss finding' : 'Confirm decision'}
            </button>
          </>
        }
      >
        {pending && (
          <>
            <div className="mb-4 rounded-lg border border-border-base bg-[#FAFAFA] px-4 py-3">
              <div className="text-[13px] font-semibold text-foreground">{pending.finding.title}</div>
              <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted-fg">
                <SeverityBadge s={pending.finding.severity} />
                <span>{pending.finding.agent} · {Math.round(pending.finding.aiConfidence * 100)}% confidence</span>
              </div>
            </div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Decision note <span className="font-normal text-muted-fg">— recorded against your name</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why this decision? An auditor will read this alongside the agent's reasoning."
              className="w-full rounded-md border border-border-base px-3 py-2 text-[13px] text-body placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {pending.finding.blocksPacks.length > 0 && pending.actionId !== 'dismiss' && (
              <div className="mt-3">
                <Banner
                  tone="info"
                  icon="info"
                  title={`${pending.finding.blocksPacks.length} regime pack${pending.finding.blocksPacks.length > 1 ? 's' : ''} will be re-scored`}
                  body="Requirements this finding was blocking move up a rung on the confidence ladder."
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  )
}

function rank(s: Severity) {
  return { critical: 3, high: 2, medium: 1, low: 0 }[s]
}
