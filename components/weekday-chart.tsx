'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

const config = {
  net: { label: 'Revenu net', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function WeekdayChart({ stats }: { stats: Stats }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="font-serif text-lg font-semibold">Activité par jour</CardTitle>
        <CardDescription>Revenu net par jour de la semaine</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={config} className="h-[200px] w-full">
          <BarChart data={stats.parJour} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="jour" tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => formatEUR(v)} className="text-xs" />
            <ChartTooltip
              cursor={{ fill: 'var(--color-net)', fillOpacity: 0.08 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => p?.[0]?.payload?.jourFull ?? ''}
                  formatter={(v) => formatEUR2(Number(v))}
                />
              }
            />
            <Bar dataKey="net" fill="var(--color-net)" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
