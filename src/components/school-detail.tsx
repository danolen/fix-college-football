"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ScoredRivalry } from "@/lib/scoring"
import type { School } from "@/lib/types"

export function SchoolDetail({
  school,
  rows,
  onOpenChange,
}: {
  school: School | null
  rows: ScoredRivalry[]
  onOpenChange: (open: boolean) => void
}) {
  const related = school
    ? rows.filter((row) => row.schoolA.id === school.id || row.schoolB.id === school.id)
    : []
  return (
    <Dialog open={Boolean(school)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{school?.name}</DialogTitle>
          <DialogDescription>
            {school ? `${school.city}, ${school.region} · ${school.abbr}` : ""}
          </DialogDescription>
        </DialogHeader>
        {related.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No listed rivalry for this school counts yet. Both schools have to be on the board.
          </p>
        )}
        {related.length > 0 && (
          <ul className="flex flex-col gap-2">
            {related.map((row) => {
              const other = row.schoolA.id === school?.id ? row.schoolB : row.schoolA
              return (
                <li key={row.rivalry.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{row.rivalry.name}</span>
                    <span className="text-muted-foreground"> · {other.name}</span>
                  </span>
                  <span className={row.kept ? "text-green-800" : "text-rose-800"}>
                    {row.kept ? "Together" : "Split"}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
