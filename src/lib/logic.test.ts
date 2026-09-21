import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  addConference,
  applyPreset,
  canDeleteConference,
  createBlankBoard,
  deleteConference,
  moveConferenceTier,
  moveSchool,
  setMode,
  shareUnlocked,
} from "./board.ts"
import { scoreRivalries, scoreTone, shareText } from "./scoring.ts"
import type { Preset, School } from "./types.ts"

const ids = (() => {
  let n = 0
  return () => `id-${++n}`
})()

const school = (id: string, level: "fbs" | "fcs"): School => ({
  id,
  name: id,
  abbr: id.slice(0, 3).toUpperCase(),
  level,
  city: "City",
  region: "ST",
  lat: 40,
  lon: -90,
  primary: "#111111",
  secondary: "#eeeeee",
})

describe("board", () => {
  it("keeps placements when switching modes", () => {
    let state = createBlankBoard(ids)
    const target = state.conferences[1]
    state = moveSchool(state, "alpha", target.id)
    state = setMode(state, "tiers")
    const moved = state.conferences.find((conference) => conference.id === target.id)
    assert.deepEqual(moved?.schoolIds, ["alpha"])
    assert.equal(state.mode, "tiers")
    state = setMode(state, "flat")
    assert.deepEqual(state.conferences.find((conference) => conference.id === target.id)?.schoolIds, ["alpha"])
  })

  it("refuses to delete the last conference in a tier", () => {
    let state = setMode(createBlankBoard(ids), "tiers")
    const first = state.conferences[0]
    state = moveConferenceTier(state, first.id, "power") ?? state
    assert.equal(canDeleteConference(state, first.id), false)
    assert.equal(deleteConference(state, first.id), null)
    const group = state.conferences.find((conference) => conference.tier === "none")
    assert.ok(group)
    assert.equal(deleteConference(state, group.id) !== null, true)
  })

  it("returns schools to the pool when a conference is deleted", () => {
    let state = createBlankBoard(ids)
    const extra = addConference(state, "group", ids)
    const doomed = extra.conferences.at(-1)
    assert.ok(doomed)
    state = moveSchool(extra, "beta", doomed.id)
    const next = deleteConference(state, doomed.id)
    assert.ok(next)
    assert.equal(next.conferences.some((conference) => conference.schoolIds.includes("beta")), false)
  })

  it("locks sharing until every conference has two schools", () => {
    let state = createBlankBoard(ids)
    assert.equal(shareUnlocked(state), false)
    state = {
      ...state,
      conferences: state.conferences.map((conference) => ({ ...conference, schoolIds: ["a", "b"] })),
    }
    assert.equal(shareUnlocked(state), true)
  })

  it("does not let Independents block sharing", () => {
    let state = createBlankBoard(ids)
    state = {
      ...state,
      conferences: state.conferences.map((conference, index) =>
        index === 0
          ? { ...conference, name: "Independents", schoolIds: [] }
          : { ...conference, schoolIds: [`a${index}`, `b${index}`] },
      ),
    }
    assert.equal(shareUnlocked(state), true)
    state = {
      ...state,
      conferences: state.conferences.map((conference) =>
        conference.name === "Independents" ? { ...conference, schoolIds: ["notre-dame"] } : conference,
      ),
    }
    assert.equal(shareUnlocked(state), true)
    state = {
      ...state,
      conferences: state.conferences.map((conference) =>
        conference.name === "Conference 2" ? { ...conference, schoolIds: ["only"] } : conference,
      ),
    }
    assert.equal(shareUnlocked(state), false)
  })

  it("applies a preset without dropping membership when the mode changes", () => {
    const preset: Preset = {
      id: "2026",
      label: "2026",
      detail: "season",
      basedOn2026: true,
      conferences: [
        { name: "SEC", tier: "power", color: "#111111", schools: ["ala", "uga"] },
        { name: "MAC", tier: "group", color: "#222222", schools: ["ohio"] },
      ],
    }
    const flat = applyPreset(preset, "flat", ids)
    const tiers = setMode(flat, "tiers")
    assert.deepEqual(
      tiers.conferences.map((conference) => [conference.name, conference.tier, conference.schoolIds]),
      [
        ["SEC", "power", ["ala", "uga"]],
        ["MAC", "group", ["ohio"]],
      ],
    )
  })
})

describe("scoring", () => {
  const schools = [school("a", "fbs"), school("b", "fbs"), school("c", "fcs"), school("d", "fcs")]
  const schoolsById = new Map(schools.map((item) => [item.id, item]))

  it("ignores an FCS rivalry until both schools are on the board", () => {
    const rivalries = [
      { id: "fbs", name: "Bowl", schools: ["a", "b"] as [string, string] },
      { id: "fcs", name: "Trophy", schools: ["c", "d"] as [string, string] },
    ]
    const hidden = scoreRivalries({
      rivalries,
      schoolsById,
      onBoard: new Set(["a", "b"]),
      conferenceOf: new Map([
        ["a", "sec"],
        ["b", "sec"],
      ]),
    })
    assert.equal(hidden.total, 1)
    assert.equal(hidden.kept, 1)
    const shown = scoreRivalries({
      rivalries,
      schoolsById,
      onBoard: new Set(["a", "b", "c", "d"]),
      conferenceOf: new Map([
        ["a", "sec"],
        ["b", "sec"],
        ["c", "mvfc"],
      ]),
    })
    assert.equal(shown.total, 2)
    assert.equal(shown.kept, 1)
  })

  it("uses the 25/45 and 15/45 cuts", () => {
    const thresholds = { green: 25, amber: 15, reference: 45 }
    assert.equal(scoreTone(25, 45, thresholds), "green")
    assert.equal(scoreTone(15, 45, thresholds), "amber")
    assert.equal(scoreTone(14, 45, thresholds), "red")
    assert.equal(scoreTone(5, 9, thresholds), "green")
  })

  it("builds the share sentence", () => {
    assert.equal(
      shareText(12, 40),
      "I tried to fix college football. 12/40 rivalries kept together. Think you can do better? #FixCollegeFootball",
    )
  })
})
