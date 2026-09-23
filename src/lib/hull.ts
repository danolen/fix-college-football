export type Pt = [number, number]

export function convexHull(points: Pt[]): Pt[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length <= 1) return sorted
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Pt[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop()
    lower.push(point)
  }
  const upper: Pt[] = []
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop()
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return ensureCcw(lower.concat(upper))
}

export function blobPath(points: Pt[], padding: number): string {
  return pathFromOutline(blobOutline(points, padding))
}

export function blobOutline(points: Pt[], padding: number): Pt[] {
  const unique = dedupe(points)
  const pad = Math.max(1, padding)
  if (unique.length === 0) return []
  if (unique.length === 1) return sampleCircle(unique[0], pad)
  if (unique.length === 2) return sampleCapsule(unique[0], unique[1], pad)
  const hull = convexHull(unique)
  if (hull.length <= 1) return sampleCircle(hull[0] ?? unique[0], pad)
  if (hull.length === 2) return sampleCapsule(hull[0], hull[1], pad)
  return sampleRoundedBuffer(hull, pad)
}

export function boundsOf(points: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (points.length === 0) return null
  let minX = points[0][0]
  let minY = points[0][1]
  let maxX = points[0][0]
  let maxY = points[0][1]
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

export function pointInPolygon(point: Pt, polygon: Pt[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[previous]
    const b = polygon[index]
    const crosses = a[1] > point[1] !== b[1] > point[1]
    if (crosses && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1] || Number.EPSILON) + a[0]) {
      inside = !inside
    }
  }
  return inside
}

export function signedArea(points: Pt[]): number {
  let sum = 0
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length]
    sum += points[index][0] * next[1] - next[0] * points[index][1]
  }
  return sum
}

function pathFromOutline(outline: Pt[]): string {
  if (outline.length === 0) return ""
  return `M ${outline.map((point) => `${point[0]} ${point[1]}`).join(" L ")} Z`
}

function ensureCcw(points: Pt[]): Pt[] {
  return signedArea(points) < 0 ? [...points].reverse() : points
}

function dedupe(points: Pt[]): Pt[] {
  const seen = new Set<string>()
  const out: Pt[] = []
  for (const point of points) {
    const key = `${point[0].toFixed(2)},${point[1].toFixed(2)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(point)
  }
  return out
}

function sampleCircle(center: Pt, radius: number): Pt[] {
  const out: Pt[] = []
  for (let step = 0; step < 24; step += 1) {
    const angle = (step / 24) * Math.PI * 2
    out.push([center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius])
  }
  return out
}

function sampleCapsule(a: Pt, b: Pt, radius: number): Pt[] {
  const along = Math.atan2(b[1] - a[1], b[0] - a[0])
  const left = along + Math.PI / 2
  const right = along - Math.PI / 2
  const out: Pt[] = []
  for (let step = 0; step <= 12; step += 1) {
    const angle = left + (Math.PI * step) / 12
    out.push([a[0] + Math.cos(angle) * radius, a[1] + Math.sin(angle) * radius])
  }
  for (let step = 0; step <= 12; step += 1) {
    const angle = right + (Math.PI * step) / 12
    out.push([b[0] + Math.cos(angle) * radius, b[1] + Math.sin(angle) * radius])
  }
  return out
}

function sampleRoundedBuffer(hull: Pt[], padding: number): Pt[] {
  const ring = ensureCcw(hull)
  const count = ring.length
  const out: Pt[] = []
  for (let index = 0; index < count; index += 1) {
    const prev = ring[(index - 1 + count) % count]
    const curr = ring[index]
    const next = ring[(index + 1) % count]
    const incoming = outwardNormal(prev, curr)
    const outgoing = outwardNormal(curr, next)
    const start = Math.atan2(incoming[1], incoming[0])
    const end = Math.atan2(outgoing[1], outgoing[0])
    let delta = end - start
    while (delta <= 0) delta += Math.PI * 2
    if (delta > Math.PI) delta -= Math.PI * 2
    const steps = Math.max(3, Math.ceil((Math.abs(delta) * padding) / 2.5))
    for (let step = 0; step <= steps; step += 1) {
      const angle = start + (delta * step) / steps
      out.push([curr[0] + Math.cos(angle) * padding, curr[1] + Math.sin(angle) * padding])
    }
  }
  return out
}

function outwardNormal(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy) || 1
  return [dy / length, -dx / length]
}
