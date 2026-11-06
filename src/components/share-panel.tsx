"use client"

import { useEffect, useRef, useState } from "react"
import { toBlob } from "html-to-image"
import { toast } from "sonner"
import { Download, Share2 } from "lucide-react"
import { MapView } from "@/components/map-view"
import { SchoolTileFace } from "@/components/school-tile"
import { useBoard } from "@/components/board-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { conferenceDivisions, undividedSchoolIds } from "@/lib/board"
import { canvasPixelRatio, needsShareSheet, savePngBlob, sharePngFile, svgElementToPngBlob, withTimeout } from "@/lib/download"
import { shareText } from "@/lib/scoring"

type PicturePreview = {
  url: string
  filename: string
  blob: Blob
  label: string
}

export function SharePanel() {
  const board = useBoard()
  const gridRef = useRef<HTMLDivElement>(null)
  const mapFrame = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<"grid" | "map" | null>(null)
  const [preview, setPreview] = useState<PicturePreview | null>(null)
  const previewRef = useRef<PicturePreview | null>(null)
  const text = shareText(board.scoreKept, board.scoreTotal)
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

  useEffect(() => {
    previewRef.current = preview
  }, [preview])

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url)
    }
  }, [])

  function closePreview() {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }

  function showPreview(next: PicturePreview) {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return next
    })
  }

  async function keepPicture(blob: Blob, filename: string, label: string) {
    const result = await savePngBlob(blob, filename)
    if (result === "cancelled") return
    if (result === "preview") {
      showPreview({ url: URL.createObjectURL(blob), filename, blob, label })
      return
    }
    toast.success(result === "shared" ? `Saved the ${label}.` : `Downloaded the ${label}.`)
  }

  async function saveFromPreview() {
    if (!preview) return
    const result = await sharePngFile(preview.blob, preview.filename)
    if (result === "cancelled") return
    if (result === "shared") {
      toast.success(`Saved the ${preview.label}.`)
      closePreview()
      return
    }
    toast.message(`Press and hold the picture, then tap Add to Photos.`)
  }

  async function saveGrid() {
    const node = gridRef.current
    if (!node) return
    setBusy("grid")
    try {
      const ios = needsShareSheet({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
      })
      const blob = await withTimeout(
        toBlob(node, {
          pixelRatio: canvasPixelRatio(node.scrollWidth, node.scrollHeight),
          backgroundColor: "#f3ead7",
          cacheBust: !ios,
          skipFonts: ios,
        }),
        20000,
      )
      if (!blob) throw new Error("The grid image could not be saved.")
      await keepPicture(blob, "fix-college-football-grid.png", "grid")
    } catch {
      toast.error("The grid image could not be saved.")
    } finally {
      setBusy(null)
    }
  }

  async function saveMap() {
    const svg = mapFrame.current?.querySelector("svg") ?? null
    if (!svg) {
      toast.error("The map is not ready yet.")
      return
    }
    setBusy("map")
    try {
      const blob = await svgElementToPngBlob(svg)
      await keepPicture(blob, "fix-college-football-map.png", "map")
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
          Every conference other than Independents needs at least two schools. Independents can be empty. Other empty conferences count against you — fill them or delete them. Schools left unassigned can stay in the pool, and their rivalries still count as misses. Ignored schools are left out of the count. On the map, unassigned schools stay as gray dots.
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
          Posting sends the text only. The pictures stay on this device — download them if you want to attach one. On iPhone, Download opens the share sheet so you can tap Save Image.
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
                      {conferenceDivisions(conference).length === 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {conference.schoolIds.map((id) => {
                            const school = board.schoolsById.get(id)
                            return school ? <SchoolTileFace key={id} school={school} /> : null
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {conferenceDivisions(conference).map((division) => (
                            <div key={division.id}>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">{division.name}</p>
                              <div className="flex flex-wrap gap-2">
                                {division.schoolIds.map((id) => {
                                  const school = board.schoolsById.get(id)
                                  return school ? <SchoolTileFace key={id} school={school} /> : null
                                })}
                              </div>
                            </div>
                          ))}
                          {undividedSchoolIds(conference).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {undividedSchoolIds(conference).map((id) => {
                                const school = board.schoolsById.get(id)
                                return school ? <SchoolTileFace key={id} school={school} /> : null
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div ref={mapFrame} className="min-w-[720px]">
          <MapView
            schools={board.onBoard.filter((school) => !board.state.ignoredIds.includes(school.id))}
            conferences={board.state.conferences}
            mode={board.state.mode}
            className="h-[36rem] w-full"
          />
        </div>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Save the {preview?.label}</DialogTitle>
            <DialogDescription>
              Press and hold the picture, then tap Add to Photos. Save opens the share sheet when this iPhone allows it.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- a blob preview the user long-presses to save on iPhone
            <img
              src={preview.url}
              alt={`Fix College Football ${preview.label}`}
              className="max-h-[70vh] w-full rounded-lg object-contain"
              style={{ WebkitTouchCallout: "default" }}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePreview}>
              Close
            </Button>
            <Button type="button" onClick={saveFromPreview}>
              <Download />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
