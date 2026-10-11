import { geoAlbers, geoBounds, geoPath, type GeoPermissibleObjects } from "d3-geo"
import type { Feature, Geometry } from "geojson"
import { conferenceDivisions } from "./board"
import { blobPath, type Pt } from "./hull"
import type { Conference, MapColorMode, MapShowMode, School } from "./types"

export type MapRegion = "main" | "hawaii" | "alaska"

export type LandFeature = {
  region: MapRegion
  name: string
  kind: "state" | "country"
  geometry: Geometry
}

export type NorthAmericaGeo = {
  regions: LandFeature[]
  lakes: Geometry[]
}

export type MapBlob = {
  d: string
  color: string
  name: string
  label: Pt | null
  kind: "conference" | "division"
}

export const UNASSIGNED_DOT = "#8d8680"

export type MapDot = {
  id: string
  name: string
  x: number
  y: number
  color: string
  assigned: boolean
  primary: string
  secondary: string
  abbr: string
}

export function mapDotRadius(width: number) {
  return Math.max(5.5, width / 130)
}

export function mapSchoolMarkSize(width: number, inset = false) {
  if (inset) return Math.max(14, Math.min(18, width / 18))
  return Math.max(16, Math.min(22, width / 44))
}

export function conferenceBlobPad(width: number, colorBy: MapColorMode, inset = false) {
  if (inset) {
    const mark = colorBy === "schools" ? mapSchoolMarkSize(width, true) / 2 : 5
    return mark + 2
  }
  const mark = colorBy === "schools" ? mapSchoolMarkSize(width) / 2 : mapDotRadius(width)
  return mark + 3
}

export type MapInset = {
  x: number
  y: number
  width: number
  height: number
  label: string
  land: string[]
  lakes: string[]
  blobs: MapBlob[]
  dots: MapDot[]
}

export type MapScene = {
  width: number
  height: number
  mainHeight: number
  land: string[]
  lakes: string[]
  blobs: MapBlob[]
  dots: MapDot[]
  insets: MapInset[]
}

export function geoRegion(lat: number, lon: number): MapRegion {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "main"
  if (lat > 50 && lon < -130) return "alaska"
  if (lon < -140 && lat < 30) return "hawaii"
  if (lon < -155) return "alaska"
  return "main"
}

export function layoutMap(args: {
  geo: NorthAmericaGeo
  schools: School[]
  conferences: Conference[]
  width: number
  height: number
  show?: MapShowMode
  colorBy?: MapColorMode
  conferenceIds?: string[]
}): MapScene {
  const width = Math.max(320, args.width)
  const height = Math.max(260, args.height)
  const show = args.show ?? "all"
  const colorBy = args.colorBy ?? "conference"
  const selected = new Set(args.conferenceIds ?? [])
  const located = args.schools.filter((school) => Number.isFinite(school.lat) && Number.isFinite(school.lon))
  const membership = new Map<string, Conference>()
  for (const conference of args.conferences) {
    for (const schoolId of conference.schoolIds) membership.set(schoolId, conference)
  }
  const showHawaii = located.some(
    (school) => geoRegion(school.lat, school.lon) === "hawaii" && schoolOnMap(school, membership, show, selected),
  )
  const showAlaska = located.some(
    (school) => geoRegion(school.lat, school.lon) === "alaska" && schoolOnMap(school, membership, show, selected),
  )
  const band = showHawaii || showAlaska ? 128 : 0
  const mainHeight = height - band

  const stateLand = args.geo.regions.filter(
    (item) => item.kind === "state" && item.region === "main" && isLowerFortyEight(item.geometry),
  )
  const projection = geoAlbers().parallels([29.5, 45.5]).rotate([96, 0])
  const fitFeature = {
    type: "FeatureCollection",
    features: stateLand.map((item) => ({ type: "Feature", properties: {}, geometry: item.geometry }) as Feature),
  }
  projection.fitExtent(
    [
      [12, 12],
      [width - 12, mainHeight - 12],
    ],
    fitFeature as GeoPermissibleObjects,
  )
  const path = geoPath(projection)
  const land = stateLand.map((item) => path(item.geometry) ?? "").filter(Boolean)
  const lakes = args.geo.lakes.map((geometry) => path(geometry) ?? "").filter(Boolean)

  const mainSchools = located.filter((school) => geoRegion(school.lat, school.lon) === "main")
  const projectMain = (school: School): Pt | null => {
    const point = projection([school.lon, school.lat])
    return point ? [point[0], point[1]] : null
  }

  const pad = conferenceBlobPad(width, colorBy)
  const { dots, grouped } = placeSchools({
    schools: mainSchools,
    project: projectMain,
    membership,
    show,
    colorBy,
    selected,
    minDist: dotSeparation(width, colorBy),
  })

  const blobs = placeLabels(blobsFromGrouped(grouped, pad))

  const insets: MapInset[] = []
  const insetY = mainHeight + 10
  const insetWidth = Math.min(210, Math.round(width * 0.3))
  const insetHeight = 108
  if (showHawaii) {
    insets.push(
      buildInset({
        geo: args.geo,
        schools: located.filter((school) => geoRegion(school.lat, school.lon) === "hawaii"),
        region: "hawaii",
        label: "Hawaiʻi",
        x: 12,
        y: insetY,
        width: insetWidth,
        height: insetHeight,
        membership,
        show,
        colorBy,
        selected,
      }),
    )
  }
  if (showAlaska) {
    insets.push(
      buildInset({
        geo: args.geo,
        schools: located.filter((school) => geoRegion(school.lat, school.lon) === "alaska"),
        region: "alaska",
        label: "Alaska",
        x: showHawaii ? 28 + insetWidth : 12,
        y: insetY,
        width: insetWidth,
        height: insetHeight,
        membership,
        show,
        colorBy,
        selected,
      }),
    )
  }

  return { width, height, mainHeight, land, lakes, blobs, dots, insets }
}

function isLowerFortyEight(geometry: Geometry): boolean {
  const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(geometry)
  return minLon > -130 && maxLon < -60 && minLat > 23 && maxLat < 50
}

function buildInset(args: {
  geo: NorthAmericaGeo
  schools: School[]
  region: MapRegion
  label: string
  x: number
  y: number
  width: number
  height: number
  membership: Map<string, Conference>
  show: MapShowMode
  colorBy: MapColorMode
  selected: Set<string>
}): MapInset {
  const landFeatures = args.geo.regions.filter((item) => item.region === args.region)
  const collection = {
    type: "FeatureCollection",
    features: landFeatures.map((item) => ({ type: "Feature", properties: {}, geometry: item.geometry }) as Feature),
  }
  const projection = geoAlbers()
  if (collection.features.length > 0) {
    projection.fitExtent(
      [
        [args.x + 8, args.y + 18],
        [args.x + args.width - 8, args.y + args.height - 8],
      ],
      collection as GeoPermissibleObjects,
    )
  }
  const path = geoPath(projection)
  const land = landFeatures.map((item) => path(item.geometry) ?? "").filter(Boolean)
  const lakes: string[] = []
  const pad = conferenceBlobPad(args.width, args.colorBy, true)
  const { dots, grouped } = placeSchools({
    schools: args.schools,
    project: (school) => {
      const point = projection([school.lon, school.lat])
      return point ? [point[0], point[1]] : null
    },
    membership: args.membership,
    show: args.show,
    colorBy: args.colorBy,
    selected: args.selected,
    minDist: dotSeparation(args.width, args.colorBy, true),
  })
  const blobs = blobsFromGrouped(grouped, pad).map((blob) => ({ ...blob, label: null }))
  return {
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    label: args.label,
    land,
    lakes,
    blobs,
    dots,
  }
}

type PlacedGroup = { conference: Conference; points: Pt[]; byDivision: Map<string, Pt[]> }

function dotSeparation(width: number, colorBy: MapColorMode, inset = false): number {
  if (colorBy === "schools") return mapSchoolMarkSize(width, inset) + 2
  const radius = inset ? 5 : mapDotRadius(width)
  return radius * 2 + 2
}

function placeSchools(args: {
  schools: School[]
  project: (school: School) => Pt | null
  membership: Map<string, Conference>
  show: MapShowMode
  colorBy: MapColorMode
  selected: Set<string>
  minDist: number
}): { dots: MapDot[]; grouped: Map<string, PlacedGroup> } {
  const visible: Array<{ school: School; conference: Conference | undefined; point: Pt }> = []
  for (const school of args.schools) {
    const conference = args.membership.get(school.id)
    const point = args.project(school)
    if (!point) continue
    if (!schoolVisible(conference, Boolean(conference), args.show, args.selected)) continue
    visible.push({ school, conference, point })
  }
  const separated = separateOverlaps(
    visible.map((item) => ({ id: item.school.id, x: item.point[0], y: item.point[1] })),
    args.minDist,
  )
  const dots: MapDot[] = []
  const grouped = new Map<string, PlacedGroup>()
  for (const item of visible) {
    const point = separated.get(item.school.id) ?? item.point
    dots.push(makeDot(item.school, point, item.conference, args.colorBy))
    const conference = item.conference
    if (!conference || !conferenceVisible(conference, args.show, args.selected)) continue
    const bucket = grouped.get(conference.id) ?? { conference, points: [], byDivision: new Map<string, Pt[]>() }
    bucket.points.push(point)
    const division = conferenceDivisions(conference).find((division) => division.schoolIds.includes(item.school.id))
    if (division) {
      const points = bucket.byDivision.get(division.id) ?? []
      points.push(point)
      bucket.byDivision.set(division.id, points)
    }
    grouped.set(conference.id, bucket)
  }
  return { dots, grouped }
}

function separateOverlaps(points: Array<{ id: string; x: number; y: number }>, minDist: number): Map<string, Pt> {
  const placed = points.map((point) => ({ ...point }))
  const origin = new Map(points.map((point) => [point.id, [point.x, point.y] as Pt]))
  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const left = placed[i]
        const right = placed[j]
        let dx = right.x - left.x
        let dy = right.y - left.y
        let dist = Math.hypot(dx, dy)
        if (dist >= minDist) continue
        if (dist < 0.5) {
          const angle = overlapAngle(left.id, right.id)
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          dist = 1
        }
        const push = (minDist - dist) / 2
        const ux = dx / dist
        const uy = dy / dist
        nudge(left, origin.get(left.id), -ux * push, -uy * push, minDist)
        nudge(right, origin.get(right.id), ux * push, uy * push, minDist)
        moved = true
      }
    }
    if (!moved) break
  }
  return new Map(placed.map((point) => [point.id, [point.x, point.y]]))
}

function nudge(
  point: { x: number; y: number },
  origin: Pt | undefined,
  dx: number,
  dy: number,
  maxShift: number,
) {
  if (!origin) {
    point.x += dx
    point.y += dy
    return
  }
  const nextX = point.x + dx
  const nextY = point.y + dy
  const shiftX = nextX - origin[0]
  const shiftY = nextY - origin[1]
  const shift = Math.hypot(shiftX, shiftY)
  if (shift <= maxShift || shift === 0) {
    point.x = nextX
    point.y = nextY
    return
  }
  const scale = maxShift / shift
  point.x = origin[0] + shiftX * scale
  point.y = origin[1] + shiftY * scale
}

function overlapAngle(left: string, right: string): number {
  const [a, b] = left < right ? [left, right] : [right, left]
  let hash = 0
  const text = `${a}|${b}`
  for (let index = 0; index < text.length; index += 1) hash = (hash * 33 + text.charCodeAt(index)) >>> 0
  return ((hash % 360) * Math.PI) / 180
}

function makeDot(school: School, point: Pt, conference: Conference | undefined, colorBy: MapColorMode): MapDot {
  const assigned = Boolean(conference)
  return {
    id: school.id,
    name: school.name,
    x: point[0],
    y: point[1],
    color: colorBy === "schools" ? school.primary : conference?.color ?? UNASSIGNED_DOT,
    assigned,
    primary: school.primary,
    secondary: school.secondary,
    abbr: school.abbr,
  }
}

function centroid(points: Pt[]): Pt {
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length
  return [x, y]
}

function schoolOnMap(
  school: School,
  membership: Map<string, Conference>,
  show: MapShowMode,
  selected: Set<string>,
): boolean {
  const conference = membership.get(school.id)
  return schoolVisible(conference, Boolean(conference), show, selected)
}

function conferenceVisible(conference: Conference, show: MapShowMode, selected: Set<string>): boolean {
  if (show === "unassigned") return false
  if (show === "all" || show === "assigned") return true
  if (show === "power") return conference.tier === "power"
  if (show === "group") return conference.tier === "group"
  if (show === "conferences") return selected.has(conference.id)
  return false
}

function schoolVisible(
  conference: Conference | undefined,
  assigned: boolean,
  show: MapShowMode,
  selected: Set<string>,
): boolean {
  if (show === "all") return true
  if (show === "unassigned") return !assigned
  if (!assigned || !conference) return false
  return conferenceVisible(conference, show, selected)
}

function blobsFromGrouped(
  grouped: Map<string, { conference: Conference; points: Pt[]; byDivision: Map<string, Pt[]> }>,
  pad: number,
): MapBlob[] {
  const divisionPad = Math.max(4, pad - 3)
  const blobs: MapBlob[] = []
  for (const bucket of grouped.values()) {
    blobs.push({
      d: blobPath(bucket.points, pad),
      color: bucket.conference.color,
      name: bucket.conference.name,
      label: centroid(bucket.points),
      kind: "conference",
    })
    for (const division of conferenceDivisions(bucket.conference)) {
      const points = bucket.byDivision.get(division.id)
      if (!points || points.length === 0) continue
      blobs.push({
        d: blobPath(points, divisionPad),
        color: bucket.conference.color,
        name: division.name,
        label: centroid(points),
        kind: "division",
      })
    }
  }
  return blobs
}

function placeLabels(blobs: MapBlob[]): MapBlob[] {
  const placed = blobs.map((blob) => ({ ...blob, label: blob.label ? ([...blob.label] as Pt) : null }))
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i].label
        const b = placed[j].label
        if (!a || !b) continue
        if (Math.abs(a[0] - b[0]) < 72 && Math.abs(a[1] - b[1]) < 16) b[1] += 16
      }
    }
  }
  return placed
}
