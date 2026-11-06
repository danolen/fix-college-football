import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canvasPixelRatio, needsShareSheet } from "./download.ts"

describe("image saving", () => {
  it("keeps a normal picture at double resolution", () => {
    assert.equal(canvasPixelRatio(720, 480), 2)
  })

  it("shrinks the scale when a tall grid would overflow an iPhone canvas", () => {
    const ratio = canvasPixelRatio(800, 6000)
    assert.ok(ratio < 2)
    assert.ok(800 * ratio <= 4096)
    assert.ok(6000 * ratio <= 4096)
    assert.ok(800 * ratio * 6000 * ratio <= 16_000_000)
  })

  it("treats iPhone, iPad, and iPadOS as share-sheet devices", () => {
    assert.equal(needsShareSheet({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 }), true)
    assert.equal(needsShareSheet({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", platform: "iPad", maxTouchPoints: 5 }), true)
    assert.equal(needsShareSheet({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5 }), true)
    assert.equal(needsShareSheet({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 }), false)
    assert.equal(needsShareSheet({ userAgent: "Mozilla/5.0 (Linux; Android 14)", platform: "Linux armv8l", maxTouchPoints: 5 }), false)
  })
})
