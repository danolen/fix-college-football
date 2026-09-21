"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import { Download, Share2 } from "lucide-react"
import { MapView } from "@/components/map-view"
import { SchoolTileFace } from "@/components/school-tile"
import { useBoard } from "@/components/board-context"
import { Button } from "@/components/ui/button"
import { downloadSvgPng } from "@/lib/download"
import { shareText } from "@/lib/scoring"

export function SharePanel() {
  const board = useBoard()
  const gridRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<SVGSVGElement>(null)
  const [busy, setBusy] = useState<"grid" | "map" | null>(null)
  const text = shareText(board.scoreKept, board.scoreTotal)
  const placed = new Set(board.state.conferences.flatMap((conference) => conference.schoolIds))
  const assigned = board.onBoard.filter((school) => placed.has(school.id))
  const outside = board.state.conferences.filter((conference) => conference.tier === "none")
  const sections =
    board.state.mode === "tiers"
      ? [
          { title: "Power", conferences: board.state.conferences.filter((conference) => conference.tier === "power") },
          {
            title: `Group of ${board.state.conferences.filter((conference) => conference.tier === "group").length}`,
            conferences: board.state.conferences.filter((conference) => conference.tier === "group"),
          },
          ...(outside.length > 0 ? [{ title: "Not in a tier", conferences: outside }] : []),
        ]
      : [{ title: "Conferences", conferences: board.state.conferences }]

  async function saveGrid() {
    const node = gridRef.current
    if (!node) return
    setBusy("grid")
    try {
      const url = await toPng(node, { pixelRatio: 2, backgroundColor: "#f3ead7", cacheBust: true })
      const link = document.createElement("a")
      link.href = url
      link.download = "fix-college-football-grid.png"
      link.click()
      toast.success("Downloaded the grid.")
    } catch {
      toast.error("The grid image could not be saved.")
    } finally {
      setBusy(null)
    }
  }

  async function saveMap() {
    const svg = mapRef.current
    if (!svg) {
      toast.error("The map is not ready yet.")
      return
    }
    setBusy("map")
    try {
      await downloadSvgPng(svg, "fix-college-football-map.png")
      toast.success("Downloaded the map.")
    } catch {
      toast.error("The map image could not be saved.")
    } finally {
      setBusy(null)
    }
  }

  function post() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (!board.unlocked) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">Share is locked</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Every conference other than Independents needs at least two schools. Independents can be empty. Other empty conferences count against you — fill them or delete them. Schools left unassigned can stay in the pool, and they stay off the map.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Post</p>
        <p className="mt-2 font-serif text-lg leading-snug" data-testid="share-text">
          {text}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" data-testid="download-grid" disabled={busy !== null} onClick={saveGrid}>
            <Download />
            {busy === "grid" ? "Saving grid…" : "Download grid"}
          </Button>
          <Button type="button" variant="outline" data-testid="download-map" disabled={busy !== null} onClick={saveMap}>
            <Download />
            {busy === "map" ? "Saving map…" : "Download map"}
          </Button>
          <Button type="button" variant="secondary" data-testid="share-x" onClick={post}>
            <Share2 />
            Post to X
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Posting sends the text only. The pictures stay on this device — download them if you want to attach one.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div ref={gridRef} data-testid="share-grid" className="min-w-[720px] rounded-2xl border bg-[#f3ead7] p-5">
          <p className="font-display text-3xl font-semibold tracking-wide">Fix College Football</p>
          <p className="mt-1 font-serif text-base">{text}</p>
          <div className="mt-4 flex flex-col gap-4">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="font-display text-xl font-semibold">{section.title}</h3>
                <div className="mt-2 flex flex-col gap-3">
                  {section.conferences.map((conference) => (
                    <div key={conference.id}>
                      <p className="mb-1 text-sm font-medium" style={{ color: conference.color }}>
                        {conference.name}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {conference.schoolIds.map((id) => {
                          const school = board.schoolsById.get(id)
                          return school ? <SchoolTileFace key={id} school={school} /> : null
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <MapView
            schools={assigned}
            conferences={board.state.conferences}
            includeUnassigned={false}
            svgRef={mapRef}
            className="h-[36rem] w-full"
          />
        </div>
      </div>
    </div>
  )
}
