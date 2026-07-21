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
  Flag,
  KpiCard,
  PageHeader,
  Progress,
  SectionTitle,
} from '../ui/kit'
import { useStore } from '../data/store'
import { MINERAL_META, TODAY } from '../data/seed'
import { CONFIDENCE_META, type Confidence } from '../data/types'

export function Products() {
  const { products, selectedProductId, selectProduct, nodes, flows, go, openVera, packs } = useStore()
  const product = products.find((p) => p.id === selectedProductId) ?? products[0]

  // Roll the BOM up to mineral level and score each mineral by its weakest link.
  const byMineral = useMemo(() => {
    const map = new Map<string, { mass: number; confidence: Confidence; supplier: string }>()
    product.bom.forEach((item) => {
      item.minerals.forEach((mn) => {
        const prev = map.get(mn.mineral)
        const worse =
          !prev || CONFIDENCE_META[mn.confidence].rank < CONFIDENCE_META[prev.confidence].rank ? mn.confidence : prev.confidence
        map.set(mn.mineral, {
          mass: (prev?.mass ?? 0) + mn.massKg,
          confidence: worse,
          supplier: nodes.find((n) => n.id === item.supplierNodeId)?.name ?? '—',
        })
      })
    })
    return [...map.entries()].sort((a, b) => CONFIDENCE_META[a[1].confidence].rank - CONFIDENCE_META[b[1].confidence].rank)
  }, [product, nodes])

  // How many tiers deep the declared chain actually reaches for each mineral.
  const chainDepth = useMemo(() => {
    return byMineral.map(([mineral]) => {
      const carriers = nodes.filter((n) => n.minerals.includes(mineral))
      const declared = carriers.filter((n) =>
        flows.some((f) => (f.from === n.id || f.to === n.id) && f.mineral === mineral && f.status === 'confirmed'),
      )
      const maxTier = declared.length ? Math.max(...declared.map((n) => n.tier)) : 0
      return { mineral, depth: maxTier, needed: 5 }
    })
  }, [byMineral, nodes, flows])

  const massOption: EChartsOption = useMemo(
    () => ({
      grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/><b>{c}</b> kg per unit' },
      xAxis: { type: 'value', axisLabel: { formatter: '{value} kg' } },
      yAxis: {
        type: 'category',
        data: byMineral.map(([k]) => MINERAL_META[k]?.label ?? k).reverse(),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          barWidth: 13,
          label: { show: true, position: 'right', formatter: '{c} kg', fontSize: 10.5, color: '#6B7280' },
          data: [...byMineral]
            .reverse()
            .map(([, v]) => ({ value: v.mass, itemStyle: { color: CONFIDENCE_META[v.confidence].color, borderRadius: [0, 4, 4, 0] } })),
        },
      ],
    }),
    [byMineral],
  )

  const days = Math.round((new Date(product.leadDeadline).getTime() - TODAY.getTime()) / 86_400_000)
  const weakest = byMineral[0]

  return (
    <>
      <PageHeader
        title="Products & bill of materials"
        description="Regulated obligations attach to products, not to spreadsheets. Each product resolves down to the minerals inside it and the evidence behind each one."
        context={
          <>
            <span className="chip bg-muted text-slate-700">{products.length} products in scope</span>
            <AiTag label="BOM auto-mapped from ERP" title="Minerals in scope identified automatically from the imported bill of materials" />
          </>
        }
        actions={
          <button onClick={() => openVera('Summarise the chain for the NW-7 pack')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Explain this product
          </button>
        }
      />

      {/* ---- product selector ---- */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {products.map((p) => {
          const active = p.id === product.id
          const d = Math.round((new Date(p.leadDeadline).getTime() - TODAY.getTime()) / 86_400_000)
          return (
            <button
              key={p.id}
              onClick={() => selectProduct(p.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active ? 'border-primary bg-soft-blue shadow-xs' : 'border-border-base bg-white hover:border-border-strong'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-foreground">{p.name}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted-fg">{p.category}</div>
                </div>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    active ? 'bg-white text-primary' : 'bg-muted text-muted-fg'
                  }`}
                >
                  <Icon name={p.id === 'p-tm220' ? 'settings' : 'battery'} className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11.5px]">
                <span className="font-medium text-slate-600">{p.leadRegime}</span>
                <span className={`num font-semibold ${d < 200 ? 'text-status-error' : 'text-slate-600'}`}>{d}d</span>
              </div>
              <div className="mt-1.5">
                <Progress value={p.readiness} tone={p.readiness >= 70 ? 'blue' : p.readiness >= 50 ? 'amber' : 'red'} height={5} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-fg">
                <span>{p.readiness}% evidence-ready</span>
                <span>{p.units.toLocaleString()} units</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ---- KPI row ---- */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Evidence readiness"
          value={product.readiness}
          unit="%"
          icon="shield"
          tone="blue"
          sub={`Lead regime: ${product.leadRegime}`}
        />
        <KpiCard
          label="Days to obligation"
          value={days}
          icon="clock"
          tone={days < 200 ? 'red' : 'green'}
          sub={new Date(product.leadDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
        <KpiCard
          label="Minerals in scope"
          value={byMineral.length}
          icon="beaker"
          tone="violet"
          sub={`Weakest: ${MINERAL_META[weakest?.[0]]?.label ?? '—'} (${CONFIDENCE_META[weakest?.[1].confidence ?? 'missing'].short})`}
        />
        <KpiCard
          label="Product carbon footprint"
          value={product.pcf ? product.pcf.value : '—'}
          unit={product.pcf?.unit}
          icon="trend"
          tone={product.pcf?.confidence === 'crosschecked' ? 'green' : 'amber'}
          sub={product.pcf?.method ?? 'No PCF required for this product'}
        />
      </div>

      {product.id === 'p-nw7' && (
        <div className="mb-5">
          <Banner
            tone="warning"
            icon="alert"
            title="Lithium is the weakest leg of this product"
            body="The declared refiner does not resolve to any known facility, so the lithium chain stops three tiers deep where the passport needs four. Everything else on this pack is at document level or better."
            action={
              <button onClick={() => go('verification')} className="btn btn-sm btn-warn">
                Review finding
              </button>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* ---- BOM ---- */}
        <div className="xl:col-span-2">
          <Card pad={false}>
            <div className="border-b border-border-base p-5">
              <CardTitle
                icon="package"
                sub={`${product.code} · ${product.markets.join(', ')} · ${product.units.toLocaleString()} units placed`}
              >
                Bill of materials
              </CardTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Tier-1 supplier</th>
                    <th>Mineral</th>
                    <th className="text-right">Mass / unit</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {product.bom.flatMap((item) => {
                    const supplier = nodes.find((n) => n.id === item.supplierNodeId)
                    return item.minerals.map((mn, i) => (
                      <tr key={`${item.id}-${mn.mineral}`}>
                        {i === 0 ? (
                          <td rowSpan={item.minerals.length} className="align-top font-medium text-foreground">
                            {item.part}
                          </td>
                        ) : null}
                        {i === 0 ? (
                          <td rowSpan={item.minerals.length} className="align-top">
                            <span className="flex items-center gap-1.5">
                              {supplier && <Flag code={supplier.countryCode} />}
                              {supplier?.name}
                            </span>
                          </td>
                        ) : null}
                        <td>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: MINERAL_META[mn.mineral]?.color ?? '#9CA3AF' }}
                            />
                            {MINERAL_META[mn.mineral]?.label ?? mn.mineral}
                          </span>
                        </td>
                        <td className="num text-right">{mn.massKg.toLocaleString()} kg</td>
                        <td>
                          <ConfidenceBadge c={mn.confidence} showHelp />
                        </td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ---- side ---- */}
        <div className="space-y-5">
          <Card>
            <CardTitle icon="scale" sub="Per unit, coloured by evidence quality">
              Mineral content
            </CardTitle>
            <Chart option={massOption} height={Math.max(160, byMineral.length * 34)} />
          </Card>

          <Card>
            <CardTitle icon="layers" sub="How far the declared chain actually reaches. Passports need mine level.">
              Chain depth by mineral
            </CardTitle>
            <div className="space-y-3">
              {chainDepth.map((c) => (
                <div key={c.mineral}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-700">{MINERAL_META[c.mineral]?.label ?? c.mineral}</span>
                    <span className={`num font-semibold ${c.depth >= 5 ? 'text-status-success' : c.depth >= 3 ? 'text-amber-text' : 'text-status-error'}`}>
                      tier {c.depth} of {c.needed}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          backgroundColor: i < c.depth ? (c.depth >= 5 ? '#16A34A' : c.depth >= 3 ? '#D97706' : '#DC2626') : '#E5E7EB',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {product.recycledContent && (
            <Card>
              <CardTitle icon="recycle" sub="Claimed against what the allocation records actually support">
                Recycled content
              </CardTitle>
              <div className="space-y-3">
                {product.recycledContent.map((r) => (
                  <div key={r.mineral}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-slate-700">{MINERAL_META[r.mineral]?.label ?? r.mineral}</span>
                      <span className="num text-muted-fg">
                        claimed <b className="text-foreground">{r.claimedPct}%</b> · verified{' '}
                        <b className={r.verifiedPct === 0 ? 'text-status-error' : 'text-amber-text'}>{r.verifiedPct}%</b>
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border-base">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[#DDD6FE]" style={{ width: `${r.claimedPct * 5}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-ai" style={{ width: `${r.verifiedPct * 5}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted-fg">
                Documentation obligations start Aug 2028; binding minimums in 2031. The gap matters now because the claimed
                figure also appears in marketing material.
              </p>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle sub="Every regime this product feeds, and where it stands">Obligations attached to {product.name}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {packs
            .filter((p) => p.scope.includes(product.name.split(' ')[0]) || p.jurisdiction === 'EU' || p.id === 'pk-cmrt')
            .slice(0, 4)
            .map((p) => (
              <button
                key={p.id}
                onClick={() => go('packs')}
                className="rounded-lg border border-border-base bg-white p-4 text-left hover:border-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold leading-snug text-foreground">{p.shortName}</span>
                  <Badge tone={p.readiness >= 90 ? 'green' : p.readiness >= 60 ? 'blue' : 'amber'}>{p.readiness}%</Badge>
                </div>
                <div className="mt-2">
                  <Progress value={p.readiness} tone={p.readiness >= 90 ? 'green' : p.readiness >= 60 ? 'blue' : 'amber'} height={4} />
                </div>
                <div className="mt-2 text-[11.5px] text-muted-fg">Due {p.dueOn}</div>
              </button>
            ))}
        </div>
      </div>
    </>
  )
}
