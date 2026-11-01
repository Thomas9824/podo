'use client'

import { Cell, Label, Pie, PieChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { mode: string; montant: number; net: number; pct: number; fill: string } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="grid min-w-32 gap-1 rounded-xl border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-medium text-foreground">{d.mode}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">CA brut</span>
        <span className="font-semibold tabular-nums text-foreground">{formatEUR2(d.montant)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Net (65%)</span>
        <span className="tabular-nums text-muted-foreground">{formatEUR2(d.net)}</span>
      </div>
    </div>
  )
}

export function PaymentModeChart({ stats }: { stats: Stats }) {
  const data = stats.parMode
    .filter((m) => m.montant >= 1)
    .map((m, i) => ({ ...m, fill: COLORS[i % COLORS.length] }))
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.mode, { label: d.mode, color: COLORS[i % COLORS.length] }]),
  )

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-1">
        <CardTitle className="font-serif text-lg font-semibold">Modes de paiement</CardTitle>
        <CardDescription>Répartition du chiffre d'affaires brut</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-2.5 pt-0 pb-2">
        <ChartContainer config={config} className="mx-auto aspect-square h-[150px]">
          <PieChart>
            <ChartTooltip content={<CustomTooltip />} />
            <Pie data={data} dataKey="montant" nameKey="mode" innerRadius={46} outerRadius={68} strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.mode} fill={d.fill} className="stroke-card" />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox)) return null
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 5} className="fill-foreground font-serif text-lg font-semibold">
                        {formatEUR(stats.totalMontant)}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 12} className="fill-muted-foreground text-[10px]">
                        CA brut
                      </tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="flex flex-col gap-1.5">
          {data.map((d) => (
            <li key={d.mode} className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-[2px]" style={{ backgroundColor: d.fill }} />
              <span className="text-foreground">{d.mode}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">{Math.round(d.pct)}%</span>
              <span className="w-16 text-right tabular-nums font-semibold text-foreground">{formatEUR(d.montant)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
