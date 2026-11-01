'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

const config = {
  montant: { label: 'CA brut', color: 'var(--chart-1)' },
  net: { label: 'Net', color: 'var(--chart-2)' },
} satisfies ChartConfig

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; payload: { montant: number; net: number; label: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="grid min-w-36 gap-1.5 rounded-xl border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-medium text-foreground">{d.label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--color-montant)' }} />
          CA brut
        </span>
        <span className="font-semibold tabular-nums text-foreground">{formatEUR2(d.montant)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--color-net)' }} />
          Net (65%)
        </span>
        <span className="tabular-nums text-muted-foreground">{formatEUR2(d.net)}</span>
      </div>
    </div>
  )
}

export function RevenueChart({ stats }: { stats: Stats }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-1">
        <CardTitle className="font-serif text-lg font-semibold">Chiffre d'affaires</CardTitle>
        <CardDescription>
          {stats.monthly ? 'Agrégation mensuelle' : 'Jour par jour'} · {formatEUR(stats.totalMontant)} brut encaissé
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end pt-0 pb-2">
        <ChartContainer config={config} className="h-[250px] w-full">
          <AreaChart data={stats.serie} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillMontant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-montant)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-montant)" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-net)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-net)" stopOpacity={0.01} />
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
              cursor={{ stroke: 'var(--color-montant)', strokeOpacity: 0.15, strokeWidth: 24 }}
              content={<CustomTooltip />}
            />
            {/* Net en arrière-plan (secondaire) */}
            <Area
              dataKey="net"
              type="monotone"
              stroke="var(--color-net)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="url(#fillNet)"
              dot={false}
              activeDot={false}
            />
            {/* CA brut en premier plan (primaire) */}
            <Area
              dataKey="montant"
              type="monotone"
              stroke="var(--color-montant)"
              strokeWidth={2.5}
              fill="url(#fillMontant)"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--color-montant)' }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
