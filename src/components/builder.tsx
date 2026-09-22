"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useDrag } from "@/components/drag-context"
import { ConferenceRow } from "@/components/conference-row"
import { FcsPicker } from "@/components/fcs-picker"
import { MapView } from "@/components/map-view"
import { SchoolTile } from "@/components/school-tile"
import { useBoard } from "@/components/board-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isIndependents } from "@/lib/board"
import type { Tier } from "@/lib/types"
import { cn } from "@/lib/utils"

export function Builder({ onInspect }: { onInspect: (id: string) => void }) {
  const board = useBoard()
  const [poolQuery, setPoolQuery] = useState("")
  const [fcsOpen, setFcsOpen] = useState(false)
  const placed = useMemo(() => {
    const ids = new Set(board.state.conferences.flatMap((conference) => conference.schoolIds))
    return ids
  }, [board.state.conferences])
  const unassigned = board.onBoard.filter((school) => !placed.has(school.id))
  const needle = poolQuery.trim().toLowerCase()
  const visiblePool = needle
    ? unassigned.filter((school) =>
        [school.name, school.abbr, school.city, school.region].join(" ").toLowerCase().includes(needle),
      )
    : unassigned
  const drag = useDrag()
  const groupCount = board.state.conferences.filter((conference) => conference.tier === "group").length
  const short = board.state.conferences.filter(
    (conference) => !isIndependents(conference) && conference.schoolIds.length < 2,
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {board.catalog.presets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={board.state.presetId === preset.id ? "default" : "outline"}
              data-testid={`preset-${preset.id}`}
              onClick={() => board.requestPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={board.state.presetId === "blank" ? "default" : "outline"}
            data-testid="preset-blank"
            onClick={board.requestBlank}
          >
            Blank
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="Conference structure">
            <Button
              type="button"
              size="sm"
              variant={board.state.mode === "flat" ? "default" : "ghost"}
              data-testid="mode-flat"
              onClick={() => board.setMode("flat")}
            >
              One set
            </Button>
            <Button
              type="button"
              size="sm"
              variant={board.state.mode === "tiers" ? "default" : "ghost"}
              data-testid="mode-tiers"
              onClick={() => board.setMode("tiers")}
            >
              Two tiers
            </Button>
          </div>
          <Button type="button" size="sm" variant="outline" data-testid="add-fcs" onClick={() => setFcsOpen(true)}>
            <Plus />
            FCS school
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Switching between one set and two tiers keeps every placement.
        {board.state.mode === "tiers"
          ? ` The lower tier is Group of ${groupCount}. Conferences with no tier, including Independents, are not part of that count.`
          : ""}
      </p>
      <p className="text-sm" data-testid="share-lock">
        {board.unlocked
          ? "Share is open. Every conference besides Independents has at least two schools."
          : `Share is locked. ${short.map((conference) => `${conference.name} (${conference.schoolIds.length})`).join(", ") || "Add a conference"} still need two schools.`}
      </p>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(17.5rem,0.72fr)]">
        <MapView
          schools={board.onBoard}
          conferences={board.state.conferences}
          className="h-[28rem] w-full sm:h-[32rem] lg:sticky lg:top-36 lg:h-[calc(100vh-17.5rem)] lg:min-h-[32rem]"
        />
        <div className="flex flex-col gap-4">
          {board.state.mode === "flat" ? (
            <TierBlock
              title="Conferences"
              tier="none"
              conferences={board.state.conferences}
              onInspect={onInspect}
            />
          ) : (
            <>
              <TierBlock
                title="Power"
                tier="power"
                empty="Move a conference here, or add one."
                conferences={board.state.conferences.filter((conference) => conference.tier === "power")}
                onInspect={onInspect}
              />
              <TierBlock
                title={`Group of ${groupCount}`}
                tier="group"
                empty="The non-power tier. Add a conference or move one here."
                conferences={board.state.conferences.filter((conference) => conference.tier === "group")}
                onInspect={onInspect}
              />
              <TierBlock
                title="Not in a tier"
                tier="none"
                empty="Conferences here stay out of Power and out of Group of X."
                conferences={board.state.conferences.filter((conference) => conference.tier === "none")}
                onInspect={onInspect}
              />
            </>
          )}
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-3">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-wide">Unassigned</h2>
            <p className="text-xs text-muted-foreground">
              {unassigned.length} of {board.onBoard.length} schools on the board. They can stay here.
            </p>
          </div>
          <Input
            value={poolQuery}
            onChange={(event) => setPoolQuery(event.target.value)}
            placeholder="Find an unassigned school"
            aria-label="Find an unassigned school"
            className="sm:max-w-64"
          />
        </div>
        <div
          data-testid="unassigned-pool"
          data-drop-pool=""
          className={cn(
            "flex min-h-28 flex-wrap gap-2 rounded-xl border border-dashed p-2",
            drag.overPool ? "border-foreground bg-accent" : "border-border",
          )}
        >
          {unassigned.length === 0 && (
            <p className="m-auto text-sm text-muted-foreground">Every school on the board has a conference.</p>
          )}
          {unassigned.length > 0 && visiblePool.length === 0 && (
            <p className="m-auto text-sm text-muted-foreground">No unassigned school matches that search.</p>
          )}
          {visiblePool.map((school) => (
            <SchoolTile key={school.id} school={school} onInspect={(item) => onInspect(item.id)} />
          ))}
        </div>
      </section>
      <FcsGate open={fcsOpen} onOpenChange={setFcsOpen} />
    </div>
  )
}

function TierBlock({
  title,
  tier,
  conferences,
  onInspect,
  empty = "This tier has no conferences yet.",
}: {
  title: string
  tier: Tier
  conferences: ReturnType<typeof useBoard>["state"]["conferences"]
  onInspect: (id: string) => void
  empty?: string
}) {
  const board = useBoard()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-wide">{title}</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => board.addConference(tier)}>
          <Plus />
          Add conference
        </Button>
      </div>
      {conferences.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{empty}</p>
      )}
      {conferences.map((conference) => (
        <ConferenceRow
          key={conference.id}
          conference={conference}
          schools={conference.schoolIds
            .map((id) => board.schoolsById.get(id))
            .filter((school): school is NonNullable<typeof school> => Boolean(school))}
          canDelete={board.canDelete(conference.id)}
          showTierMove={board.state.mode === "tiers"}
          onRename={(name) => board.renameConference(conference.id, name)}
          onRecolor={(color) => board.recolorConference(conference.id, color)}
          onDelete={() => board.requestDelete(conference)}
          onMoveTier={(next) => board.moveTier(conference.id, next)}
          onInspect={(school) => onInspect(school.id)}
        />
      ))}
    </div>
  )
}

function FcsGate({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const board = useBoard()
  return (
    <FcsPicker
      open={open}
      onOpenChange={onOpenChange}
      schools={board.fcs}
      addedIds={board.state.addedFcsIds}
      onAdd={board.addFcs}
      onRemove={board.removeFcs}
    />
  )
}
