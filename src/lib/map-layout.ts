import { geoAlbers, geoBounds, geoPath, type GeoPermissibleObjects } from "d3-geo"
import type { Feature, Geometry } from "geojson"
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
}): MapScene {
  const width = Math.max(320, args.width)
  const height = Math.max(260, args.height)
  const show = args.show ?? "all"
  const colorBy = args.colorBy ?? "conference"
  const located = args.schools.filter((school) => Number.isFinite(school.lat) && Number.isFinite(school.lon))
  const membership = new Map<string, Conference>()
  for (const conference of args.conferences) {
    for (const schoolId of conference.schoolIds) membership.set(schoolId, conference)
  }
  const showHawaii = located.some((school) => geoRegion(school.lat, school.lon) === "hawaii")
  const showAlaska = located.some((school) => geoRegion(school.lat, school.lon) === "alaska")
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
  const dots: MapDot[] = []
  const grouped = new Map<string, { conference: Conference; points: Pt[] }>()
  for (const school of mainSchools) {
    const conference = membership.get(school.id)
    const point = projectMain(school)
    if (!point) continue
    const assigned = Boolean(conference)
    if (show === "assigned" && !assigned) continue
    dots.push(makeDot(school, point, conference, colorBy))
    if (!conference) continue
    const bucket = grouped.get(conference.id) ?? { conference, points: [] }
    bucket.points.push(point)
    grouped.set(conference.id, bucket)
  }

  const blobs = placeLabels(
    [...grouped.values()].map((bucket) => ({
      d: blobPath(bucket.points, pad),
      color: bucket.conference.color,
      name: bucket.conference.name,
      label: centroid(bucket.points),
    })),
  )

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
  const grouped = new Map<string, { conference: Conference; points: Pt[] }>()
  const dots: MapDot[] = []
  const pad = conferenceBlobPad(args.width, args.colorBy, true)
  for (const school of args.schools) {
    const conference = args.membership.get(school.id)
    const point = projection([school.lon, school.lat])
    if (!point) continue
    const assigned = Boolean(conference)
    if (args.show === "assigned" && !assigned) continue
    dots.push(makeDot(school, point, conference, args.colorBy))
    if (!conference) continue
    const bucket = grouped.get(conference.id) ?? { conference, points: [] }
    bucket.points.push(point)
    grouped.set(conference.id, bucket)
  }
  const blobs = [...grouped.values()].map((bucket) => ({
    d: blobPath(bucket.points, pad),
    color: bucket.conference.color,
    name: bucket.conference.name,
    label: null,
  }))
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
