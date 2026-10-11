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
import { annualReasonNote, describeScheduleGame, scheduleGameCount, type ScheduleGame } from "@/lib/schedule"
import type { ScoredRivalry } from "@/lib/scoring"
import type { School } from "@/lib/types"
import { cn } from "@/lib/utils"

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
          <section data-testid="team-schedule" className="rounded-xl border border-foreground/15 bg-background p-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Schedule</p>
              {schedule && schedule.length > 0 && (
                <p className="text-xs text-muted-foreground">{scheduleGameCount(schedule)} games</p>
              )}
            </div>
            {schedule && schedule.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {schedule.map((game) => (
                  <ScheduleRow key={game.key} game={game} schoolsById={schoolsById} />
                ))}
              </ul>
            )}
            {schedule && schedule.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">This schedule has no games yet.</p>
            )}
            {!schedule && (
              <p className="mt-2 text-sm text-muted-foreground">Assign this school to a conference to give it a schedule.</p>
            )}
          </section>
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
          <section data-testid="team-rivalries" className="rounded-xl bg-muted p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rivalries</p>
            <ul className="mt-2 flex flex-col gap-2">
              {related.map((row) => {
                const other = row.schoolA.id === school?.id ? row.schoolB : row.schoolA
                return (
                  <li key={row.rivalry.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{row.rivalry.name}</span>
                      <span className="text-muted-foreground"> · {other.name}</span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", row.kept ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800")}>
                      {row.kept ? "Together" : "Split"}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
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

function ScheduleRow({ game, schoolsById }: { game: ScheduleGame; schoolsById: Map<string, School> }) {
  const label = describeScheduleGame(game, (id) => schoolsById.get(id)?.name ?? id)
  const why = game.annual ? annualReasonNote(game.reasons) : ""
  return (
    <li
      data-testid={game.opponentId ? `game-${game.opponentId}` : `game-rotating-${game.kind}`}
      className={cn("rounded-lg px-2.5 py-2 text-sm", game.annual ? "bg-green-100" : "bg-muted")}
    >
      <p className="font-medium">{label}</p>
      {game.opponentId && (
        <p className="text-muted-foreground">
          {game.kind === "conference" ? "Conference" : "Non-conference"}
          {game.rivalryName ? ` · ${game.rivalryName}` : ""}
          {game.annual ? " · Every year" : ""}
          {why ? ` · ${why}` : ""}
        </p>
      )}
    </li>
  )
}
