import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECElementEvent } from 'echarts'

interface EChartProps {
  option: EChartsOption
  height?: number | string
  onClick?: (params: ECElementEvent) => void
  className?: string
}

export function EChart({ option, height = 280, onClick, className }: EChartProps) {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!elementRef.current) return
    const chart = echarts.init(elementRef.current, undefined, { renderer: 'canvas' })
    chart.setOption(option)
    if (onClick) chart.on('click', onClick)
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(elementRef.current)
    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [onClick, option])

  return <div ref={elementRef} className={className} style={{ width: '100%', minWidth: 0, maxWidth: '100%', height }} />
}
