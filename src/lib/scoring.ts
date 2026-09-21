import type { Rivalry, School, ScoreTone, ScoringThresholds } from "@/lib/types"

export type ScoredRivalry = {
  rivalry: Rivalry
  schoolA: School
  schoolB: School
  kept: boolean
}

export function scoreRivalries(args: {
  rivalries: Rivalry[]
  schoolsById: Map<string, School>
  onBoard: Set<string>
  conferenceOf: Map<string, string>
}): { kept: number; total: number; rows: ScoredRivalry[] } {
  const rows: ScoredRivalry[] = []
  for (const rivalry of args.rivalries) {
    const [left, right] = rivalry.schools
    if (!args.onBoard.has(left) || !args.onBoard.has(right)) continue
    const schoolA = args.schoolsById.get(left)
    const schoolB = args.schoolsById.get(right)
    if (!schoolA || !schoolB) continue
    const conferenceA = args.conferenceOf.get(left)
    const conferenceB = args.conferenceOf.get(right)
    const kept = Boolean(conferenceA && conferenceA === conferenceB)
    rows.push({ rivalry, schoolA, schoolB, kept })
  }
  const kept = rows.filter((row) => row.kept).length
  return { kept, total: rows.length, rows }
}

export function scoreTone(kept: number, total: number, thresholds: ScoringThresholds): ScoreTone {
  if (total <= 0) return "empty"
  const ratio = kept / total
  if (ratio + 1e-9 >= thresholds.green / thresholds.reference) return "green"
  if (ratio + 1e-9 >= thresholds.amber / thresholds.reference) return "amber"
  return "red"
}

export function shareText(kept: number, total: number): string {
  return `I tried to fix college football. ${kept}/${total} rivalries kept together. Think you can do better? #FixCollegeFootball`
}
