"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { BoardState, Catalog, Conference, Mode, Preset, School, Tier } from "@/lib/types"
import type { ScoredRivalry } from "@/lib/scoring"

export type BoardApi = {
  catalog: Catalog
  state: BoardState
  schoolsById: Map<string, School>
  onBoard: School[]
  fbs: School[]
  fcs: School[]
  scoreKept: number
  scoreTotal: number
  scoreRows: ScoredRivalry[]
  unlocked: boolean
  tab: "build" | "share"
  setTab: (tab: "build" | "share") => void
  setMode: (mode: Mode) => void
  requestPreset: (preset: Preset) => void
  requestBlank: () => void
  requestReset: () => void
  addConference: (tier: Tier) => void
  renameConference: (id: string, name: string) => void
  recolorConference: (id: string, color: string) => void
  requestDelete: (conference: Conference) => void
  moveTier: (id: string, tier: Tier) => void
  addFcs: (id: string) => void
  removeFcs: (id: string) => void
  assignSchools: (schoolIds: string[], conferenceId: string | null) => void
  canDelete: (id: string) => boolean
}

const BoardContext = createContext<BoardApi | null>(null)

export function BoardProvider({ value, children }: { value: BoardApi; children: ReactNode }) {
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard() {
  const value = useContext(BoardContext)
  if (!value) throw new Error("Board is not ready.")
  return value
}
