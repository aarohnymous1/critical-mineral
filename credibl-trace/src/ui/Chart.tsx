import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

// Shared Credibl chart theme (Essentials §66 / Enterprise §6). Registered once
// so every chart inherits the tokens: IBM Plex Sans, muted axes, white tooltip,
// value-axis gridlines only, palette in order.
export const CHART_COLORS = ['#0A7AEB', '#3398DB', '#2790AA', '#73778C', '#E85530', '#7C3AED']

const THEME = {
  color: CHART_COLORS,
  textStyle: { fontFamily: '"IBM Plex Sans", sans-serif', color: '#6B7280', fontSize: 12 },
  grid: { left: 48, right: 24, top: 32, bottom: 40, containLabel: true },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#E5E7EB' } },
    axisTick: { show: false },
    axisLabel: { color: '#6B7280', fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#6B7280', fontSize: 11 },
    splitLine: { lineStyle: { color: '#F1F5F9', type: 'solid' } },
  },
  legend: {
    top: 0,
    right: 0,
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    textStyle: { color: '#6B7280', fontSize: 11 },
  },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    textStyle: { color: '#0F172A', fontSize: 12 },
    extraCssText: 'border-radius:8px;box-shadow:0 4px 12px -2px rgba(0,0,0,0.10);padding:8px 12px;',
  },
}

let registered = false
function ensureTheme() {
  if (!registered) {
    echarts.registerTheme('credibl', THEME)
    registered = true
  }
}

export function Chart({
  option,
  height = 260,
  className = '',
  onEvent,
}: {
  option: EChartsOption
  height?: number | string
  className?: string
  onEvent?: { type: string; handler: (params: unknown) => void }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    ensureTheme()
    if (!ref.current) return
    // StrictMode mounts effects twice in dev; guard every call against a
    // disposed instance so the second pass doesn't warn.
    inst.current = echarts.init(ref.current, 'credibl', { renderer: 'canvas' })
    const ro = new ResizeObserver(() => {
      if (inst.current && !inst.current.isDisposed()) inst.current.resize()
    })
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      inst.current?.dispose()
      inst.current = null
    }
  }, [])

  useEffect(() => {
    if (inst.current && !inst.current.isDisposed()) inst.current.setOption(option, true)
  }, [option])

  useEffect(() => {
    const chart = inst.current
    if (!chart || chart.isDisposed() || !onEvent) return
    chart.off(onEvent.type)
    chart.on(onEvent.type, onEvent.handler)
    return () => {
      chart.off(onEvent.type)
    }
  }, [onEvent])

  return <div ref={ref} className={className} style={{ height, width: '100%' }} />
}
