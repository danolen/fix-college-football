"use client"

import { EyeOff, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ScheduleGame } from "@/lib/schedule"
import type { ScoredRivalry } from "@/lib/scoring"
import type { School } from "@/lib/types"

export function SchoolDetail({
  school,
  rows,
  ignored,
  showSchedule,
  schedule,
  schoolsById,
  onIgnore,
  onRestore,
  onOpenChange,
}: {
  school: School | null
  rows: ScoredRivalry[]
  ignored: boolean
  showSchedule: boolean
  schedule: ScheduleGame[] | null
  schoolsById: Map<string, School>
  onIgnore: () => void
  onRestore: () => void
  onOpenChange: (open: boolean) => void
}) {
  const related = school
    ? rows.filter((row) => row.schoolA.id === school.id || row.schoolB.id === school.id)
    : []
  return (
    <Dialog open={Boolean(school)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(42rem,calc(100%-2rem))] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{school?.name}</DialogTitle>
          <DialogDescription>
            {school ? `${school.city}, ${school.region} · ${school.abbr}` : ""}
          </DialogDescription>
        </DialogHeader>
        {showSchedule && (
          <div data-testid="team-schedule" className="flex flex-col gap-2">
            <p className="font-medium">Schedule</p>
            {schedule && schedule.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {schedule.map((game) => (
                  <li key={game.opponentId} className="text-sm" data-testid={`game-${game.opponentId}`}>
                    <span className="font-medium">{schoolsById.get(game.opponentId)?.name ?? game.opponentId}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {game.kind === "conference" ? "Conference" : "Non-conference"}
                    </span>
                    {game.rivalryName && <span className="text-muted-foreground"> · {game.rivalryName}</span>}
                    {game.annual && <span className="text-green-800"> · Every year</span>}
                  </li>
                ))}
              </ul>
            )}
            {schedule && schedule.length === 0 && (
              <p className="text-sm text-muted-foreground">This schedule has no games yet.</p>
            )}
            {!schedule && (
              <p className="text-sm text-muted-foreground">Assign this school to a conference to give it a schedule.</p>
            )}
          </div>
        )}
        {ignored && (
          <p className="text-sm text-muted-foreground">
            This school is ignored, so every rivalry that includes it is left out of the count.
          </p>
        )}
        {!ignored && related.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No listed rivalry for this school counts yet. Both schools have to be on the board.
          </p>
        )}
        {!ignored && related.length > 0 && (
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
        <div className="flex flex-col gap-2">
          {ignored ? (
            <Button type="button" variant="outline" onClick={onRestore}>
              <Undo2 />
              Put back with unassigned
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onIgnore}>
                <EyeOff />
                Ignore this school
              </Button>
              <p className="text-sm text-muted-foreground">
                Rivalries that include it drop out of the count. If it is in a conference, it leaves that conference. An unassigned school still counts as a miss.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
