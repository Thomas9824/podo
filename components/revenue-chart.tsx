'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

const config = {
  net: { label: 'Revenu net', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function RevenueChart({ stats }: { stats: Stats }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="font-serif text-lg font-semibold">Évolution du revenu net</CardTitle>
        <CardDescription>
          {stats.monthly ? 'Agrégation mensuelle' : 'Jour par jour'} · {formatEUR(stats.totalNet)} au total
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={config} className="h-[240px] w-full">
          <AreaChart data={stats.serie} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-net)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-net)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={24}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => formatEUR(v)}
              className="text-xs"
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-net)', strokeOpacity: 0.2, strokeWidth: 24 }}
              content={<ChartTooltipContent formatter={(v) => formatEUR2(Number(v))} />}
            />
            <Area
              dataKey="net"
              type="monotone"
              stroke="var(--color-net)"
              strokeWidth={2.5}
              fill="url(#fillNet)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
