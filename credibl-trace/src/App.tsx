import { Shell } from './app/Shell'
import { Vera, VeraLauncher } from './app/Vera'
import { useStore } from './data/store'
import { Agents } from './pages/Agents'
import { ChainMap } from './pages/ChainMap'
import { CommandCentre } from './pages/CommandCentre'
import { CompliancePacks } from './pages/CompliancePacks'
import { EvidenceVault } from './pages/EvidenceVault'
import { Passport } from './pages/Passport'
import { Products } from './pages/Products'
import { Suppliers } from './pages/Suppliers'
import { Verification } from './pages/Verification'
import { Watchtower } from './pages/Watchtower'

const PAGES = {
  command: CommandCentre,
  products: Products,
  chain: ChainMap,
  suppliers: Suppliers,
  evidence: EvidenceVault,
  verification: Verification,
  agents: Agents,
  packs: CompliancePacks,
  passport: Passport,
  watchtower: Watchtower,
} as const

export function App() {
  const page = useStore((s) => s.page)
  const Page = PAGES[page]
  return (
    <>
      <Shell>
        <Page />
      </Shell>
      <Vera />
      <VeraLauncher />
    </>
  )
}
