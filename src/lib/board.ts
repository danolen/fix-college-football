import { nextColor } from "@/lib/colors"
import type { BoardState, Conference, Division, Mode, Preset, Tier } from "@/lib/types"

export function conferenceDivisions(conference: Conference): Division[] {
  return conference.divisions ?? []
}

export function undividedSchoolIds(conference: Conference): string[] {
  const claimed = new Set(conferenceDivisions(conference).flatMap((division) => division.schoolIds))
  return conference.schoolIds.filter((id) => !claimed.has(id))
}

export function createBlankBoard(ids: () => string): BoardState {
  const seeds: Array<[string, Tier]> = [
    ["Conference 1", "none"],
    ["Conference 2", "none"],
    ["Conference 3", "none"],
    ["Conference 4", "none"],
  ]
  const conferences: Conference[] = []
  for (const [name, tier] of seeds) {
    conferences.push({
      id: ids(),
      name,
      tier,
      color: nextColor(conferences.map((conference) => conference.color)),
      schoolIds: [],
    })
  }
  return { mode: "flat", conferences, addedFcsIds: [], presetId: "blank" }
}

export function applyPreset(preset: Preset, mode: Mode, ids: () => string): BoardState {
  return {
    mode,
    conferences: preset.conferences.map((conference) => {
      const schoolIds = [...conference.schools]
      const allowed = new Set(schoolIds)
      const divisions = (conference.divisions ?? [])
        .filter((division) => division.name.trim())
        .map((division) => ({
          id: ids(),
          name: division.name.trim(),
          schoolIds: division.schools.filter((id) => allowed.has(id)),
        }))
      return {
        id: ids(),
        name: conference.name,
        tier: conference.tier,
        color: conference.color,
        schoolIds,
        ...(divisions.length > 0 ? { divisions } : {}),
      }
    }),
    addedFcsIds: [],
    presetId: preset.id,
  }
}

export function setMode(state: BoardState, mode: Mode): BoardState {
  if (state.mode === mode) return state
  return { ...state, mode, conferences: state.conferences.map(cloneConference) }
}

export function addConference(state: BoardState, tier: Tier, ids: () => string): BoardState {
  const count = state.conferences.filter((conference) => conference.tier === tier).length + 1
  const name =
    tier === "power" ? `Power ${count}` : tier === "group" ? `Group ${count}` : `Conference ${state.conferences.length + 1}`
  return {
    ...state,
    presetId: null,
    conferences: [...state.conferences, emptyConference(ids, name, tier, state.conferences)],
  }
}

export function renameConference(state: BoardState, id: string, name: string): BoardState {
  const trimmed = name.trim()
  if (!trimmed) return state
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.map((conference) =>
      conference.id === id ? { ...conference, name: trimmed } : conference,
    ),
  }
}

export function recolorConference(state: BoardState, id: string, color: string): BoardState {
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.map((conference) =>
      conference.id === id ? { ...conference, color } : conference,
    ),
  }
}

export function canDeleteConference(state: BoardState, id: string): boolean {
  const conference = state.conferences.find((item) => item.id === id)
  if (!conference) return false
  if (state.conferences.length <= 1) return false
  if (state.mode === "flat" || conference.tier === "none") return true
  return state.conferences.filter((item) => item.tier === conference.tier).length > 1
}

export function deleteConference(state: BoardState, id: string): BoardState | null {
  if (!canDeleteConference(state, id)) return null
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.filter((conference) => conference.id !== id),
  }
}

export function moveConferenceTier(state: BoardState, id: string, tier: Tier): BoardState | null {
  const conference = state.conferences.find((item) => item.id === id)
  if (!conference || conference.tier === tier) return state
  if (conference.tier !== "none" && state.conferences.filter((item) => item.tier === conference.tier).length <= 1) {
    return null
  }
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.map((item) => (item.id === id ? { ...item, tier } : item)),
  }
}

export function moveSchool(
  state: BoardState,
  schoolId: string,
  targetConferenceId: string | null,
  beforeId?: string | null,
  divisionId?: string | null,
): BoardState {
  const conferences = state.conferences.map((conference) => stripSchool(conference, schoolId))
  if (targetConferenceId) {
    const target = conferences.find((conference) => conference.id === targetConferenceId)
    if (target) {
      const index = beforeId ? target.schoolIds.indexOf(beforeId) : -1
      if (index >= 0) target.schoolIds.splice(index, 0, schoolId)
      else target.schoolIds.push(schoolId)
      if (divisionId) {
        target.divisions = conferenceDivisions(target).map((division) =>
          division.id === divisionId
            ? { ...division, schoolIds: insertSchool(division.schoolIds, schoolId, beforeId) }
            : division,
        )
      }
    }
  }
  return { ...state, presetId: null, conferences }
}

export function moveSchools(
  state: BoardState,
  schoolIds: string[],
  targetConferenceId: string | null,
  beforeId?: string | null,
  divisionId?: string | null,
): BoardState {
  const unique = [...new Set(schoolIds.filter(Boolean))]
  if (unique.length === 0) return state
  let next = state
  for (const schoolId of unique) {
    next = moveSchool(next, schoolId, targetConferenceId, schoolId === unique[0] ? beforeId : null, divisionId)
  }
  return next
}

export function addDivision(state: BoardState, conferenceId: string, ids: () => string): BoardState {
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.map((conference) => {
      if (conference.id !== conferenceId) return conference
      const existing = conferenceDivisions(conference)
      return {
        ...conference,
        divisions: [...existing, { id: ids(), name: `Division ${existing.length + 1}`, schoolIds: [] }],
      }
    }),
  }
}

export function renameDivision(state: BoardState, conferenceId: string, divisionId: string, name: string): BoardState {
  const trimmed = name.trim()
  if (!trimmed) return state
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.map((conference) => {
      if (conference.id !== conferenceId) return conference
      const divisions = conferenceDivisions(conference).map((division) =>
        division.id === divisionId ? { ...division, name: trimmed } : division,
      )
      return { ...conference, divisions }
    }),
  }
}

export function deleteDivision(state: BoardState, conferenceId: string, divisionId: string): BoardState {
  return {
    ...state,
    presetId: null,
    conferences: state.conferences.map((conference) => {
      if (conference.id !== conferenceId) return conference
      const divisions = conferenceDivisions(conference).filter((division) => division.id !== divisionId)
      return { ...conference, divisions }
    }),
  }
}

export function addFcsSchool(state: BoardState, schoolId: string): BoardState {
  if (state.addedFcsIds.includes(schoolId)) return state
  return { ...state, presetId: null, addedFcsIds: [...state.addedFcsIds, schoolId] }
}

export function removeFcsSchool(state: BoardState, schoolId: string): BoardState {
  return {
    ...state,
    presetId: null,
    addedFcsIds: state.addedFcsIds.filter((id) => id !== schoolId),
    conferences: state.conferences.map((conference) => stripSchool(conference, schoolId)),
  }
}

export function isIndependents(conference: { name: string }): boolean {
  return conference.name.trim().toLowerCase() === "independents"
}

export function shareUnlocked(state: BoardState): boolean {
  return (
    state.conferences.length > 0 &&
    state.conferences.every((conference) => isIndependents(conference) || conference.schoolIds.length >= 2)
  )
}

export function onBoardIds(fbsIds: string[], state: BoardState): string[] {
  return [...fbsIds, ...state.addedFcsIds]
}

export function conferenceOf(state: BoardState): Map<string, string> {
  const map = new Map<string, string>()
  for (const conference of state.conferences) {
    for (const schoolId of conference.schoolIds) map.set(schoolId, conference.id)
  }
  return map
}

export function isDirty(state: BoardState): boolean {
  if (state.addedFcsIds.length > 0) return true
  if (state.presetId !== "blank") return true
  return state.conferences.some((conference) => conference.schoolIds.length > 0)
}

function cloneConference(conference: Conference): Conference {
  return withOptionalDivisions(
    { ...conference, schoolIds: [...conference.schoolIds] },
    conferenceDivisions(conference).map((division) => ({
      ...division,
      schoolIds: [...division.schoolIds],
    })),
  )
}

function stripSchool(conference: Conference, schoolId: string): Conference {
  return withOptionalDivisions(
    { ...conference, schoolIds: conference.schoolIds.filter((id) => id !== schoolId) },
    conferenceDivisions(conference).map((division) => ({
      ...division,
      schoolIds: division.schoolIds.filter((id) => id !== schoolId),
    })),
  )
}

function withOptionalDivisions(conference: Conference, divisions: Division[]): Conference {
  const next = { ...conference }
  if (divisions.length > 0) next.divisions = divisions
  else delete next.divisions
  return next
}

function insertSchool(schoolIds: string[], schoolId: string, beforeId?: string | null): string[] {
  const next = schoolIds.filter((id) => id !== schoolId)
  const index = beforeId ? next.indexOf(beforeId) : -1
  if (index >= 0) next.splice(index, 0, schoolId)
  else next.push(schoolId)
  return next
}

function emptyConference(ids: () => string, name: string, tier: Tier, existing: Conference[]): Conference {
  return {
    id: ids(),
    name,
    tier,
    color: nextColor(existing.map((conference) => conference.color)),
    schoolIds: [],
  }
}
