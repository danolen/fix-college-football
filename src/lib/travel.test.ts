import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { boardTripMiles, conferenceTripMiles, formatTripMiles, meanPairMiles, milesBetween } from "./travel.ts"

describe("conference travel", () => {
  it("measures a one-way trip in miles", () => {
    const miles = milesBetween({ lat: 42.2708, lon: -83.743 }, { lat: 40.0017, lon: -83.0197 })
    assert.ok(miles > 155 && miles < 175, `expected about 165 miles, got ${miles}`)
  })

  it("averages every pair in a conference and skips a one-school conference", () => {
    const close = [
      { lat: 40, lon: -80 },
      { lat: 40.2, lon: -80 },
    ]
    const far = { lat: 41.5, lon: -80 }
    const pair = meanPairMiles(close)
    assert.ok(pair != null)
    assert.equal(conferenceTripMiles(close), Math.round(pair))
    assert.equal(conferenceTripMiles([close[0]]), null)
    const three = meanPairMiles([...close, far])
    assert.ok(three != null && three > pair)
  })

  it("weights the board average by schools and leaves Independents out", () => {
    const east = { lat: 40, lon: -74 }
    const midwest = { lat: 41, lon: -87 }
    const west = { lat: 34, lon: -118 }
    const pacific = { lat: 37, lon: -122 }
    const schools = new Map([
      ["east", east],
      ["midwest", midwest],
      ["west", west],
      ["pacific", pacific],
      ["notre-dame", { lat: 41.7, lon: -86.2 }],
      ["uconn", { lat: 41.8, lon: -72.25 }],
    ])
    const small = meanPairMiles([east, midwest])
    const large = meanPairMiles([east, west, pacific])
    assert.ok(small != null && large != null)
    const average = boardTripMiles(
      [
        { name: "Small", schoolIds: ["east", "midwest"] },
        { name: "Large", schoolIds: ["east", "west", "pacific"] },
        { name: "Independents", schoolIds: ["notre-dame", "uconn"] },
        { name: "Empty", schoolIds: ["east"] },
      ],
      schools,
    )
    assert.equal(average, Math.round((small * 2 + large * 3) / 5))
    assert.equal(boardTripMiles([{ name: "Independents", schoolIds: ["notre-dame", "uconn"] }], schools), null)
  })

  it("formats miles with a thousands separator", () => {
    assert.equal(formatTripMiles(842), "842 mi")
    assert.equal(formatTripMiles(1234), "1,234 mi")
  })
})
