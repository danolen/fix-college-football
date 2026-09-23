import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { publicUrl } from "./public-url.ts"

describe("publicUrl", () => {
  it("leaves root paths alone when there is no base path", () => {
    const previous = process.env.NEXT_PUBLIC_BASE_PATH
    delete process.env.NEXT_PUBLIC_BASE_PATH
    assert.equal(publicUrl("/geo/north-america.json"), "/geo/north-america.json")
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
    else process.env.NEXT_PUBLIC_BASE_PATH = previous
  })

  it("prefixes GitHub Pages project paths", () => {
    const previous = process.env.NEXT_PUBLIC_BASE_PATH
    process.env.NEXT_PUBLIC_BASE_PATH = "/fix-college-football"
    assert.equal(publicUrl("/geo/north-america.json"), "/fix-college-football/geo/north-america.json")
    process.env.NEXT_PUBLIC_BASE_PATH = "/fix-college-football/"
    assert.equal(publicUrl("geo/north-america.json"), "/fix-college-football/geo/north-america.json")
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
    else process.env.NEXT_PUBLIC_BASE_PATH = previous
  })
})
