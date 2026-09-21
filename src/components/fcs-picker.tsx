"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { School } from "@/lib/types"

export function FcsPicker({
  schools,
  addedIds,
  open,
  onOpenChange,
  onAdd,
  onRemove,
}: {
  schools: School[]
  addedIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const added = new Set(addedIds)
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return schools
      .filter((school) => {
        if (!needle) return true
        return [school.name, school.abbr, school.city, school.region].join(" ").toLowerCase().includes(needle)
      })
      .slice(0, 80)
  }, [query, schools])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add an FCS school</DialogTitle>
          <DialogDescription>
            The board starts with FBS. Pick a school from the list to bring it on. A rivalry counts only when both schools are here.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by school, city, or state"
          aria-label="Search FCS schools"
        />
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          {schools.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No FCS schools are in this set.</p>
          )}
          {schools.length > 0 && filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No FCS school matches that search.</p>
          )}
          <ul>
            {filtered.map((school) => {
              const isAdded = added.has(school.id)
              return (
                <li key={school.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: school.primary }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{school.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {school.abbr} · {school.city}, {school.region}
                    </span>
                  </span>
                  {isAdded ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onRemove(school.id)}>
                      Remove
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={() => onAdd(school.id)}>
                      Add
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
