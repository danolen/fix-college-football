import { readFileSync, writeFileSync } from "node:fs"

// Pair source: CFB 27 rival lists archived from https://collegefootball.gg/rivals/
// Names: Wikipedia "List of NCAA college football rivalry games" FBS trophy templates
const cfb = JSON.parse(readFileSync(new URL("./cfb27-rivals.json", import.meta.url), "utf8"))
const wiki = readFileSync(new URL("./wiki-fbs-rivalries.wikitext", import.meta.url), "utf8")
const schools = JSON.parse(readFileSync(new URL("../data/schools.json", import.meta.url), "utf8"))

const aliases = new Map([
  ["app state", "appalachian-state"],
  ["appalachian state", "appalachian-state"],
  ["california", "california"],
  ["cal", "california"],
  ["florida atlantic", "florida-atlantic"],
  ["fau", "florida-atlantic"],
  ["georgia southern", "georgia-southern"],
  ["hawai'i", "hawaii"],
  ["hawaii", "hawaii"],
  ["jacksonville state", "jacksonville-state"],
  ["louisiana monroe", "ulm"],
  ["ul-monroe", "ulm"],
  ["ulm", "ulm"],
  ["miami", "miami-fl"],
  ["miami (fl)", "miami-fl"],
  ["miami (oh)", "miami-oh"],
  ["miami oh", "miami-oh"],
  ["middle tennessee", "middle-tennessee"],
  ["san diego st", "san-diego-state"],
  ["san diego state", "san-diego-state"],
  ["san jose state", "san-jose-state"],
  ["san josé state", "san-jose-state"],
  ["south florida", "south-florida"],
  ["usf", "south-florida"],
  ["texas a&m", "texas-a-m"],
  ["texas am", "texas-a-m"],
])

const byName = new Map()
for (const school of schools) {
  byName.set(school.name.toLowerCase(), school.id)
  byName.set(school.id, school.id)
  byName.set(school.abbr.toLowerCase(), school.id)
}
for (const [alias, id] of aliases) byName.set(alias, id)

function schoolId(name) {
  const key = String(name)
    .replace(/\[\[|\]\]/g, "")
    .split("|")
    .pop()
    .replace(/ football.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
  if (byName.has(key)) return byName.get(key)
  const slug = key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  if (byName.has(slug)) return byName.get(slug)
  return null
}

function wikiLabel(raw) {
  if (!raw) return ""
  const complete = raw.match(/\[\[([^\[\]]+)\]\]/)
  let label = ""
  if (complete) {
    const parts = complete[1].split("|")
    label = (parts[1] ?? parts[0]).trim()
  } else {
    label = raw.replace(/\[\[|\]\]/g, "").trim()
    if (/\[\[|\]\]/.test(raw)) label = label.split(",")[0].trim()
  }
  label = label.replace(/ \((trophy|game)\)$/i, "")
  label = label.replace(/ football rivalry$/i, "")
  return label.trim()
}

function isGenericPairName(label, aName, bName) {
  const compact = label.toLowerCase().replace(/[–—−-]/g, "-").replace(/\s+/g, "")
  const pair = `${aName}-${bName}`.toLowerCase().replace(/\s+/g, "")
  const rev = `${bName}-${aName}`.toLowerCase().replace(/\s+/g, "")
  return compact === pair || compact === rev
}

function splitWikiFields(raw) {
  const fields = []
  let current = ""
  let depth = 0
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]
    if (char === "[" && next === "[") {
      depth += 1
      current += "[["
      index += 1
      continue
    }
    if (char === "]" && next === "]") {
      depth = Math.max(0, depth - 1)
      current += "]]"
      index += 1
      continue
    }
    if (char === "|" && depth === 0) {
      fields.push(current)
      current = ""
      continue
    }
    current += char
  }
  fields.push(current)
  return fields
}

const names = new Map()
const fbsStart = wiki.indexOf("==NCAA Division I Football Bowl Subdivision==")
const fbsEnd = wiki.indexOf("==NCAA Division I Football Championship Subdivision==")
const fbs = wiki.slice(fbsStart, fbsEnd > 0 ? fbsEnd : undefined)
let wikiHits = 0
let wikiMiss = 0
for (const match of fbs.matchAll(/\{\{Trophy game\|([^]*?)\}\}/g)) {
  const fields = splitWikiFields(match[1])
  if (fields.length < 4) continue
  const game = wikiLabel(fields[0])
  const trophy = wikiLabel(fields[1])
  const left = schoolId(fields[2])
  const right = schoolId(fields[3])
  if (!left || !right || left === right) {
    wikiMiss += 1
    continue
  }
  wikiHits += 1
  const key = [left, right].sort().join("|")
  const aName = schools.find((school) => school.id === left)?.name ?? left
  const bName = schools.find((school) => school.id === right)?.name ?? right
  let name = game
  if (!name || isGenericPairName(name, aName, bName)) name = trophy || game
  if (!name) name = `${aName}–${bName}`
  if (!names.has(key)) names.set(key, name)
}
console.log(`wiki named ${wikiHits}, skipped ${wikiMiss}`)

const pairs = new Map()
for (const team of Object.values(cfb.teams)) {
  const left = schoolId(team.n)
  if (!left) {
    console.error("Unmapped CFB team", team.n)
    continue
  }
  for (const rival of team.rv) {
    const right = schoolId(rival)
    if (!right) {
      console.error("Unmapped rival", rival, "of", team.n)
      continue
    }
    if (left === right) continue
    const key = [left, right].sort().join("|")
    pairs.set(key, [left, right].sort())
  }
}

const rows = [...pairs.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([key, [a, b]], index) => {
    const aName = schools.find((school) => school.id === a)?.name ?? a
    const bName = schools.find((school) => school.id === b)?.name ?? b
    return {
      id: `r-${String(index + 1).padStart(3, "0")}`,
      name: names.get(key) ?? `${aName}–${bName}`,
      schools: [a, b],
    }
  })

writeFileSync(new URL("../data/rivalries.json", import.meta.url), `${JSON.stringify(rows, null, 2)}\n`)

const fbsIds = schools.filter((school) => school.level === "fbs").map((school) => school.id)
const covered = new Set(rows.flatMap((row) => row.schools))
const missing = fbsIds.filter((id) => !covered.has(id))
console.log(`wrote ${rows.length} rivalries; missing FBS: ${missing.length}`)
if (missing.length) console.log(missing.join("\n"))
