import { createBlankBoard } from "@/lib/board"
import { catalog } from "@/lib/catalog"
import type { BoardState } from "@/lib/types"

const KEY = "fix-college-football-v1"

export function loadBoard(raw: string | null): BoardState | null {
  if (!raw) return null
  const parsed = JSON.parse(raw) as Partial<BoardState> & { v?: number }
  if (!parsed || !Array.isArray(parsed.conferences)) throw new Error("Saved board is unreadable.")
  if (parsed.mode !== "flat" && parsed.mode !== "tiers") throw new Error("Saved board is unreadable.")
  return {
    mode: parsed.mode,
    presetId: typeof parsed.presetId === "string" || parsed.presetId === null ? parsed.presetId : null,
    addedFcsIds: Array.isArray(parsed.addedFcsIds) ? parsed.addedFcsIds.filter((id) => typeof id === "string") : [],
    conferences: parsed.conferences
      .filter((conference) => conference && typeof conference.id === "string" && typeof conference.name === "string")
      .map((conference) => ({
        id: conference.id,
        name: conference.name,
        color: typeof conference.color === "string" ? conference.color : "#44403C",
        tier: conference.tier === "power" || conference.tier === "group" ? conference.tier : "none",
        schoolIds: Array.isArray(conference.schoolIds)
          ? conference.schoolIds.filter((id): id is string => typeof id === "string")
          : [],
      })),
  }
}

export function readSavedBoard(): BoardState | null {
  if (typeof window === "undefined") return null
  return loadBoard(window.localStorage.getItem(KEY))
}

export function writeSavedBoard(state: BoardState) {
  window.localStorage.setItem(KEY, JSON.stringify({ v: 1, ...state }))
}

export function clearSavedBoard() {
  window.localStorage.removeItem(KEY)
}

export function makeId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export type BoardSnapshot = {
  board: BoardState
  loadError: string | null
}

let current: BoardSnapshot | null = null
const listeners = new Set<() => void>()

export function subscribeBoard(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getBoardSnapshot(): BoardSnapshot | null {
  current ??= readInitial()
  return current
}

export function getServerBoardSnapshot(): BoardSnapshot | null {
  return null
}

export function replaceBoard(board: BoardState) {
  writeSavedBoard(board)
  publish({ board, loadError: null })
}

export function discardSavedBoard() {
  clearSavedBoard()
  publish({ board: createBlankBoard(makeId), loadError: null })
}

function publish(next: BoardSnapshot) {
  current = next
  for (const listener of listeners) listener()
}

function readInitial(): BoardSnapshot {
  try {
    const saved = readSavedBoard()
    if (!saved) return { board: createBlankBoard(makeId), loadError: null }
    return { board: sanitize(saved), loadError: null }
  } catch {
    return {
      board: createBlankBoard(makeId),
      loadError: "The board saved in this browser could not be read.",
    }
  }
}

function sanitize(saved: BoardState): BoardState {
  const schoolsById = new Map(catalog.schools.map((school) => [school.id, school]))
  const fcsIds = new Set(catalog.schools.filter((school) => school.level === "fcs").map((school) => school.id))
  const fbsIds = new Set(catalog.schools.filter((school) => school.level === "fbs").map((school) => school.id))
  const added = saved.addedFcsIds.filter((id) => fcsIds.has(id))
  const allowed = new Set<string>([...fbsIds, ...added])
  const conferences = saved.conferences
    .map((conference) => ({
      ...conference,
      schoolIds: conference.schoolIds.filter((id) => allowed.has(id) && schoolsById.has(id)),
    }))
    .filter((conference) => conference.name.trim().length > 0)
  if (conferences.length === 0) return createBlankBoard(makeId)
  return { ...saved, addedFcsIds: added, conferences }
}
