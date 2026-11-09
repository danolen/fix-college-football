"use client"

import { useState } from "react"
import { formatSp, spPosition, type RatedSchool } from "@/lib/strength"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const DOT_RADIUS = 4

function schoolsAt(track: HTMLDivElement | null, schools: RatedSchool[], clientX: number, fallback: RatedSchool) {
  const width = track?.getBoundingClientRect().width ?? 0
  if (!track || width <= 0) return [fallback]
  const x = clientX - track.getBoundingClientRect().left
  const near = schools
    .filter((school) => Math.abs((spPosition(school.rating) / 100) * width - x) <= DOT_RADIUS)
    .sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name))
  return near.length > 0 ? near : [fallback]
}

export function StrengthStrip({
  schools,
  color,
  guide,
}: {
  schools: RatedSchool[]
  color: string
  guide?: number | null
}) {
  const [track, setTrack] = useState<HTMLDivElement | null>(null)
  return (
    <div ref={setTrack} className="relative h-3" data-testid="strength-strip">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <span className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-foreground/30" style={{ left: `${spPosition(0)}%` }} />
      {guide != null && (
        <span className="absolute top-0 h-3 w-px bg-foreground" style={{ left: `${spPosition(guide)}%` }} data-testid="strength-guide" />
      )}
      {schools.map((school) => (
        <StrengthDot key={school.id} school={school} schools={schools} color={color} track={track} />
      ))}
    </div>
  )
}

function StrengthDot({
  school,
  schools,
  color,
  track,
}: {
  school: RatedSchool
  schools: RatedSchool[]
  color: string
  track: HTMLDivElement | null
}) {
  const [near, setNear] = useState<RatedSchool[]>([school])
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        tabIndex={-1}
        aria-label={`${school.name} ${formatSp(school.rating)} SP+`}
        data-testid={`strength-dot-${school.id}`}
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 cursor-default rounded-full border-0 p-0 ring-1 ring-background outline-none"
        style={{ left: `${spPosition(school.rating)}%`, background: color }}
        onPointerEnter={(event) => setNear(schoolsAt(track, schools, event.clientX, school))}
      />
      <TooltipContent data-testid={`strength-tip-${school.id}`} className="flex-col items-start gap-0.5">
        {near.map((item) => (
          <span key={item.id} className="flex items-baseline gap-2">
            <span className="font-medium">{item.name}</span>
            <span className="tabular-nums">{formatSp(item.rating)} SP+</span>
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
