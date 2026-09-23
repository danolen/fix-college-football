"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { RotateCcw } from "lucide-react"
import { BoardProvider, type BoardApi } from "@/components/board-context"
import { Builder } from "@/components/builder"
import { DragProvider, type DropTarget } from "@/components/drag-context"
import { SchoolDetail } from "@/components/school-detail"
import { SchoolTileFace } from "@/components/school-tile"
import { SharePanel } from "@/components/share-panel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { catalog } from "@/lib/catalog"
import {
  addConference,
  addFcsSchool,
  applyPreset,
  canDeleteConference,
  conferenceOf,
  createBlankBoard,
  deleteConference,
  isDirty,
  moveConferenceTier,
  moveSchools,
  onBoardIds,
  recolorConference,
  removeFcsSchool,
  renameConference,
  setMode,
  shareUnlocked,
} from "@/lib/board"
import { scoreRivalries, scoreTone } from "@/lib/scoring"
import { discardSavedBoard, getBoardSnapshot, getServerBoardSnapshot, makeId, replaceBoard, subscribeBoard } from "@/lib/storage"
import type { BoardState, Conference, Mode, Preset, Tier } from "@/lib/types"

export function AppShell() {
  const snapshot = useSyncExternalStore(subscribeBoard, getBoardSnapshot, getServerBoardSnapshot)
  const [tab, setTab] = useState<"build" | "share">("build")
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [pending, setPending] = useState<
    | { kind: "preset"; preset: Preset }
    | { kind: "blank" }
    | { kind: "reset" }
    | { kind: "delete"; conference: Conference }
    | null
  >(null)

  const schoolsById = useMemo(() => new Map(catalog.schools.map((school) => [school.id, school])), [])
  const fbs = useMemo(() => catalog.schools.filter((school) => school.level === "fbs"), [])
  const fcs = useMemo(() => catalog.schools.filter((school) => school.level === "fcs"), [])
  const draft = snapshot?.board ?? null

  const onBoard = useMemo(() => {
    if (!draft) return []
    const idsOnBoard = new Set([
      ...onBoardIds(
        fbs.map((school) => school.id),
        draft,
      ),
      ...draft.conferences.flatMap((conference) => conference.schoolIds),
    ])
    return catalog.schools.filter((school) => idsOnBoard.has(school.id))
  }, [fbs, draft])

  const score = useMemo(() => {
    return scoreRivalries({
      rivalries: catalog.rivalries,
      schoolsById,
      onBoard: new Set(onBoard.map((school) => school.id)),
      conferenceOf: draft ? conferenceOf(draft) : new Map(),
    })
  }, [onBoard, schoolsById, draft])

  if (!snapshot || !draft) {
    return (
      <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-display text-4xl font-semibold tracking-wide">Fix College Football</p>
        <p className="mt-3 text-muted-foreground">Setting the board…</p>
      </main>
    )
  }

  const state = snapshot.board
  const loadError = snapshot.loadError
  const unlocked = shareUnlocked(state)
  const tone = scoreTone(score.kept, score.total, catalog.thresholds)
  function commit(next: BoardState) {
    replaceBoard(next)
    if (tab === "share" && !shareUnlocked(next)) setTab("build")
  }

  function dropSchool(schoolIds: string[], target: DropTarget) {
    const board = getBoardSnapshot()?.board
    if (!board) return
    commit(moveSchools(board, schoolIds, target.conferenceId, target.beforeId))
  }

  function commitPreset(preset: Preset) {
    commit(applyPreset(preset, state.mode, makeId))
    setTab("build")
  }

  function commitBlank() {
    commit(createBlankBoard(makeId))
    setTab("build")
  }

  const api: BoardApi = {
    catalog,
    state,
    schoolsById,
    onBoard,
    fbs,
    fcs,
    scoreKept: score.kept,
    scoreTotal: score.total,
    scoreRows: score.rows,
    unlocked,
    tab,
    setTab: (next) => {
      if (next === "share" && !unlocked) return
      setTab(next)
    },
    setMode: (mode: Mode) => commit(setMode(state, mode)),
    requestPreset: (preset) => {
      if (isDirty(state) && state.presetId !== preset.id) setPending({ kind: "preset", preset })
      else commitPreset(preset)
    },
    requestBlank: () => {
      if (isDirty(state)) setPending({ kind: "blank" })
      else commitBlank()
    },
    requestReset: () => setPending({ kind: "reset" }),
    addConference: (tier: Tier) => commit(addConference(state, tier, makeId)),
    renameConference: (id, name) => commit(renameConference(state, id, name)),
    recolorConference: (id, color) => commit(recolorConference(state, id, color)),
    requestDelete: (conference) => {
      if (!canDeleteConference(state, conference.id)) return
      if (conference.schoolIds.length > 0) setPending({ kind: "delete", conference })
      else {
        const next = deleteConference(state, conference.id)
        if (next) commit(next)
      }
    },
    moveTier: (id, tier) => {
      const next = moveConferenceTier(state, id, tier)
      if (next) commit(next)
    },
    addFcs: (id) => commit(addFcsSchool(state, id)),
    removeFcs: (id) => commit(removeFcsSchool(state, id)),
    assignSchools: (schoolIds, conferenceId) => commit(moveSchools(state, schoolIds, conferenceId)),
    canDelete: (id) => canDeleteConference(state, id),
  }

  return (
    <BoardProvider value={api}>
      <div className="min-h-full">
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-3xl leading-none font-semibold tracking-wide sm:text-4xl">
                  Fix College Football
                </p>
                <p className="mt-1 font-serif text-sm text-muted-foreground sm:text-base">
                  I tried to fix college football.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ScorePill kept={score.kept} total={score.total} tone={tone} />
                <Button type="button" variant="outline" size="sm" onClick={() => api.requestReset()}>
                  <RotateCcw />
                  Reset
                </Button>
              </div>
            </div>
            <Tabs value={tab} onValueChange={(value) => api.setTab(value as "build" | "share")}>
              <TabsList>
                <TabsTrigger value="build">Build</TabsTrigger>
                <TabsTrigger value="share" disabled={!unlocked} data-testid="share-tab">
                  Share
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {loadError && (
          <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-3 rounded-xl border border-destructive/40 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">{loadError}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => discardSavedBoard()}
            >
              Discard the saved board
            </Button>
          </div>
        )}

        <DragProvider
          onDrop={dropSchool}
          overlay={(schoolId, count) => {
            const school = schoolsById.get(schoolId)
            if (!school) return null
            return (
              <div className="relative">
                <SchoolTileFace school={school} />
                {count > 1 && (
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-foreground px-1.5 text-[0.65rem] font-semibold text-background">
                    {count}
                  </span>
                )}
              </div>
            )
          }}
        >
          <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <Tabs value={tab} onValueChange={(value) => api.setTab(value as "build" | "share")}>
              <TabsContent value="build">
                <Builder onInspect={setInspectId} />
              </TabsContent>
              <TabsContent value="share">
                <SharePanel />
              </TabsContent>
            </Tabs>
          </main>
        </DragProvider>

        <footer className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-muted-foreground sm:px-6">
          Fix College Football is not affiliated with the NCAA, any conference, or any school. Tiles are colored
          circles in school colors, not official athletic marks. The toy is inspired by Lily Lavender’s{" "}
          <a className="underline" href="https://lilylavender.github.io/youTryItThen/">
            youTryItThen
          </a>
          .
        </footer>
      </div>

      <SchoolDetail
        school={inspectId ? schoolsById.get(inspectId) ?? null : null}
        rows={score.rows}
        onOpenChange={(open) => {
          if (!open) setInspectId(null)
        }}
      />

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === "delete" ? `Remove ${pending.conference.name}?` : "Replace this board?"}
            </DialogTitle>
            <DialogDescription>
              {pending?.kind === "delete"
                ? "Its schools go back to the unassigned pool."
                : "The layout in this browser will be replaced. FCS schools you added will leave the board."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pending?.kind === "preset") commitPreset(pending.preset)
                else if (pending?.kind === "blank" || pending?.kind === "reset") commitBlank()
                else if (pending?.kind === "delete") {
                  const next = deleteConference(state, pending.conference.id)
                  if (next) commit(next)
                }
                setPending(null)
              }}
            >
              {pending?.kind === "delete" ? "Remove conference" : "Replace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardProvider>
  )
}

function ScorePill({ kept, total, tone }: { kept: number; total: number; tone: string }) {
  const color =
    tone === "green" ? "text-green-800 bg-green-100" : tone === "amber" ? "text-amber-900 bg-amber-100" : tone === "red" ? "text-rose-800 bg-rose-100" : "text-foreground bg-card"
  return (
    <p
      data-testid="rivalry-score"
      aria-live="polite"
      title="Green from 25/45 of the rivalries on the board, amber from 15/45. Each pair weighs the same."
      className={`rounded-full px-3 py-1 text-sm font-medium ${color}`}
    >
      {kept}/{total} rivalries kept together
    </p>
  )
}
