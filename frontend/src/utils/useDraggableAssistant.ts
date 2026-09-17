import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent, type MouseEvent } from 'react'

type Point = { x: number; y: number }
/** How far along the free space the element sits, per axis, in the range 0..1. */
type Anchor = { x: number; y: number }

const POSITION_KEY = 'bio-xiaoan-positions'
const STORAGE_VERSION = 2
/** Page inset kept clear around the floating assistant. */
const EDGE = 12
/** The wake toggle overhangs the card: reserve room so it is never clipped. */
const TOGGLE_OVERHANG = 12

const DEFAULT_ANCHOR: Anchor = { x: 1, y: 1 }

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toAnchor(value: unknown): Anchor | null {
  const x = readNumber((value as Anchor | null | undefined)?.x)
  const y = readNumber((value as Anchor | null | undefined)?.y)
  if (x === null || y === null) return null
  // Stored anchors are ratios; older pixel records are rejected and re-defaulted.
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}

/** Geometry of the element inside the viewport, including the reserved toggle space. */
function measure(element: HTMLElement, expanded: boolean) {
  const width = element.offsetWidth + (expanded ? 0 : TOGGLE_OVERHANG)
  const height = element.offsetHeight
  let vw = document.documentElement.clientWidth
  let vh = window.innerHeight
  const viewport = window.visualViewport
  // Browser zoom shrinks visualViewport before documentElement catches up.
  if (viewport) { vw = Math.min(vw, Math.round(viewport.width)); vh = Math.min(vh, Math.round(viewport.height)) }
  return { width, height, vw: Math.max(vw, 1), vh: Math.max(vh, 1) }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** Anchor -> top-left point. A ratio of 1 means "flush against the far edge". */
function pointFromAnchor(anchor: Anchor, width: number, height: number, vw: number, vh: number): Point {
  const freeX = Math.max(vw - width - EDGE * 2, 0)
  const freeY = Math.max(vh - height - EDGE * 2, 0)
  return { x: EDGE + freeX * anchor.x, y: EDGE + freeY * anchor.y }
}

export function useDraggableAssistant(expanded: boolean) {
  const mode = expanded ? 'panel' : 'card'
  const ref = useRef<HTMLDivElement>(null)
  const saved = useRef<Partial<Record<'panel' | 'card', Anchor>>>({})
  const current = useRef<Point | null>(null)
  const gesture = useRef<{ id: number; x: number; y: number; origin: Point; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [point, setPoint] = useState<Point | null>(null)
  const [dragging, setDragging] = useState(false)

  const applyPoint = (next: Point, anchor: Anchor) => {
    const element = ref.current
    if (!element) return
    const { width, height, vw, vh } = measure(element, expanded)
    const bounded = {
      x: clamp(next.x, EDGE, vw - width - EDGE),
      y: clamp(next.y, EDGE, vh - height - EDGE),
    }
    current.current = bounded
    // Re-derive the ratio from the *clamped* point so a resize keeps the element
    // on the same edge even when the viewport is smaller than the element.
    const freeX = Math.max(vw - width - EDGE * 2, 0)
    const freeY = Math.max(vh - height - EDGE * 2, 0)
    saved.current[mode] = {
      x: freeX > 0 ? clamp((bounded.x - EDGE) / freeX, 0, 1) : anchor.x,
      y: freeY > 0 ? clamp((bounded.y - EDGE) / freeY, 0, 1) : anchor.y,
    }
    setPoint(bounded)
  }

  const applyAnchor = (anchor: Anchor) => {
    const element = ref.current
    if (!element) return
    const { width, height, vw, vh } = measure(element, expanded)
    applyPoint(pointFromAnchor(anchor, width, height, vw, vh), anchor)
  }

  const persist = () => {
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({ version: STORAGE_VERSION, ...saved.current })) } catch { /* Dragging still works without storage. */ }
  }

  useLayoutEffect(() => {
    let restored: Partial<Record<'panel' | 'card', Anchor>> = {}
    try {
      const raw = JSON.parse(localStorage.getItem(POSITION_KEY) ?? '{}')
      for (const key of ['card', 'panel'] as const) {
        const anchor = toAnchor(raw?.[key])
        if (anchor) restored[key] = anchor
      }
    } catch { /* Fall back to the default corner. */ }
    saved.current = restored
    const element = ref.current
    if (!element) return
    const initial: Anchor = restored[mode] ?? DEFAULT_ANCHOR
    applyAnchor(initial)
    // Viewport changes include browser zoom (which also re-fires resize), so both
    // the position and the element size are re-derived instead of left stale.
    const onViewportChange = () => { applyAnchor(saved.current[mode] ?? DEFAULT_ANCHOR); persist() }
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('orientationchange', onViewportChange)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    const observer = new ResizeObserver(() => { applyAnchor(saved.current[mode] ?? DEFAULT_ANCHOR) })
    observer.observe(element)
    return () => {
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('orientationchange', onViewportChange)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      observer.disconnect()
    }
  }, [mode])

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary) return
    if (event.target instanceof Element && event.target.closest('a,input,textarea,select,button') && event.target.closest('button') !== event.currentTarget) return
    const element = ref.current
    if (!element) return
    const { width, height, vw, vh } = measure(element, expanded)
    const anchor = saved.current[mode] ?? DEFAULT_ANCHOR
    // Track from the clamped origin so a drag can never start from a stale point.
    const origin = current.current ?? pointFromAnchor(anchor, width, height, vw, vh)
    suppressClick.current = false
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 5) return
    drag.moved = true
    suppressClick.current = true
    setDragging(true)
    applyPoint({ x: drag.origin.x + dx, y: drag.origin.y + dy }, saved.current[mode] ?? DEFAULT_ANCHOR)
  }

  const finish = (event: PointerEvent<HTMLElement>) => {
    if (gesture.current?.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    persist()
  }

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation() }
    suppressClick.current = false
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !current.current) return
    const offsets: Record<string, Point> = { ArrowLeft: { x: -20, y: 0 }, ArrowRight: { x: 20, y: 0 }, ArrowUp: { x: 0, y: -20 }, ArrowDown: { x: 0, y: 20 } }
    const offset = offsets[event.key]
    if (offset) {
      event.preventDefault()
      applyPoint({ x: current.current.x + offset.x, y: current.current.y + offset.y }, saved.current[mode] ?? DEFAULT_ANCHOR)
      persist()
    }
  }

  const style: CSSProperties | undefined = point ? { left: point.x, top: point.y, right: 'auto', bottom: 'auto' } : undefined
  return { ref, style, dragging, handle: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish, onClickCapture, onKeyDown } }
}
