import { isIndependents } from "@/lib/board"

const EARTH_RADIUS_MILES = 3958.8

export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const latDelta = radians(b.lat - a.lat)
  const lonDelta = radians(b.lon - a.lon)
  const latA = radians(a.lat)
  const latB = radians(b.lat)
  const haversine =
    Math.sin(latDelta / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

export function meanPairMiles(schools: Array<{ lat: number; lon: number }>): number | null {
  if (schools.length < 2) return null
  let sum = 0
  let pairs = 0
  for (let left = 0; left < schools.length; left += 1) {
    for (let right = left + 1; right < schools.length; right += 1) {
      sum += milesBetween(schools[left], schools[right])
      pairs += 1
    }
  }
  return sum / pairs
}

export function conferenceTripMiles(schools: Array<{ lat: number; lon: number }>): number | null {
  const mean = meanPairMiles(schools)
  return mean == null ? null : Math.round(mean)
}

export function boardTripMiles(
  conferences: Array<{ name: string; schoolIds: string[] }>,
  schoolsById: Map<string, { lat: number; lon: number }>,
): number | null {
  let weighted = 0
  let counted = 0
  for (const conference of conferences) {
    if (isIndependents(conference)) continue
    const schools = conference.schoolIds
      .map((id) => schoolsById.get(id))
      .filter((school): school is { lat: number; lon: number } => Boolean(school))
    const mean = meanPairMiles(schools)
    if (mean == null) continue
    weighted += mean * schools.length
    counted += schools.length
  }
  if (counted === 0) return null
  return Math.round(weighted / counted)
}

export function formatTripMiles(miles: number): string {
  return `${miles.toLocaleString("en-US")} mi`
}
