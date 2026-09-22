import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { feature } from "topojson-client"

const countriesTopo = JSON.parse(readFileSync("/tmp/geo/countries-110m.json", "utf8"))
const statesTopo = JSON.parse(readFileSync("/tmp/geo/states-10m.json", "utf8"))
const lakesFc = JSON.parse(readFileSync("/tmp/geo/lakes.json", "utf8"))

const countries = feature(countriesTopo, countriesTopo.objects.countries)
const states = feature(statesTopo, statesTopo.objects.states)

function roundCoords(value, digits = 3) {
  const factor = 10 ** digits
  if (typeof value[0] === "number") {
    value[0] = Math.round(value[0] * factor) / factor
    value[1] = Math.round(value[1] * factor) / factor
    return
  }
  for (const child of value) roundCoords(child, digits)
}

function explode(geometry) {
  if (geometry.type === "Polygon") return [geometry]
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
  }
  return []
}

function centroid(geometry) {
  const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0][0]
  let lon = 0
  let lat = 0
  for (const pair of ring) {
    lon += pair[0]
    lat += pair[1]
  }
  return [lon / ring.length, lat / ring.length]
}

const regions = []

for (const item of states.features) {
  const name = item.properties?.name ?? "State"
  for (const geometry of explode(item.geometry)) {
    roundCoords(geometry.coordinates)
    const [, lat] = centroid(geometry)
    let region = "main"
    if (name === "Alaska" || lat > 50) region = "alaska"
    else if (name === "Hawaii") region = "hawaii"
    regions.push({ region, name, kind: "state", geometry })
  }
}

for (const item of countries.features) {
  const id = String(item.id)
  if (id !== "124" && id !== "484") continue
  const name = id === "124" ? "Canada" : "Mexico"
  for (const geometry of explode(item.geometry)) {
    const [lon, lat] = centroid(geometry)
    if (name === "Canada" && (lat > 58 || lon < -141)) continue
    roundCoords(geometry.coordinates)
    regions.push({ region: "main", name, kind: "country", geometry })
  }
}

const lakeNames = new Set(["l. ontario", "l. erie", "lake superior", "lake huron", "lake michigan"])
const lakes = []
for (const item of lakesFc.features) {
  const name = String(item.properties?.name ?? "").replace(/\s+/g, " ").trim().toLowerCase()
  if (!lakeNames.has(name)) continue
  for (const geometry of explode(item.geometry)) {
    roundCoords(geometry.coordinates, 3)
    lakes.push(geometry)
  }
}

mkdirSync("public/geo", { recursive: true })
const payload = { regions, lakes }
writeFileSync("public/geo/north-america.json", JSON.stringify(payload))
console.log(`regions ${regions.length}, lakes ${lakes.length}, bytes ${Buffer.byteLength(JSON.stringify(payload))}`)
