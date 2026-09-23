"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"

export type DropTarget = {
  conferenceId: string | null
  beforeId: string | null
}

type DragValue = {
  activeId: string | null
  activeIds: string[]
  selectedIds: string[]
  overSchoolId: string | null
  overConferenceId: string | null
  overPool: boolean
  startPointerDrag: (event: ReactPointerEvent<HTMLElement>, schoolId: string) => void
  toggleSelected: (schoolId: string, mode?: "replace" | "toggle" | "range") => void
  clearSelected: () => void
  pruneSelected: (allowedIds: Iterable<string>) => void
  isSelected: (schoolId: string) => boolean
}

const DragContext = createContext<DragValue | null>(null)

export function useDrag() {
  const value = useContext(DragContext)
  if (!value) throw new Error("Drag is not ready.")
  return value
}

export function resolveDrop(x: number, y: number, schoolId: string): DropTarget | null {
  const source = document.querySelector(`[data-school-id="${CSS.escape(schoolId)}"]`)
  if (source instanceof HTMLElement) {
    const rect = source.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return null
  }
  const elements = document.elementsFromPoint(x, y)
  let conferenceId: string | null = null
  let sawConference = false
  let sawPool = false
  for (const el of elements) {
    if (!(el instanceof Element)) continue
    if (source instanceof HTMLElement && (el === source || source.contains(el))) continue
    const schoolNode = el.closest("[data-school-id]")
    if (schoolNode instanceof HTMLElement) {
      const other = schoolNode.dataset.schoolId
      if (other && other !== schoolId) {
        const section = schoolNode.closest("[data-conference-id]")
        if (section instanceof HTMLElement && section.dataset.conferenceId) {
          return { conferenceId: section.dataset.conferenceId, beforeId: other }
        }
        if (schoolNode.closest("[data-drop-pool]")) return { conferenceId: null, beforeId: null }
      }
    }
    if (!sawConference) {
      const section = el.closest("[data-conference-id]")
      if (section instanceof HTMLElement && section.dataset.conferenceId) {
        sawConference = true
        conferenceId = section.dataset.conferenceId
      }
    }
    if (el.closest("[data-drop-pool]")) sawPool = true
  }
  if (sawConference) return { conferenceId, beforeId: null }
  if (sawPool) return { conferenceId: null, beforeId: null }
  return null
}

function poolSchoolIds() {
  return [...document.querySelectorAll<HTMLElement>("[data-pool-select][data-school-id]")]
    .map((node) => node.dataset.schoolId)
    .filter((id): id is string => Boolean(id))
}

export function DragProvider({
  children,
  onDrop,
  overlay,
}: {
  children: ReactNode
  onDrop: (schoolIds: string[], target: DropTarget) => void
  overlay: (schoolId: string, count: number) => ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedRef = useRef<string[]>([])
  const lastSelectedRef = useRef<string | null>(null)
  const [over, setOver] = useState<{ schoolId: string | null; conferenceId: string | null; pool: boolean }>({
    schoolId: null,
    conferenceId: null,
    pool: false,
  })
  const onDropRef = useRef(onDrop)
  const overlayRef = useRef<HTMLDivElement>(null)
  const pointRef = useRef({ x: 0, y: 0 })
  const scrollDir = useRef(0)
  const scrollFrame = useRef<number | null>(null)

  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  useEffect(() => {
    selectedRef.current = selectedIds
  }, [selectedIds])

  function toggleSelected(schoolId: string, mode: "replace" | "toggle" | "range" = "toggle") {
    setSelectedIds((current) => {
      if (mode === "replace") {
        lastSelectedRef.current = schoolId
        return [schoolId]
      }
      if (mode === "range") {
        const order = poolSchoolIds()
        const from = lastSelectedRef.current ?? schoolId
        const start = order.indexOf(from)
        const end = order.indexOf(schoolId)
        if (start < 0 || end < 0) {
          lastSelectedRef.current = schoolId
          return current.includes(schoolId) ? current : [...current, schoolId]
        }
        const [lo, hi] = start < end ? [start, end] : [end, start]
        lastSelectedRef.current = schoolId
        return order.slice(lo, hi + 1)
      }
      lastSelectedRef.current = schoolId
      return current.includes(schoolId) ? current.filter((id) => id !== schoolId) : [...current, schoolId]
    })
  }

  function clearSelected() {
    lastSelectedRef.current = null
    setSelectedIds([])
  }

  function pruneSelected(allowedIds: Iterable<string>) {
    const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds)
    setSelectedIds((current) => {
      const next = current.filter((id) => allowed.has(id))
      if (next.length === current.length) return current
      if (lastSelectedRef.current && !allowed.has(lastSelectedRef.current)) lastSelectedRef.current = null
      return next
    })
  }

  useLayoutEffect(() => {
    const node = overlayRef.current
    if (!node || !activeId) return
    node.style.left = `${pointRef.current.x}px`
    node.style.top = `${pointRef.current.y}px`
  }, [activeId])

  function placeOverlay(x: number, y: number) {
    pointRef.current = { x, y }
    const node = overlayRef.current
    if (!node) return
    node.style.left = `${x}px`
    node.style.top = `${y}px`
  }

  function rememberOver(x: number, y: number, schoolId: string) {
    const target = resolveDrop(x, y, schoolId)
    const next = {
      schoolId: target?.beforeId ?? null,
      conferenceId: target?.conferenceId ?? null,
      pool: Boolean(target && target.conferenceId === null),
    }
    setOver((current) =>
      current.schoolId === next.schoolId && current.conferenceId === next.conferenceId && current.pool === next.pool
        ? current
        : next,
    )
  }

  function stopScroll() {
    scrollDir.current = 0
    if (scrollFrame.current != null) cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = null
  }

  function startPointerDrag(event: ReactPointerEvent<HTMLElement>, schoolId: string) {
    if (event.button !== 0 || !event.isPrimary) return
    const target = event.target
    if (target instanceof Element && target.closest("button, a, input, textarea")) return
    event.preventDefault()
    const handle = event.currentTarget
    const pointerId = event.pointerId
    const originX = event.clientX
    const originY = event.clientY
    let moved = false
    let done = false
    handle.setPointerCapture(pointerId)

    const tick = () => {
      if (scrollDir.current !== 0) window.scrollBy(0, scrollDir.current)
      scrollFrame.current = requestAnimationFrame(tick)
    }
    stopScroll()
    scrollFrame.current = requestAnimationFrame(tick)

    const finish = (ev: PointerEvent) => {
      if (done || ev.pointerId !== pointerId) return
      done = true
      window.removeEventListener("pointermove", onMove, true)
      window.removeEventListener("pointerup", finish, true)
      window.removeEventListener("pointercancel", finish, true)
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
      stopScroll()
      if (moved) {
        const blockClick = (click: Event) => {
          click.preventDefault()
          click.stopPropagation()
          window.removeEventListener("click", blockClick, true)
        }
        window.addEventListener("click", blockClick, true)
        const drop = resolveDrop(ev.clientX, ev.clientY, schoolId)
        if (drop) {
          const group = selectedRef.current.includes(schoolId) && selectedRef.current.length > 1
            ? selectedRef.current
            : [schoolId]
          onDropRef.current(group, drop)
          if (group.some((id) => selectedRef.current.includes(id))) clearSelected()
        }
      } else {
        const selectable = handle.hasAttribute("data-pool-select")
        if (selectable) {
          const mode = ev.shiftKey ? "range" : ev.metaKey || ev.ctrlKey ? "toggle" : "toggle"
          toggleSelected(schoolId, mode)
        }
      }
      setActiveId(null)
      setActiveIds([])
      setOver({ schoolId: null, conferenceId: null, pool: false })
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const dx = ev.clientX - originX
      const dy = ev.clientY - originY
      if (!moved) {
        if (dx * dx + dy * dy < 16) return
        moved = true
        const group = selectedRef.current.includes(schoolId) && selectedRef.current.length > 1
          ? selectedRef.current
          : [schoolId]
        setActiveId(schoolId)
        setActiveIds(group)
      }
      if (ev.cancelable) ev.preventDefault()
      const edge = 64
      if (ev.clientY < edge) scrollDir.current = -18
      else if (ev.clientY > window.innerHeight - edge) scrollDir.current = 18
      else scrollDir.current = 0
      placeOverlay(ev.clientX, ev.clientY)
      rememberOver(ev.clientX, ev.clientY, schoolId)
    }

    window.addEventListener("pointermove", onMove, { capture: true, passive: false })
    window.addEventListener("pointerup", finish, true)
    window.addEventListener("pointercancel", finish, true)
  }

  const value: DragValue = {
    activeId,
    activeIds,
    selectedIds,
    overSchoolId: over.schoolId,
    overConferenceId: over.conferenceId,
    overPool: over.pool,
    startPointerDrag,
    toggleSelected,
    clearSelected,
    pruneSelected,
    isSelected: (schoolId) => selectedIds.includes(schoolId),
  }

  return (
    <DragContext.Provider value={value}>
      {children}
      {activeId && (
        <div
          ref={overlayRef}
          data-drag-overlay
          className="pointer-events-none fixed top-0 left-0 z-50 -translate-x-1/2 -translate-y-1/2"
        >
          {overlay(activeId, activeIds.length || 1)}
        </div>
      )}
    </DragContext.Provider>
  )
}
