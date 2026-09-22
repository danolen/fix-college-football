import schools from "../../data/schools.json"
import rivalries from "../../data/rivalries.json"
import presets from "../../data/presets.json"
import thresholds from "../../data/scoring.json"
import type { Catalog, Preset, Rivalry, School, ScoringThresholds } from "@/lib/types"

export const catalog: Catalog = {
  schools: schools as School[],
  rivalries: rivalries as Rivalry[],
  presets: presets as Preset[],
  thresholds: thresholds as ScoringThresholds,
}
