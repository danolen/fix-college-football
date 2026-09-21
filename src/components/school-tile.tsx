"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Info } from "lucide-react"
import { inkOn } from "@/lib/colors"
import type { School } from "@/lib/types"
import { HelmetMark } from "@/components/helmet-mark"
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
  const draggable = useDraggable({
    id: `school:${school.id}`,
    data: { schoolId: school.id },
    disabled: readOnly,
  })
  const droppable = useDroppable({
    id: `slot:${school.id}`,
    data: { schoolId: school.id },
    disabled: readOnly,
  })
  const ink = inkOn(school.primary)
  return (
    <div
      ref={(node) => {
        draggable.setNodeRef(node)
        droppable.setNodeRef(node)
      }}
      data-school-id={school.id}
      className={cn(
        "group relative flex w-[4.6rem] shrink-0 cursor-grab flex-col items-center gap-1 rounded-xl px-1 py-1.5 active:cursor-grabbing sm:w-[5.1rem]",
        draggable.isDragging && "opacity-40",
        droppable.isOver && "ring-2 ring-foreground",
      )}
      {...(readOnly ? {} : draggable.listeners)}
      {...(readOnly ? {} : draggable.attributes)}
    >
      <div
        className="flex w-full flex-col items-center rounded-lg border-2 px-1 pt-1 pb-1.5"
        style={{ background: school.primary, borderColor: school.secondary, color: ink }}
      >
        <HelmetMark primary={school.primary} secondary={school.secondary} className="h-11 w-12" />
        <span
          className={`font-display leading-none font-semibold tracking-wide ${school.abbr.length >= 5 ? "text-[0.68rem]" : "text-[0.95rem]"}`}
        >
          {school.abbr}
        </span>
      </div>
      <span className="max-w-full truncate text-[0.65rem] text-muted-foreground">{school.name}</span>
      {onInspect && (
        <button
          type="button"
          className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5 text-foreground shadow-sm"
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
  const ink = inkOn(school.primary)
  return (
    <div
      className="flex w-16 flex-col items-center rounded-lg border-2 px-1 pt-1 pb-1.5"
      style={{ background: school.primary, borderColor: school.secondary, color: ink }}
    >
      <HelmetMark primary={school.primary} secondary={school.secondary} className="h-11 w-12" />
      <span
      className={`font-display leading-none font-semibold tracking-wide ${school.abbr.length >= 5 ? "text-[0.68rem]" : "text-sm"}`}
    >
      {school.abbr}
    </span>
    </div>
  )
}
