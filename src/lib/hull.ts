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
  if (unique.length === 0) return ""
  if (unique.length === 1) return circle(unique[0], padding)
  if (unique.length === 2) return capsule(unique[0], unique[1], padding * 0.85)
  const hull = convexHull(unique)
  const expanded = offsetConvex(hull, padding)
  return smoothClosed(expanded, padding * 0.85)
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

function offsetConvex(points: Pt[], padding: number): Pt[] {
  const count = points.length
  const out: Pt[] = []
  for (let index = 0; index < count; index += 1) {
    const prev = points[(index - 1 + count) % count]
    const curr = points[index]
    const next = points[(index + 1) % count]
    const n1 = outwardNormal(prev, curr)
    const n2 = outwardNormal(curr, next)
    let bx = n1[0] + n2[0]
    let by = n1[1] + n2[1]
    const length = Math.hypot(bx, by) || 1
    bx /= length
    by /= length
    const denom = Math.abs(bx * n1[0] + by * n1[1])
    const scale = padding / Math.max(0.2, denom)
    out.push([curr[0] + bx * scale, curr[1] + by * scale])
  }
  return out
}

function outwardNormal(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy) || 1
  return [dy / length, -dx / length]
}

function smoothClosed(points: Pt[], radius: number): string {
  const count = points.length
  let path = ""
  for (let index = 0; index < count; index += 1) {
    const prev = points[(index - 1 + count) % count]
    const curr = points[index]
    const next = points[(index + 1) % count]
    const start = pull(curr, prev, Math.min(radius, distance(curr, prev) / 2))
    const end = pull(curr, next, Math.min(radius, distance(curr, next) / 2))
    path += index === 0 ? `M ${start[0]} ${start[1]}` : `L ${start[0]} ${start[1]}`
    path += ` Q ${curr[0]} ${curr[1]} ${end[0]} ${end[1]}`
  }
  return `${path} Z`
}

function pull(from: Pt, to: Pt, amount: number): Pt {
  const length = distance(from, to) || 1
  return [from[0] + ((to[0] - from[0]) / length) * amount, from[1] + ((to[1] - from[1]) / length) * amount]
}

function distance(a: Pt, b: Pt): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}
