import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { applyPreset } from "./board.ts"
import { sanitizeBoard } from "./storage.ts"
import type { Preset, School } from "./types.ts"

const presets = JSON.parse(readFileSync(new URL("../../data/presets.json", import.meta.url), "utf8")) as Preset[]
const schools = JSON.parse(readFileSync(new URL("../../data/schools.json", import.meta.url), "utf8")) as School[]
const known = new Set(schools.map((school) => school.id))

function season(year: string) {
  const preset = presets.find((item) => item.id === year)
  assert.ok(preset, year)
  return preset
}

function home(year: string, schoolId: string) {
  const matches = season(year).conferences.filter((conference) => conference.schools.includes(schoolId))
  assert.equal(matches.length <= 1, true, `${schoolId} in ${year}`)
  return matches[0]?.name ?? null
}

describe("FBS season presets", () => {
  it("covers every season from 2010 through 2026, newest first", () => {
    assert.deepEqual(
      presets.map((preset) => preset.id),
      ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"],
    )
  })

  it("uses only known schools, once per season, with no tiny conferences", () => {
    for (const preset of presets) {
      const seen = new Set<string>()
      for (const conference of preset.conferences) {
        assert.ok(conference.schools.length >= 2, `${preset.id} ${conference.name}`)
        for (const id of conference.schools) {
          assert.equal(known.has(id), true, `${preset.id} ${id}`)
          assert.equal(seen.has(id), false, `${preset.id} duplicate ${id}`)
          seen.add(id)
        }
      }
    }
  })

  it("keeps the published conference sizes", () => {
    const sizes: Record<string, Record<string, number>> = {
      "2010": { ACC: 12, "Big East": 8, "Big Ten": 11, "Big 12": 12, "Pac-10": 10, SEC: 12, "Conference USA": 12, MAC: 13, "Mountain West": 9, "Sun Belt": 9, WAC: 9, Independents: 3 },
      "2012": { ACC: 12, "Big East": 8, "Big Ten": 12, "Big 12": 10, "Pac-12": 12, SEC: 14, "Conference USA": 12, MAC: 13, "Mountain West": 10, "Sun Belt": 10, WAC: 7, Independents: 4 },
      "2013": { ACC: 14, "Big Ten": 12, "Big 12": 10, "Pac-12": 12, SEC: 14, American: 10, "Conference USA": 14, MAC: 13, "Mountain West": 12, "Sun Belt": 8, Independents: 6 },
      "2014": { ACC: 14, "Big Ten": 14, "Big 12": 10, "Pac-12": 12, SEC: 14, American: 11, "Conference USA": 13, MAC: 13, "Mountain West": 12, "Sun Belt": 11, Independents: 4 },
      "2020": { ACC: 15, "Big Ten": 14, "Big 12": 10, "Pac-12": 12, SEC: 14, American: 11, "Conference USA": 14, MAC: 12, "Mountain West": 12, "Sun Belt": 10, Independents: 6 },
      "2024": { ACC: 17, "Big Ten": 18, "Big 12": 16, SEC: 16, American: 14, "Conference USA": 10, MAC: 12, "Mountain West": 12, "Pac-12": 2, "Sun Belt": 14, Independents: 3 },
      "2025": { ACC: 17, "Big Ten": 18, "Big 12": 16, SEC: 16, American: 14, "Conference USA": 12, MAC: 13, "Mountain West": 12, "Pac-12": 2, "Sun Belt": 14, Independents: 2 },
      "2026": { ACC: 17, "Big Ten": 18, "Big 12": 16, SEC: 16, American: 14, "Conference USA": 10, MAC: 13, "Mountain West": 10, "Pac-12": 8, "Sun Belt": 14, Independents: 2 },
    }
    for (const [year, expected] of Object.entries(sizes)) {
      const got = Object.fromEntries(season(year).conferences.map((conference) => [conference.name, conference.schools.length]))
      assert.deepEqual(got, expected, year)
    }
  })

  it("follows the realignment record for schools that changed conferences", () => {
    assert.equal(home("2010", "nebraska"), "Big 12")
    assert.equal(home("2011", "nebraska"), "Big Ten")
    assert.equal(home("2010", "colorado"), "Big 12")
    assert.equal(home("2011", "colorado"), "Pac-12")
    assert.equal(home("2010", "utah"), "Mountain West")
    assert.equal(home("2011", "utah"), "Pac-12")
    assert.equal(home("2010", "byu"), "Mountain West")
    assert.equal(home("2011", "byu"), "Independents")
    assert.equal(home("2011", "tcu"), "Mountain West")
    assert.equal(home("2012", "tcu"), "Big 12")
    assert.equal(home("2011", "missouri"), "Big 12")
    assert.equal(home("2012", "missouri"), "SEC")
    assert.equal(home("2012", "texas-a-m"), "SEC")
    assert.equal(home("2011", "west-virginia"), "Big East")
    assert.equal(home("2012", "west-virginia"), "Big 12")
    assert.equal(home("2012", "pittsburgh"), "Big East")
    assert.equal(home("2013", "pittsburgh"), "ACC")
    assert.equal(home("2013", "syracuse"), "ACC")
    assert.equal(home("2013", "louisville"), "American")
    assert.equal(home("2014", "louisville"), "ACC")
    assert.equal(home("2013", "maryland"), "ACC")
    assert.equal(home("2014", "maryland"), "Big Ten")
    assert.equal(home("2014", "rutgers"), "Big Ten")
    assert.equal(home("2010", "boise-state"), "WAC")
    assert.equal(home("2011", "boise-state"), "Mountain West")
    assert.equal(home("2012", "fresno-state"), "Mountain West")
    assert.equal(home("2012", "utsa"), "WAC")
    assert.equal(home("2013", "utsa"), "Conference USA")
    assert.equal(home("2013", "texas-state"), "Sun Belt")
    assert.equal(home("2014", "navy"), "Independents")
    assert.equal(home("2015", "navy"), "American")
    assert.equal(home("2023", "army"), "Independents")
    assert.equal(home("2024", "army"), "American")
    assert.equal(home("2019", "notre-dame"), "Independents")
    assert.equal(home("2020", "notre-dame"), "ACC")
    assert.equal(home("2021", "notre-dame"), "Independents")
    assert.equal(home("2019", "uconn"), "American")
    assert.equal(home("2020", "uconn"), "Independents")
    assert.equal(home("2022", "byu"), "Independents")
    assert.equal(home("2023", "byu"), "Big 12")
    assert.equal(home("2023", "cincinnati"), "Big 12")
    assert.equal(home("2023", "oklahoma"), "Big 12")
    assert.equal(home("2024", "oklahoma"), "SEC")
    assert.equal(home("2024", "texas"), "SEC")
    assert.equal(home("2023", "oregon"), "Pac-12")
    assert.equal(home("2024", "oregon"), "Big Ten")
    assert.equal(home("2024", "smu"), "ACC")
    assert.equal(home("2024", "stanford"), "ACC")
    assert.equal(home("2025", "texas-state"), "Sun Belt")
    assert.equal(home("2026", "texas-state"), "Pac-12")
    assert.equal(home("2025", "louisiana-tech"), "Conference USA")
    assert.equal(home("2026", "louisiana-tech"), "Sun Belt")
    assert.equal(home("2025", "utep"), "Conference USA")
    assert.equal(home("2026", "utep"), "Mountain West")
    assert.equal(home("2026", "boise-state"), "Pac-12")
    assert.equal(home("2015", "umass"), "MAC")
    assert.equal(home("2016", "umass"), "Independents")
    assert.equal(home("2025", "umass"), "MAC")
    assert.equal(home("2022", "liberty"), "Independents")
    assert.equal(home("2023", "liberty"), "Conference USA")
  })

  it("leaves schools out until they play FBS, and while a program is dropped", () => {
    assert.equal(home("2011", "south-alabama"), null)
    assert.equal(home("2012", "south-alabama"), "Sun Belt")
    assert.equal(home("2013", "appalachian-state"), null)
    assert.equal(home("2014", "appalachian-state"), "Sun Belt")
    assert.equal(home("2014", "charlotte"), null)
    assert.equal(home("2015", "charlotte"), "Conference USA")
    assert.equal(home("2014", "uab"), "Conference USA")
    assert.equal(home("2015", "uab"), null)
    assert.equal(home("2016", "uab"), null)
    assert.equal(home("2017", "uab"), "Conference USA")
    assert.equal(home("2017", "idaho"), "Sun Belt")
    assert.equal(home("2018", "idaho"), null)
    assert.equal(home("2017", "liberty"), null)
    assert.equal(home("2018", "liberty"), "Independents")
    assert.equal(home("2021", "james-madison"), null)
    assert.equal(home("2022", "james-madison"), "Sun Belt")
    assert.equal(home("2022", "sam-houston"), null)
    assert.equal(home("2023", "sam-houston"), "Conference USA")
    assert.equal(home("2023", "kennesaw-state"), null)
    assert.equal(home("2024", "kennesaw-state"), "Conference USA")
    assert.equal(home("2024", "delaware"), null)
    assert.equal(home("2025", "delaware"), "Conference USA")
    assert.equal(home("2025", "missouri-state"), "Conference USA")
    assert.equal(home("2025", "north-dakota-state"), null)
    assert.equal(home("2026", "north-dakota-state"), "Mountain West")
    assert.equal(home("2025", "sacramento-state"), null)
    assert.equal(home("2026", "sacramento-state"), "MAC")
  })

  it("treats the Big East as a power conference and the rebuilt Pac-12 as a group conference", () => {
    assert.equal(season("2010").conferences.find((conference) => conference.name === "Big East")?.tier, "power")
    assert.equal(season("2012").conferences.find((conference) => conference.name === "Pac-12")?.tier, "power")
    assert.equal(season("2013").conferences.find((conference) => conference.name === "American")?.tier, "group")
    assert.equal(season("2024").conferences.find((conference) => conference.name === "Pac-12")?.tier, "group")
    assert.equal(season("2026").conferences.find((conference) => conference.name === "Pac-12")?.tier, "group")
    assert.equal(season("2024").basedOn2026, false)
    assert.equal(season("2026").basedOn2026, true)
  })

  it("keeps that season's teams and sets later FBS schools aside", () => {
    const fbsIds = schools.filter((school) => school.level === "fbs").map((school) => school.id)
    const fcsIds = schools.filter((school) => school.level === "fcs").map((school) => school.id)
    const levels = { fbsIds, fcsIds }
    const state = applyPreset(season("2010"), "flat", () => "c", levels)
    assert.deepEqual(state.addedFcsIds, ["idaho"])
    assert.equal(state.ignoredIds.includes("nebraska"), false)
    assert.equal(state.ignoredIds.includes("james-madison"), true)
    assert.equal(state.ignoredIds.includes("north-dakota-state"), true)
    assert.match(season("2010").detail, /set aside/)
    const reloaded = sanitizeBoard({ ...state, addedFcsIds: [] })
    assert.ok(reloaded.conferences.find((conference) => conference.name === "WAC")?.schoolIds.includes("idaho"))
    assert.ok(reloaded.addedFcsIds.includes("idaho"))
    assert.equal(reloaded.ignoredIds.includes("james-madison"), true)
    const modern = applyPreset(season("2026"), "flat", () => "c", levels)
    assert.deepEqual(modern.addedFcsIds, [])
    assert.deepEqual(modern.ignoredIds, [])
    assert.doesNotMatch(season("2026").detail, /set aside/)
  })

  it("names every conference membership change in the season note", () => {
    const expected: Record<string, string[]> = {
      "2011": ["Boise State", "Mountain West", "BYU", "Nebraska", "Big Ten", "Colorado", "Utah", "Pac-12"],
      "2012": ["Missouri", "Texas A&M", "SEC", "TCU", "West Virginia", "Big 12", "Temple", "Big East", "Fresno State", "Hawai'i", "Nevada", "UMass", "South Alabama", "Texas State", "UTSA"],
      "2013": ["Pittsburgh", "Syracuse", "ACC", "American", "Houston", "Memphis", "SMU", "UCF", "Florida Atlantic", "FIU", "Middle Tennessee", "North Texas", "Louisiana Tech", "UTSA", "San Jose State", "Utah State", "Texas State", "Georgia State", "Idaho", "New Mexico State", "WAC"],
      "2014": ["Maryland", "Rutgers", "Big Ten", "Louisville", "ACC", "East Carolina", "Tulane", "Tulsa", "Western Kentucky", "Old Dominion", "Appalachian State", "Georgia Southern", "Idaho", "New Mexico State"],
      "2015": ["Navy", "Charlotte", "UAB"],
      "2016": ["UMass"],
      "2017": ["UAB", "Coastal Carolina"],
      "2018": ["Liberty", "Idaho", "New Mexico State"],
      "2019": ["No teams change conferences"],
      "2020": ["Notre Dame", "ACC", "UConn"],
      "2021": ["Notre Dame"],
      "2022": ["James Madison", "Marshall", "Old Dominion", "Southern Miss"],
      "2023": ["BYU", "Cincinnati", "Houston", "UCF", "Big 12", "Charlotte", "Florida Atlantic", "North Texas", "Rice", "UAB", "UTSA", "Liberty", "New Mexico State", "Jacksonville State", "Sam Houston"],
      "2024": ["Oklahoma", "Texas", "SEC", "Oregon", "UCLA", "USC", "Washington", "Big Ten", "Arizona State", "Colorado", "Utah", "Big 12", "Stanford", "SMU", "ACC", "Army", "Kennesaw State", "Oregon State", "Washington State"],
      "2025": ["Delaware", "Missouri State", "UMass"],
      "2026": ["Boise State", "Colorado State", "Fresno State", "San Diego State", "Texas State", "Utah State", "Pac-12", "North Dakota State", "Northern Illinois", "UTEP", "Louisiana Tech", "Sacramento State"],
    }
    for (const [year, phrases] of Object.entries(expected)) {
      const detail = season(year).detail
      for (const phrase of phrases) {
        assert.equal(detail.includes(phrase), true, `${year} note is missing ${phrase}`)
      }
    }
  })
})
