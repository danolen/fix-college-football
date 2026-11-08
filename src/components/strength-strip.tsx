import { spPosition, type RatedSchool } from "@/lib/strength"

export function StrengthStrip({
  schools,
  color,
  guide,
}: {
  schools: RatedSchool[]
  color: string
  guide?: number | null
}) {
  return (
    <div className="relative h-3" data-testid="strength-strip">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <span className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-foreground/30" style={{ left: `${spPosition(0)}%` }} />
      {guide != null && (
        <span className="absolute top-0 h-3 w-px bg-foreground" style={{ left: `${spPosition(guide)}%` }} data-testid="strength-guide" />
      )}
      {schools.map((school) => (
        <span
          key={school.id}
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-background"
          style={{ left: `${spPosition(school.rating)}%`, background: color }}
          data-testid={`strength-dot-${school.id}`}
        />
      ))}
    </div>
  )
}
