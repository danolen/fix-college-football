"use client"

import { Info } from "lucide-react"
import type { School } from "@/lib/types"
import { HelmetMark } from "@/components/helmet-mark"
import { useDrag } from "@/components/drag-context"
import { cn } from "@/lib/utils"

export function SchoolTile({
  school,
  readOnly = false,
  onInspect,
}: {
  school: School
  readOnly?: boolean
  onInspect?: (school: School) => void
}) {
  const drag = useDrag()
  const dragging = drag.activeId === school.id
  const targeted = drag.overSchoolId === school.id && !dragging
  return (
    <div
      data-school-id={school.id}
      draggable={false}
      onPointerDown={readOnly ? undefined : (event) => drag.startPointerDrag(event, school.id)}
      className={cn(
        "group relative flex w-[5.4rem] shrink-0 touch-none flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 select-none",
        readOnly ? "" : "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
        targeted && "ring-2 ring-foreground",
      )}
    >
      <HelmetMark
        primary={school.primary}
        secondary={school.secondary}
        abbr={school.abbr}
        className="h-[5.2rem] w-full"
      />
      <span className="max-w-full truncate text-[0.65rem] text-muted-foreground">{school.name}</span>
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
    <HelmetMark
      primary={school.primary}
      secondary={school.secondary}
      abbr={school.abbr}
      className="h-[5.2rem] w-[5.2rem] drop-shadow-md"
    />
  )
}
