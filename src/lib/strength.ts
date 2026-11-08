import ratingsFile from "../../data/sp-plus.json"

export const SP_SEASONS = ratingsFile.seasons
export const SP_WEIGHTS = ratingsFile.weights
export const SP_SCALE = { min: -30, max: 35 }

type RatingsFile = {
  seasons: number[]
  weights: number[]
  schools: Record<string, Array<number | null>>
}

const ratings = ratingsFile as RatingsFile

export type RatedSchool = {
  id: string
  name: string
  rating: number
}

export type ConferenceStrength = {
  mean: number
  spread: number
  best: RatedSchool
  worst: RatedSchool
  schools: RatedSchool[]
}

export function weightedSp(values: Array<number | null>, weights: number[] = SP_WEIGHTS): number | null {
  let weighted = 0
  let total = 0
  for (let index = 0; index < weights.length; index += 1) {
    const value = values[index]
    if (value == null || !Number.isFinite(value)) continue
    weighted += value * weights[index]
    total += weights[index]
  }
  if (total === 0) return null
  return weighted / total
}

export function populationSpread(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function schoolSp(id: string): number | null {
  const values = ratings.schools[id]
  if (!values) return null
  return weightedSp(values)
}

export function summarizeRated(rated: RatedSchool[]): ConferenceStrength | null {
  if (rated.length < 2) return null
  const mean = rated.reduce((sum, school) => sum + school.rating, 0) / rated.length
  const spread = populationSpread(rated.map((school) => school.rating))
  if (spread == null) return null
  const ordered = [...rated].sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name))
  const best = ordered[0]
  const worst = [...ordered].sort((left, right) => left.rating - right.rating || left.name.localeCompare(right.name))[0]
  return { mean, spread, best, worst, schools: ordered }
}

export function summarizeSp(schools: Array<{ id: string; name: string }>): ConferenceStrength | null {
  const rated = schools
    .map((school) => {
      const rating = schoolSp(school.id)
      return rating == null ? null : { id: school.id, name: school.name, rating }
    })
    .filter((school): school is RatedSchool => Boolean(school))
  return summarizeRated(rated)
}

export function formatSp(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const text = Math.abs(rounded).toFixed(1)
  if (rounded > 0) return `+${text}`
  if (rounded < 0) return `-${text}`
  return "0.0"
}

export function formatSpread(value: number): string {
  return Math.abs(Math.round(value * 10) / 10).toFixed(1)
}

export function spTone(value: number): string {
  const rounded = Math.round(value * 10) / 10
  if (rounded > 0) return "text-green-800"
  if (rounded < 0) return "text-rose-800"
  return "text-muted-foreground"
}

export function spPosition(value: number, scale: { min: number; max: number } = SP_SCALE): number {
  const clamped = Math.min(scale.max, Math.max(scale.min, value))
  return ((clamped - scale.min) / (scale.max - scale.min)) * 100
}
