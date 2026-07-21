import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useStore, VERA_SUGGESTIONS } from '../data/store'

// Ask VERA — the traceability sibling of Ask EVA in the Credibl ESG platform.
// Enterprise §17: right drawer, bubbles, suggestion chips, plain business tone.
// Every answer is grounded in the live evidence graph and cites what it used.
export function Vera() {
  const { veraOpen, closeVera, veraMessages, veraThinking, askVera, go, selectFinding } = useStore()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [veraMessages, veraThinking])

  useEffect(() => {
    if (!veraOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && closeVera()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [veraOpen, closeVera])

  if (!veraOpen) return null

  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    askVera(t)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.24)]" onClick={closeVera} />
      <aside className="relative flex w-[520px] max-w-full animate-slide-in flex-col bg-white shadow-lg">
        <header className="flex items-center justify-between gap-3 border-b border-border-base px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ai-soft text-ai">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[14.5px] font-semibold leading-tight text-foreground">Ask VERA</div>
              <div className="text-[11.5px] text-muted-fg">Verification &amp; evidence reasoning assistant</div>
            </div>
          </div>
          <button onClick={closeVera} className="btn btn-ghost h-7 w-7 rounded-full p-0" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {veraMessages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <div className="max-w-[86%] rounded-xl rounded-tr-sm bg-soft-blue px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1D4ED8]">
                  {m.text}
                </div>
              ) : (
                <div className="max-w-full">
                  <div className="rounded-xl rounded-tl-sm bg-[#FAFAFA] px-3.5 py-3 text-[13px] leading-relaxed text-body">
                    {m.text.split('\n\n').map((p, i) => (
                      <p key={i} className={i > 0 ? 'mt-2.5' : ''}>
                        {p}
                      </p>
                    ))}
                  </div>

                  {m.metrics && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {m.metrics.map((k, i) => (
                        <div key={i} className="rounded-lg border border-border-base bg-white px-3 py-2">
                          <div className="text-[10.5px] font-semibold uppercase tracking-[0.03em] text-muted-fg">{k.label}</div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="num text-[16px] font-bold text-foreground">{k.value}</span>
                            {k.unit && <span className="text-[11px] text-muted-fg">{k.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.cites && m.cites.length > 0 && (
                    <div className="mt-2 rounded-lg border border-ai-border bg-ai-soft px-3 py-2.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ai-deep">
                        <Icon name="link" className="h-3 w-3" />
                        Evidence used
                      </div>
                      <ul className="space-y-1">
                        {m.cites.map((c, i) => (
                          <li key={i}>
                            <button
                              onClick={() => {
                                if (c.ref.startsWith('fi-')) {
                                  go('verification')
                                  selectFinding(c.ref)
                                  closeVera()
                                }
                              }}
                              className="text-left text-[12px] leading-snug text-ai-deep underline decoration-ai-border underline-offset-2 hover:decoration-ai"
                            >
                              {c.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.actions && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.actions.map((a, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (a.page) go(a.page)
                            closeVera()
                          }}
                          className="btn btn-xs btn-neutral"
                        >
                          {a.label}
                          <Icon name="arrowRight" className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {veraThinking && (
            <div className="flex items-center gap-2 rounded-xl bg-[#FAFAFA] px-3.5 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulsedot rounded-full bg-ai"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </span>
              <span className="text-[12px] text-muted-fg">Reading the evidence graph…</span>
            </div>
          )}
        </div>

        <div className="border-t border-border-base px-5 py-3">
          {veraMessages.length <= 1 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {VERA_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="chip border border-ai-border bg-ai-soft text-ai-deep hover:bg-[#EDE9FE]">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about a mineral, supplier, finding or regime…"
              className="field flex-1"
            />
            <button type="submit" disabled={!draft.trim()} className="btn btn-md btn-ai w-9 px-0" aria-label="Send">
              <Icon name="send" className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-[11px] leading-normal text-muted-fg">
            VERA answers only from your evidence graph and shows what it used. It never files or sends anything on its own.
          </p>
        </div>
      </aside>
    </div>
  )
}

/** Floating launcher — Essentials §25: pill, white, subtle shadow, bottom-right. */
export function VeraLauncher() {
  const { openVera, veraOpen } = useStore()
  if (veraOpen) return null
  return (
    <button
      onClick={() => openVera()}
      className="fixed bottom-5 right-5 z-30 flex h-11 items-center gap-2 rounded-full border border-ai-border bg-white px-4 text-[13px] font-semibold text-ai-deep shadow-md transition-shadow hover:shadow-lg"
    >
      <Icon name="sparkles" className="h-4 w-4 text-ai" />
      Ask VERA
    </button>
  )
}
