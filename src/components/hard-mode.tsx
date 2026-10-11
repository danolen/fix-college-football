"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useBoard } from "@/components/board-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isIndependents } from "@/lib/board"
import { defaultByes, playoffPlans, resolveConferenceRules, titlePlans } from "@/lib/hard-mode"
import type { BuiltSchedule } from "@/lib/schedule"
import type { Conference, ConferenceScheduleStyle } from "@/lib/types"

export function HardMode({
  onInspect,
  schedule,
}: {
  onInspect: (id: string) => void
  schedule: BuiltSchedule | null
}) {
  const board = useBoard()
  const settings = board.state.hardMode
  const titles = useMemo(() => titlePlans(board.state), [board.state])
  const playoffs = useMemo(() => playoffPlans(board.state), [board.state])

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Hard mode</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Easy mode is the conference board. Hard mode sets the championship games, the playoff, and who plays whom.
            </p>
          </div>
          <Button
            type="button"
            variant={settings.enabled ? "outline" : "default"}
            data-testid="hard-mode-toggle"
            onClick={() => board.setHardMode({ enabled: !settings.enabled })}
          >
            {settings.enabled ? "Turn off hard mode" : "Turn on hard mode"}
          </Button>
        </div>
        {settings.enabled && schedule && (
          <p className="mt-4 font-display text-3xl font-semibold tracking-wide" data-testid="annual-count">
            {schedule.annualGames} rivalry games every year
          </p>
        )}
      </section>

      {settings.enabled && (
        <>
          <Section title="Default championship">
            <p className="text-sm text-muted-foreground">
              Every conference starts with this title game. Change a conference on its own when its size or divisions need a different championship.
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Default championship format">
              <Choice
                pressed={settings.titleGame === "division-winners"}
                testId="title-division-winners"
                onClick={() => board.setHardMode({ titleGame: "division-winners" })}
              >
                Division winners
              </Choice>
              <Choice
                pressed={settings.titleGame === "top-two"}
                testId="title-top-two"
                onClick={() => board.setHardMode({ titleGame: "top-two" })}
              >
                Top two records
              </Choice>
              <Choice
                pressed={settings.titleGame === "four-team"}
                testId="title-four-team"
                onClick={() => board.setHardMode({ titleGame: "four-team" })}
              >
                Four-team playoff
              </Choice>
            </div>
          </Section>

          <Section title="National champion">
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label="Playoff teams"
                value={settings.playoffTeams}
                min={2}
                max={16}
                testId="playoff-teams"
                onChange={(playoffTeams) => board.setHardMode({ playoffTeams, playoffByes: defaultByes(playoffTeams) })}
              />
              <NumberField
                label="First-round byes"
                value={settings.playoffByes}
                min={0}
                max={Math.max(0, settings.playoffTeams - 2)}
                testId="playoff-byes"
                onChange={(playoffByes) => board.setHardMode({ playoffByes })}
              />
              {board.state.mode === "flat" && (
                <NumberField
                  label="Automatic bids for conference champions"
                  value={settings.autoBidChampions}
                  min={0}
                  max={24}
                  testId="auto-bids"
                  onChange={(autoBidChampions) => board.setHardMode({ autoBidChampions })}
                />
              )}
            </div>
            {board.state.mode === "tiers" ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  data-testid="separate-playoffs"
                  checked={settings.separatePlayoffs}
                  onChange={(event) => board.setHardMode({ separatePlayoffs: event.target.checked })}
                />
                <span>Run a separate playoff for each tier. One playoff gives every Power champion a bid and the top Group champion a bid.</span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                Split the board into two tiers on the Easy screen to give Power and Group their own playoffs.
              </p>
            )}
            <div className="flex flex-col gap-3" data-testid="playoff-plans">
              {playoffs.map((plan) => (
                <div key={plan.name}>
                  <p className="font-medium">{plan.name}</p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
                    {plan.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Regular season">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Games per team"
                value={settings.totalGames}
                min={1}
                max={20}
                testId="total-games"
                onChange={(totalGames) => board.setHardMode({ totalGames })}
              />
              <NumberField
                label="Default conference games"
                value={settings.conferenceGames}
                min={0}
                max={20}
                testId="conference-games"
                onChange={(conferenceGames) => board.setHardMode({ conferenceGames })}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Default conference schedule">
              <Choice
                pressed={settings.conferenceSchedule === "set-count"}
                testId="schedule-set-count"
                onClick={() => board.setHardMode({ conferenceSchedule: "set-count" })}
              >
                Set number of conference games
              </Choice>
              <Choice
                pressed={settings.conferenceSchedule === "all-division"}
                testId="schedule-all-division"
                onClick={() => board.setHardMode({ conferenceSchedule: "all-division" })}
              >
                Play the whole division
              </Choice>
              <Choice
                pressed={settings.conferenceSchedule === "all-conference"}
                testId="schedule-all-conference"
                onClick={() => board.setHardMode({ conferenceSchedule: "all-conference" })}
              >
                Play the whole conference
              </Choice>
            </div>
            <p className="text-sm text-muted-foreground">
              {scheduleCopy(settings.conferenceSchedule)} Each conference can keep a different schedule below.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                data-testid="same-tier"
                checked={settings.sameTierNonConference}
                disabled={board.state.mode !== "tiers"}
                onChange={(event) => board.setHardMode({ sameTierNonConference: event.target.checked })}
              />
              <span>
                Non-conference games stay inside the same tier. Independents can still play anyone.
                {board.state.mode !== "tiers" ? " This applies once the board uses two tiers." : ""}
              </span>
            </label>
            {schedule && schedule.warnings.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-amber-900" data-testid="schedule-warnings">
                {schedule.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </Section>

          <ConferenceRules titles={titles} />

          <PermanentRivals />

          {schedule && (
            <Section title="Schedules">
              <p className="text-sm text-muted-foreground">
                Open a team to see its slate. Games marked every year are the ones in the rivalry counter. The other dates fill out the season and can rotate.
              </p>
              <div className="flex flex-col gap-4">
                {board.state.conferences.map((conference) => {
                  const schools = conference.schoolIds
                    .map((id) => board.schoolsById.get(id))
                    .filter((school) => school !== undefined)
                  if (schools.length === 0) return null
                  return (
                    <div key={conference.id}>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{conference.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {schools.map((school) => (
                          <Button
                            key={school.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            data-testid={`schedule-${school.id}`}
                            onClick={() => onInspect(school.id)}
                          >
                            {school.abbr}
                            <span className="text-muted-foreground">
                              {schedule.bySchool.get(school.id)?.games.length ?? 0}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function ConferenceRules({ titles }: { titles: ReturnType<typeof titlePlans> }) {
  const board = useBoard()
  const summaries = new Map(titles.map((plan) => [plan.conferenceId, plan.summary]))
  const conferences = board.state.conferences.filter((conference) =>
    isIndependents(conference) ? conference.schoolIds.length > 0 : conference.schoolIds.length >= 2,
  )
  return (
    <Section title="Each conference">
      <p className="text-sm text-muted-foreground">
        A bigger conference can play more league games, or crown its champion a different way, without changing the rest of the board.
      </p>
      <div className="flex flex-col gap-3" data-testid="title-plans">
        {conferences.map((conference) => (
          <ConferenceRuleCard
            key={conference.id}
            conference={conference}
            summary={summaries.get(conference.id) ?? "Independents play an all non-conference schedule."}
          />
        ))}
      </div>
    </Section>
  )
}

function ConferenceRuleCard({ conference, summary }: { conference: Conference; summary: string }) {
  const board = useBoard()
  const rules = resolveConferenceRules(board.state.hardMode, conference.id)
  const independent = isIndependents(conference)
  const divisions = (conference.divisions ?? []).filter((division) => division.schoolIds.length > 0).length
  const size = `${conference.schoolIds.length} teams${divisions > 0 ? ` · ${divisions} divisions` : ""}`
  return (
    <div className="rounded-xl border p-3" data-conference-rules={conference.id} data-testid={`rules-${conference.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {conference.name}
          <span className="font-normal text-muted-foreground"> · {size}</span>
        </p>
        {rules.custom && (
          <Button type="button" size="sm" variant="ghost" data-testid={`rules-reset-${conference.id}`} onClick={() => board.clearConferenceRules(conference.id)}>
            Use the default
          </Button>
        )}
      </div>
      {independent ? (
        <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Championship</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Choice
                pressed={rules.titleGame === "division-winners"}
                testId={`rules-title-${conference.id}-division-winners`}
                onClick={() => board.setConferenceRules(conference.id, { titleGame: "division-winners" })}
              >
                Division winners
              </Choice>
              <Choice
                pressed={rules.titleGame === "top-two"}
                testId={`rules-title-${conference.id}-top-two`}
                onClick={() => board.setConferenceRules(conference.id, { titleGame: "top-two" })}
              >
                Top two records
              </Choice>
              <Choice
                pressed={rules.titleGame === "four-team"}
                testId={`rules-title-${conference.id}-four-team`}
                onClick={() => board.setConferenceRules(conference.id, { titleGame: "four-team" })}
              >
                Four-team playoff
              </Choice>
            </div>
            <p className="mt-1.5 text-sm">{summary}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Schedule</p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-end">
              <NumberField
                label="Conference games"
                value={rules.conferenceGames}
                min={0}
                max={20}
                testId={`rules-games-${conference.id}`}
                onChange={(conferenceGames) => board.setConferenceRules(conference.id, { conferenceGames })}
              />
              <div className="flex flex-wrap gap-2">
                <Choice
                  pressed={rules.conferenceSchedule === "set-count"}
                  testId={`rules-schedule-${conference.id}-set-count`}
                  onClick={() => board.setConferenceRules(conference.id, { conferenceSchedule: "set-count" })}
                >
                  Set number
                </Choice>
                <Choice
                  pressed={rules.conferenceSchedule === "all-division"}
                  testId={`rules-schedule-${conference.id}-all-division`}
                  onClick={() => board.setConferenceRules(conference.id, { conferenceSchedule: "all-division" })}
                >
                  Whole division
                </Choice>
                <Choice
                  pressed={rules.conferenceSchedule === "all-conference"}
                  testId={`rules-schedule-${conference.id}-all-conference`}
                  onClick={() => board.setConferenceRules(conference.id, { conferenceSchedule: "all-conference" })}
                >
                  Whole conference
                </Choice>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{scheduleDetail(rules.conferenceSchedule, rules.conferenceGames, conference.schoolIds.length)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function PermanentRivals() {
  const board = useBoard()
  const [query, setQuery] = useState("")
  const selected = new Set(board.state.hardMode.annualRivalryIds)
  const rows = useMemo(() => {
    const placed = new Map<string, { conferenceId: string; independent: boolean; name: string }>()
    for (const conference of board.state.conferences) {
      const independent = isIndependents(conference)
      for (const id of conference.schoolIds) {
        const school = board.schoolsById.get(id)
        if (school) placed.set(id, { conferenceId: conference.id, independent, name: school.name })
      }
    }
    return board.catalog.rivalries
      .filter((rivalry) => placed.has(rivalry.schools[0]) && placed.has(rivalry.schools[1]))
      .map((rivalry) => {
        const left = placed.get(rivalry.schools[0])!
        const right = placed.get(rivalry.schools[1])!
        const conferenceGame = left.conferenceId === right.conferenceId && !left.independent
        return {
          id: rivalry.id,
          name: rivalry.name,
          matchup: `${left.name} vs ${right.name}`,
          conferenceGame,
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [board.catalog.rivalries, board.schoolsById, board.state.conferences])
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? rows.filter((row) => `${row.name} ${row.matchup}`.toLowerCase().includes(needle))
    : rows

  function toggle(id: string) {
    const next = selected.has(id)
      ? board.state.hardMode.annualRivalryIds.filter((rivalryId) => rivalryId !== id)
      : [...board.state.hardMode.annualRivalryIds, id]
    board.setHardMode({ annualRivalryIds: next })
  }

  return (
    <Section title="Permanent rivals">
      <p className="text-sm text-muted-foreground">
        Checked games are played every year and count in the rivalry total. A pair in the same conference is a conference game. A pair in different conferences is a non-conference game.
      </p>
      <Input
        value={query}
        placeholder="Search rivalries"
        data-testid="rivalry-search"
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="text-xs text-muted-foreground" data-testid="permanent-count">
        {board.state.hardMode.annualRivalryIds.length} permanent {board.state.hardMode.annualRivalryIds.length === 1 ? "rivalry" : "rivalries"}
      </p>
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {visible.map((row) => (
          <li key={row.id}>
            <label className="flex items-start gap-2 rounded-lg px-1 py-1 text-sm hover:bg-muted">
              <input
                type="checkbox"
                className="mt-0.5"
                data-testid={`rivalry-toggle-${row.id}`}
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
              />
              <span>
                <span className="font-medium">{row.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {row.matchup} · {row.conferenceGame ? "Conference" : "Non-conference"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Choice({
  pressed,
  testId,
  onClick,
  children,
}: {
  pressed: boolean
  testId: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button type="button" size="sm" variant={pressed ? "default" : "outline"} data-testid={testId} aria-pressed={pressed} onClick={onClick}>
      {children}
    </Button>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  testId,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  testId: string
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        data-testid={testId}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(next)
        }}
      />
    </label>
  )
}

function scheduleDetail(style: ConferenceScheduleStyle, games: number, teams: number): string {
  if (style === "all-conference") return `Every team plays the other ${Math.max(0, teams - 1)} conference opponents.`
  if (style === "all-division") return `Every team plays its division, then fills out to ${games} conference games.`
  return `Each team plays ${games} conference games. The remaining conference dates rotate.`
}

function scheduleCopy(style: ConferenceScheduleStyle): string {
  if (style === "all-division") {
    return "Each team plays everyone in its division. Extra conference games fill up to the conference-game number. A conference with no divisions uses that number alone."
  }
  if (style === "all-conference") {
    return "Each team plays every conference opponent. Independents play an all non-conference schedule."
  }
  return "Each team plays that many conference games. Permanent rivals stay on the schedule every year, and the remaining conference dates rotate."
}
