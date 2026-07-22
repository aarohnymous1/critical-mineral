// ---------------------------------------------------------------------------
// Credibl Trace — domain model
//
// One evidence graph, many regimes. Everything the product shows is a projection
// of three node families: ENTITIES (who), FLOWS (what moved), EVIDENCE (proof).
// Verification confidence is a first-class property of every fact.
// ---------------------------------------------------------------------------

/** Verification ladder — how well a fact is backed. Drives colour everywhere. */
export type Confidence = 'attested' | 'crosschecked' | 'document' | 'declared' | 'missing'

export const CONFIDENCE_META: Record<
  Confidence,
  { label: string; short: string; color: string; tint: string; rank: number; help: string }
> = {
  attested: {
    label: 'Third-party attested',
    short: 'Attested',
    color: '#15803D',
    tint: '#F0FDF4',
    rank: 4,
    help: 'Confirmed by an independent auditor or assurance scheme (RMAP, IRMA, Copper Mark).',
  },
  crosschecked: {
    label: 'Cross-checked',
    short: 'Cross-checked',
    color: '#0A7AEB',
    tint: '#EFF6FF',
    rank: 3,
    help: 'Declaration agrees with at least one independent source (customs, trade data, peer declaration).',
  },
  document: {
    label: 'Document-backed',
    short: 'Document',
    color: '#7C3AED',
    tint: '#F5F3FF',
    rank: 2,
    help: 'Supported by an uploaded document whose fields were extracted and passed forensic checks.',
  },
  declared: {
    label: 'Self-declared',
    short: 'Declared',
    color: '#D97706',
    tint: '#FFFBEB',
    rank: 1,
    help: 'Supplier stated this in a questionnaire. No supporting document on file.',
  },
  missing: {
    label: 'No evidence',
    short: 'Missing',
    color: '#DC2626',
    tint: '#FEF2F2',
    rank: 0,
    help: 'Nothing on file. This is a gap that will block a regime pack.',
  },
}

export type NodeKind =
  | 'own'
  | 'cell'
  | 'magnet'
  | 'module'
  | 'electronics'
  | 'cathode'
  | 'anode'
  | 'precursor'
  | 'component'
  | 'refiner'
  | 'smelter'
  | 'mine'
  | 'asm'
  | 'trader'
  | 'recycler'

export const NODE_KIND_META: Record<NodeKind, { label: string; glyph: string }> = {
  own: { label: 'Own operations', glyph: 'factory' },
  cell: { label: 'Cell maker', glyph: 'battery' },
  magnet: { label: 'Magnet maker', glyph: 'magnet' },
  module: { label: 'Module assembly', glyph: 'layers' },
  electronics: { label: 'Electronics', glyph: 'chip' },
  cathode: { label: 'Cathode maker', glyph: 'beaker' },
  anode: { label: 'Anode maker', glyph: 'beaker' },
  precursor: { label: 'Precursor (pCAM)', glyph: 'beaker' },
  component: { label: 'Component maker', glyph: 'cube' },
  refiner: { label: 'Refiner', glyph: 'flame' },
  smelter: { label: 'Smelter', glyph: 'flame' },
  mine: { label: 'Mine', glyph: 'pickaxe' },
  asm: { label: 'Artisanal mining (ASM)', glyph: 'people' },
  trader: { label: 'Trader / aggregator', glyph: 'exchange' },
  recycler: { label: 'Recycler', glyph: 'recycle' },
}

/** Risk flags carried by an entity. Each maps to a regime consequence. */
export type RiskFlag =
  | 'entity_list_proximity'
  | 'sanctions_proximity'
  | 'rmap_lapsed'
  | 'asm_exposure'
  | 'export_control'
  | 'mass_balance'
  | 'conflict_region'
  | 'forced_labour_region'
  | 'unresolved_identity'

export const RISK_FLAG_META: Record<RiskFlag, { label: string; regime: string; severity: Severity }> = {
  entity_list_proximity: { label: 'UFLPA entity-list proximity', regime: 'UFLPA', severity: 'critical' },
  sanctions_proximity: { label: 'Sanctions proximity', regime: 'OFAC / EU sanctions', severity: 'critical' },
  rmap_lapsed: { label: 'RMAP conformance lapsed', regime: 'CMRT / EU battery Art. 48', severity: 'high' },
  asm_exposure: { label: 'ASM feedstock exposure', regime: 'OECD Annex II', severity: 'high' },
  export_control: { label: 'Chinese export licensing', regime: 'MOFCOM licence', severity: 'high' },
  mass_balance: { label: 'Mass-balance implausible', regime: 'All origin claims', severity: 'high' },
  conflict_region: { label: 'Conflict-affected region', regime: 'OECD / EU CMR', severity: 'critical' },
  forced_labour_region: { label: 'Forced-labour risk region', regime: 'UFLPA / EU FLR', severity: 'critical' },
  unresolved_identity: { label: 'Entity identity unresolved', regime: 'CMRT smelter validation', severity: 'medium' },
}

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export const SEVERITY_META: Record<Severity, { label: string; color: string; tint: string; border: string }> = {
  critical: { label: 'Critical', color: '#B91C1C', tint: '#FEF2F2', border: '#FECACA' },
  high: { label: 'High', color: '#C2410C', tint: '#FFF7ED', border: '#FED7AA' },
  medium: { label: 'Medium', color: '#B45309', tint: '#FFFBEB', border: '#FDE68A' },
  low: { label: 'Low', color: '#1E40AF', tint: '#EFF6FF', border: '#BFDBFE' },
}

export interface ChainNode {
  id: string
  name: string
  kind: NodeKind
  country: string
  countryCode: string
  tier: number // 0 = own operations, increasing upstream
  minerals: string[]
  confidence: Confidence
  /** 0–100 evidence coverage for this node's own facts. */
  coverage: number
  riskFlags: RiskFlag[]
  rmiId?: string
  schemes: string[]
  ownership?: string
  capacity?: string
  /** Declared annual throughput, for mass-balance work. */
  declaredOutput?: { value: number; unit: string; mineral: string }
  certifiedInput?: { value: number; unit: string }
  note?: string
  x: number
  y: number
}

export type FlowStatus = 'confirmed' | 'ai_inferred' | 'disputed' | 'unverified'
/** Fidelity ladder: what granularity the chain link is known at. */
export type Fidelity = 'entity' | 'shipment' | 'lot'

export const FIDELITY_META: Record<Fidelity, { label: string; help: string; grade: string }> = {
  entity: { label: 'Entity-level', help: 'We know the company is in the chain, not which material moved.', grade: 'CMRT-grade' },
  shipment: { label: 'Shipment-level', help: 'Country of origin known per shipment.', grade: 'UFLPA / 232-grade' },
  lot: { label: 'Lot-level', help: 'Mass-balance reconciled batch, traceable end to end.', grade: 'Passport / FEOC-grade' },
}

export interface ChainFlow {
  id: string
  from: string
  to: string
  mineral: string
  fidelity: Fidelity
  status: FlowStatus
  confidence: Confidence
  volume?: number
  unit?: string
  period: string
  evidenceIds: string[]
  /** Present when the link was proposed by an AI agent rather than declared. */
  inference?: { agent: string; basis: string; probability: number }
}

export type DocKind =
  | 'assay'
  | 'rmap_cert'
  | 'quota_cert'
  | 'audit_report'
  | 'pcf_study'
  | 'bill_of_lading'
  | 'invoice'
  | 'mining_licence'
  | 'mill_cert'
  | 'recycled_alloc'
  | 'cmrt'
  | 'customs_entry'

export const DOC_KIND_META: Record<DocKind, { label: string }> = {
  assay: { label: 'Assay certificate' },
  rmap_cert: { label: 'RMAP conformance' },
  quota_cert: { label: 'ARECOMS quota certificate' },
  audit_report: { label: 'Audit report' },
  pcf_study: { label: 'Product carbon footprint' },
  bill_of_lading: { label: 'Bill of lading' },
  invoice: { label: 'Commercial invoice' },
  mining_licence: { label: 'Mining licence' },
  mill_cert: { label: 'Mill test certificate' },
  recycled_alloc: { label: 'Recycled-content allocation' },
  cmrt: { label: 'CMRT / EMRT declaration' },
  customs_entry: { label: 'Customs entry' },
}

export interface ExtractedField {
  label: string
  value: string
  confidence: number
  /** Set when the extracted value disagrees with the graph. */
  conflict?: string
}

export interface EvidenceDoc {
  id: string
  title: string
  kind: DocKind
  nodeId: string
  issuer: string
  issuedOn: string
  receivedOn: string
  supplier: string
  pages: number
  /** AI document-understanding output. */
  extraction: {
    status: 'extracted' | 'processing' | 'failed'
    agent: string
    fields: ExtractedField[]
    completeness: number
  }
  /** AI document forensics. 0–100, higher = more suspicious. */
  forensics: {
    risk: number
    verdict: 'clean' | 'review' | 'suspect'
    signals: string[]
  }
  confidence: Confidence
  linkedFindings: string[]
}

export type FindingKind =
  | 'entity_resolution'
  | 'mass_balance'
  | 'document_forensics'
  | 'origin_anomaly'
  | 'ownership_screening'
  | 'scheme_status'
  | 'pcf_outlier'
  | 'recycled_claim'
  | 'chain_gap'
  | 'regime_conflict'
  | 'asm_disclosure'

export const FINDING_KIND_META: Record<FindingKind, { label: string; agent: string }> = {
  entity_resolution: { label: 'Entity resolution', agent: 'Entity Resolver' },
  mass_balance: { label: 'Mass balance', agent: 'Mass Balance Auditor' },
  document_forensics: { label: 'Document forensics', agent: 'Document Forensics' },
  origin_anomaly: { label: 'Origin anomaly', agent: 'Origin Anomaly Detector' },
  ownership_screening: { label: 'Ownership screening', agent: 'Ownership Graph' },
  scheme_status: { label: 'Scheme status', agent: 'Scheme Monitor' },
  pcf_outlier: { label: 'Carbon-footprint outlier', agent: 'PCF Validator' },
  recycled_claim: { label: 'Recycled-content claim', agent: 'Recycled Content Engine' },
  chain_gap: { label: 'Chain gap', agent: 'Chain Inference' },
  regime_conflict: { label: 'Cross-regime conflict', agent: 'Regime Reconciler' },
  asm_disclosure: { label: 'ASM disclosure', agent: 'ASM Monitor' },
}

export type FindingStatus = 'open' | 'in_review' | 'accepted' | 'dismissed' | 'resolved'

export interface Finding {
  id: string
  kind: FindingKind
  severity: Severity
  title: string
  summary: string
  /** The agent's chain of reasoning, shown verbatim in the UI. */
  reasoning: { step: string; detail: string; source?: string }[]
  recommendation: string
  /** What a human can do about it, rendered as action buttons. */
  actions: { id: string; label: string; kind: 'primary' | 'neutral' | 'warn' }[]
  nodeIds: string[]
  flowIds: string[]
  docIds: string[]
  /** Which regime packs this finding currently blocks. */
  blocksPacks: string[]
  status: FindingStatus
  aiConfidence: number
  detectedOn: string
  agent: string
  /** Populated when a human resolves it — the audit trail. */
  resolution?: { by: string; on: string; note: string; action: string }
}

export interface BomItem {
  id: string
  part: string
  supplierNodeId: string
  minerals: { mineral: string; massKg: number; confidence: Confidence }[]
}

export interface Product {
  id: string
  name: string
  code: string
  category: string
  markets: string[]
  units: number
  /** 0–100, how ready this product is for its lead regime. */
  readiness: number
  leadRegime: string
  leadDeadline: string
  pcf?: { value: number; unit: string; confidence: Confidence; method: string }
  recycledContent?: { mineral: string; claimedPct: number; verifiedPct: number }[]
  bom: BomItem[]
  image?: string
}

export type PackStatus = 'ready' | 'in_progress' | 'blocked' | 'submitted' | 'urgent'

export interface PackRequirement {
  id: string
  label: string
  detail: string
  status: 'met' | 'partial' | 'gap'
  confidence: Confidence
  evidenceCount: number
  blockingFindings: string[]
}

export interface CompliancePack {
  id: string
  regime: string
  shortName: string
  scope: string
  jurisdiction: 'EU' | 'US' | 'CN' | 'Global'
  status: PackStatus
  readiness: number
  dueOn: string
  dueLabel: string
  owner: string
  ownerRole: string
  description: string
  requirements: PackRequirement[]
  /** AI-drafted narrative for the submission. */
  narrative?: string
  lastGenerated?: string
}

export interface SupplierRequest {
  id: string
  supplier: string
  nodeId: string
  tier: number
  campaign: string
  status: 'responded' | 'pending' | 'overdue' | 'chasing' | 'declined'
  requestedOn: string
  dueOn: string
  responseQuality?: number
  /** AI auto-chase log. */
  chases: { on: string; channel: string; agent: string; note: string }[]
  gaps: string[]
}

export interface Campaign {
  id: string
  name: string
  regime: string
  minerals: string[]
  suppliersInvited: number
  responded: number
  tiersReached: number
  dueOn: string
  status: 'active' | 'closed' | 'draft'
  autoChase: boolean
}

export interface RiskEvent {
  id: string
  title: string
  category: 'export_control' | 'enforcement' | 'sanctions' | 'operational' | 'regulatory' | 'price'
  severity: Severity
  detectedOn: string
  source: string
  summary: string
  /** How the event propagates through this customer's own graph. */
  exposure: { nodeIds: string[]; products: string[]; assessment: string }
  aiAssessment: string
  status: 'new' | 'assessed' | 'actioned'
}

export interface AiAgent {
  id: string
  name: string
  role: string
  description: string
  cadence: string
  status: 'active' | 'idle' | 'paused'
  runsToday: number
  itemsProcessed: number
  findingsOpen: number
  precision: number
  lastRun: string
}

export interface ActivityEvent {
  id: string
  on: string
  actor: string
  actorKind: 'human' | 'agent'
  action: string
  detail: string
  entity?: string
}

export interface VeraMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Structured attachments the assistant can render inline. */
  cites?: { label: string; ref: string }[]
  metrics?: { label: string; value: string; unit?: string }[]
  actions?: { label: string; page?: PageId }[]
  pending?: boolean
}

export type PageId =
  | 'command'
  | 'products'
  | 'chain'
  | 'suppliers'
  | 'evidence'
  | 'verification'
  | 'packs'
  | 'passport'
  | 'watchtower'
  | 'agents'
  | 'earth'
