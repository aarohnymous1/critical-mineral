import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  CardTitle,
  ConfidenceBadge,
  Flag,
  KpiCard,
  Modal,
  PageHeader,
  Progress,
  Segmented,
  SectionTitle,
} from '../ui/kit'
import { useStore } from '../data/store'
import { MINERAL_META, TODAY } from '../data/seed'
import { CONFIDENCE_META, type Confidence } from '../data/types'

type Schema = 'catena' | 'gba' | 'untp'

const SCHEMA_LABEL: Record<Schema, string> = { catena: 'Catena-X', gba: 'GBA Battery Passport', untp: 'UNECE UNTP' }

export function Passport() {
  const { packs, products, nodes, flows, findings, go, selectFinding, openVera, pushToast } = useStore()
  const [schema, setSchema] = useState<Schema>('catena')
  const [publishing, setPublishing] = useState(false)

  const pack = packs.find((p) => p.id === 'pk-passport')!
  const product = products.find((p) => p.id === 'p-nw7')!
  const days = Math.round((new Date('2027-02-18').getTime() - TODAY.getTime()) / 86_400_000)

  const blockers = findings.filter((f) => f.blocksPacks.includes('pk-passport') && f.status !== 'resolved' && f.status !== 'dismissed')

  // Sourcing chain per mineral, weakest-link scored.
  const sourcing = useMemo(() => {
    const mins = ['Li', 'Co', 'Ni', 'Gr', 'Mn'] as const
    return mins.map((mineral) => {
      const path = nodes
        .filter((n) => n.minerals.includes(mineral) && n.tier > 0)
        .sort((a, b) => b.tier - a.tier)
      const mine = path.find((n) => n.kind === 'mine' || n.kind === 'asm')
      const refiner = path.find((n) => n.kind === 'refiner' || n.kind === 'smelter')
      const worst = path.reduce<Confidence>(
        (acc, n) => (CONFIDENCE_META[n.confidence].rank < CONFIDENCE_META[acc].rank ? n.confidence : acc),
        'attested',
      )
      const declaredLinks = flows.filter((f) => f.mineral === mineral && f.status === 'confirmed').length
      return { mineral, mine, refiner, worst, depth: path.length, declaredLinks }
    })
  }, [nodes, flows])

  const payload = useMemo(() => {
    const base = {
      passportId: 'urn:credibl:bp:NW7-78-NMC:2026-0001',
      issuer: { name: 'Northwind Mobility Group Ltd', id: 'urn:epc:id:pgln:429871.00001' },
      product: { model: product.code, category: product.category, capacityKWh: 78, chemistry: 'NMC811' },
      carbonFootprint: {
        value: product.pcf?.value,
        unit: product.pcf?.unit,
        verified: false,
        evidenceRung: 'document-backed',
        note: 'Cathode stage unverified — peer deviation flagged',
      },
      responsibleSourcing: sourcing.map((s) => ({
        material: MINERAL_META[s.mineral].label,
        refiner: s.refiner?.name ?? null,
        mine: s.mine?.name ?? null,
        chainComplete: !!s.mine,
        evidenceRung: CONFIDENCE_META[s.worst].short.toLowerCase(),
      })),
      recycledContent: product.recycledContent?.map((r) => ({
        material: MINERAL_META[r.mineral].label,
        claimedPercent: r.claimedPct,
        substantiatedPercent: r.verifiedPct,
      })),
      performance: { ratedCapacityKWh: 78, expectedLifetimeCycles: 2400, roundTripEfficiency: 0.94 },
    }
    if (schema === 'gba') {
      return { schema: 'GBA Battery Passport v1.2', dataCarrier: 'QR + RFID', ...base }
    }
    if (schema === 'untp') {
      return {
        '@context': 'https://test.uncefact.org/vocabulary/untp/dpp/0.5.0/',
        type: ['DigitalProductPassport', 'VerifiableCredential'],
        credentialSubject: base,
      }
    }
    return { schema: 'Catena-X DPP 5.0.0', dataspace: 'Catena-X', ...base }
  }, [schema, product, sourcing])

  return (
    <>
      <PageHeader
        title="Battery passport"
        description="The first digital product passport at scale. Every field is generated from the evidence graph and carries the rung of proof behind it — so a reviewer sees what is verified and what is merely asserted."
        context={
          <>
            <span className="chip border border-indigo-soft bg-white text-indigo-brand">
              <Icon name="calendar" className="h-3 w-3" />
              Mandatory 18 Feb 2027 · {days} days
            </span>
            <span className="chip bg-muted text-slate-700">EU Battery Regulation 2023/1542</span>
            <AiTag label="Write once, publish to any standard" />
          </>
        }
        actions={
          <button onClick={() => openVera('What is blocking the battery passport?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            What is blocking it?
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Passport readiness" value={pack.readiness} unit="%" icon="gauge" tone="blue" sub={`${pack.requirements.filter((r) => r.status === 'met').length} of ${pack.requirements.length} fields fully evidenced`} />
        <KpiCard label="Days to go-live" value={days} icon="clock" tone={days < 250 ? 'amber' : 'green'} sub="No extension has been granted for the passport date" />
        <KpiCard label="Blocking findings" value={blockers.length} icon="sparkles" tone="violet" sub="Must be cleared before publication" onClick={() => go('verification')} />
        <KpiCard label="Output schemas" value={3} icon="link" tone="green" sub="Catena-X · GBA · UNTP from one payload" />
      </div>

      <div className="mb-5">
        <Banner
          tone="warning"
          icon="alert"
          title="This passport cannot be published yet"
          body="Two sourcing fields are incomplete and the carbon footprint has no verified methodology. A non-compliant battery cannot be placed on the EU market at all — market access is the penalty, not a fine."
          action={
            <button onClick={() => go('verification')} className="btn btn-sm btn-warn">
              Clear {blockers.length} findings
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(340px,400px)_1fr]">
        {/* ---- passport card ---- */}
        <div className="space-y-5">
          <Card className="overflow-hidden bg-gradient-to-b from-soft-blue to-white" pad={false}>
            <div className="border-b border-border-base px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-primary">Digital product passport</div>
                  <div className="mt-1 text-[17px] font-bold leading-tight text-foreground">{product.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted-fg">{product.code} · 78 kWh NMC811</div>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-foreground shadow-xs">
                  <Icon name="qr" className="h-6 w-6" strokeWidth={1.4} />
                </span>
              </div>
            </div>
            <div className="space-y-3.5 px-5 py-4">
              <PassportField label="Manufacturer" value="Northwind Mobility Group Ltd" c="attested" />
              <PassportField label="Place of manufacture" value="Pune, India" c="attested" />
              <PassportField
                label="Carbon footprint"
                value={`${product.pcf?.value} ${product.pcf?.unit}`}
                c="document"
                warn="Cathode stage not independently verified"
              />
              <PassportField label="Rated capacity" value="78 kWh · 2,400 cycles" c="attested" />
              <PassportField label="Recycled nickel" value="12% claimed · 7.5% substantiated" c="declared" warn="Allocation records missing" />
              <PassportField label="Cobalt chain" value="Traced to mine, contested" c="declared" warn="Mass balance does not close" />
              <PassportField label="Lithium chain" value="Refiner unresolved" c="missing" warn="Cannot publish this field" />
              <PassportField label="Nickel chain" value="Sorowako → Sulawesi HPAL → pCAM" c="document" />
              <PassportField label="Graphite chain" value="Entity-level only" c="declared" warn="Shipment records outstanding" />
            </div>
            <div className="border-t border-border-base bg-white px-5 py-3.5">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="font-semibold text-slate-700">Publication readiness</span>
                <span className="num font-semibold text-slate-700">{pack.readiness}%</span>
              </div>
              <Progress value={pack.readiness} tone="blue" />
              <button onClick={() => setPublishing(true)} className="btn btn-md btn-primary mt-3.5 w-full">
                <Icon name="upload" className="h-4 w-4" />
                Publish passport
              </button>
            </div>
          </Card>
        </div>

        {/* ---- sourcing + payload ---- */}
        <div className="space-y-5">
          <Card pad={false}>
            <div className="border-b border-border-base p-5">
              <CardTitle icon="route" sub="The passport's hardest field: chain of custody to mine level for each of the four regulated minerals.">
                Responsible sourcing chain
              </CardTitle>
            </div>
            <div className="divide-y divide-border-base">
              {sourcing.map((s) => (
                <div key={s.mineral} className="px-5 py-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MINERAL_META[s.mineral].color }} />
                      <span className="text-[13.5px] font-semibold text-foreground">{MINERAL_META[s.mineral].label}</span>
                      {['Li', 'Co', 'Ni', 'Gr'].includes(s.mineral) && <Badge tone="blue">Art. 48 due diligence</Badge>}
                    </div>
                    <ConfidenceBadge c={s.worst} showHelp />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                    {s.mine ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-white px-2 py-1">
                        <Flag code={s.mine.countryCode} />
                        {s.mine.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#FECACA] bg-soft-red px-2 py-1 text-status-error">
                        <Icon name="alert" className="h-3 w-3" />
                        No mine identified
                      </span>
                    )}
                    <Icon name="arrowRight" className="h-3.5 w-3.5 text-muted-fg" />
                    {s.refiner ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-white px-2 py-1">
                        <Flag code={s.refiner.countryCode} />
                        {s.refiner.name}
                      </span>
                    ) : (
                      <span className="rounded-md border border-[#FECACA] bg-soft-red px-2 py-1 text-status-error">Unresolved</span>
                    )}
                    <Icon name="arrowRight" className="h-3.5 w-3.5 text-muted-fg" />
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-white px-2 py-1">
                      <Flag code="KR" />
                      Cell &amp; pack
                    </span>
                  </div>
                  <div className="mt-2 text-[11.5px] text-muted-fg">
                    {s.declaredLinks} declared link{s.declaredLinks === 1 ? '' : 's'} · {s.depth} entities in path
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle
              icon="link"
              sub="Interoperability as a product: one evidence base, three passport standards. Buyers fear stranding data in the wrong schema."
              right={<Segmented value={schema} onChange={setSchema} items={[{ id: 'catena', label: 'Catena-X' }, { id: 'gba', label: 'GBA' }, { id: 'untp', label: 'UNTP' }]} />}
            >
              Passport payload — {SCHEMA_LABEL[schema]}
            </CardTitle>
            <pre className="max-h-[340px] overflow-auto rounded-lg border border-border-base bg-[#FAFAFA] p-4 font-mono text-[11.5px] leading-relaxed text-slate-700">
              {JSON.stringify(payload, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11.5px] leading-relaxed text-muted-fg">
                Fields still at <b>missing</b> or <b>self-declared</b> are emitted with their evidence rung rather than silently
                omitted — a reviewer can see exactly what is proven.
              </p>
              <button
                onClick={() => pushToast({ kind: 'success', title: `${SCHEMA_LABEL[schema]} payload exported` })}
                className="btn btn-sm btn-neutral"
              >
                <Icon name="download" className="h-3.5 w-3.5" />
                Export JSON
              </button>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle sub="What the Credibl ESG platform already contributes to this passport">Reusing the ESG data spine</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-green text-status-success">
                <Icon name="factory" className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-foreground">Facility emissions</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-fg">
                  Pune assembly energy and emissions come straight from the Credibl ESG facility ledger — already assured, already
                  audited.
                </p>
                <div className="mt-2">
                  <ConfidenceBadge c="attested" />
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-blue text-primary">
                <Icon name="trend" className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-foreground">Carbon footprint workflow</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-fg">
                  PCF is the first passport field with real teeth. The downstream leg is verified; the cathode stage upstream is
                  what needs work.
                </p>
                <div className="mt-2">
                  <ConfidenceBadge c="document" />
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ai-soft text-ai">
                <Icon name="clipboard" className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-foreground">Disclosure extracts</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-fg">
                  The same sourcing evidence feeds CSRD value-chain disclosure and the CRMA board risk assessment without a second
                  collection round.
                </p>
                <div className="mt-2">
                  <ConfidenceBadge c="crosschecked" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={publishing}
        onClose={() => setPublishing(false)}
        title="Publish this passport?"
        description="Publishing makes the record publicly resolvable from the QR code on every pack. It is the legal basis for placing the product on the EU market."
        footer={
          <>
            <button onClick={() => setPublishing(false)} className="btn btn-md btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => {
                setPublishing(false)
                pushToast({
                  kind: 'warning',
                  title: 'Publication blocked',
                  detail: `${blockers.length} verification findings must be cleared before this passport can be published.`,
                })
                go('verification')
              }}
              className="btn btn-md btn-primary"
            >
              Publish
            </button>
          </>
        }
      >
        <Banner
          tone="error"
          icon="alert"
          title={`${blockers.length} findings still block publication`}
          body="Publishing with an unresolved lithium chain would make a false sourcing statement on a public record. The platform will not let this through until each finding has a recorded human decision."
        />
        <ul className="mt-3 space-y-2">
          {blockers.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => {
                  setPublishing(false)
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
      </Modal>
    </>
  )
}

function PassportField({ label, value, c, warn }: { label: string; value: string; c: Confidence; warn?: string }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-fg">{label}</div>
          <div className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">{value}</div>
        </div>
        <ConfidenceBadge c={c} showHelp />
      </div>
      {warn && (
        <div className="mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug text-amber-deep">
          <Icon name="alert" className="mt-px h-3 w-3 shrink-0" />
          {warn}
        </div>
      )}
    </div>
  )
}
