"use client"

import { useState } from "react"
import { ArrowLeftRight, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { useDrag } from "@/components/drag-context"
import { SchoolTile } from "@/components/school-tile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { conferenceDivisions, isIndependents, undividedSchoolIds } from "@/lib/board"
import { formatSp, formatSpread, spTone, summarizeSp } from "@/lib/strength"
import { StrengthStrip } from "@/components/strength-strip"
import { conferenceTripMiles, formatTripMiles } from "@/lib/travel"
import { PALETTE } from "@/lib/colors"
import type { Conference, Division, School, Tier } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ConferenceRow({
  conference,
  schools,
  canDelete,
  showTierMove,
  collapsed,
  onToggleCollapsed,
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
  collapsed: boolean
  onToggleCollapsed: () => void
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
  const tripMiles = isIndependents(conference) ? null : conferenceTripMiles(schools)
  const strength = isIndependents(conference) ? null : summarizeSp(schools)
  const targeted =
    drag.overConferenceId === conference.id && (divisions.length === 0 || drag.overDivisionId == null)

  return (
    <section
      className={cn("rounded-2xl border bg-card p-3 shadow-sm", targeted && "ring-2 ring-foreground")}
      data-conference-id={conference.id}
      data-collapsed={collapsed ? "" : undefined}
    >
      <div className={cn("flex gap-2", collapsed ? "flex-nowrap items-center" : "mb-2 items-start")}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${conference.name}`}
          data-testid={`collapse-${conference.id}`}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronRight /> : <ChevronDown />}
        </Button>
        <Popover>
          <PopoverTrigger
            className="size-7 shrink-0 rounded-full border-2 border-background shadow-sm ring-1 ring-foreground/15"
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
        <div className="min-w-0 flex-1">
          <div className={cn("flex gap-2", collapsed ? "items-center" : "items-start")}>
            <div className="min-w-0 flex-1">
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
                className="h-8 min-w-0 overflow-hidden border-transparent bg-transparent font-display text-lg font-semibold tracking-wide shadow-none focus-visible:border-border"
              />
            </div>
            <div className={cn("z-10 flex shrink-0 items-center bg-card", collapsed ? "gap-3" : "")}>
              {collapsed && strength && (
                <span className={cn("border-l border-border pl-3 text-xs tabular-nums", spTone(strength.mean))} data-testid={`conference-sp-${conference.id}`}>
                  {formatSp(strength.mean)}
                </span>
              )}
              {collapsed && strength && (
                <span className="text-xs tabular-nums text-muted-foreground" data-testid={`conference-spread-${conference.id}`}>
                  ±{formatSpread(strength.spread)}
                </span>
              )}
              {collapsed && tripMiles != null && (
                <span className={cn("text-xs tabular-nums text-muted-foreground", strength ? "" : "border-l border-border pl-3")} data-testid={`conference-miles-${conference.id}`}>
                  {formatTripMiles(tripMiles)}
                </span>
              )}
              <span className={cn("w-7 text-right text-xs tabular-nums text-muted-foreground", collapsed ? "" : "pt-2")} data-testid={`conference-count-${conference.id}`}>
                {schools.length}
              </span>
              {collapsed && (
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
              )}
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-wrap items-center justify-between gap-2 pl-2.5">
              {tripMiles != null ? (
                <p className="text-xs whitespace-nowrap text-muted-foreground" data-testid={`conference-miles-${conference.id}`}>
                  {formatTripMiles(tripMiles)} avg
                </p>
              ) : (
                <span />
              )}
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
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
          )}
          {!collapsed && strength && (
            <div className="mt-1 pl-2.5" data-testid={`conference-strength-${conference.id}`}>
              <p className="text-xs whitespace-nowrap">
                <span className={cn("tabular-nums", spTone(strength.mean))}>{formatSp(strength.mean)} SP+</span>
                <span className="text-muted-foreground"> · ±{formatSpread(strength.spread)} from average</span>
              </p>
              <div className="mt-1.5 max-w-md">
                <StrengthStrip schools={strength.schools} color={conference.color} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className={spTone(strength.best.rating)}>{strength.best.name} {formatSp(strength.best.rating)}</span>
                <span> · </span>
                <span className={spTone(strength.worst.rating)}>{strength.worst.name} {formatSp(strength.worst.rating)}</span>
              </p>
            </div>
          )}
        </div>
      </div>
      {!collapsed && (divisions.length === 0 ? (
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
      ))}
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
