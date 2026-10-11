"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useBoard } from "@/components/board-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isIndependents } from "@/lib/board"
import { defaultByes, pairKey, playoffPlans, protectedPairStatus, resolveConferenceRules, titlePlans } from "@/lib/hard-mode"
import { scheduleGameCount, type BuiltSchedule } from "@/lib/schedule"
import type { Conference, ConferenceScheduleStyle } from "@/lib/types"
import { cn } from "@/lib/utils"

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
                Open a team to see its slate. Games played every year name the opponent and why that game stays on the schedule. Rotating conference dates say which teams they can be, and the other dates say which tier they come from.
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
                              {scheduleGameCount(schedule.bySchool.get(school.id)?.games ?? [])}
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
          <ConferenceProtectedGames conference={conference} />
        </div>
      )}
    </div>
  )
}

function ConferenceProtectedGames({ conference }: { conference: Conference }) {
  const board = useBoard()
  const rules = resolveConferenceRules(board.state.hardMode, conference.id)
  const [leftId, setLeftId] = useState("")
  const [rightId, setRightId] = useState("")
  const schools = useMemo(
    () =>
      conference.schoolIds
        .map((id) => board.schoolsById.get(id))
        .filter((school) => school !== undefined)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [board.schoolsById, conference.schoolIds],
  )
  const rivalryName = useMemo(() => {
    const names = new Map<string, string>()
    const ids = new Set(conference.schoolIds)
    for (const rivalry of board.catalog.rivalries) {
      if (ids.has(rivalry.schools[0]) && ids.has(rivalry.schools[1])) {
        names.set(pairKey(rivalry.schools[0], rivalry.schools[1]), rivalry.name)
      }
    }
    return names
  }, [board.catalog.rivalries, conference.schoolIds])
  const target = rules.protectedGames
  const pairs = rules.protectedPairs
  const status = protectedPairStatus(conference.schoolIds, pairs, target)
  const pairSet = new Set(pairs)
  const leftDegree = status.degree.get(leftId) ?? 0
  const rightDegree = status.degree.get(rightId) ?? 0
  const alreadyPaired = Boolean(leftId && rightId && pairSet.has(pairKey(leftId, rightId)))
  const canAdd = Boolean(leftId && rightId && leftId !== rightId && !alreadyPaired && leftDegree < target && rightDegree < target)
  const listed = pairs
    .filter((pair) => {
      const [left, right] = pair.split("|")
      return schools.some((school) => school.id === left) && schools.some((school) => school.id === right)
    })
    .sort((left, right) => pairLabel(left, board.schoolsById).localeCompare(pairLabel(right, board.schoolsById)))

  function addPair() {
    if (!leftId || !rightId || leftId === rightId) return
    const key = pairKey(leftId, rightId)
    if (pairSet.has(key)) return
    if ((status.degree.get(leftId) ?? 0) >= target || (status.degree.get(rightId) ?? 0) >= target) return
    board.setConferenceRules(conference.id, { protectedPairs: [...pairs, key] })
    setRightId("")
  }

  function removePair(key: string) {
    board.setConferenceRules(conference.id, { protectedPairs: pairs.filter((pair) => pair !== key) })
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Protected games</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Set one protected-game count for {conference.name}. Every team in this conference has that same number of in-conference protected rivals, and those games are played every year. They count toward the conference-game number.
      </p>
      <div className="mt-2 max-w-xs">
        <NumberField
          label="Protected games"
          value={target}
          min={0}
          max={19}
          testId={`rules-protected-${conference.id}`}
          onChange={(protectedGames) => board.setConferenceRules(conference.id, { protectedGames })}
        />
      </div>
      {target === 0 && pairs.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Saved pairs stay with this conference and return to the schedule when the protected-game count is above zero.
        </p>
      )}
      {target > 0 && (
        <>
          <p className="mt-2 text-sm" data-testid={`rules-protected-status-${conference.id}`}>
            {protectedStatusCopy(conference.name, conference.schoolIds.length, target, status)}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {schools.map((school) => {
              const degree = status.degree.get(school.id) ?? 0
              return (
                <li
                  key={school.id}
                  data-testid={`protected-count-${conference.id}-${school.id}`}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    degree === target ? "bg-green-100 text-green-800" : degree > target ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground",
                  )}
                >
                  {school.abbr} {degree}/{target}
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">First team</span>
              <select className={selectClass} data-testid={`protected-a-${conference.id}`} value={leftId} onChange={(event) => setLeftId(event.target.value)}>
                <option value="">Choose a team</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Second team</span>
              <select className={selectClass} data-testid={`protected-b-${conference.id}`} value={rightId} onChange={(event) => setRightId(event.target.value)}>
                <option value="">Choose a team</option>
                {schools
                  .filter((school) => school.id !== leftId)
                  .map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
              </select>
            </label>
            <Button type="button" size="sm" data-testid={`protected-add-${conference.id}`} disabled={!canAdd} onClick={addPair}>
              Add pair
            </Button>
          </div>
          {listed.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {listed.map((pair) => {
                const name = rivalryName.get(pair)
                return (
                  <li key={pair} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm">
                    <span>
                      <span className="font-medium">{pairLabel(pair, board.schoolsById)}</span>
                      {name ? <span className="text-muted-foreground"> · {name}</span> : null}
                    </span>
                    <Button type="button" size="sm" variant="ghost" data-testid={`protected-remove-${conference.id}-${pair}`} onClick={() => removePair(pair)}>
                      Remove
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function pairLabel(pair: string, schoolsById: Map<string, { name: string }>): string {
  const [left, right] = pair.split("|")
  const leftName = schoolsById.get(left)?.name ?? left
  const rightName = schoolsById.get(right)?.name ?? right
  return leftName.localeCompare(rightName) < 0 ? `${leftName} vs ${rightName}` : `${rightName} vs ${leftName}`
}

function protectedStatusCopy(
  name: string,
  teams: number,
  target: number,
  status: ReturnType<typeof protectedPairStatus>,
): string {
  if (teams < 2) return `${name} needs at least two teams before it can protect a rivalry.`
  if (target >= teams) return `Each of the ${teams} teams can protect at most ${teams - 1} conference opponents.`
  if (!status.possible) {
    return `${teams} teams × ${target} protected games is ${teams * target}. A complete pairing needs an even number of ends, so change the protected-game count.`
  }
  const exact = [...status.degree.values()].filter((degree) => degree === target).length
  const over = [...status.degree.values()].filter((degree) => degree > target).length
  const rival = target === 1 ? "rival" : "rivals"
  if (status.complete) return `Every team has ${target} protected ${rival}.`
  const progress = `${exact} of ${teams} teams have ${target} protected ${rival}.`
  if (over > 0) return `${progress} ${over} ${over === 1 ? "team has" : "teams have"} more than ${target}. Remove pairs until every team has ${target}.`
  return progress
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
        return {
          id: rivalry.id,
          name: rivalry.name,
          matchup: `${left.name} vs ${right.name}`,
          conferenceGame: left.conferenceId === right.conferenceId && !left.independent,
        }
      })
      .filter((row) => !row.conferenceGame)
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [board.catalog.rivalries, board.schoolsById, board.state.conferences])
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? rows.filter((row) => `${row.name} ${row.matchup}`.toLowerCase().includes(needle))
    : rows
  const chosen = rows.filter((row) => selected.has(row.id)).length

  function toggle(id: string) {
    const next = selected.has(id)
      ? board.state.hardMode.annualRivalryIds.filter((rivalryId) => rivalryId !== id)
      : [...board.state.hardMode.annualRivalryIds, id]
    board.setHardMode({ annualRivalryIds: next })
  }

  return (
    <Section title="Permanent rivals">
      <p className="text-sm text-muted-foreground">
        Checked games are non-conference rivalries played every year. Each one replaces an open non-conference date and counts in the rivalry total. In-conference protected games are set on each conference above.
      </p>
      <Input
        value={query}
        placeholder="Search rivalries"
        data-testid="rivalry-search"
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="text-xs text-muted-foreground" data-testid="permanent-count">
        {chosen} permanent {chosen === 1 ? "rivalry" : "rivalries"}
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
                  · {row.matchup} · Non-conference
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
  return "Each team plays that many conference games. Protected rivals stay on the schedule every year, and the remaining conference dates rotate."
}
