export type Level = "fbs" | "fcs"

export type School = {
  id: string
  name: string
  abbr: string
  level: Level
  city: string
  region: string
  lat: number
  lon: number
  primary: string
  secondary: string
}

export type Rivalry = {
  id: string
  name: string
  schools: [string, string]
}

export type Tier = "power" | "group" | "none"

export type PresetDivision = {
  name: string
  schools: string[]
}

export type PresetConference = {
  name: string
  tier: Tier
  color: string
  schools: string[]
  divisions?: PresetDivision[]
}

export type Preset = {
  id: string
  label: string
  detail: string
  basedOn2026: boolean
  conferences: PresetConference[]
}

export type ScoringThresholds = {
  green: number
  amber: number
  reference: number
}

export type Catalog = {
  schools: School[]
  rivalries: Rivalry[]
  presets: Preset[]
  thresholds: ScoringThresholds
}

export type Mode = "flat" | "tiers"

export type Division = {
  id: string
  name: string
  schoolIds: string[]
}

export type Conference = {
  id: string
  name: string
  color: string
  tier: Tier
  schoolIds: string[]
  divisions?: Division[]
}

export type BoardState = {
  mode: Mode
  conferences: Conference[]
  addedFcsIds: string[]
  presetId: string | null
}

export type ScoreTone = "green" | "amber" | "red" | "empty"

export type MapShowMode = "all" | "assigned" | "power" | "group" | "conferences"

export type MapColorMode = "conference" | "schools"
