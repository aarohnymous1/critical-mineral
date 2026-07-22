import { Icon } from '../ui/Icon'
import { Badge, Banner, Card, ConfidenceBadge, Drawer, Flag, MetaRow, Progress } from '../ui/kit'
import { useStore } from '../data/store'
import { MINERAL_META } from '../data/seed'
import { CONFIDENCE_META, FIDELITY_META, NODE_KIND_META, RISK_FLAG_META } from '../data/types'
import {
  ATTENTION_META,
  attentionFor,
  chronicHotspots,
  EARTH_LAYER_META,
  HAZARD_META,
  RISK_LEVELS,
  signalsForNode,
} from '../data/earth'

// The one place both ledgers meet — evidence confidence and physical exposure,
// side by side, never combined (Earth Watch spec, Rule 1).
export function NodeDrawer() {
  const { nodes, flows, findings, selectedNodeId, selectNode, selectFinding, go, signalStates } = useStore()

  const selected = nodes.find((n) => n.id === selectedNodeId) ?? null
  const inbound = selected ? flows.filter((f) => f.to === selected.id) : []
  const outbound = selected ? flows.filter((f) => f.from === selected.id) : []
  const nodeFindings = selected ? findings.filter((f) => f.nodeIds.includes(selected.id)) : []

  const attention = selected ? attentionFor(selected.id, signalStates) : null
  const liveSignals = selected ? signalsForNode(selected.id, signalStates) : []
  const hotspots = selected ? chronicHotspots(selected.id) : []

  return (
    <Drawer
      open={!!selected}
      onClose={() => selectNode(null)}
      title={selected?.name ?? ''}
      badge={
        selected && (
          <>
            <ConfidenceBadge c={selected.confidence} showHelp />
            <Badge tone="grey">{NODE_KIND_META[selected.kind].label}</Badge>
            <Badge tone="blue">Tier {selected.tier}</Badge>
          </>
        )
      }
      subtitle={
        selected && (
          <span className="flex items-center gap-1.5">
            <Flag code={selected.countryCode} />
            {selected.country} · {selected.capacity}
          </span>
        )
      }
    >
      {selected && attention && (
        <div className="space-y-5">
          {selected.note && (
            <Banner tone={selected.riskFlags.length ? 'warning' : 'info'} icon="info" title="Context" body={selected.note} />
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-700">Evidence coverage</span>
              <span className="num text-[12px] font-semibold text-slate-700">{selected.coverage}%</span>
            </div>
            <Progress
              value={selected.coverage}
              tone={selected.coverage >= 75 ? 'green' : selected.coverage >= 45 ? 'blue' : 'red'}
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-fg">{CONFIDENCE_META[selected.confidence].help}</p>
          </div>

          {/* ---- Physical exposure — the outside-in ledger, demarcated ---- */}
          <div className="rounded-lg border border-earth-border bg-earth-soft/50 p-4">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-earth-deep">
                <Icon name="globe" className="h-4 w-4" />
                Physical exposure
              </div>
              <span
                className="chip"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: ATTENTION_META[attention.level].color,
                  border: `1px solid ${ATTENTION_META[attention.level].ring}40`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ATTENTION_META[attention.level].color }} />
                {ATTENTION_META[attention.level].label}
              </span>
            </div>

            {attention.rules.length > 0 && (
              <ul className="mb-2.5 space-y-1">
                {attention.rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-earth-deep">
                    <Icon name="chevronRight" className="mt-0.5 h-3 w-3 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}

            {liveSignals.length > 0 ? (
              <ul className="mb-2.5 space-y-1.5">
                {liveSignals.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => go('earth')}
                      className="flex w-full items-center gap-2 rounded-md border border-earth-border bg-white px-2.5 py-1.5 text-left text-[12px] text-slate-700 hover:border-earth"
                    >
                      <Icon name={EARTH_LAYER_META[s.kind].icon} className="h-3.5 w-3.5 shrink-0 text-earth" />
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      <Icon name="chevronRight" className="h-3 w-3 shrink-0 text-muted-fg" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2.5 text-[12px] text-muted-fg">No live signals at this location.</p>
            )}

            {hotspots.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {hotspots.map((h) => {
                  const lvl = RISK_LEVELS[h.level - 1]
                  return (
                    <span
                      key={h.hazard}
                      className="chip"
                      style={{ backgroundColor: lvl.tint, color: lvl.solid }}
                      title={`Chronic ${HAZARD_META[h.hazard].label.toLowerCase()} · ${lvl.label} · ${h.source}`}
                    >
                      {HAZARD_META[h.hazard].label} · {lvl.label}
                    </span>
                  )
                })}
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-earth-deep/70">
              Outside-in — independent of evidence confidence. See Earth watch.
            </p>
          </div>

          <MetaRow
            items={[
              { label: 'Minerals', value: selected.minerals.map((k) => MINERAL_META[k]?.label ?? k).join(', ') },
              { label: 'RMI facility ID', value: selected.rmiId ?? '—' },
              { label: 'Ownership', value: selected.ownership ?? 'Not disclosed' },
              { label: 'Schemes', value: selected.schemes.length ? selected.schemes.join(' · ') : 'None on file' },
            ]}
          />

          {selected.declaredOutput && selected.certifiedInput && (
            <Card className="border-[#FECACA] bg-soft-red">
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-status-error">
                <Icon name="scale" className="h-4 w-4" />
                Mass balance does not close
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="num text-[17px] font-bold text-foreground">
                    {selected.certifiedInput.value.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-fg">Certified input (t)</div>
                </div>
                <div>
                  <div className="num text-[17px] font-bold text-foreground">
                    {selected.declaredOutput.value.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-fg">Declared output (t)</div>
                </div>
                <div>
                  <div className="num text-[17px] font-bold text-status-error">
                    {(selected.declaredOutput.value - selected.certifiedInput.value).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-fg">Unexplained (t)</div>
                </div>
              </div>
            </Card>
          )}

          {selected.riskFlags.length > 0 && (
            <div>
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Risk flags</h4>
              <ul className="space-y-2">
                {selected.riskFlags.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 rounded-lg border border-border-base px-3 py-2.5">
                    <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-text" />
                    <div>
                      <div className="text-[12.5px] font-medium text-foreground">{RISK_FLAG_META[r].label}</div>
                      <div className="text-[11.5px] text-muted-fg">Consequence under {RISK_FLAG_META[r].regime}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Material flows</h4>
            <div className="space-y-1.5">
              {inbound.map((f) => (
                <FlowRow key={f.id} flow={f} label={nodes.find((n) => n.id === f.from)?.name ?? ''} dir="in" />
              ))}
              {outbound.map((f) => (
                <FlowRow key={f.id} flow={f} label={nodes.find((n) => n.id === f.to)?.name ?? ''} dir="out" />
              ))}
              {inbound.length === 0 && outbound.length === 0 && <p className="text-[12.5px] text-muted-fg">No flows recorded.</p>}
            </div>
          </div>

          {nodeFindings.length > 0 && (
            <div>
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Open findings on this entity</h4>
              <ul className="space-y-2">
                {nodeFindings.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => {
                        selectFinding(f.id)
                        go('verification')
                      }}
                      className="flex w-full items-start gap-2.5 rounded-lg border border-border-base px-3 py-2.5 text-left hover:border-primary"
                    >
                      <Icon name="sparkles" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ai" />
                      <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-foreground">{f.title}</span>
                      <Icon name="chevronRight" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-fg" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

function FlowRow({
  flow,
  label,
  dir,
}: {
  flow: { mineral: string; fidelity: keyof typeof FIDELITY_META; status: string; volume?: number; unit?: string }
  label: string
  dir: 'in' | 'out'
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border-base px-3 py-2">
      <Icon
        name={dir === 'in' ? 'arrowRight' : 'arrowUpRight'}
        className={`h-3.5 w-3.5 shrink-0 ${dir === 'in' ? 'text-slate-400' : 'text-primary'}`}
      />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-body">{label}</span>
      <Badge
        tone={flow.status === 'ai_inferred' ? 'violet' : flow.fidelity === 'lot' ? 'green' : flow.fidelity === 'shipment' ? 'blue' : 'grey'}
      >
        {flow.status === 'ai_inferred' ? 'Inferred' : FIDELITY_META[flow.fidelity].label}
      </Badge>
      <span className="shrink-0 text-[11.5px] text-muted-fg">{MINERAL_META[flow.mineral]?.label ?? flow.mineral}</span>
    </div>
  )
}
