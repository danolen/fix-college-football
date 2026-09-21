"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { ArrowLeftRight, Trash2 } from "lucide-react"
import { SchoolTile } from "@/components/school-tile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PALETTE } from "@/lib/colors"
import type { Conference, School, Tier } from "@/lib/types"
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
  onInspect: (school: School) => void
}) {
  const [name, setName] = useState(conference.name)
  const [sourceName, setSourceName] = useState(conference.name)
  if (conference.name !== sourceName) {
    setSourceName(conference.name)
    setName(conference.name)
  }
  const droppable = useDroppable({ id: `conference:${conference.id}` })

  return (
    <section className="rounded-2xl border bg-card p-3 shadow-sm" data-conference-id={conference.id}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            className="size-7 rounded-full border-2 border-background shadow-sm ring-1 ring-foreground/15"
            style={{ background: conference.color }}
            aria-label={`Color for ${conference.name}`}
          />
          <PopoverContent className="w-auto" align="start">
            <p className="mb-2 text-xs font-medium">Conference color</p>
            <div className="grid grid-cols-6 gap-1.5">
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
      <div
        ref={(node) => {
          droppable.setNodeRef(node)
        }}
        className={cn(
          "flex min-h-24 flex-wrap gap-2 rounded-xl border border-dashed p-2",
          droppable.isOver ? "border-foreground bg-accent" : "border-border bg-background/40",
        )}
      >
        {schools.length === 0 && (
          <p className="m-auto text-sm text-muted-foreground">Drop schools here.</p>
        )}
        {schools.map((school) => (
          <SchoolTile key={school.id} school={school} onInspect={onInspect} />
        ))}
      </div>
    </section>
  )
}
