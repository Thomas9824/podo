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
        up ? 'text-primary' : 'text-destructive',
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {/* Revenu net — carte signature */}
      <Card className="col-span-2 flex flex-col justify-between gap-6 overflow-hidden border-primary/20 bg-primary p-5 text-primary-foreground lg:col-span-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary-foreground/80">Revenu net</span>
          <Wallet className="size-4 text-primary-foreground/70" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-serif text-4xl font-semibold leading-none tracking-tight tabular-nums">
            {formatEUR(stats.totalNet)}
          </span>
          <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
            {stats.evolution !== null ? (
              <span className="inline-flex items-center gap-1 font-medium">
                {stats.evolution >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {stats.evolution >= 0 ? '+' : ''}
                {stats.evolution}% vs période précédente
              </span>
            ) : (
              <span>Sur l’ensemble des données</span>
            )}
          </div>
        </div>
      </Card>

      <Kpi label="Chiffre d’affaires" icon={Coins} value={formatEUR(stats.totalMontant)} hint="Montant brut encaissé" />
      <Kpi label="Rétrocessions" icon={HandCoins} value={formatEUR(stats.totalRetro)} hint="40 % reversés" />
      <Kpi label="Consultations" icon={Users} value={String(stats.n)} hint={`${stats.totalHeures} h travaillées`} />
      <Kpi label="Panier moyen" icon={ShoppingBag} value={formatEUR2(stats.panier)} hint="Net par consultation" />
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="flex flex-col justify-between gap-6 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/70" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-serif text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
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
