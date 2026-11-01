'use client'

import { TrendingUp, TrendingDown, Coins, HandCoins, Wallet, Users, ShoppingBag, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatEUR, formatEUR2, type Stats } from '@/lib/analytics'

function Delta({ value }: { value: number | null }) {
  if (value === null) return null
  const up = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        up ? 'text-emerald-500 dark:text-emerald-400' : 'text-destructive',
      )}
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {up ? '+' : ''}
      {value}%
    </span>
  )
}

export function KpiCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* Chiffre d'affaires brut — carte signature */}
      <Card className="relative col-span-2 flex flex-col justify-between gap-3 overflow-hidden border-primary/20 bg-primary p-4 text-primary-foreground shadow-sm sm:col-span-1">
        {/* Décoration subtile */}
        <div className="pointer-events-none absolute right-0 top-0 size-24 translate-x-8 -translate-y-8 rounded-full bg-white/8" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary-foreground/80">Chiffre d'affaires</span>
          <Coins className="size-4 text-primary-foreground/60" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-serif text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {formatEUR(stats.totalMontant)}
          </span>
          <div className="text-[11px] text-primary-foreground/75">
            {stats.evolution !== null ? (
              <span className="inline-flex items-center gap-1 font-medium">
                {stats.evolution >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {stats.evolution >= 0 ? '+' : ''}
                {stats.evolution}% vs N-1
              </span>
            ) : (
              <span>Total brut encaissé</span>
            )}
          </div>
        </div>
      </Card>

      <Kpi
        label="Revenu net"
        sublabel="65% du CA"
        icon={Wallet}
        value={formatEUR(stats.totalNet)}
      />
      <Kpi
        label="Rétrocessions"
        sublabel="35% du CA"
        icon={HandCoins}
        value={formatEUR(stats.totalRetro)}
        valueClassName="text-muted-foreground"
      />
      <Kpi
        label="Consultations"
        sublabel={`${stats.totalHeures} h de soins`}
        icon={Users}
        value={String(stats.n)}
      />
      <Kpi
        label="Panier moyen brut"
        sublabel={`Net : ${formatEUR2(stats.panier)}`}
        icon={ShoppingBag}
        value={formatEUR2(stats.panierBrut)}
      />
      <Kpi
        label="CA horaire brut"
        sublabel={`Net : ${formatEUR2(stats.netParHeure)}/h`}
        icon={Clock}
        value={formatEUR2(stats.montantParHeure)}
      />
    </div>
  )
}

function Kpi({
  label,
  sublabel,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string
  sublabel?: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  valueClassName?: string
}) {
  return (
    <Card className="flex flex-col justify-between gap-3 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/60" />
      </div>
      <div className="flex flex-col gap-1">
        <span className={cn('font-serif text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground', valueClassName)}>
          {value}
        </span>
        {sublabel ? <span className="text-[11px] text-muted-foreground">{sublabel}</span> : null}
      </div>
    </Card>
  )
}

export function NetPerHourBanner({ stats }: { stats: Stats }) {
  return (
    <Card className="flex items-center justify-between gap-4 border-accent bg-accent/40 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="size-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">Revenu net par heure travaillée</span>
          <span className="text-xs text-muted-foreground/80">
            Estimé à partir de la durée moyenne de chaque soin
          </span>
        </div>
      </div>
      <span className="font-serif text-3xl font-semibold tabular-nums text-foreground">
        {formatEUR2(stats.netParHeure)}
      </span>
    </Card>
  )
}
