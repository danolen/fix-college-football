import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatSp,
  formatSpread,
  populationSpread,
  schoolSp,
  spPosition,
  summarizeRated,
  summarizeSp,
  weightedSp,
} from "./strength.ts"

describe("SP+ strength", () => {
  it("weights recent seasons more and drops seasons that are missing", () => {
    assert.equal(weightedSp([10, 10, 10, 10, 20]), (10 + 20 + 30 + 40 + 100) / 15)
    assert.equal(weightedSp([null, null, null, null, -10.9]), -10.9)
    assert.equal(weightedSp([null, null, 0, 0, 30]), 150 / 12)
    assert.equal(weightedSp([null, null, null, null, null]), null)
  })

  it("uses the population spread of the schools in the conference", () => {
    assert.equal(populationSpread([10]), null)
    assert.equal(populationSpread([10, 10]), 0)
    assert.equal(populationSpread([0, 10]), 5)
  })

  it("needs two rated schools and names the best and worst", () => {
    const summary = summarizeRated([
      { id: "georgia", name: "Georgia", rating: 28 },
      { id: "vanderbilt", name: "Vanderbilt", rating: 4 },
      { id: "alabama", name: "Alabama", rating: 22 },
    ])
    assert.ok(summary)
    assert.equal(summary.best.name, "Georgia")
    assert.equal(summary.worst.name, "Vanderbilt")
    assert.equal(summary.mean, 18)
    assert.equal(summary.spread, Math.sqrt(104))
    assert.equal(summarizeRated([{ id: "georgia", name: "Georgia", rating: 28 }]), null)
    assert.equal(summarizeSp([{ id: "not-a-school", name: "Missing" }]), null)
  })

  it("reads the stored Ohio State rating above a below-average school", () => {
    const ohio = schoolSp("ohio-state")
    const kent = schoolSp("kent-state")
    const delaware = schoolSp("delaware")
    assert.ok(ohio != null && ohio > 25)
    assert.ok(kent != null && kent < 0)
    assert.equal(delaware, -10.9)
    assert.equal(schoolSp("north-dakota-state"), null)
    assert.equal(schoolSp("not-a-school"), null)
  })

  it("formats a signed rating and a spread, and keeps every conference on one scale", () => {
    assert.equal(formatSp(11.24), "+11.2")
    assert.equal(formatSp(-3.44), "-3.4")
    assert.equal(formatSp(0.04), "0.0")
    assert.equal(formatSpread(6.36), "6.4")
    assert.equal(spPosition(0), ((0 - -30) / (35 - -30)) * 100)
    assert.equal(spPosition(-40), 0)
    assert.equal(spPosition(40), 100)
  })
})
