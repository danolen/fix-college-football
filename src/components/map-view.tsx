"use client"

import { useEffect, useState, type Ref } from "react"
import type { NorthAmericaGeo } from "@/lib/map-layout"
import { layoutMap } from "@/lib/map-layout"
import type { Conference, School } from "@/lib/types"
import { Button } from "@/components/ui/button"

export function MapView({
  schools,
  conferences,
  includeUnassigned,
  className,
  svgRef,
}: {
  schools: School[]
  conferences: Conference[]
  includeUnassigned: boolean
  className?: string
  svgRef?: Ref<SVGSVGElement>
}) {
  const [geo, setGeo] = useState<NorthAmericaGeo | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [size, setSize] = useState({ width: 960, height: 640 })

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

  const [node, setNode] = useState<HTMLDivElement | null>(null)
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
      ? layoutMap({ geo, schools, conferences, width: size.width, height: size.height, includeUnassigned })
      : null

  return (
    <div ref={setNode} className={className}>
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
          ref={svgRef}
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          role="img"
          aria-label="Map of conferences across North America"
          className="block h-full w-full rounded-2xl border bg-[#d5e3ea]"
        >
          <rect width={scene.width} height={scene.height} fill="#d5e3ea" />
          {scene.land.map((d, index) => (
            <path key={`land-${index}`} d={d} fill="#e7efe4" stroke="#7f9788" strokeWidth={0.6} />
          ))}
          {scene.lakes.map((d, index) => (
            <path key={`lake-${index}`} d={d} fill="#d5e3ea" />
          ))}
          {scene.blobs.map((blob) => (
            <path key={blob.name + blob.d.slice(0, 24)} d={blob.d} fill={blob.color} fillOpacity={0.38} stroke={blob.color} strokeWidth={1.5} />
          ))}
          {scene.dots.map((dot) => (
            <g key={dot.id}>
              <circle cx={dot.x} cy={dot.y} r={Math.max(5.5, scene.width / 130)} fill={dot.color} stroke="#fbf6ec" strokeWidth={1.6} />
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
          {scene.insets.map((inset) => (
            <g key={inset.label}>
              <rect x={inset.x} y={inset.y} width={inset.width} height={inset.height} rx={8} fill="#d5e3ea" stroke="#7f9788" />
              <text x={inset.x + 8} y={inset.y + 13} fontSize={10} fontWeight={700} fill="#1c1915" fontFamily="Arial, Helvetica, sans-serif">
                {inset.label}
              </text>
              {inset.land.map((d, index) => (
                <path key={`${inset.label}-land-${index}`} d={d} fill="#e7efe4" stroke="#7f9788" strokeWidth={0.5} />
              ))}
              {inset.blobs.map((blob) => (
                <path key={`${inset.label}-${blob.d.slice(0, 16)}`} d={blob.d} fill={blob.color} fillOpacity={0.38} stroke={blob.color} />
              ))}
              {inset.dots.map((dot) => (
                <circle key={dot.id} cx={dot.x} cy={dot.y} r={4.5} fill={dot.color} stroke="#fbf6ec" strokeWidth={1.2} />
              ))}
            </g>
          ))}
        </svg>
      )}
      </div>
  )
}
