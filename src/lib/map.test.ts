import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { nextColor, PALETTE } from "./colors.ts"
import { blobOutline, blobPath, boundsOf, pointInPolygon, signedArea, type Pt } from "./hull.ts"
import { layoutMap, type NorthAmericaGeo } from "./map-layout.ts"
import type { Conference, School } from "./types.ts"

describe("palette", () => {
  it("has dozens of distinct conference colors", () => {
    assert.ok(PALETTE.length >= 40)
    assert.equal(new Set(PALETTE.map((color) => color.toLowerCase())).size, PALETTE.length)
  })

  it("gives a new conference the next unused palette color", () => {
    const used = PALETTE.slice(0, 7)
    assert.equal(nextColor(used), PALETTE[7])
    const wrapped = nextColor([...PALETTE, ...PALETTE])
    assert.ok(PALETTE.includes(wrapped))
    const assigned: string[] = []
    for (let index = 0; index < 24; index += 1) assigned.push(nextColor(assigned))
    assert.deepEqual(assigned, PALETTE.slice(0, 24))
  })
})

describe("conference blobs", () => {
  it("keeps a single-school conference as a small pad, not a giant oval", () => {
    const pad = 12
    const outline = blobOutline([[80, 90]], pad)
    const box = boundsOf(outline)
    assert.ok(box)
    assert.ok(box.maxX - box.minX < pad * 2 + 1)
    assert.ok(box.maxY - box.minY < pad * 2 + 1)
  })

  it("hugs a coast-to-coast hull with one path and a small pad", () => {
    const points: Pt[] = [
      [40, 120],
      [620, 110],
      [300, 80],
      [580, 200],
      [90, 190],
    ]
    const pad = 12
    const path = blobPath(points, pad)
    assert.equal((path.match(/M /g) ?? []).length, 1)
    assert.match(path, /Z/)
    const box = boundsOf(blobOutline(points, pad))
    const schools = boundsOf(points)
    assert.ok(box && schools)
    const extraX = Math.max(box.maxX - schools.maxX, schools.minX - box.minX)
    const extraY = Math.max(box.maxY - schools.maxY, schools.minY - box.minY)
    assert.ok(extraX > pad * 0.6 && extraX < pad * 2.2)
    assert.ok(extraY > pad * 0.6 && extraY < pad * 2.2)
  })

  it("does not split far-apart schools into multiple blobs", () => {
    const path = blobPath(
      [
        [30, 80],
        [700, 90],
        [360, 220],
      ],
      11,
    )
    assert.equal((path.match(/M /g) ?? []).length, 1)
  })

  it("keeps a positive winding so corners do not invert", () => {
    const points: Pt[] = [
      [80, 80],
      [220, 70],
      [240, 180],
      [60, 200],
      [140, 120],
    ]
    const outline = blobOutline(points, 12)
    assert.ok(signedArea(outline) > 0)
    for (const point of points) assert.equal(pointInPolygon(point, outline), true)
    assert.equal(pointInPolygon([800, 800], outline), false)
    assert.equal(/[Aa] /.test(blobPath(points, 12)), false)
  })
})

const geo: NorthAmericaGeo = {
  regions: [
    {
      region: "main",
      name: "lower-48",
      kind: "state",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-125, 24],
            [-66, 24],
            [-66, 49],
            [-125, 49],
            [-125, 24],
          ],
        ],
      },
    },
    {
      region: "hawaii",
      name: "hawaii",
      kind: "state",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-160, 18],
            [-154, 18],
            [-154, 23],
            [-160, 23],
            [-160, 18],
          ],
        ],
      },
    },
  ],
  lakes: [],
}

function school(partial: Partial<School> & Pick<School, "id" | "lat" | "lon">): School {
  return {
    name: partial.id,
    abbr: partial.id.slice(0, 3).toUpperCase(),
    level: "fbs",
    city: "City",
    region: "ST",
    primary: "#111111",
    secondary: "#eeeeee",
    ...partial,
  }
}

describe("map layout", () => {
  const schools = [
    school({ id: "oregon", lat: 44.05, lon: -123.07, primary: "#007030", secondary: "#FEE11A", abbr: "ORE" }),
    school({ id: "rutgers", lat: 40.5, lon: -74.45, primary: "#CC0033", secondary: "#000000", abbr: "RUT" }),
    school({ id: "iowa", lat: 41.66, lon: -91.53, primary: "#000000", secondary: "#FFCD00", abbr: "IOWA" }),
    school({ id: "hawaii", lat: 21.3, lon: -157.85, primary: "#024731", secondary: "#C8A32E", abbr: "HAW" }),
    school({ id: "loose", lat: 33.75, lon: -84.39, primary: "#B3A369", secondary: "#003057", abbr: "GT" }),
  ]
  const conferences: Conference[] = [
    { id: "b1g", name: "Big Ten", color: "#9E2A2B", tier: "power", schoolIds: ["oregon", "rutgers", "iowa"] },
    { id: "mw", name: "Mountain West", color: "#1E3A8A", tier: "group", schoolIds: ["hawaii"] },
  ]

  it("draws one main blob for a coast-to-coast conference", () => {
    const scene = layoutMap({ geo, schools, conferences, width: 960, height: 640 })
    const bigTen = scene.blobs.filter((blob) => blob.name === "Big Ten")
    assert.equal(bigTen.length, 1)
    assert.equal((bigTen[0].d.match(/M /g) ?? []).length, 1)
  })

  it("hides unassigned schools when show is assigned only", () => {
    const all = layoutMap({ geo, schools, conferences, width: 960, height: 640, show: "all" })
    const assigned = layoutMap({ geo, schools, conferences, width: 960, height: 640, show: "assigned" })
    assert.equal(all.dots.some((dot) => dot.id === "loose"), true)
    assert.equal(assigned.dots.some((dot) => dot.id === "loose"), false)
    assert.equal(assigned.dots.every((dot) => dot.assigned), true)
  })

  it("uses school colors when color by is school colors", () => {
    const scene = layoutMap({
      geo,
      schools,
      conferences,
      width: 960,
      height: 640,
      colorBy: "schools",
    })
    const oregon = scene.dots.find((dot) => dot.id === "oregon")
    const loose = scene.dots.find((dot) => dot.id === "loose")
    assert.equal(oregon?.color, "#007030")
    assert.equal(oregon?.secondary, "#FEE11A")
    assert.equal(oregon?.abbr, "ORE")
    assert.equal(loose?.color, "#B3A369")
  })

  it("keeps unassigned schools gray in conference color mode", () => {
    const scene = layoutMap({ geo, schools, conferences, width: 960, height: 640, colorBy: "conference" })
    const loose = scene.dots.find((dot) => dot.id === "loose")
    const oregon = scene.dots.find((dot) => dot.id === "oregon")
    assert.equal(loose?.color, "#8d8680")
    assert.equal(oregon?.color, "#9E2A2B")
  })

  it("keeps a Hawaiʻi inset instead of stretching the mainland crop", () => {
    const scene = layoutMap({ geo, schools, conferences, width: 960, height: 640 })
    assert.equal(scene.insets.some((inset) => inset.label === "Hawaiʻi"), true)
    assert.equal(scene.dots.some((dot) => dot.id === "hawaii"), false)
    assert.equal(scene.insets[0].dots.some((dot) => dot.id === "hawaii"), true)
  })
})
