import { nextColor } from "@/lib/colors"
import type { BoardState, Conference, Mode, Preset, Tier } from "@/lib/types"

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
    conferences: preset.conferences.map((conference) => ({
      id: ids(),
      name: conference.name,
      tier: conference.tier,
      color: conference.color,
      schoolIds: [...conference.schools],
    })),
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
): BoardState {
  const conferences = state.conferences.map((conference) => ({
    ...conference,
    schoolIds: conference.schoolIds.filter((id) => id !== schoolId),
  }))
  if (targetConferenceId) {
    const target = conferences.find((conference) => conference.id === targetConferenceId)
    if (target) {
      const index = beforeId ? target.schoolIds.indexOf(beforeId) : -1
      if (index >= 0) target.schoolIds.splice(index, 0, schoolId)
      else target.schoolIds.push(schoolId)
    }
  }
  return { ...state, presetId: null, conferences }
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
    conferences: state.conferences.map((conference) => ({
      ...conference,
      schoolIds: conference.schoolIds.filter((id) => id !== schoolId),
    })),
  }
}

export function shareUnlocked(state: BoardState): boolean {
  return state.conferences.length > 0 && state.conferences.every((conference) => conference.schoolIds.length >= 2)
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
  return { ...conference, schoolIds: [...conference.schoolIds] }
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
