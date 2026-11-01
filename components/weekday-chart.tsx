'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

const config = {
  montant: { label: 'CA brut', color: 'var(--chart-2)' },
} satisfies ChartConfig

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { jour: string; jourFull: string; montant: number; net: number; nb: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="grid min-w-36 gap-1.5 rounded-xl border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-medium text-foreground">{d.jourFull}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">CA brut</span>
        <span className="font-semibold tabular-nums text-foreground">{formatEUR2(d.montant)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Net (65%)</span>
        <span className="tabular-nums text-muted-foreground">{formatEUR2(d.net)}</span>
      </div>
      {d.nb > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-1">
          <span className="text-muted-foreground">Consultations</span>
          <span className="tabular-nums text-muted-foreground">{d.nb}</span>
        </div>
      )}
    </div>
  )
}

export function WeekdayChart({ stats }: { stats: Stats }) {
  const peakDay = useMemo(() => {
    return [...stats.parJour].sort((a, b) => b.montant - a.montant)[0]
  }, [stats.parJour])

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg font-semibold">Activité par jour</CardTitle>
          {peakDay && peakDay.montant > 0 && (
            <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              Pic : {peakDay.jourFull} ({formatEUR(peakDay.montant)})
            </span>
          )}
        </div>
        <CardDescription>CA brut encaissé par jour de la semaine</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ChartContainer config={config} className="h-[250px] w-full">
          <BarChart data={stats.parJour} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="jour" tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => formatEUR(v)} className="text-xs" />
            <ChartTooltip
              cursor={{ fill: 'var(--color-montant)', fillOpacity: 0.08 }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="montant" fill="var(--color-montant)" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
