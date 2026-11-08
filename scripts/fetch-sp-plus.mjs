import { readFileSync, writeFileSync } from "node:fs"

// Pulls final SP+ from CollegeFootballData and writes data/sp-plus.json.
// After a season ends, set SEASONS to the last five completed seasons and run:
//   CFBD_API_KEY=... node scripts/fetch-sp-plus.mjs
// Leave the in-progress season out until Connelly's final ratings are published.
const SEASONS = [2021, 2022, 2023, 2024, 2025]
const WEIGHTS = [1, 2, 3, 4, 5]

const key = process.env.CFBD_API_KEY
if (!key) {
  console.error("Set CFBD_API_KEY. The key is not stored in the repo.")
  process.exit(1)
}

const schools = JSON.parse(readFileSync(new URL("../data/schools.json", import.meta.url), "utf8"))

function normalize(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
}

const aliases = new Map([
  ["app state", "appalachian-state"],
  ["connecticut", "uconn"],
  ["miami", "miami-fl"],
  ["florida international", "fiu"],
  ["hawaii", "hawaii"],
  ["louisiana monroe", "ulm"],
  ["ul monroe", "ulm"],
  ["massachusetts", "umass"],
  ["miami oh", "miami-oh"],
  ["middle tennessee state", "middle-tennessee"],
  ["mississippi", "ole-miss"],
  ["north carolina state", "nc-state"],
  ["san jose state", "san-jose-state"],
  ["southern california", "usc"],
  ["southern methodist", "smu"],
  ["southern mississippi", "southern-miss"],
  ["texas christian", "tcu"],
  ["texas san antonio", "utsa"],
  ["ut san antonio", "utsa"],
])

const byName = new Map()
for (const school of schools) {
  byName.set(normalize(school.name), school.id)
  byName.set(normalize(school.id.replace(/-/g, " ")), school.id)
}
for (const [alias, id] of aliases) byName.set(alias, id)

function schoolId(team) {
  const keyName = normalize(team)
  if (byName.has(keyName)) return byName.get(keyName)
  const parenthetical = String(team).match(/\(([^)]+)\)/)
  if (parenthetical) {
    const withState = normalize(`${team.replace(/\([^)]*\)/g, "")} ${parenthetical[1]}`)
    if (byName.has(withState)) return byName.get(withState)
  }
  return null
}

const ignoredTeams = new Set(["nationalaverages"])
// In the catalog as FBS, but not in the SP+ feed for 2021–2025.
const notYetRated = new Set(["north-dakota-state", "sacramento-state"])
const ratings = new Map(schools.filter((school) => school.level === "fbs").map((school) => [school.id, SEASONS.map(() => null)]))
const unknown = new Map()

for (const [index, year] of SEASONS.entries()) {
  const response = await fetch(`https://api.collegefootballdata.com/ratings/sp?year=${year}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  })
  if (!response.ok) {
    console.error(`${year} request failed: ${response.status}`)
    process.exit(1)
  }
  const rows = await response.json()
  if (!Array.isArray(rows) || rows.length < 100) {
    console.error(`${year} returned ${Array.isArray(rows) ? rows.length : "no"} teams`)
    process.exit(1)
  }
  for (const row of rows) {
    if (ignoredTeams.has(normalize(row.team))) continue
    const id = schoolId(row.team)
    if (!id) {
      unknown.set(row.team, (unknown.get(row.team) ?? 0) + 1)
      continue
    }
    if (!ratings.has(id)) ratings.set(id, SEASONS.map(() => null))
    const value = Number(row.rating)
    if (!Number.isFinite(value)) {
      console.error(`${year} ${row.team} has no numeric rating`)
      process.exit(1)
    }
    ratings.get(id)[index] = Math.round(value * 10) / 10
  }
  console.error(`${year}: ${rows.length} teams`)
}

if (unknown.size > 0) {
  console.error("Unmatched CollegeFootballData teams:")
  for (const name of [...unknown.keys()].sort()) console.error(`  ${name}`)
  process.exit(1)
}

const missing = [...ratings.entries()]
  .filter(([id, values]) => values.every((value) => value == null) && !notYetRated.has(id))
  .map(([id]) => id)
if (missing.length > 0) {
  console.error("FBS schools with no SP+ season:")
  for (const id of missing.sort()) console.error(`  ${id}`)
  process.exit(1)
}
for (const [id, values] of ratings) {
  if (values.every((value) => value == null)) ratings.delete(id)
}

const schoolsOut = Object.fromEntries([...ratings.entries()].sort(([a], [b]) => a.localeCompare(b)))
const payload = {
  seasons: SEASONS,
  weights: WEIGHTS,
  source: "https://api.collegefootballdata.com/ratings/sp",
  retrieved: new Date().toISOString().slice(0, 10),
  schools: schoolsOut,
}
writeFileSync(new URL("../data/sp-plus.json", import.meta.url), `${JSON.stringify(payload, null, 2)}\n`)
console.error(`Wrote ${Object.keys(schoolsOut).length} schools`)
