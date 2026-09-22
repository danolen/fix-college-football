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
  return lower.concat(upper)
}

export function blobPath(points: Pt[], padding: number): string {
  const unique = dedupe(points)
  const pad = Math.max(1, padding)
  if (unique.length === 0) return ""
  if (unique.length === 1) return circle(unique[0], pad)
  if (unique.length === 2) return capsule(unique[0], unique[1], pad)
  const hull = convexHull(unique)
  if (hull.length <= 1) return circle(hull[0] ?? unique[0], pad)
  if (hull.length === 2) return capsule(hull[0], hull[1], pad)
  return roundedBuffer(hull, pad)
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

function circle(center: Pt, radius: number): string {
  return `M ${center[0] - radius} ${center[1]} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`
}

function capsule(a: Pt, b: Pt, radius: number): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy) || 1
  const px = -dy / length
  const py = dx / length
  const a1 = [a[0] + px * radius, a[1] + py * radius]
  const a2 = [a[0] - px * radius, a[1] - py * radius]
  const b1 = [b[0] + px * radius, b[1] + py * radius]
  const b2 = [b[0] - px * radius, b[1] - py * radius]
  return `M ${a1[0]} ${a1[1]} A ${radius} ${radius} 0 0 0 ${a2[0]} ${a2[1]} L ${b2[0]} ${b2[1]} A ${radius} ${radius} 0 0 0 ${b1[0]} ${b1[1]} Z`
}

function roundedBuffer(hull: Pt[], padding: number): string {
  const count = hull.length
  let path = ""
  for (let index = 0; index < count; index += 1) {
    const curr = hull[index]
    const next = hull[(index + 1) % count]
    const nEdge = outwardNormal(curr, next)
    const nNext = outwardNormal(next, hull[(index + 2) % count])
    const from: Pt = [curr[0] + nEdge[0] * padding, curr[1] + nEdge[1] * padding]
    const to: Pt = [next[0] + nEdge[0] * padding, next[1] + nEdge[1] * padding]
    const after: Pt = [next[0] + nNext[0] * padding, next[1] + nNext[1] * padding]
    const cross = nEdge[0] * nNext[1] - nEdge[1] * nNext[0]
    const sweep = cross >= 0 ? 0 : 1
    path += index === 0 ? `M ${from[0]} ${from[1]}` : `L ${from[0]} ${from[1]}`
    path += ` L ${to[0]} ${to[1]} A ${padding} ${padding} 0 0 ${sweep} ${after[0]} ${after[1]}`
  }
  return `${path} Z`
}

function sampleRoundedBuffer(hull: Pt[], padding: number): Pt[] {
  const count = hull.length
  const out: Pt[] = []
  for (let index = 0; index < count; index += 1) {
    const curr = hull[index]
    const next = hull[(index + 1) % count]
    const nEdge = outwardNormal(curr, next)
    const nNext = outwardNormal(next, hull[(index + 2) % count])
    out.push([curr[0] + nEdge[0] * padding, curr[1] + nEdge[1] * padding])
    out.push([next[0] + nEdge[0] * padding, next[1] + nEdge[1] * padding])
    const start = Math.atan2(nEdge[1], nEdge[0])
    const end = Math.atan2(nNext[1], nNext[0])
    const turn = sweepDelta(start, end, nEdge[0] * nNext[1] - nEdge[1] * nNext[0] >= 0)
    const steps = Math.max(2, Math.ceil(Math.abs(turn) * padding / 3))
    for (let step = 1; step <= steps; step += 1) {
      const angle = start + (turn * step) / steps
      out.push([next[0] + Math.cos(angle) * padding, next[1] + Math.sin(angle) * padding])
    }
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
  for (let step = 0; step <= 10; step += 1) {
    const angle = left + (Math.PI * step) / 10
    out.push([a[0] + Math.cos(angle) * radius, a[1] + Math.sin(angle) * radius])
  }
  for (let step = 0; step <= 10; step += 1) {
    const angle = right + (Math.PI * step) / 10
    out.push([b[0] + Math.cos(angle) * radius, b[1] + Math.sin(angle) * radius])
  }
  return out
}

function outwardNormal(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy) || 1
  return [dy / length, -dx / length]
}

function sweepDelta(start: number, end: number, ccw: boolean): number {
  let delta = end - start
  if (ccw) {
    while (delta < 0) delta += Math.PI * 2
    while (delta > Math.PI * 2) delta -= Math.PI * 2
  } else {
    while (delta > 0) delta -= Math.PI * 2
    while (delta < -Math.PI * 2) delta += Math.PI * 2
  }
  return delta
}
