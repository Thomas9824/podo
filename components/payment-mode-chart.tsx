'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function PaymentModeChart({ stats }: { stats: Stats }) {
  const data = stats.parMode
    .filter((m) => m.net >= 1)
    .map((m, i) => ({ ...m, fill: COLORS[i % COLORS.length] }))
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.mode, { label: d.mode, color: COLORS[i % COLORS.length] }]),
  )

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="font-serif text-lg font-semibold">Modes de paiement</CardTitle>
        <CardDescription>Répartition du revenu net encaissé</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ChartContainer config={config} className="mx-auto aspect-square h-[180px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v) => formatEUR2(Number(v))} />} />
            <Pie data={data} dataKey="net" nameKey="mode" innerRadius={54} outerRadius={80} strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.mode} fill={d.fill} className="stroke-card" />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox)) return null
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="fill-foreground font-serif text-xl font-semibold">
                        {formatEUR(stats.totalNet)}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-[11px]">
                        net total
                      </tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="flex flex-col gap-2">
          {data.map((d) => (
            <li key={d.mode} className="flex items-center gap-2.5 text-sm">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: d.fill }} />
              <span className="text-foreground">{d.mode}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">{Math.round(d.pct)}%</span>
              <span className="w-20 text-right tabular-nums font-medium text-foreground">{formatEUR(d.net)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
