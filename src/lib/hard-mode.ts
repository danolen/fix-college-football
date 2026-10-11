import type { BoardState, Conference, ConferenceRuleOverride, ConferenceScheduleStyle, HardModeSettings, TitleGameFormat } from "@/lib/types"

export function defaultHardMode(): HardModeSettings {
  return {
    enabled: false,
    titleGame: "division-winners",
    playoffTeams: 12,
    playoffByes: 4,
    separatePlayoffs: false,
    autoBidChampions: 5,
    totalGames: 12,
    conferenceGames: 8,
    sameTierNonConference: false,
    conferenceSchedule: "set-count",
    annualRivalryIds: [],
    conferenceRules: {},
  }
}

export function defaultByes(teams: number): number {
  const size = clampInt(teams, 2, 16, 12)
  let power = 1
  while (power < size) power *= 2
  if (power === size) return 0
  return power - size
}

export function normalizeHardMode(input: Partial<HardModeSettings> | null | undefined): HardModeSettings {
  const base = defaultHardMode()
  const titleGame: TitleGameFormat =
    input?.titleGame === "top-two" || input?.titleGame === "four-team" || input?.titleGame === "division-winners"
      ? input.titleGame
      : base.titleGame
  const conferenceSchedule =
    input?.conferenceSchedule === "all-division" || input?.conferenceSchedule === "all-conference" || input?.conferenceSchedule === "set-count"
      ? input.conferenceSchedule
      : base.conferenceSchedule
  const playoffTeams = clampInt(input?.playoffTeams, 2, 16, base.playoffTeams)
  const playoffByes = clampByes(input?.playoffByes ?? defaultByes(playoffTeams), playoffTeams)
  const annualRivalryIds = Array.isArray(input?.annualRivalryIds)
    ? [...new Set(input.annualRivalryIds.filter((id): id is string => typeof id === "string"))].sort()
    : []
  return {
    enabled: Boolean(input?.enabled),
    titleGame,
    playoffTeams,
    playoffByes,
    separatePlayoffs: Boolean(input?.separatePlayoffs),
    autoBidChampions: clampInt(input?.autoBidChampions, 0, 24, base.autoBidChampions),
    totalGames: clampInt(input?.totalGames, 1, 20, base.totalGames),
    conferenceGames: clampInt(input?.conferenceGames, 0, 20, base.conferenceGames),
    sameTierNonConference: Boolean(input?.sameTierNonConference),
    conferenceSchedule,
    annualRivalryIds,
    conferenceRules: normalizeConferenceRules(input?.conferenceRules),
  }
}

export function sameHardMode(a: HardModeSettings, b: HardModeSettings): boolean {
  return (
    a.enabled === b.enabled &&
    a.titleGame === b.titleGame &&
    a.playoffTeams === b.playoffTeams &&
    a.playoffByes === b.playoffByes &&
    a.separatePlayoffs === b.separatePlayoffs &&
    a.autoBidChampions === b.autoBidChampions &&
    a.totalGames === b.totalGames &&
    a.conferenceGames === b.conferenceGames &&
    a.sameTierNonConference === b.sameTierNonConference &&
    a.conferenceSchedule === b.conferenceSchedule &&
    a.annualRivalryIds.length === b.annualRivalryIds.length &&
    a.annualRivalryIds.every((id, index) => id === b.annualRivalryIds[index]) &&
    sameConferenceRules(a.conferenceRules, b.conferenceRules)
  )
}

export function hardModeIsDefault(settings: HardModeSettings): boolean {
  return sameHardMode(normalizeHardMode(settings), defaultHardMode())
}

export function updateHardMode(state: BoardState, patch: Partial<HardModeSettings>): BoardState {
  const hardMode = normalizeHardMode({ ...state.hardMode, ...patch })
  if (sameHardMode(hardMode, state.hardMode)) return state
  return { ...state, hardMode }
}

export type ResolvedConferenceRules = {
  titleGame: TitleGameFormat
  conferenceSchedule: ConferenceScheduleStyle
  conferenceGames: number
  protectedGames: number
  protectedPairs: string[]
  custom: boolean
}

export function resolveConferenceRules(settings: HardModeSettings, conferenceId: string): ResolvedConferenceRules {
  const override = settings.conferenceRules[conferenceId] ?? {}
  const protectedGames = override.protectedGames ?? 0
  const protectedPairs = override.protectedPairs ?? []
  return {
    titleGame: override.titleGame ?? settings.titleGame,
    conferenceSchedule: override.conferenceSchedule ?? settings.conferenceSchedule,
    conferenceGames: override.conferenceGames ?? settings.conferenceGames,
    protectedGames,
    protectedPairs,
    custom:
      override.titleGame !== undefined ||
      override.conferenceSchedule !== undefined ||
      override.conferenceGames !== undefined ||
      protectedGames > 0 ||
      protectedPairs.length > 0,
  }
}

export function pairKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

export type ProtectedPairStatus = {
  degree: Map<string, number>
  possible: boolean
  complete: boolean
}

export function protectedPairStatus(schoolIds: string[], pairs: string[], target: number): ProtectedPairStatus {
  const ids = new Set(schoolIds)
  const degree = new Map(schoolIds.map((id) => [id, 0]))
  const seen = new Set<string>()
  for (const pair of pairs) {
    const [left, right] = pair.split("|")
    if (!left || !right || left === right || !ids.has(left) || !ids.has(right)) continue
    const key = pairKey(left, right)
    if (seen.has(key)) continue
    seen.add(key)
    degree.set(left, (degree.get(left) ?? 0) + 1)
    degree.set(right, (degree.get(right) ?? 0) + 1)
  }
  const possible = target === 0 || (schoolIds.length >= 2 && target < schoolIds.length && (schoolIds.length * target) % 2 === 0)
  const complete = possible && target > 0 && schoolIds.every((id) => (degree.get(id) ?? 0) === target)
  return { degree, possible, complete }
}

export function keptConferenceRules(
  rules: Record<string, ConferenceRuleOverride>,
  conferences: { id: string; schoolIds: string[] }[],
): Record<string, ConferenceRuleOverride> {
  const members = new Map(conferences.map((conference) => [conference.id, new Set(conference.schoolIds)]))
  const next: Record<string, ConferenceRuleOverride> = {}
  for (const [id, override] of Object.entries(rules)) {
    const ids = members.get(id)
    if (!ids) continue
    const protectedPairs = (override.protectedPairs ?? []).filter((pair) => {
      const [left, right] = pair.split("|")
      return Boolean(left && right && ids.has(left) && ids.has(right))
    })
    next[id] =
      protectedPairs.length === (override.protectedPairs?.length ?? 0) ? override : { ...override, protectedPairs }
  }
  return next
}

export function updateConferenceRules(state: BoardState, conferenceId: string, patch: ConferenceRuleOverride): BoardState {
  const current = state.hardMode.conferenceRules[conferenceId] ?? {}
  const next = normalizeOverride({ ...current, ...patch })
  const conferenceRules = { ...state.hardMode.conferenceRules }
  if (overrideIsEmpty(next)) delete conferenceRules[conferenceId]
  else conferenceRules[conferenceId] = next
  const hardMode = { ...state.hardMode, conferenceRules }
  if (sameHardMode(hardMode, state.hardMode)) return state
  return { ...state, hardMode }
}

export function clearConferenceRules(state: BoardState, conferenceId: string): BoardState {
  if (!state.hardMode.conferenceRules[conferenceId]) return state
  const conferenceRules = { ...state.hardMode.conferenceRules }
  delete conferenceRules[conferenceId]
  return { ...state, hardMode: { ...state.hardMode, conferenceRules } }
}

export type TitlePlan = {
  conferenceId: string
  conferenceName: string
  summary: string
}

export function titlePlans(state: BoardState): TitlePlan[] {
  const plans: TitlePlan[] = []
  for (const conference of state.conferences) {
    if (isIndependents(conference) || conference.schoolIds.length < 2) continue
    plans.push({
      conferenceId: conference.id,
      conferenceName: conference.name,
      summary: titleSummary(conference, resolveConferenceRules(state.hardMode, conference.id).titleGame),
    })
  }
  return plans
}

export type PlayoffPlan = {
  name: string
  teams: number
  byes: number
  lines: string[]
}

export function playoffPlans(state: BoardState): PlayoffPlan[] {
  const settings = state.hardMode
  const eligible = state.conferences.filter((conference) => !isIndependents(conference) && conference.schoolIds.length >= 2)
  if (state.mode === "tiers" && settings.separatePlayoffs) {
    return [
      tierPlan("Power", eligible.filter((conference) => conference.tier === "power"), settings),
      tierPlan("Group", eligible.filter((conference) => conference.tier === "group"), settings),
    ]
  }
  if (state.mode === "tiers") return [combinedTierPlan(eligible, settings)]
  return [flatPlan(eligible, settings)]
}

function titleSummary(conference: Conference, format: TitleGameFormat): string {
  const count = conference.schoolIds.length
  if (format === "four-team") {
    if (count < 4) return `This conference has ${count} teams, so the two with the best records play for the championship.`
    return "The four teams with the best records play a conference playoff, and the winners meet for the championship."
  }
  if (format === "top-two") return "The two teams with the best records play for the championship."
  const divisions = (conference.divisions ?? []).filter((division) => division.schoolIds.length > 0)
  const claimed = new Set(divisions.flatMap((division) => division.schoolIds))
  const undivided = conference.schoolIds.filter((id) => !claimed.has(id)).length
  if (divisions.length < 2) return "The two teams with the best records play for the championship."
  const names = divisions.map((division) => division.name)
  let summary: string
  if (divisions.length === 2) {
    summary = `The ${names[0]} winner plays the ${names[1]} winner for the championship.`
  } else if (divisions.length === 3) {
    summary = `The ${names.join(", ")} winners are eligible. The two division winners with the best records play for the championship.`
  } else {
    summary = `The winners of ${names.join(", ")} play a ${divisions.length}-team conference championship.`
  }
  if (undivided > 0) {
    summary += ` ${undivided} ${undivided === 1 ? "school sits" : "schools sit"} outside a division, so ${undivided === 1 ? "it is" : "they are"} outside that field.`
  }
  return summary
}

function combinedTierPlan(eligible: Conference[], settings: HardModeSettings): PlayoffPlan {
  const power = eligible.filter((conference) => conference.tier === "power").length
  const group = eligible.filter((conference) => conference.tier === "group").length
  const auto = power + (group > 0 ? 1 : 0)
  const teams = Math.max(settings.playoffTeams, auto, 2)
  const byes = clampByes(settings.playoffByes, teams)
  const lines: string[] = []
  if (power > 0) lines.push(`Every Power conference champion gets an automatic bid (${power}).`)
  if (group > 0) lines.push("The top-ranked Group conference champion gets an automatic bid.")
  if (auto === 0) lines.push("Automatic bids start once a Power or Group conference has two schools.")
  lines.push(`${teams - auto} at-large bids complete the ${teams}-team field.`)
  if (teams > settings.playoffTeams) lines.push(`The field grows from ${settings.playoffTeams} to ${teams} so every automatic bid fits.`)
  lines.push(...bracketLines(teams, byes))
  return { name: "College Football Playoff", teams, byes, lines }
}

function tierPlan(label: string, conferences: Conference[], settings: HardModeSettings): PlayoffPlan {
  const champs = conferences.length
  const teams = Math.max(settings.playoffTeams, champs, 2)
  const byes = clampByes(settings.playoffByes, teams)
  const lines = [
    champs > 0
      ? `Every ${label} conference champion gets an automatic bid (${champs}).`
      : `${label} automatic bids start once a ${label} conference has two schools.`,
    `${Math.max(0, teams - champs)} at-large bids come from the ${label} tier.`,
  ]
  if (teams > settings.playoffTeams) lines.push(`The field grows from ${settings.playoffTeams} to ${teams} so every automatic bid fits.`)
  lines.push(...bracketLines(teams, byes))
  return { name: `${label} playoff`, teams, byes, lines }
}

function flatPlan(eligible: Conference[], settings: HardModeSettings): PlayoffPlan {
  const champs = eligible.length
  const teams = Math.max(settings.playoffTeams, 2)
  const auto = Math.min(settings.autoBidChampions, champs, teams)
  const byes = clampByes(settings.playoffByes, teams)
  const lines: string[] = []
  if (auto === 0) lines.push(`The ${teams}-team field is filled with at-large bids.`)
  else if (auto === champs) lines.push(`All ${champs} conference champions get automatic bids.`)
  else lines.push(`The ${auto} highest-ranked conference champions get automatic bids.`)
  if (auto > 0) lines.push(`${teams - auto} at-large bids complete the ${teams}-team field.`)
  lines.push(...bracketLines(teams, byes))
  return { name: "College Football Playoff", teams, byes, lines }
}

function bracketLines(teams: number, byes: number): string[] {
  if (teams < 2) return ["Add teams before this playoff has a game."]
  if (byes <= 0) {
    if (teams === 2) return ["The two teams play for the championship."]
    return [`All ${teams} teams play in the first round. The highest seed plays the lowest seed.`]
  }
  const pairs: string[] = []
  let low = byes + 1
  let high = teams
  while (low < high) {
    pairs.push(`${low} vs ${high}`)
    low += 1
    high -= 1
  }
  return [
    `The top ${byes} seeds get byes. Byes go to the highest-ranked conference champions in the field.`,
    `The first round is ${pairs.join(", ")}.`,
    `Those winners join the bye teams in a ${byes + pairs.length}-team bracket.`,
  ]
}

function normalizeConferenceRules(input: unknown): Record<string, ConferenceRuleOverride> {
  if (!input || typeof input !== "object") return {}
  const rules: Record<string, ConferenceRuleOverride> = {}
  for (const [id, raw] of Object.entries(input)) {
    if (!id || !raw || typeof raw !== "object") continue
    const override = normalizeOverride(raw as ConferenceRuleOverride)
    if (!overrideIsEmpty(override)) rules[id] = override
  }
  return rules
}

function normalizeOverride(raw: ConferenceRuleOverride): ConferenceRuleOverride {
  const override: ConferenceRuleOverride = {}
  if (raw.titleGame === "division-winners" || raw.titleGame === "top-two" || raw.titleGame === "four-team") {
    override.titleGame = raw.titleGame
  }
  if (raw.conferenceSchedule === "set-count" || raw.conferenceSchedule === "all-division" || raw.conferenceSchedule === "all-conference") {
    override.conferenceSchedule = raw.conferenceSchedule
  }
  if (typeof raw.conferenceGames === "number" && Number.isFinite(raw.conferenceGames)) {
    override.conferenceGames = clampInt(raw.conferenceGames, 0, 20, 8)
  }
  if (typeof raw.protectedGames === "number" && Number.isFinite(raw.protectedGames)) {
    const protectedGames = clampInt(raw.protectedGames, 0, 19, 0)
    if (protectedGames > 0) override.protectedGames = protectedGames
  }
  const protectedPairs = normalizePairs(raw.protectedPairs)
  if (protectedPairs.length > 0) override.protectedPairs = protectedPairs
  return override
}

function normalizePairs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const pairs = new Set<string>()
  for (const item of raw) {
    if (typeof item !== "string") continue
    const [left, right] = item.split("|")
    if (!left || !right || left === right || item.split("|").length !== 2) continue
    pairs.add(pairKey(left, right))
  }
  return [...pairs].sort()
}

function overrideIsEmpty(override: ConferenceRuleOverride): boolean {
  return (
    override.titleGame === undefined &&
    override.conferenceSchedule === undefined &&
    override.conferenceGames === undefined &&
    override.protectedGames === undefined &&
    (override.protectedPairs?.length ?? 0) === 0
  )
}

function sameConferenceRules(left: Record<string, ConferenceRuleOverride>, right: Record<string, ConferenceRuleOverride>): boolean {
  const leftIds = Object.keys(left).sort()
  const rightIds = Object.keys(right).sort()
  if (leftIds.length !== rightIds.length || leftIds.some((id, index) => id !== rightIds[index])) return false
  return leftIds.every((id) => {
    const a = left[id]
    const b = right[id]
    const aPairs = a.protectedPairs ?? []
    const bPairs = b.protectedPairs ?? []
    return (
      a.titleGame === b.titleGame &&
      a.conferenceSchedule === b.conferenceSchedule &&
      a.conferenceGames === b.conferenceGames &&
      a.protectedGames === b.protectedGames &&
      aPairs.length === bPairs.length &&
      aPairs.every((pair, index) => pair === bPairs[index])
    )
  })
}

function isIndependents(conference: { name: string }): boolean {
  return conference.name.trim().toLowerCase() === "independents"
}

function clampByes(byes: unknown, teams: number): number {
  const max = Math.max(0, teams - 2)
  let next = clampInt(byes, 0, max, defaultByes(teams))
  if ((teams - next) % 2 !== 0) next = Math.max(0, next - 1)
  return next
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.min(max, Math.max(min, numeric))
}
