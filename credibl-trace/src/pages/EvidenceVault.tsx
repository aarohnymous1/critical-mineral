import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  ConfidenceBadge,
  Drawer,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
  Progress,
  Tabs,
} from '../ui/kit'
import { useStore } from '../data/store'
import { DOC_KIND_META } from '../data/types'

export function EvidenceVault() {
  const { docs, nodes, findings, selectedDocId, selectDoc, quarantineDoc, uploadDocument, pushToast, go, selectFinding } =
    useStore()
  const [tab, setTab] = useState<'all' | 'suspect' | 'conflicts'>('all')
  const [uploading, setUploading] = useState(false)
  const [confirmQuarantine, setConfirmQuarantine] = useState<string | null>(null)

  const list = useMemo(() => {
    if (tab === 'suspect') return docs.filter((d) => d.forensics.verdict !== 'clean')
    if (tab === 'conflicts') return docs.filter((d) => d.extraction.fields.some((f) => f.conflict))
    return docs
  }, [docs, tab])

  const selected = docs.find((d) => d.id === selectedDocId) ?? null
  const suspect = docs.filter((d) => d.forensics.verdict === 'suspect').length
  const conflicts = docs.reduce((a, d) => a + d.extraction.fields.filter((f) => f.conflict).length, 0)
  const avgCompleteness = Math.round(docs.reduce((a, d) => a + d.extraction.completeness, 0) / docs.length)

  const runUpload = () => {
    setUploading(true)
    setTimeout(() => {
      uploadDocument('Assay certificate — LUA/2026/0731', 'n-lualaba')
      setUploading(false)
      pushToast({
        kind: 'success',
        title: 'Document extracted',
        detail: 'Three fields written to the graph. Forensics clean, no conflicts detected.',
      })
    }, 1400)
  }

  return (
    <>
      <PageHeader
        title="Evidence vault"
        description="Every certificate, assay, audit and licence behind the graph. Each document is read by an extraction agent and then tested by a forensics agent before anything it says is believed."
        context={
          <>
            <span className="chip bg-muted text-slate-700">{docs.length} documents</span>
            <AiTag label="Extraction + forensics on every upload" />
            <span className="chip bg-soft-green text-status-success">Five-year retention (OECD)</span>
          </>
        }
        actions={
          <button onClick={runUpload} disabled={uploading} className="btn btn-md btn-primary">
            {uploading ? <Icon name="refresh" className="h-4 w-4 animate-spin" /> : <Icon name="upload" className="h-4 w-4" />}
            {uploading ? 'Extracting…' : 'Upload evidence'}
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Documents on file" value={docs.length} icon="folder" tone="blue" sub="Linked to entities and flows" />
        <KpiCard
          label="Extraction completeness"
          value={avgCompleteness}
          unit="%"
          icon="sparkles"
          tone="violet"
          sub="Mean share of expected fields recovered"
        />
        <KpiCard
          label="Field conflicts"
          value={conflicts}
          icon="alert"
          tone="amber"
          sub="Extracted value disagrees with the graph"
        />
        <KpiCard
          label="Forensically suspect"
          value={suspect}
          icon="ban"
          tone="red"
          sub="Failed template, metadata or logic checks"
        />
      </div>

      {suspect > 0 && (
        <div className="mb-5">
          <Banner
            tone="error"
            icon="alert"
            title="One document shows signs of fabrication"
            body="Assay ARC-2291 failed four independent forensic checks and is the only origin document behind a 4,100 t cobalt parcel. Declaration-based compliance cannot catch this; document forensics can."
            action={
              <button onClick={() => setTab('suspect')} className="btn btn-sm btn-danger">
                Show it
              </button>
            }
          />
        </div>
      )}

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'All documents', count: docs.length },
            { id: 'conflicts', label: 'With field conflicts', count: docs.filter((d) => d.extraction.fields.some((f) => f.conflict)).length },
            { id: 'suspect', label: 'Forensic flags', count: docs.filter((d) => d.forensics.verdict !== 'clean').length },
          ]}
        />
      </div>

      <Card pad={false}>
        {list.length === 0 ? (
          <EmptyState icon="folder" title="No documents match" body="Try a different filter, or upload new evidence." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Entity</th>
                  <th>Extraction</th>
                  <th>Forensic risk</th>
                  <th>Evidence rung</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const node = nodes.find((n) => n.id === d.nodeId)
                  const conflictCount = d.extraction.fields.filter((f) => f.conflict).length
                  return (
                    <tr key={d.id} className="cursor-pointer" onClick={() => selectDoc(d.id)}>
                      <td>
                        <div className="font-medium text-foreground">{d.title}</div>
                        <div className="mt-0.5 text-[11.5px] text-muted-fg">
                          {d.issuer} · {d.issuedOn} · {d.pages}pp
                        </div>
                      </td>
                      <td className="text-muted-fg">{DOC_KIND_META[d.kind].label}</td>
                      <td className="text-muted-fg">{node?.name ?? '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-14">
                            <Progress value={d.extraction.completeness} tone="violet" height={4} />
                          </span>
                          <span className="num text-[12px] text-muted-fg">{d.extraction.completeness}%</span>
                          {conflictCount > 0 && (
                            <Badge tone="amber">
                              {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="w-14">
                            <Progress
                              value={d.forensics.risk}
                              tone={d.forensics.risk >= 60 ? 'red' : d.forensics.risk >= 25 ? 'amber' : 'green'}
                              height={4}
                            />
                          </span>
                          <Badge tone={d.forensics.verdict === 'clean' ? 'green' : d.forensics.verdict === 'review' ? 'amber' : 'red'}>
                            {d.forensics.verdict === 'clean' ? 'Clean' : d.forensics.verdict === 'review' ? 'Review' : 'Suspect'}
                          </Badge>
                        </span>
                      </td>
                      <td>
                        <ConfidenceBadge c={d.confidence} showHelp />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- document drawer ---- */}
      <Drawer
        open={!!selected}
        onClose={() => selectDoc(null)}
        title={selected?.title ?? ''}
        badge={
          selected && (
            <>
              <Badge tone="grey">{DOC_KIND_META[selected.kind].label}</Badge>
              <ConfidenceBadge c={selected.confidence} showHelp />
              <Badge
                tone={selected.forensics.verdict === 'clean' ? 'green' : selected.forensics.verdict === 'review' ? 'amber' : 'red'}
              >
                Forensic risk {selected.forensics.risk}/100
              </Badge>
            </>
          )
        }
        subtitle={selected && `${selected.issuer} · issued ${selected.issuedOn} · received ${selected.receivedOn} via ${selected.supplier}`}
        footer={
          selected &&
          selected.forensics.verdict === 'suspect' && (
            <button onClick={() => setConfirmQuarantine(selected.id)} className="btn btn-md btn-danger w-full">
              <Icon name="ban" className="h-4 w-4" />
              Quarantine this document
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* forensics */}
            <Card
              className={
                selected.forensics.verdict === 'suspect'
                  ? 'border-[#FECACA] bg-soft-red'
                  : selected.forensics.verdict === 'review'
                    ? 'border-amber-border bg-soft-amber'
                    : 'border-[#BBF7D0] bg-soft-green'
              }
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  <Icon name="shield" className="h-4 w-4" />
                  Document forensics
                </div>
                <span className="num text-[16px] font-bold text-foreground">{selected.forensics.risk}/100</span>
              </div>
              <ul className="space-y-1.5">
                {selected.forensics.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-body">
                    <Icon
                      name={selected.forensics.verdict === 'clean' ? 'check' : 'alert'}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            {/* extraction */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
                  <Icon name="sparkles" className="h-3.5 w-3.5 text-ai" />
                  Extracted fields
                </h4>
                <span className="text-[11.5px] text-muted-fg">
                  {selected.extraction.agent} · {selected.extraction.completeness}% complete
                </span>
              </div>
              <div className="space-y-2">
                {selected.extraction.fields.map((f, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-3 py-2.5 ${f.conflict ? 'border-amber-border bg-soft-amber' : 'border-border-base bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">{f.label}</div>
                        <div className="mt-0.5 text-[13px] font-medium text-foreground">{f.value}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num text-[12px] font-semibold text-slate-700">{Math.round(f.confidence * 100)}%</div>
                        <div className="text-[10.5px] text-muted-fg">confidence</div>
                      </div>
                    </div>
                    {f.conflict && (
                      <div className="mt-2 flex items-start gap-1.5 border-t border-amber-border pt-2 text-[12px] text-amber-deep">
                        <Icon name="alert" className="mt-0.5 h-3 w-3 shrink-0" />
                        {f.conflict}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selected.linkedFindings.length > 0 && (
              <div>
                <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Findings that cite this document</h4>
                <ul className="space-y-2">
                  {selected.linkedFindings.map((fid) => {
                    const f = findings.find((x) => x.id === fid)
                    if (!f) return null
                    return (
                      <li key={fid}>
                        <button
                          onClick={() => {
                            selectFinding(fid)
                            go('verification')
                          }}
                          className="flex w-full items-start gap-2.5 rounded-lg border border-border-base px-3 py-2.5 text-left hover:border-primary"
                        >
                          <Icon name="sparkles" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ai" />
                          <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-foreground">{f.title}</span>
                          <Icon name="chevronRight" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-fg" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={!!confirmQuarantine}
        onClose={() => setConfirmQuarantine(null)}
        title="Quarantine this document?"
        description="It will be withdrawn from every regime pack that relies on it, and any claim resting on it drops to no-evidence. This is reversible once the issuer confirms authenticity."
        footer={
          <>
            <button onClick={() => setConfirmQuarantine(null)} className="btn btn-md btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirmQuarantine) {
                  quarantineDoc(confirmQuarantine)
                  pushToast({
                    kind: 'warning',
                    title: 'Document quarantined',
                    detail: 'Dependent claims downgraded. An issuer-direct copy has been requested.',
                  })
                }
                setConfirmQuarantine(null)
                selectDoc(null)
              }}
              className="btn btn-md btn-danger"
            >
              Quarantine
            </button>
          </>
        }
      />
    </>
  )
}
