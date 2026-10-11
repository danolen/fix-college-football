import { isIndependents } from "@/lib/board"
import { resolveConferenceRules } from "@/lib/hard-mode"
import type { BoardState, Rivalry, Tier } from "@/lib/types"

export type OpponentTier = "power" | "group" | "either"

export type ScheduleGame = {
  key: string
  kind: "conference" | "non-conference"
  annual: boolean
  count: number
  opponentId: string | null
  poolIds: string[]
  tier: OpponentTier | null
  rivalryId: string | null
  rivalryName: string | null
}

export type TeamSchedule = {
  schoolId: string
  games: ScheduleGame[]
}

export type BuiltSchedule = {
  bySchool: Map<string, TeamSchedule>
  annualGames: number
  warnings: string[]
}

type Member = {
  id: string
  conferenceId: string
  independent: boolean
  tier: Tier
}

type Edge = {
  a: string
  b: string
  kind: "conference" | "non-conference"
  annual: boolean
  rivalryId: string | null
  rivalryName: string | null
}

export function buildSchedule(state: BoardState, rivalries: Rivalry[]): BuiltSchedule {
  const settings = state.hardMode
  const rivalryByPair = new Map<string, Rivalry>()
  const rivalryById = new Map<string, Rivalry>()
  for (const rivalry of rivalries) {
    rivalryByPair.set(pairKey(rivalry.schools[0], rivalry.schools[1]), rivalry)
    rivalryById.set(rivalry.id, rivalry)
  }

  const members: Member[] = []
  for (const conference of state.conferences) {
    const independent = isIndependents(conference)
    for (const id of conference.schoolIds) {
      members.push({ id, conferenceId: conference.id, independent, tier: conference.tier })
    }
  }
  members.sort((left, right) => left.id.localeCompare(right.id))
  const memberById = new Map(members.map((member) => [member.id, member]))

  const played = new Set<string>()
  const edges: Edge[] = []
  const warnings: string[] = []

  function addEdge(a: string, b: string, kind: "conference" | "non-conference", annual: boolean) {
    const key = pairKey(a, b)
    if (a === b || played.has(key)) return
    played.add(key)
    const rivalry = rivalryByPair.get(key) ?? null
    edges.push({
      a,
      b,
      kind,
      annual,
      rivalryId: rivalry?.id ?? null,
      rivalryName: rivalry?.name ?? null,
    })
  }

  for (const conference of state.conferences) {
    if (isIndependents(conference)) continue
    const ids = [...conference.schoolIds].sort()
    if (ids.length < 2) continue
    const idSet = new Set(ids)
    const locked = new Set<string>()
    const rules = resolveConferenceRules(settings, conference.id)
    const playEveryone = rules.conferenceSchedule === "all-conference" || rules.conferenceGames >= ids.length - 1
    if (playEveryone) {
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) locked.add(pairKey(ids[i], ids[j]))
      }
    } else if (rules.conferenceSchedule === "all-division") {
      for (const division of conference.divisions ?? []) {
        const divisionIds = division.schoolIds.filter((id) => idSet.has(id)).sort()
        for (let i = 0; i < divisionIds.length; i += 1) {
          for (let j = i + 1; j < divisionIds.length; j += 1) locked.add(pairKey(divisionIds[i], divisionIds[j]))
        }
      }
    }
    for (const rivalryId of settings.annualRivalryIds) {
      const rivalry = rivalryById.get(rivalryId)
      if (!rivalry) continue
      const [left, right] = rivalry.schools
      if (idSet.has(left) && idSet.has(right)) locked.add(pairKey(left, right))
    }

    const degree = new Map(ids.map((id) => [id, 0]))
    for (const key of locked) {
      const [left, right] = key.split("|")
      degree.set(left, (degree.get(left) ?? 0) + 1)
      degree.set(right, (degree.get(right) ?? 0) + 1)
      addEdge(left, right, "conference", true)
    }
    if (rules.conferenceSchedule !== "all-conference" && ids.some((id) => (degree.get(id) ?? 0) > rules.conferenceGames)) {
      warnings.push(
        `${conference.name} keeps locked conference games that run past the ${rules.conferenceGames}-game target.`,
      )
    }
    if (rules.conferenceSchedule === "all-conference" && ids.length - 1 > settings.totalGames) {
      warnings.push(
        `${conference.name} plays every conference opponent, ${ids.length - 1} games, which runs past the ${settings.totalGames}-game season.`,
      )
    }
  }

  for (const rivalryId of settings.annualRivalryIds) {
    const rivalry = rivalryById.get(rivalryId)
    if (!rivalry) continue
    const [left, right] = rivalry.schools
    const memberA = memberById.get(left)
    const memberB = memberById.get(right)
    if (!memberA || !memberB) continue
    if (memberA.conferenceId === memberB.conferenceId && !memberA.independent) continue
    addEdge(left, right, "non-conference", true)
  }

  const conferenceIds = new Map<string, string[]>()
  for (const conference of state.conferences) {
    if (!isIndependents(conference)) conferenceIds.set(conference.id, [...conference.schoolIds].sort())
  }
  const conferenceDegree = new Map(members.map((member) => [member.id, 0]))
  const playedOpponents = new Map(members.map((member) => [member.id, new Set<string>()]))
  for (const edge of edges) {
    playedOpponents.get(edge.a)?.add(edge.b)
    playedOpponents.get(edge.b)?.add(edge.a)
    if (edge.kind === "conference") {
      conferenceDegree.set(edge.a, (conferenceDegree.get(edge.a) ?? 0) + 1)
      conferenceDegree.set(edge.b, (conferenceDegree.get(edge.b) ?? 0) + 1)
    }
  }

  const bySchool = new Map<string, TeamSchedule>()
  for (const member of members) bySchool.set(member.id, { schoolId: member.id, games: [] })
  for (const edge of edges) {
    bySchool.get(edge.a)?.games.push(toGame(edge, edge.b))
    bySchool.get(edge.b)?.games.push(toGame(edge, edge.a))
  }
  for (const member of members) {
    const mates = member.independent ? [] : conferenceIds.get(member.conferenceId) ?? []
    const locked = conferenceDegree.get(member.id) ?? 0
    const rules = resolveConferenceRules(settings, member.conferenceId)
    const cap = rules.conferenceSchedule === "all-conference" ? Math.max(0, mates.length - 1) : rules.conferenceGames
    const rotating = member.independent ? 0 : Math.max(0, Math.min(Math.max(0, mates.length - 1), Math.max(cap, locked)) - locked)
    const poolIds = mates.filter((id) => id !== member.id && !playedOpponents.get(member.id)?.has(id))
    const schedule = bySchool.get(member.id)
    if (!schedule) continue
    if (rotating > 0 && poolIds.length > 0) {
      schedule.games.push({
        key: "conference-rotation",
        kind: "conference",
        annual: false,
        count: rotating,
        opponentId: null,
        poolIds,
        tier: null,
        rivalryId: null,
        rivalryName: null,
      })
    }
    const named = schedule.games.reduce((total, game) => total + (game.opponentId ? game.count : 0), 0)
    const openDates = Math.max(0, settings.totalGames - named - (rotating > 0 ? rotating : 0))
    if (openDates > 0) {
      schedule.games.push({
        key: "nonconference-rotation",
        kind: "non-conference",
        annual: false,
        count: openDates,
        opponentId: null,
        poolIds: [],
        tier: nonConferenceTier(member, state),
        rivalryId: null,
        rivalryName: null,
      })
    }
    schedule.games.sort(compareGames)
  }

  const over = members.filter((member) => scheduleGameCount(bySchool.get(member.id)?.games ?? []) > settings.totalGames).length
  if (over > 0) {
    warnings.push(
      `${over} ${over === 1 ? "team plays" : "teams play"} more than ${settings.totalGames} games so locked games stay on the schedule.`,
    )
  }

  return {
    bySchool,
    annualGames: edges.filter((edge) => edge.annual && edge.rivalryId).length,
    warnings,
  }
}

export function scheduleGameCount(games: ScheduleGame[]): number {
  return games.reduce((total, game) => total + game.count, 0)
}

export function describeScheduleGame(game: ScheduleGame, nameOf: (id: string) => string): string {
  if (game.opponentId) return nameOf(game.opponentId)
  if (game.kind === "conference") {
    const list = formatNameList(game.poolIds.map(nameOf).sort((left, right) => left.localeCompare(right)))
    if (game.count === 1) return `One of ${list}`
    return `${game.count} conference games, each one of ${list}`
  }
  const tier = game.tier === "power" ? "Power tier" : game.tier === "group" ? "Group tier" : "either tier"
  if (game.count === 1) return `Non-conference game vs ${tier}`
  return `${game.count} non-conference games vs ${tier}`
}

function compareGames(left: ScheduleGame, right: ScheduleGame): number {
  if (left.kind !== right.kind) return left.kind === "conference" ? -1 : 1
  if (left.opponentId && !right.opponentId) return -1
  if (!left.opponentId && right.opponentId) return 1
  return (left.opponentId ?? "").localeCompare(right.opponentId ?? "")
}

function nonConferenceTier(member: Member, state: BoardState): OpponentTier {
  if (!state.hardMode.sameTierNonConference || state.mode !== "tiers") return "either"
  if (member.tier === "power") return "power"
  if (member.tier === "group") return "group"
  return "either"
}

function toGame(edge: Edge, opponentId: string): ScheduleGame {
  return {
    key: opponentId,
    kind: edge.kind,
    annual: edge.annual,
    count: 1,
    opponentId,
    poolIds: [],
    tier: null,
    rivalryId: edge.rivalryId,
    rivalryName: edge.rivalryName,
  }
}

function formatNameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "the rest of the conference"
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}
