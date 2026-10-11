import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { applyPreset, createBlankBoard } from "./board.ts"
import { defaultByes, defaultHardMode, playoffPlans, titlePlans, updateHardMode } from "./hard-mode.ts"
import { buildSchedule } from "./schedule.ts"
import { loadBoard } from "./storage.ts"
import type { BoardState, Conference, HardModeSettings, Rivalry } from "./types.ts"

const ids = (() => {
  let n = 0
  return () => `id-${++n}`
})()

function conference(partial: Partial<Conference> & Pick<Conference, "id" | "name" | "schoolIds">): Conference {
  return {
    color: "#111111",
    tier: "none",
    ...partial,
  }
}

function board(partial: Partial<BoardState> & { conferences: Conference[] }, hard?: Partial<HardModeSettings>): BoardState {
  const { hardMode: existing, ...rest } = partial
  return {
    mode: "flat",
    addedFcsIds: [],
    ignoredIds: [],
    presetId: null,
    ...rest,
    hardMode: { ...defaultHardMode(), enabled: true, ...existing, ...hard },
  }
}

const rivalry = (id: string, schools: [string, string]): Rivalry => ({ id, name: id, schools })

describe("hard mode defaults", () => {
  it("gives a 12-team playoff four byes and an eight-game conference schedule", () => {
    const settings = defaultHardMode()
    assert.equal(settings.enabled, false)
    assert.equal(settings.playoffTeams, 12)
    assert.equal(settings.playoffByes, 4)
    assert.equal(settings.totalGames, 12)
    assert.equal(settings.conferenceGames, 8)
    assert.equal(settings.sameTierNonConference, false)
    assert.equal(settings.titleGame, "division-winners")
    assert.equal(defaultByes(12), 4)
    assert.equal(defaultByes(8), 0)
    assert.equal(defaultByes(6), 2)
    assert.equal(defaultByes(16), 0)
  })

  it("loads an old board onto the default hard-mode settings", () => {
    const loaded = loadBoard(
      JSON.stringify({
        mode: "tiers",
        presetId: "2026",
        conferences: [{ id: "c1", name: "SEC", color: "#111", tier: "power", schoolIds: ["alabama", "auburn"] }],
        hardMode: { enabled: true, playoffTeams: 8, annualRivalryIds: ["r-006", "missing", 4] },
      }),
    )
    assert.ok(loaded)
    assert.equal(loaded.hardMode.enabled, true)
    assert.equal(loaded.hardMode.playoffTeams, 8)
    assert.equal(loaded.hardMode.playoffByes, 0)
    assert.deepEqual(loaded.hardMode.annualRivalryIds, ["missing", "r-006"])
  })

  it("resets hard mode when a preset is applied", () => {
    let state = createBlankBoard(ids)
    state = updateHardMode(state, { enabled: true, playoffTeams: 4 })
    const next = applyPreset(
      { id: "custom", label: "Custom", detail: "", basedOn2026: false, conferences: [] },
      "flat",
      ids,
    )
    assert.equal(next.hardMode.enabled, false)
    assert.equal(state.hardMode.playoffTeams, 4)
  })
})

describe("championship and playoff rules", () => {
  it("uses division winners when a conference has divisions and the top two records when it does not", () => {
    const state = board({
      conferences: [
        conference({
          id: "sec",
          name: "SEC",
          schoolIds: ["e1", "e2", "w1", "w2"],
          divisions: [
            { id: "east", name: "East", schoolIds: ["e1", "e2"] },
            { id: "west", name: "West", schoolIds: ["w1", "w2"] },
          ],
        }),
        conference({ id: "acc", name: "ACC", schoolIds: ["a", "b", "c"] }),
        conference({ id: "ind", name: "Independents", schoolIds: ["nd"] }),
      ],
    })
    const plans = titlePlans(state)
    assert.equal(plans.find((plan) => plan.conferenceName === "SEC")?.summary, "The East winner plays the West winner for the championship.")
    assert.equal(
      plans.find((plan) => plan.conferenceName === "ACC")?.summary,
      "The two teams with the best records play for the championship.",
    )
    assert.equal(plans.some((plan) => plan.conferenceName === "Independents"), false)
  })

  it("describes the current playoff field for one set and for two tiers", () => {
    const flat = board({
      conferences: [
        conference({ id: "a", name: "A", schoolIds: ["a1", "a2"] }),
        conference({ id: "b", name: "B", schoolIds: ["b1", "b2"] }),
      ],
    })
    const flatPlan = playoffPlans(flat)[0]
    assert.equal(flatPlan.teams, 12)
    assert.equal(flatPlan.byes, 4)
    assert.ok(flatPlan.lines.some((line) => line.includes("All 2 conference champions")))
    assert.ok(flatPlan.lines.some((line) => line.includes("5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9")))

    const tiers = board(
      {
        mode: "tiers",
        conferences: [
          conference({ id: "p1", name: "P1", tier: "power", schoolIds: ["a1", "a2"] }),
          conference({ id: "p2", name: "P2", tier: "power", schoolIds: ["b1", "b2"] }),
          conference({ id: "g1", name: "G1", tier: "group", schoolIds: ["c1", "c2"] }),
        ],
      },
    )
    const combined = playoffPlans(tiers)[0]
    assert.equal(combined.name, "College Football Playoff")
    assert.ok(combined.lines.some((line) => line.includes("Every Power conference champion gets an automatic bid (2)")))
    assert.ok(combined.lines.some((line) => line.includes("top-ranked Group conference champion")))

    const split = board(
      {
        mode: "tiers",
        conferences: tiers.conferences,
      },
      { separatePlayoffs: true },
    )
    const names = playoffPlans(split).map((plan) => plan.name)
    assert.deepEqual(names, ["Power playoff", "Group playoff"])
  })
})

describe("schedules", () => {
  it("counts only rivalry games that are guaranteed every year", () => {
    const state = board(
      {
        conferences: [conference({ id: "big", name: "Big", schoolIds: ["a", "b", "c", "d", "e"] })],
      },
      { totalGames: 2, conferenceGames: 2 },
    )
    const rivalries = [rivalry("ab", ["a", "b"]), rivalry("ac", ["a", "c"])]
    const open = buildSchedule(state, rivalries)
    assert.equal(open.annualGames, 0)
    for (const schedule of open.bySchool.values()) assert.equal(schedule.games.length, 2)

    const locked = buildSchedule(
      board(state, { annualRivalryIds: ["ab"] }),
      rivalries,
    )
    assert.equal(locked.annualGames, 1)
    const game = locked.bySchool.get("a")?.games.find((item) => item.opponentId === "b")
    assert.equal(game?.annual, true)
    assert.equal(game?.kind, "conference")
    assert.equal(game?.rivalryName, "ab")
  })

  it("treats a full round robin as an annual rivalry", () => {
    const state = board(
      {
        conferences: [conference({ id: "small", name: "Small", schoolIds: ["a", "b", "c"] })],
      },
      { totalGames: 2, conferenceGames: 8 },
    )
    const built = buildSchedule(state, [rivalry("ab", ["a", "b"])])
    assert.equal(built.annualGames, 1)
    assert.equal(built.bySchool.get("c")?.games.every((game) => game.kind === "conference"), true)
  })

  it("keeps division games every year and rotates cross-division games", () => {
    const state = board(
      {
        conferences: [
          conference({
            id: "sec",
            name: "SEC",
            schoolIds: ["e1", "e2", "e3", "w1", "w2", "w3"],
            divisions: [
              { id: "east", name: "East", schoolIds: ["e1", "e2", "e3"] },
              { id: "west", name: "West", schoolIds: ["w1", "w2", "w3"] },
            ],
          }),
        ],
      },
      { conferenceSchedule: "all-division", conferenceGames: 2, totalGames: 2 },
    )
    const built = buildSchedule(state, [rivalry("east", ["e1", "e2"]), rivalry("cross", ["e1", "w1"])])
    assert.equal(built.annualGames, 1)
    const eastGame = built.bySchool.get("e1")?.games.find((game) => game.opponentId === "e2")
    assert.equal(eastGame?.annual, true)
    assert.equal(built.bySchool.get("e1")?.games.some((game) => game.opponentId === "w1"), false)
  })

  it("plays a permanent non-conference rivalry every year", () => {
    const state = board(
      {
        conferences: [
          conference({ id: "sec", name: "SEC", schoolIds: ["ala", "uga"] }),
          conference({ id: "b1g", name: "Big Ten", schoolIds: ["osu", "mich"] }),
        ],
      },
      { totalGames: 2, conferenceGames: 1, annualRivalryIds: ["inter"] },
    )
    const built = buildSchedule(state, [rivalry("inter", ["ala", "osu"])])
    assert.equal(built.annualGames, 1)
    const game = built.bySchool.get("ala")?.games.find((item) => item.opponentId === "osu")
    assert.equal(game?.kind, "non-conference")
    assert.equal(game?.annual, true)
  })

  it("keeps filler non-conference games inside a tier when that rule is on", () => {
    const conferences = [
      conference({ id: "p", name: "Power", tier: "power", schoolIds: ["a1", "a2"] }),
      conference({ id: "g", name: "Group", tier: "group", schoolIds: ["b1", "b2"] }),
    ]
    const limited = buildSchedule(
      board({ mode: "tiers", conferences }, { totalGames: 3, conferenceGames: 1, sameTierNonConference: true }),
      [],
    )
    assert.equal(limited.bySchool.get("a1")?.games.some((game) => game.opponentId.startsWith("b")), false)
    assert.equal(limited.bySchool.get("a1")?.games.length, 1)

    const open = buildSchedule(
      board({ mode: "tiers", conferences }, { totalGames: 3, conferenceGames: 1, sameTierNonConference: false }),
      [],
    )
    assert.equal(open.bySchool.get("a1")?.games.length, 3)
    assert.equal(open.bySchool.get("a1")?.games.some((game) => game.opponentId === "b1"), true)
  })

  it("gives independents a non-conference schedule", () => {
    const built = buildSchedule(
      board(
        {
          conferences: [
            conference({ id: "ind", name: "Independents", schoolIds: ["nd"] }),
            conference({ id: "big", name: "Big", schoolIds: ["a", "b"] }),
          ],
        },
        { totalGames: 2, conferenceGames: 1 },
      ),
      [],
    )
    const nd = built.bySchool.get("nd")
    assert.equal(nd?.games.length, 2)
    assert.equal(nd?.games.every((game) => game.kind === "non-conference"), true)
    assert.equal(built.bySchool.get("a")?.games.find((game) => game.opponentId === "b")?.kind, "conference")
  })

  it("leaves ignored and unassigned schools off the slate", () => {
    const built = buildSchedule(
      board({
        ignoredIds: ["gone"],
        conferences: [conference({ id: "big", name: "Big", schoolIds: ["a", "b"] })],
      }),
      [rivalry("ag", ["a", "gone"])],
    )
    assert.equal(built.bySchool.has("gone"), false)
    assert.equal(built.bySchool.has("pool"), false)
    assert.equal(built.annualGames, 0)
  })
})
