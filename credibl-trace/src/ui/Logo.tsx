// The credibl eclipse logomark — three nested crescents, used verbatim from the
// brand vector (Essentials §1). Never re-drawn or recoloured.
export function Logomark({ className = 'h-6 w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="-1 0 90 120" className={className} role="img" aria-label="Credibl">
      <path
        fill="none"
        stroke="#1D1D1B"
        strokeWidth="11"
        d="m58.32,119.33C25.37,118.59-.73,91.27.02,58.32.76,25.37,28.08-.73,61.03.02"
      />
      <path
        fill="none"
        stroke="#366EB5"
        strokeWidth="11"
        d="m66.97,95.86c-19.89-.45-35.64-16.94-35.19-36.82.45-19.89,16.94-35.64,36.82-35.19"
      />
      <path
        fill="none"
        stroke="#5EC4E4"
        strokeWidth="11"
        d="m77.98,84.63c-13.54-.31-24.28-11.54-23.97-25.08s11.54-24.28,25.08-23.97"
      />
    </svg>
  )
}

export function BrandLockup({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) return <Logomark className="h-7 w-[21px]" />
  return (
    <div className="flex items-center gap-2.5">
      <Logomark className="h-[26px] w-[20px] shrink-0" />
      <div className="leading-none">
        <div className="text-[19px] font-bold tracking-[-0.02em] text-[#1D1D1B]">credibl</div>
        <div className="mt-[3px] text-[10.5px] font-semibold tracking-[0.01em] text-[#366EB5]">
          Critical Minerals Traceability
        </div>
      </div>
    </div>
  )
}
