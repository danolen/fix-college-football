import { isIndependents } from "@/lib/board"
import type { BoardState, Rivalry, Tier } from "@/lib/types"

export type ScheduleGame = {
  opponentId: string
  kind: "conference" | "non-conference"
  annual: boolean
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
    const playEveryone = settings.conferenceSchedule === "all-conference" || settings.conferenceGames >= ids.length - 1
    if (playEveryone) {
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) locked.add(pairKey(ids[i], ids[j]))
      }
    } else if (settings.conferenceSchedule === "all-division") {
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
    if (settings.conferenceSchedule !== "all-conference" && ids.some((id) => (degree.get(id) ?? 0) > settings.conferenceGames)) {
      warnings.push(
        `${conference.name} keeps locked conference games that run past the ${settings.conferenceGames}-game target.`,
      )
    }
    if (settings.conferenceSchedule === "all-conference" && ids.length - 1 > settings.totalGames) {
      warnings.push(
        `${conference.name} plays every conference opponent, ${ids.length - 1} games, which runs past the ${settings.totalGames}-game season.`,
      )
    }

    fillPairs(
      ids,
      (id) => {
        const current = degree.get(id) ?? 0
        const cap = settings.conferenceSchedule === "all-conference" ? ids.length - 1 : settings.conferenceGames
        return Math.min(ids.length - 1, Math.max(cap, current)) - current
      },
      (left, right) => !played.has(pairKey(left, right)),
      (left, right) => {
        degree.set(left, (degree.get(left) ?? 0) + 1)
        degree.set(right, (degree.get(right) ?? 0) + 1)
        addEdge(left, right, "conference", false)
      },
    )
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

  const degree = new Map(members.map((member) => [member.id, 0]))
  for (const edge of edges) {
    degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1)
    degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1)
  }
  fillPairs(
    members.map((member) => member.id),
    (id) => Math.max(0, settings.totalGames - (degree.get(id) ?? 0)),
    (left, right) => {
      if (played.has(pairKey(left, right))) return false
      const memberA = memberById.get(left)
      const memberB = memberById.get(right)
      if (!memberA || !memberB) return false
      if (memberA.conferenceId === memberB.conferenceId && !memberA.independent) return false
      if (!settings.sameTierNonConference || state.mode !== "tiers") return true
      if (memberA.tier === "none" || memberB.tier === "none") return true
      return memberA.tier === memberB.tier
    },
    (left, right) => {
      degree.set(left, (degree.get(left) ?? 0) + 1)
      degree.set(right, (degree.get(right) ?? 0) + 1)
      addEdge(left, right, "non-conference", false)
    },
  )

  const bySchool = new Map<string, TeamSchedule>()
  for (const member of members) bySchool.set(member.id, { schoolId: member.id, games: [] })
  for (const edge of edges) {
    bySchool.get(edge.a)?.games.push(toGame(edge, edge.b))
    bySchool.get(edge.b)?.games.push(toGame(edge, edge.a))
  }
  for (const schedule of bySchool.values()) {
    schedule.games.sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "conference" ? -1 : 1
      if (left.annual !== right.annual) return left.annual ? -1 : 1
      return left.opponentId.localeCompare(right.opponentId)
    })
  }

  const over = members.filter((member) => (bySchool.get(member.id)?.games.length ?? 0) > settings.totalGames).length
  const short = members.filter((member) => (bySchool.get(member.id)?.games.length ?? 0) < settings.totalGames).length
  if (over > 0) {
    warnings.push(
      `${over} ${over === 1 ? "team plays" : "teams play"} more than ${settings.totalGames} games so locked games stay on the schedule.`,
    )
  }
  if (short > 0) {
    warnings.push(
      `${short} ${short === 1 ? "team still has" : "teams still have"} an open date. There are not enough opponents under these rules.`,
    )
  }

  return {
    bySchool,
    annualGames: edges.filter((edge) => edge.annual && edge.rivalryId).length,
    warnings,
  }
}

function fillPairs(
  ids: string[],
  needOf: (id: string) => number,
  allowed: (left: string, right: string) => boolean,
  add: (left: string, right: string) => void,
) {
  const need = new Map(ids.map((id) => [id, needOf(id)]))
  const guard = ids.length * ids.length + 2
  for (let step = 0; step < guard; step += 1) {
    let bestRank = ""
    let bestA = ""
    let bestB = ""
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const left = ids[i]
        const right = ids[j]
        const leftNeed = need.get(left) ?? 0
        const rightNeed = need.get(right) ?? 0
        if (leftNeed <= 0 || rightNeed <= 0) continue
        if (!allowed(left, right)) continue
        const rank = `${String(100 - Math.min(leftNeed, rightNeed)).padStart(3, "0")}|${String(100 - Math.max(leftNeed, rightNeed)).padStart(3, "0")}|${pairKey(left, right)}`
        if (!bestRank || rank < bestRank) {
          bestRank = rank
          bestA = left
          bestB = right
        }
      }
    }
    if (!bestRank) break
    need.set(bestA, (need.get(bestA) ?? 0) - 1)
    need.set(bestB, (need.get(bestB) ?? 0) - 1)
    add(bestA, bestB)
  }
}

function toGame(edge: Edge, opponentId: string): ScheduleGame {
  return {
    opponentId,
    kind: edge.kind,
    annual: edge.annual,
    rivalryId: edge.rivalryId,
    rivalryName: edge.rivalryName,
  }
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}
