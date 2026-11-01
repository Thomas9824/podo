'use client'

import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { fmtDay } from '@/lib/analytics'

export type DateRange = { start: string; end: string }

const SHORTCUTS: { label: string; days: number }[] = [
  { label: '7 j', days: 7 },
  { label: '14 j', days: 14 },
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n + 1)
  return d.toISOString().slice(0, 10)
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (r: DateRange) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" />

      {/* Shortcuts */}
      <div className="flex items-center gap-1">
        {SHORTCUTS.map((s) => (
          <button
            key={s.days}
            type="button"
            onClick={() => onChange({ start: daysAgoISO(s.days), end: todayISO() })}
            className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {s.label}
          </button>
        ))}
      </div>

      <span className="text-border">|</span>

      {/* Date inputs */}
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={value.start}
          max={value.end || todayISO()}
          onChange={(e) => {
            const next = { ...value, start: e.target.value }
            if (next.start && next.end && next.start <= next.end) onChange(next)
            else if (next.start) onChange({ ...next, end: next.end || next.start })
          }}
          className="h-7 w-36 px-2 text-xs"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="date"
          value={value.end}
          min={value.start || undefined}
          max={todayISO()}
          onChange={(e) => {
            const next = { ...value, end: e.target.value }
            if (next.start && next.end && next.start <= next.end) onChange(next)
            else if (next.end) onChange({ ...next, start: next.start || next.end })
          }}
          className="h-7 w-36 px-2 text-xs"
        />
      </div>

      {/* Résumé */}
      {value.start && value.end && (
        <span className="text-xs text-muted-foreground">
          {fmtDay(value.start)} – {fmtDay(value.end)}
        </span>
      )}
    </div>
  )
}
