"use client"

import { useState } from "react"
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react"
import { useDrag } from "@/components/drag-context"
import { SchoolTile } from "@/components/school-tile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { conferenceDivisions, undividedSchoolIds } from "@/lib/board"
import { PALETTE } from "@/lib/colors"
import type { Conference, Division, School, Tier } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ConferenceRow({
  conference,
  schools,
  canDelete,
  showTierMove,
  onRename,
  onRecolor,
  onDelete,
  onMoveTier,
  onAddDivision,
  onRenameDivision,
  onDeleteDivision,
  onInspect,
}: {
  conference: Conference
  schools: School[]
  canDelete: boolean
  showTierMove: boolean
  onRename: (name: string) => void
  onRecolor: (color: string) => void
  onDelete: () => void
  onMoveTier: (tier: Tier) => void
  onAddDivision: () => void
  onRenameDivision: (divisionId: string, name: string) => void
  onDeleteDivision: (divisionId: string) => void
  onInspect: (school: School) => void
}) {
  const [name, setName] = useState(conference.name)
  const [sourceName, setSourceName] = useState(conference.name)
  if (conference.name !== sourceName) {
    setSourceName(conference.name)
    setName(conference.name)
  }
  const drag = useDrag()
  const divisions = conferenceDivisions(conference)
  const byId = new Map(schools.map((school) => [school.id, school]))
  const undivided = undividedSchoolIds(conference)
    .map((id) => byId.get(id))
    .filter((school): school is School => Boolean(school))
  const targeted =
    drag.overConferenceId === conference.id && (divisions.length === 0 || drag.overDivisionId == null)

  return (
    <section
      className={cn("rounded-2xl border bg-card p-3 shadow-sm", targeted && "ring-2 ring-foreground")}
      data-conference-id={conference.id}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            className="size-7 rounded-full border-2 border-background shadow-sm ring-1 ring-foreground/15"
            style={{ background: conference.color }}
            aria-label={`Color for ${conference.name}`}
          />
          <PopoverContent className="w-auto" align="start">
            <p className="mb-2 text-xs font-medium">Conference color</p>
            <div className="grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Set color ${color}`}
                  className="size-6 rounded-md ring-1 ring-foreground/10"
                  style={{ background: color }}
                  onClick={() => onRecolor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={name}
          aria-label={`Rename ${conference.name}`}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => onRename(name)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setName(conference.name)
              event.currentTarget.blur()
            }
          }}
          className="h-8 max-w-52 border-transparent bg-transparent font-display text-lg font-semibold tracking-wide shadow-none focus-visible:border-border"
        />
        <span className="text-xs text-muted-foreground">{schools.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={`add-division-${conference.id}`}
            onClick={onAddDivision}
          >
            <Plus />
            Add division
          </Button>
          {showTierMove && conference.tier !== "power" && (
            <Button type="button" variant="outline" size="sm" disabled={conference.tier === "group" && !canDelete} onClick={() => onMoveTier("power")}>
              <ArrowLeftRight />
              To Power
            </Button>
          )}
          {showTierMove && conference.tier !== "group" && (
            <Button type="button" variant="outline" size="sm" disabled={conference.tier === "power" && !canDelete} onClick={() => onMoveTier("group")}>
              To Group
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canDelete}
            aria-label={canDelete ? `Delete ${conference.name}` : `${conference.name} is the last conference in this tier`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {divisions.length === 0 ? (
        <DropZone conferenceId={conference.id} schools={schools} empty="Drop schools here." onInspect={onInspect} />
      ) : (
        <div className="flex flex-col gap-2">
          {divisions.map((division) => (
            <DivisionBlock
              key={division.id}
              conference={conference}
              division={division}
              schools={division.schoolIds
                .map((id) => byId.get(id))
                .filter((school): school is School => Boolean(school))}
              onRename={(next) => onRenameDivision(division.id, next)}
              onDelete={() => onDeleteDivision(division.id)}
              onInspect={onInspect}
            />
          ))}
          <div data-division-id="" data-testid={`undivided-${conference.id}`}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Undivided</p>
            <DropZone
              conferenceId={conference.id}
              divisionId=""
              schools={undivided}
              empty="Schools not in a division."
              onInspect={onInspect}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function DivisionBlock({
  conference,
  division,
  schools,
  onRename,
  onDelete,
  onInspect,
}: {
  conference: Conference
  division: Division
  schools: School[]
  onRename: (name: string) => void
  onDelete: () => void
  onInspect: (school: School) => void
}) {
  const [name, setName] = useState(division.name)
  const [sourceName, setSourceName] = useState(division.name)
  if (division.name !== sourceName) {
    setSourceName(division.name)
    setName(division.name)
  }
  const drag = useDrag()
  const targeted = drag.overConferenceId === conference.id && drag.overDivisionId === division.id

  return (
    <div
      data-division-id={division.id}
      data-testid={`division-${division.id}`}
      className={cn("rounded-xl border border-transparent p-0.5", targeted && "ring-2 ring-foreground")}
    >
      <div className="mb-1 flex items-center gap-2">
        <Input
          value={name}
          aria-label={`Rename ${division.name}`}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => onRename(name)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setName(division.name)
              event.currentTarget.blur()
            }
          }}
          className="h-7 max-w-48 border-transparent bg-transparent text-sm font-medium shadow-none focus-visible:border-border"
        />
        <span className="text-xs text-muted-foreground">{schools.length}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          aria-label={`Delete ${division.name}`}
          data-testid={`delete-division-${division.id}`}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>
      <DropZone
        conferenceId={conference.id}
        divisionId={division.id}
        schools={schools}
        empty={`Drop schools into ${division.name}.`}
        onInspect={onInspect}
      />
    </div>
  )
}

function DropZone({
  conferenceId,
  divisionId,
  schools,
  empty,
  onInspect,
}: {
  conferenceId: string
  divisionId?: string
  schools: School[]
  empty: string
  onInspect: (school: School) => void
}) {
  const drag = useDrag()
  const targeted =
    drag.overConferenceId === conferenceId &&
    (divisionId === undefined ? drag.overDivisionId == null : (drag.overDivisionId ?? "") === divisionId)
  return (
    <div
      data-division-id={divisionId}
      data-testid={
        divisionId === undefined
          ? `conference-drop-${conferenceId}`
          : divisionId === ""
            ? `undivided-drop-${conferenceId}`
            : `division-drop-${divisionId}`
      }
      className={cn(
        "flex min-h-24 flex-wrap gap-2 rounded-xl border border-dashed p-2",
        targeted ? "border-foreground bg-accent" : "border-border bg-background/40",
      )}
    >
      {schools.length === 0 && <p className="m-auto text-sm text-muted-foreground">{empty}</p>}
      {schools.map((school) => (
        <SchoolTile key={school.id} school={school} onInspect={onInspect} />
      ))}
    </div>
  )
}
