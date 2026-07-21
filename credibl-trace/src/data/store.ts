import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  ACTIVITY,
  AGENTS,
  CAMPAIGNS,
  DOCS,
  EVENTS,
  FINDINGS,
  FLOWS,
  NODES,
  PACKS,
  PRODUCTS,
  REQUESTS,
  TODAY,
} from './seed'
import type {
  ActivityEvent,
  AiAgent,
  Campaign,
  ChainFlow,
  ChainNode,
  CompliancePack,
  Confidence,
  EvidenceDoc,
  Finding,
  PageId,
  Product,
  RiskEvent,
  SupplierRequest,
  VeraMessage,
} from './types'
import { CONFIDENCE_META } from './types'

export interface Toast {
  id: string
  kind: 'success' | 'info' | 'warning' | 'error'
  title: string
  detail?: string
}

let seq = 0
const uid = (p: string) => `${p}-${++seq}-${Math.floor(Math.random() * 1e6)}`

const stamp = () =>
  `${TODAY.toISOString().slice(0, 10)} ${String(9 + (seq % 8)).padStart(2, '0')}:${String((seq * 7) % 60).padStart(2, '0')}`

export interface AppState {
  // ---- data ----
  nodes: ChainNode[]
  flows: ChainFlow[]
  docs: EvidenceDoc[]
  findings: Finding[]
  products: Product[]
  packs: CompliancePack[]
  campaigns: Campaign[]
  requests: SupplierRequest[]
  events: RiskEvent[]
  agents: AiAgent[]
  activity: ActivityEvent[]

  // ---- ui ----
  page: PageId
  sidebarOpen: boolean
  toasts: Toast[]
  selectedNodeId: string | null
  selectedFindingId: string | null
  selectedDocId: string | null
  selectedPackId: string | null
  selectedProductId: string
  selectedEventId: string | null
  veraOpen: boolean
  veraMessages: VeraMessage[]
  veraThinking: boolean
  agentConsoleOpen: boolean

  // ---- navigation ----
  go: (page: PageId) => void
  toggleSidebar: () => void
  selectNode: (id: string | null) => void
  selectFinding: (id: string | null) => void
  selectDoc: (id: string | null) => void
  selectPack: (id: string | null) => void
  selectProduct: (id: string) => void
  selectEvent: (id: string | null) => void
  setAgentConsole: (open: boolean) => void

  // ---- toasts ----
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  // ---- domain actions ----
  resolveFinding: (findingId: string, actionId: string, note: string) => void
  acceptInferredFlow: (flowId: string) => void
  quarantineDoc: (docId: string) => void
  chaseSupplier: (requestId: string) => void
  generatePack: (packId: string) => void
  runAgent: (agentId: string) => void
  uploadDocument: (title: string, nodeId: string) => void
  assessEvent: (eventId: string) => void

  // ---- vera ----
  openVera: (seedQuestion?: string) => void
  closeVera: () => void
  askVera: (question: string) => void
  resetVera: () => void
}

const logActivity = (state: AppState, actor: string, actorKind: 'human' | 'agent', action: string, detail: string, entity?: string) => ({
  activity: [{ id: uid('ac'), on: stamp(), actor, actorKind, action, detail, entity }, ...state.activity],
})

/** Bump a node up the confidence ladder by one rung. */
const upgrade = (c: Confidence): Confidence => {
  const order: Confidence[] = ['missing', 'declared', 'document', 'crosschecked', 'attested']
  const i = order.indexOf(c)
  return order[Math.min(i + 1, order.length - 1)]
}

export const useStore = create<AppState>((set, get) => ({
  nodes: NODES,
  flows: FLOWS,
  docs: DOCS,
  findings: FINDINGS,
  products: PRODUCTS,
  packs: PACKS,
  campaigns: CAMPAIGNS,
  requests: REQUESTS,
  events: EVENTS,
  agents: AGENTS,
  activity: ACTIVITY,

  page: 'command',
  sidebarOpen: true,
  toasts: [],
  selectedNodeId: null,
  selectedFindingId: null,
  selectedDocId: null,
  selectedPackId: null,
  selectedProductId: 'p-nw7',
  selectedEventId: null,
  veraOpen: false,
  veraMessages: [],
  veraThinking: false,
  agentConsoleOpen: false,

  go: (page) => set({ page, selectedNodeId: null, selectedFindingId: null, selectedDocId: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  selectNode: (id) => set({ selectedNodeId: id }),
  selectFinding: (id) => set({ selectedFindingId: id }),
  selectDoc: (id) => set({ selectedDocId: id }),
  selectPack: (id) => set({ selectedPackId: id }),
  selectProduct: (id) => set({ selectedProductId: id }),
  selectEvent: (id) => set({ selectedEventId: id }),
  setAgentConsole: (open) => set({ agentConsoleOpen: open }),

  pushToast: (t) => {
    const id = uid('t')
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismissToast(id), 4600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // -----------------------------------------------------------------------
  // Resolving a finding is the product's core loop: a human decision on an AI
  // claim, which writes back into the graph and lifts the packs it was blocking.
  // -----------------------------------------------------------------------
  resolveFinding: (findingId, actionId, note) =>
    set((state) => {
      const finding = state.findings.find((f) => f.id === findingId)
      if (!finding) return {}

      const dismissed = actionId === 'dismiss'
      const escalated = actionId === 'escalate'
      const status: Finding['status'] = dismissed ? 'dismissed' : escalated ? 'in_review' : 'resolved'

      const findings = state.findings.map((f) =>
        f.id === findingId
          ? {
              ...f,
              status,
              resolution: {
                by: 'Anjali Rao',
                on: stamp(),
                note,
                action: f.actions.find((a) => a.id === actionId)?.label ?? actionId,
              },
            }
          : f,
      )

      // Accepting an AI conclusion strengthens the evidence on the nodes it touches.
      let nodes = state.nodes
      let flows = state.flows
      if (!dismissed && !escalated) {
        nodes = state.nodes.map((n) =>
          finding.nodeIds.includes(n.id)
            ? { ...n, confidence: upgrade(n.confidence), coverage: Math.min(100, n.coverage + 14) }
            : n,
        )
        if (actionId === 'confirm-inferred') {
          flows = state.flows.map((fl) =>
            finding.flowIds.includes(fl.id) && fl.status === 'ai_inferred'
              ? { ...fl, status: 'confirmed' as const, confidence: 'crosschecked' as const }
              : fl,
          )
        }
      }

      // Packs this finding was blocking gain readiness once it stops blocking.
      const packs =
        dismissed || escalated
          ? state.packs
          : state.packs.map((p) =>
              finding.blocksPacks.includes(p.id)
                ? {
                    ...p,
                    readiness: Math.min(100, p.readiness + (finding.severity === 'critical' ? 7 : 4)),
                    requirements: p.requirements.map((r) =>
                      r.blockingFindings.includes(findingId)
                        ? {
                            ...r,
                            blockingFindings: r.blockingFindings.filter((b) => b !== findingId),
                            status: r.status === 'gap' ? ('partial' as const) : ('met' as const),
                            confidence: upgrade(r.confidence),
                          }
                        : r,
                    ),
                  }
                : p,
            )

      return {
        findings,
        nodes,
        flows,
        packs,
        ...logActivity(
          { ...state } as AppState,
          'Anjali Rao',
          'human',
          dismissed ? 'Dismissed a finding' : escalated ? 'Escalated a finding' : 'Resolved a finding',
          `${finding.title} — ${note}`,
          findingId,
        ),
      }
    }),

  acceptInferredFlow: (flowId) =>
    set((state) => ({
      flows: state.flows.map((f) =>
        f.id === flowId ? { ...f, status: 'confirmed' as const, confidence: 'crosschecked' as const } : f,
      ),
      ...logActivity({ ...state } as AppState, 'Anjali Rao', 'human', 'Confirmed an inferred link', `Chain link ${flowId} accepted into the graph.`, flowId),
    })),

  quarantineDoc: (docId) =>
    set((state) => ({
      docs: state.docs.map((d) =>
        d.id === docId ? { ...d, confidence: 'missing' as const, forensics: { ...d.forensics, verdict: 'suspect' as const } } : d,
      ),
      ...logActivity({ ...state } as AppState, 'Anjali Rao', 'human', 'Quarantined a document', `${docId} withdrawn from all evidence packs pending issuer confirmation.`, docId),
    })),

  chaseSupplier: (requestId) =>
    set((state) => {
      const req = state.requests.find((r) => r.id === requestId)
      if (!req) return {}
      return {
        requests: state.requests.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: r.status === 'responded' ? r.status : ('chasing' as const),
                chases: [
                  ...r.chases,
                  {
                    on: TODAY.toISOString().slice(0, 10),
                    channel: 'Email + portal',
                    agent: 'Supplier Chase',
                    note: `AI-drafted request targeting ${r.gaps.length} open gap${r.gaps.length === 1 ? '' : 's'}: ${r.gaps.join(', ') || 'general follow-up'}.`,
                  },
                ],
              }
            : r,
        ),
        ...logActivity({ ...state } as AppState, 'Supplier Chase', 'agent', 'Chased a supplier', `Gap-specific request sent to ${req.supplier}.`, requestId),
      }
    }),

  generatePack: (packId) =>
    set((state) => ({
      packs: state.packs.map((p) =>
        p.id === packId
          ? {
              ...p,
              lastGenerated: stamp(),
              narrative: buildNarrative(p, state.findings),
            }
          : p,
      ),
      ...logActivity({ ...state } as AppState, 'Regime Reconciler', 'agent', 'Generated a regime pack', `${state.packs.find((p) => p.id === packId)?.shortName} compiled from the evidence graph.`, packId),
    })),

  runAgent: (agentId) =>
    set((state) => {
      const agent = state.agents.find((a) => a.id === agentId)
      if (!agent) return {}
      return {
        agents: state.agents.map((a) =>
          a.id === agentId ? { ...a, runsToday: a.runsToday + 1, lastRun: 'just now', itemsProcessed: a.itemsProcessed + Math.floor(Math.random() * 24) + 4 } : a,
        ),
        ...logActivity({ ...state } as AppState, agent.name, 'agent', 'Ran on demand', `${agent.description}`, agentId),
      }
    }),

  uploadDocument: (title, nodeId) =>
    set((state) => {
      const doc: EvidenceDoc = {
        id: uid('d'),
        title,
        kind: 'assay',
        nodeId,
        issuer: 'Pending extraction',
        issuedOn: TODAY.toISOString().slice(0, 10),
        receivedOn: TODAY.toISOString().slice(0, 10),
        supplier: state.nodes.find((n) => n.id === nodeId)?.name ?? 'Unknown',
        pages: 4,
        extraction: {
          status: 'extracted',
          agent: 'Document Extraction',
          completeness: 86,
          fields: [
            { label: 'Document type', value: 'Assay certificate', confidence: 0.94 },
            { label: 'Facility', value: state.nodes.find((n) => n.id === nodeId)?.name ?? '—', confidence: 0.91 },
            { label: 'Issued on', value: TODAY.toISOString().slice(0, 10), confidence: 0.88 },
          ],
        },
        forensics: { risk: 7, verdict: 'clean', signals: ['Template consistent with issuer history', 'Metadata coherent'] },
        confidence: 'document',
        linkedFindings: [],
      }
      return {
        docs: [doc, ...state.docs],
        ...logActivity({ ...state } as AppState, 'Document Extraction', 'agent', 'Extracted a new document', `${title} — 3 fields written to the graph, forensics clean.`, doc.id),
      }
    }),

  assessEvent: (eventId) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === eventId ? { ...e, status: 'assessed' as const } : e)),
      ...logActivity({ ...state } as AppState, 'Anjali Rao', 'human', 'Assessed a watchtower event', state.events.find((e) => e.id === eventId)?.title ?? '', eventId),
    })),

  // -----------------------------------------------------------------------
  // Ask VERA
  // -----------------------------------------------------------------------
  openVera: (seedQuestion) => {
    set({ veraOpen: true })
    if (get().veraMessages.length === 0) {
      set({
        veraMessages: [
          {
            id: uid('m'),
            role: 'assistant',
            text: "I'm VERA — I work across your evidence graph, so I can answer questions about chains, findings, documents and regime readiness. Ask me anything, or start with one of these.",
          },
        ],
      })
    }
    if (seedQuestion) setTimeout(() => get().askVera(seedQuestion), 120)
  },
  closeVera: () => set({ veraOpen: false }),
  resetVera: () => set({ veraMessages: [] }),

  askVera: (question) => {
    const userMsg: VeraMessage = { id: uid('m'), role: 'user', text: question }
    set((s) => ({ veraMessages: [...s.veraMessages, userMsg], veraThinking: true }))
    setTimeout(() => {
      const answer = answerVera(question, get())
      set((s) => ({ veraMessages: [...s.veraMessages, { ...answer, id: uid('m') }], veraThinking: false }))
    }, 900)
  },
}))

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------
export const selectMetrics = (s: AppState) => {
  const totalCoverage = Math.round(s.nodes.reduce((a, n) => a + n.coverage, 0) / s.nodes.length)
  const openFindings = s.findings.filter((f) => f.status === 'open' || f.status === 'in_review')
  const critical = openFindings.filter((f) => f.severity === 'critical').length
  const confirmedFlows = s.flows.filter((f) => f.status === 'confirmed').length
  const inferredFlows = s.flows.filter((f) => f.status === 'ai_inferred').length
  const verifiedNodes = s.nodes.filter((n) => CONFIDENCE_META[n.confidence].rank >= 3).length
  const beyondTier1 = s.nodes.filter((n) => n.tier >= 2)
  const beyondTier1Visible = beyondTier1.filter((n) => n.coverage >= 50).length
  const daysToPassport = Math.round((new Date('2027-02-18').getTime() - TODAY.getTime()) / 86_400_000)
  const daysToUflpa = Math.round((new Date('2026-07-28').getTime() - TODAY.getTime()) / 86_400_000)

  return {
    totalCoverage,
    openFindings: openFindings.length,
    critical,
    confirmedFlows,
    inferredFlows,
    verifiedNodes,
    totalNodes: s.nodes.length,
    subTierVisibility: Math.round((beyondTier1Visible / beyondTier1.length) * 100),
    daysToPassport,
    daysToUflpa,
    avgPackReadiness: Math.round(s.packs.reduce((a, p) => a + p.readiness, 0) / s.packs.length),
    docsVerified: s.docs.filter((d) => d.forensics.verdict === 'clean').length,
    docsSuspect: s.docs.filter((d) => d.forensics.verdict !== 'clean').length,
    agentFindingsToday: s.findings.filter((f) => f.detectedOn >= '2026-07-14').length,
    itemsProcessed: s.agents.reduce((a, g) => a + g.itemsProcessed, 0),
  }
}

/** Hooks wrap the object-returning selectors so React only re-renders on real change. */
export const useMetrics = () => useStore(useShallow(selectMetrics))
export const useConfidence = () => useStore(useShallow(confidenceBreakdown))

export const confidenceBreakdown = (s: AppState) => {
  const counts: Record<Confidence, number> = { attested: 0, crosschecked: 0, document: 0, declared: 0, missing: 0 }
  s.nodes.forEach((n) => (counts[n.confidence] += 1))
  return counts
}

// ---------------------------------------------------------------------------
// AI-drafted pack narrative
// ---------------------------------------------------------------------------
function buildNarrative(pack: CompliancePack, findings: Finding[]): string {
  const gaps = pack.requirements.filter((r) => r.status !== 'met')
  const blocking = findings.filter((f) => f.blocksPacks.includes(pack.id) && (f.status === 'open' || f.status === 'in_review'))
  const met = pack.requirements.length - gaps.length

  const lines: string[] = []
  lines.push(
    `${pack.shortName} — compiled from the evidence graph on ${TODAY.toISOString().slice(0, 10)}. ${met} of ${pack.requirements.length} requirements are fully evidenced.`,
  )
  if (gaps.length) {
    lines.push(
      `Outstanding: ${gaps.map((g) => g.label.toLowerCase()).join('; ')}. Each is traced to a named node and a named supplier, so remediation is assignable rather than exploratory.`,
    )
  }
  if (blocking.length) {
    lines.push(
      `${blocking.length} open verification finding${
        blocking.length === 1 ? '' : 's'
      } currently constrain this pack — ${blocking.map((b) => b.title).join('; ')}.`,
    )
  } else {
    lines.push('No open verification findings constrain this pack. Every claim it makes is backed by evidence that has passed forensic and plausibility checks.')
  }
  lines.push(
    `Evidence provenance is disclosed per claim: each statement carries its confidence rung (attested, cross-checked, document-backed or self-declared) so a reviewer can see exactly what is proven and what is asserted.`,
  )
  return lines.join('\n\n')
}

// ---------------------------------------------------------------------------
// VERA — scripted reasoning over the live store
// ---------------------------------------------------------------------------
export const VERA_SUGGESTIONS = [
  'What is blocking the battery passport?',
  'Can we clear the UFLPA detention in time?',
  'Where is our cobalt actually coming from?',
  'Which suppliers should I chase first?',
  'Summarise the chain for the NW-7 pack',
]

function answerVera(q: string, s: AppState): Omit<VeraMessage, 'id'> {
  const t = q.toLowerCase()
  const m = selectMetrics(s)

  if (t.includes('passport') || t.includes('blocking') || t.includes('feb')) {
    const pack = s.packs.find((p) => p.id === 'pk-passport')!
    const blockers = s.findings.filter((f) => f.blocksPacks.includes('pk-passport') && f.status !== 'resolved' && f.status !== 'dismissed')
    return {
      role: 'assistant',
      text: `The battery passport for NW-7 is at ${pack.readiness}% with ${m.daysToPassport} days to go. Four of nine requirements are fully evidenced.\n\nWhat actually blocks it: the lithium leg has no resolved refiner, so the sourcing field cannot reach mine level — that is the single biggest hole. Cobalt is present but rests on a mass-balance gap and a suspect assay. Recycled content is declared at 12% but the arithmetic gives 7.5%. The carbon footprint is 64% below peer median with no verified method.\n\nIf you resolve the lithium identity and the cobalt mass balance, readiness moves to roughly 85% and the remaining work is documentation rather than discovery.`,
      metrics: [
        { label: 'Readiness', value: String(pack.readiness), unit: '%' },
        { label: 'Days remaining', value: String(m.daysToPassport) },
        { label: 'Blocking findings', value: String(blockers.length) },
      ],
      cites: blockers.slice(0, 4).map((b) => ({ label: b.title, ref: b.id })),
      actions: [
        { label: 'Open passport builder', page: 'passport' },
        { label: 'Review findings', page: 'verification' },
      ],
    }
  }

  if (t.includes('uflpa') || t.includes('detention') || t.includes('detained') || t.includes('cbp')) {
    return {
      role: 'assistant',
      text: `Yes, but it is tight. The rebuttal dossier is at 88% and the CBP deadline is ${m.daysToUflpa} days away.\n\nOne gap holds it: anode graphite is only at entity-level fidelity, and graphite is exactly what the detention notice names. Tianyuan has committed to shipment-level records by 25 July — three days before the deadline.\n\nMy recommendation is to assemble and internally approve the dossier now with graphite marked as pending, so that when the records land you are filing rather than starting. Everything else — import documents, entity screening, the chain map — is already evidenced.`,
      metrics: [
        { label: 'Dossier readiness', value: '88', unit: '%' },
        { label: 'Days to deadline', value: String(m.daysToUflpa) },
        { label: 'Goods held', value: '$4.1M' },
      ],
      cites: [
        { label: 'Tianyuan shares directors with a listed entity', ref: 'fi-06' },
        { label: 'Shipment SHP-4471 detained at Long Beach', ref: 'ev-1' },
      ],
      actions: [
        { label: 'Open UFLPA dossier', page: 'packs' },
        { label: 'View the supplier request', page: 'suppliers' },
      ],
    }
  }

  if (t.includes('cobalt') || t.includes('kolwezi') || t.includes('drc') || t.includes('congo')) {
    return {
      role: 'assistant',
      text: `Officially: Lualaba Copper-Cobalt Mine → Kolwezi Hydromet → Meridian Metals AG → Huaxin Cobalt Refinery → Kwangyang Precursor → cathode → cells.\n\nActually, that chain does not balance. Kolwezi declares 14,200 t of cobalt output against 9,800 t of certified, quota-covered input. 4,400 t entered that refinery without documented origin. The most probable source is Kasulo ASM Cooperative at 81% — it is 34 km from the plant gate and matches the grade profile.\n\nTwo things follow. First, the only origin document for the trader parcel is an assay that failed four forensic checks, so I would not rely on it. Second, ASM presence is not itself disqualifying — under OECD Annex II the answer is disclosure and monitoring, not exclusion. Cutting Kasulo out would embargo about 2,400 diggers and would still leave you with an unexplained gap.`,
      metrics: [
        { label: 'Declared output', value: '14,200', unit: 't' },
        { label: 'Certified input', value: '9,800', unit: 't' },
        { label: 'Unexplained', value: '4,400', unit: 't' },
      ],
      cites: [
        { label: 'Mass balance: output exceeds feedstock by 45%', ref: 'fi-02' },
        { label: 'Assay ARC-2291 shows signs of fabrication', ref: 'fi-03' },
        { label: 'ASM present but undeclared', ref: 'fi-11' },
      ],
      actions: [
        { label: 'Open the chain map', page: 'chain' },
        { label: 'Review the findings', page: 'verification' },
      ],
    }
  }

  if (t.includes('chase') || t.includes('supplier') || t.includes('first') || t.includes('priorit')) {
    return {
      role: 'assistant',
      text: `Ranked by what unblocks the most regulated value:\n\n1. Tianyuan Anode Materials — shipment-level graphite origin. This is the only thing holding a live detention worth $4.1M. Already chased three times; they have committed to 25 July.\n\n2. Zhejiang Cathode Technology — the registered legal name of the lithium refiner. One field, and it unblocks the passport sourcing requirement and the FEOC lithium worksheet at once.\n\n3. Kolwezi Hydromet — feedstock reconciliation. Overdue, and it sits behind three separate packs.\n\n4. Kalgoorlie Lithium — different framing. They are not withholding anything; nobody has asked. Approach them commercially: verified provenance supports the offtake premium they already market.\n\nI can draft all four requests, each targeting only its specific gap rather than resending a full questionnaire.`,
      metrics: [
        { label: 'Open requests', value: String(s.requests.filter((r) => r.status !== 'responded').length) },
        { label: 'Overdue', value: String(s.requests.filter((r) => r.status === 'overdue').length) },
      ],
      actions: [{ label: 'Open suppliers', page: 'suppliers' }],
    }
  }

  if (t.includes('nw-7') || t.includes('summar') || t.includes('chain for') || t.includes('overview')) {
    return {
      role: 'assistant',
      text: `NW-7 is a 78 kWh NMC811 pack, 84,000 units, sold into the EU, UK and India.\n\nThe chain runs five tiers deep: Pune assembly ← Hanjin cells (KR) ← Zhejiang cathode and Tianyuan anode (CN) ← Kwangyang precursor (KR) ← refiners in China, DRC and Indonesia ← mines in Australia, DRC, Indonesia and Mozambique.\n\nEvidence quality is uneven by mineral. Nickel is the strongest leg — document-backed to mine level through SIMBARA. Copper is attested end to end via Copper Mark. Cobalt is present but contested. Lithium effectively stops at an unresolvable refiner name. Graphite is entity-level only, which is what the detention turns on.\n\nOverall: ${m.totalCoverage}% evidence coverage, ${m.verifiedNodes} of ${m.totalNodes} nodes at cross-checked or better, ${m.inferredFlows} chain links currently proposed by inference rather than declared.`,
      metrics: [
        { label: 'Evidence coverage', value: String(m.totalCoverage), unit: '%' },
        { label: 'Chain tiers mapped', value: '5' },
        { label: 'Inferred links', value: String(m.inferredFlows) },
      ],
      actions: [
        { label: 'Open the chain map', page: 'chain' },
        { label: 'Open the product', page: 'products' },
      ],
    }
  }

  if (t.includes('lithium')) {
    return {
      role: 'assistant',
      text: `Lithium is your weakest leg. Zhejiang Cathode names "Jiangxi Lithium Chem Co" as the refiner, and that string matches nothing in the RMI, AMRT or LME registers. The three closest candidates top out at 0.61 similarity, well under the 0.85 I need to assert a match.\n\nUpstream of that name there is nothing at all, so the lithium path is three nodes deep where the passport needs four.\n\nThere is a good outcome available here. Customs data shows 62 kt of spodumene moving from Kalgoorlie into Yichun in the declaration window, which makes Kalgoorlie the probable origin at 74%. Kalgoorlie is IRMA 75 with a verified LCA — if that link is confirmed, the leg goes from missing straight to attested and your passport carbon figure improves at the same time.`,
      metrics: [
        { label: 'Best name match', value: '0.61' },
        { label: 'Acceptance threshold', value: '0.85' },
        { label: 'Inferred link', value: '74', unit: '%' },
      ],
      cites: [
        { label: 'Refiner name does not resolve', ref: 'fi-01' },
        { label: 'No declared link to any mine', ref: 'fi-07' },
      ],
      actions: [{ label: 'Open verification', page: 'verification' }],
    }
  }

  if (t.includes('recycl')) {
    return {
      role: 'assistant',
      text: `The claim is 12% recycled nickel; the evidence supports 7.5%.\n\nKwangyang declares 260 t of recycled Ni-equivalent against 3,460 t of total nickel, which is 7.5%. Revolt supplied a one-page declaration with no pre/post-consumer split and no plant-level allocation — the two things the draft methodology C(2025)1674 actually requires.\n\nThe deadline itself is not urgent: documentation obligations start August 2028, minimums in 2031. What is urgent is that the same 12% figure appears in marketing material, so the arithmetic gap is a claims-substantiation exposure today, not a compliance one in 2028.`,
      metrics: [
        { label: 'Claimed', value: '12', unit: '%' },
        { label: 'Supported', value: '7.5', unit: '%' },
      ],
      cites: [{ label: 'Recycled-nickel claim has no allocation evidence', ref: 'fi-09' }],
      actions: [{ label: 'Open verification', page: 'verification' }],
    }
  }

  if (t.includes('magnet') || t.includes('rare earth') || t.includes('ree') || t.includes('feoc') || t.includes('china')) {
    return {
      role: 'assistant',
      text: `You are making two contradictory statements about the same magnet.\n\nThe MOFCOM licence extract names Bayan Obo as the rare-earth origin and discloses Northwind Pune as the end user. The FEOC traced-value worksheet for the same part claims 61% non-Chinese content. In your own graph every node on that path is Chinese: Sundram ← Ningbo ← Baotou ← Bayan Obo.\n\nThe likely cause is that the FEOC worksheet is counting Indian magnet-assembly value added as non-Chinese content. That is a value-added test, not a material-origin test, and FEOC asks for the latter.\n\nBoth regulators can see their own filing. Fix the calculation basis before the licence renews on 30 November.`,
      metrics: [
        { label: 'MOFCOM declared origin', value: 'China' },
        { label: 'FEOC claimed non-CN', value: '61', unit: '%' },
        { label: 'Licence renewal', value: '30 Nov 2026' },
      ],
      cites: [{ label: 'Dual-documentation conflict on the same part', ref: 'fi-10' }],
      actions: [{ label: 'Open compliance packs', page: 'packs' }],
    }
  }

  if (t.includes('agent') || t.includes('ai') || t.includes('how do you')) {
    return {
      role: 'assistant',
      text: `Fourteen agents run across your graph. Four acquire data — extraction, chase, inference, horizon scanning. Six verify it — entity resolution, mass balance, document forensics, origin anomaly, PCF validation, recycled-content maths. Four watch risk — ownership screening, scheme status, ASM presence, regulatory events.\n\nToday they have processed ${m.itemsProcessed.toLocaleString()} items and opened ${m.agentFindingsToday} findings in the last week.\n\nThe important part is that none of them decide anything. Every finding carries its reasoning, its sources and a confidence figure, and a human accepts, dismisses or escalates it. That decision is what writes back into the graph — which is what makes the audit trail defensible.`,
      metrics: [
        { label: 'Agents', value: String(s.agents.length) },
        { label: 'Items processed', value: m.itemsProcessed.toLocaleString() },
        { label: 'Open findings', value: String(m.openFindings) },
      ],
      actions: [{ label: 'Open agent console', page: 'agents' }],
    }
  }

  // Fallback — still grounded in the real numbers.
  return {
    role: 'assistant',
    text: `I can work across the whole evidence graph — ${m.totalNodes} entities, ${s.flows.length} material flows, ${s.docs.length} documents and ${m.openFindings} open findings.\n\nRight now the things most worth your attention are the live UFLPA detention (${m.daysToUflpa} days to respond), the unresolved lithium refiner, and the cobalt mass-balance gap at Kolwezi. Ask me about any of them, or about a specific supplier, mineral or regime.`,
    metrics: [
      { label: 'Evidence coverage', value: String(m.totalCoverage), unit: '%' },
      { label: 'Open findings', value: String(m.openFindings) },
      { label: 'Avg pack readiness', value: String(m.avgPackReadiness), unit: '%' },
    ],
  }
}
