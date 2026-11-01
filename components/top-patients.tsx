'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEUR, type Stats } from '@/lib/analytics'

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '·'
}

export function TopPatients({ stats }: { stats: Stats }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg font-semibold">Top patients</CardTitle>
          <span className="text-xs text-muted-foreground">Top {stats.topPatients.length}</span>
        </div>
        <CardDescription>Classés par revenu net généré</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {stats.topPatients.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée sur cette période</p>
        ) : (
          <ul className="flex max-h-[235px] flex-col gap-1 overflow-y-auto pr-1">
            {stats.topPatients.map((p, i) => (
              <li key={p.nom} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
                <span className="w-4 text-right text-xs font-medium tabular-nums text-muted-foreground/70">
                  {i + 1}
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                  {initials(p.nom)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">{p.nom}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {p.nb} visite{p.nb > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="ml-auto shrink-0 tabular-nums text-xs font-semibold text-foreground">{formatEUR(p.net)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
