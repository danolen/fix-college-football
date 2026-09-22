"use client"

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Minus, Plus } from "lucide-react"
import type { NorthAmericaGeo } from "@/lib/map-layout"
import { layoutMap } from "@/lib/map-layout"
import type { Conference, School } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MIN_ZOOM = 1
const MAX_ZOOM = 8

type Frame = { width: number; height: number; main: number }
type Camera = { k: number; x: number; y: number }

function clampCamera(camera: Camera, frame: Frame): Camera {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.k))
  const maxX = ((k - 1) * frame.width) / 2 + 48
  const maxY = ((k - 1) * frame.main) / 2 + 48
  return {
    k,
    x: Math.min(maxX, Math.max(-maxX, camera.x)),
    y: Math.min(maxY, Math.max(-maxY, camera.y)),
  }
}

function zoomAt(camera: Camera, factor: number, px: number, py: number, frame: Frame): Camera {
  const cx = frame.width / 2
  const cy = frame.main / 2
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.k * factor))
  const ratio = k / camera.k
  return clampCamera(
    {
      k,
      x: (px - cx) * (1 - ratio) + camera.x * ratio,
      y: (py - cy) * (1 - ratio) + camera.y * ratio,
    },
    frame,
  )
}

export function MapView({
  schools,
  conferences,
  className,
}: {
  schools: School[]
  conferences: Conference[]
  className?: string
}) {
  const clipId = useId().replace(/:/g, "")
  const [geo, setGeo] = useState<NorthAmericaGeo | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [size, setSize] = useState({ width: 960, height: 640 })
  const [camera, setCamera] = useState<Camera>({ k: 1, x: 0, y: 0 })
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const svgNode = useRef<SVGSVGElement | null>(null)
  const frameRef = useRef<Frame>({ width: 960, height: 640, main: 512 })
  const cameraRef = useRef<Camera>({ k: 1, x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false
    fetch("/geo/north-america.json")
      .then((response) => {
        if (!response.ok) throw new Error("Map data failed to load.")
        return response.json() as Promise<NorthAmericaGeo>
      })
      .then((data) => {
        if (!cancelled) {
          setGeo(data)
          setStatus("ready")
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(() => {
      const width = Math.max(320, Math.round(node.clientWidth))
      const measured = Math.round(node.clientHeight)
      const height = Math.max(360, measured > 80 ? measured : Math.round(width * 0.72))
      setSize({ width, height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  const scene =
    geo && status === "ready"
      ? layoutMap({ geo, schools, conferences, width: size.width, height: size.height })
      : null

  useEffect(() => {
    if (!scene) return
    frameRef.current = { width: scene.width, height: scene.height, main: scene.mainHeight }
  }, [scene])

  useEffect(() => {
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      if (!svgNode.current) return
      event.preventDefault()
      const frame = frameRef.current
      const rect = svgNode.current.getBoundingClientRect()
      const px = ((event.clientX - rect.left) / rect.width) * frame.width
      const py = ((event.clientY - rect.top) / rect.height) * frame.height
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? frame.height : 1
      const delta = event.deltaY * line
      const intensity = event.ctrlKey ? 0.012 : 0.0016
      const factor = Math.exp(-delta * intensity)
      const next = zoomAt(cameraRef.current, factor, px, py, frame)
      cameraRef.current = next
      setCamera(next)
    }
    node.addEventListener("wheel", onWheel, { passive: false })
    return () => node.removeEventListener("wheel", onWheel)
  }, [node])

  function assignSvg(element: SVGSVGElement | null) {
    svgNode.current = element
  }

  function nudge(factor: number) {
    const frame = frameRef.current
    const next = zoomAt(cameraRef.current, factor, frame.width / 2, frame.main / 2, frame)
    cameraRef.current = next
    setCamera(next)
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest("[data-map-inset]")) return
    event.stopPropagation()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const origin = {
      x: event.clientX,
      y: event.clientY,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
      k: cameraRef.current.k,
    }
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== event.pointerId) return
      const frame = frameRef.current
      const rect = handle.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const dx = ((ev.clientX - origin.x) / rect.width) * frame.width
      const dy = ((ev.clientY - origin.y) / rect.height) * frame.height
      const next = clampCamera({ k: origin.k, x: origin.camX + dx, y: origin.camY + dy }, frame)
      cameraRef.current = next
      setCamera(next)
    }
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== event.pointerId) return
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", end)
      handle.removeEventListener("pointercancel", end)
      if (handle.hasPointerCapture(ev.pointerId)) handle.releasePointerCapture(ev.pointerId)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", end)
    handle.addEventListener("pointercancel", end)
  }

  return (
    <div ref={setNode} className={cn("relative", className)}>
      {status === "loading" && (
        <div className="flex h-full min-h-[22rem] items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
          Drawing the map…
        </div>
      )}
      {status === "error" && (
        <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 rounded-2xl border bg-card px-6 text-center">
          <p className="text-sm">The map could not be loaded.</p>
          <Button type="button" variant="outline" onClick={() => {
            setStatus("loading")
            setAttempt((value) => value + 1)
          }}>
            Try again
          </Button>
        </div>
      )}
      {scene && (
        <svg
          ref={assignSvg}
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          role="img"
          aria-label="Map of conferences across North America"
          className="block h-full w-full cursor-grab touch-none rounded-2xl border bg-[#d5e3ea] select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
        >
          <defs>
            <clipPath id={clipId}>
              <rect width={scene.width} height={scene.mainHeight} />
            </clipPath>
          </defs>
          <rect width={scene.width} height={scene.height} fill="#d5e3ea" />
          <MapBody scene={scene} camera={camera} clipId={clipId} />
        </svg>
      )}
      {scene && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <Button type="button" size="icon-sm" variant="outline" className="bg-background shadow-sm" aria-label="Zoom in" data-testid="map-zoom-in" onClick={() => nudge(1.25)}>
            <Plus />
          </Button>
          <Button type="button" size="icon-sm" variant="outline" className="bg-background shadow-sm" aria-label="Zoom out" data-testid="map-zoom-out" onClick={() => nudge(0.8)}>
            <Minus />
          </Button>
        </div>
      )}
    </div>
  )
}

function MapBody({
  scene,
  camera,
  clipId,
}: {
  scene: ReturnType<typeof layoutMap>
  camera: Camera
  clipId: string
}) {
  const cx = scene.width / 2
  const cy = scene.mainHeight / 2
  const transform = `translate(${cx + camera.x} ${cy + camera.y}) scale(${camera.k}) translate(${-cx} ${-cy})`
  return (
    <>
      <g clipPath={`url(#${clipId})`}>
        <g transform={transform}>
          {scene.land.map((d, index) => (
            <path key={`land-${index}`} d={d} fill="#e7efe4" stroke="#7f9788" strokeWidth={0.6} />
          ))}
          {scene.lakes.map((d, index) => (
            <path key={`lake-${index}`} d={d} fill="#d5e3ea" />
          ))}
          {scene.blobs.map((blob) => (
            <path
              key={blob.name + blob.d.slice(0, 24)}
              data-map-blob={blob.name}
              d={blob.d}
              fill={blob.color}
              fillOpacity={0.12}
              stroke={blob.color}
              strokeOpacity={0.28}
              strokeWidth={1.25}
            />
          ))}
          {scene.dots.map((dot) => (
            <g key={dot.id}>
              <circle
                data-map-dot={dot.id}
                data-assigned={dot.assigned ? "yes" : "no"}
                cx={dot.x}
                cy={dot.y}
                r={Math.max(5.5, scene.width / 130)}
                fill={dot.color}
                stroke="#fbf6ec"
                strokeWidth={1.6}
              />
              <title>{dot.name}</title>
            </g>
          ))}
          {scene.blobs.map((blob) =>
            blob.label ? (
              <text
                key={`label-${blob.name}-${blob.label[0]}`}
                x={blob.label[0]}
                y={blob.label[1]}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#1c1915"
                stroke="#fbf6ec"
                strokeWidth={3}
                paintOrder="stroke"
                fontFamily="Arial, Helvetica, sans-serif"
              >
                {blob.name}
              </text>
            ) : null,
          )}
        </g>
      </g>
      {scene.insets.map((inset) => (
        <g key={inset.label} data-map-inset={inset.label}>
          <rect x={inset.x} y={inset.y} width={inset.width} height={inset.height} rx={8} fill="#d5e3ea" stroke="#7f9788" />
          <text x={inset.x + 8} y={inset.y + 13} fontSize={10} fontWeight={700} fill="#1c1915" fontFamily="Arial, Helvetica, sans-serif">
            {inset.label}
          </text>
          {inset.land.map((d, index) => (
            <path key={`${inset.label}-land-${index}`} d={d} fill="#e7efe4" stroke="#7f9788" strokeWidth={0.5} />
          ))}
          {inset.blobs.map((blob) => (
            <path
              key={`${inset.label}-${blob.d.slice(0, 16)}`}
              data-map-blob={blob.name}
              d={blob.d}
              fill={blob.color}
              fillOpacity={0.12}
              stroke={blob.color}
              strokeOpacity={0.28}
            />
          ))}
          {inset.dots.map((dot) => (
            <circle
              key={dot.id}
              data-map-dot={dot.id}
              data-assigned={dot.assigned ? "yes" : "no"}
              cx={dot.x}
              cy={dot.y}
              r={5}
              fill={dot.color}
              stroke="#fbf6ec"
              strokeWidth={1.2}
            />
          ))}
        </g>
      ))}
    </>
  )
}
