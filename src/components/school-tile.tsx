"use client"

import { EyeOff, Info, Undo2 } from "lucide-react"
import type { School } from "@/lib/types"
import { SchoolMark } from "@/components/school-mark"
import { useDrag } from "@/components/drag-context"
import { cn } from "@/lib/utils"

export function SchoolTile({
  school,
  readOnly = false,
  selectable = false,
  onInspect,
  onIgnore,
  onRestore,
}: {
  school: School
  readOnly?: boolean
  selectable?: boolean
  onInspect?: (school: School) => void
  onIgnore?: (school: School) => void
  onRestore?: (school: School) => void
}) {
  const drag = useDrag()
  const dragging = drag.activeId === school.id || drag.activeIds.includes(school.id)
  const selected = drag.isSelected(school.id)
  const targeted = drag.overSchoolId === school.id && !dragging
  return (
    <div
      data-school-id={school.id}
      data-pool-select={selectable ? "" : undefined}
      aria-selected={selectable ? selected : undefined}
      draggable={false}
      onPointerDown={readOnly ? undefined : (event) => drag.startPointerDrag(event, school.id)}
      className={cn(
        "group relative flex w-[5.4rem] shrink-0 touch-none flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 select-none",
        readOnly ? "" : "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
        targeted && "ring-2 ring-foreground",
        selected && "bg-accent ring-2 ring-foreground",
      )}
    >
      <SchoolMark
        primary={school.primary}
        secondary={school.secondary}
        abbr={school.abbr}
        className="size-[4.6rem]"
      />
      <span className="max-w-full truncate text-[0.65rem] text-muted-foreground">{school.name}</span>
      {onIgnore && (
        <button
          type="button"
          className="absolute top-0 left-0 rounded-full bg-background/90 p-0.5 text-foreground shadow-sm"
          aria-label={`Ignore ${school.name}`}
          title={`Ignore ${school.name}. Its rivalries leave the count.`}
          data-testid={`ignore-${school.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onIgnore(school)
          }}
        >
          <EyeOff className="size-3" />
        </button>
      )}
      {onRestore && (
        <button
          type="button"
          className="absolute top-0 left-0 rounded-full bg-background/90 p-0.5 text-foreground shadow-sm"
          aria-label={`Put ${school.name} back with unassigned`}
          title={`Put ${school.name} back with the unassigned schools.`}
          data-testid={`restore-${school.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onRestore(school)
          }}
        >
          <Undo2 className="size-3" />
        </button>
      )}
      {onInspect && (
        <button
          type="button"
          className="absolute top-0 right-0 rounded-full bg-background/90 p-0.5 text-foreground shadow-sm"
          aria-label={`Details for ${school.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onInspect(school)
          }}
        >
          <Info className="size-3" />
        </button>
      )}
    </div>
  )
}

export function SchoolTileFace({ school }: { school: School }) {
  return (
    <SchoolMark
      primary={school.primary}
      secondary={school.secondary}
      abbr={school.abbr}
      className="size-[4.6rem] drop-shadow-md"
    />
  )
}
