'use client'

import { useEffect, useMemo, useState } from 'react'
import { Stethoscope, Plus } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  computeStats,
  periodLabel,
  searchConsultations,
  type Consultation,
  type PeriodKey,
} from '@/lib/analytics'
import { KpiCards } from '@/components/kpi-cards'
import { RevenueChart } from '@/components/revenue-chart'
import { PaymentModeChart } from '@/components/payment-mode-chart'
import { WeekdayChart } from '@/components/weekday-chart'
import { CareTypeTable } from '@/components/care-type-table'
import { ConsultationsTable } from '@/components/consultations-table'
import { AddConsultationDialog } from '@/components/add-consultation-dialog'
import { DateRangePicker, type DateRange } from '@/components/date-range-picker'
import { ExportPdfButton } from '@/components/export-pdf-button'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
  { key: 'custom', label: 'Perso.' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n + 1)
  return d.toISOString().slice(0, 10)
}

export function Dashboard() {
  const [rows, setRows] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>('year')
  const [customRange, setCustomRange] = useState<DateRange>({
    start: daysAgoISO(30),
    end: todayISO(),
  })
  const [query, setQuery] = useState('')

  // La date de référence = aujourd'hui (toujours dynamique)
  const refDate = todayISO()

  // Charger les consultations depuis l'API au montage
  useEffect(() => {
    fetch('/api/consultations')
      .then((r) => r.json())
      .then((data: Consultation[]) => {
        setRows(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stats = useMemo(
    () => computeStats(rows, period, refDate, customRange),
    [rows, period, refDate, customRange],
  )
  const tableRows = useMemo(
    () => searchConsultations(rows, period, query, refDate, customRange),
    [rows, period, query, refDate, customRange],
  )

  const types = useMemo(
    () => Array.from(new Set(rows.map((r) => r.type))).sort((a, b) => a.localeCompare(b)),
    [rows],
  )
  const modes = useMemo(() => ['CB', 'Espèces', 'Chèque', 'Virement', 'CPAM'], [])

  async function addConsultation(c: Omit<Consultation, 'id' | 'retrocession' | 'net'>) {
    const res = await fetch('/api/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      date: c.date,
      nom: c.nom,
      type: c.type,
      mode: c.mode,
      montant: c.montant,
      commentaire: c.commentaire,
      duree: c.duree,
      session_id: c.session_id,
    }),
    })
    if (res.ok) {
      const updated: Consultation[] = await res.json()
      setRows(updated)
    }
  }

  async function updateConsultation(id: number, c: Omit<Consultation, 'id' | 'retrocession' | 'net'>) {
    const res = await fetch(`/api/consultations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      date: c.date,
      nom: c.nom,
      type: c.type,
      mode: c.mode,
      montant: c.montant,
      commentaire: c.commentaire,
      duree: c.duree,
      session_id: c.session_id,
    }),
    })
    if (res.ok) {
      const updated: Consultation[] = await res.json()
      setRows(updated)
    }
  }

  async function deleteConsultation(id: number) {
    const res = await fetch(`/api/consultations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const updated: Consultation[] = await res.json()
      setRows(updated)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo + titre */}
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="size-4.5" />
            </span>
            <div className="flex flex-col leading-tight">
              <h1 className="font-serif text-[17px] font-semibold tracking-tight text-foreground">
                Cabinet podologie
              </h1>
              <p className="text-xs capitalize text-muted-foreground">
                {periodLabel(period, refDate, customRange)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              value={[period]}
              onValueChange={(v) => { if (v.length > 0) setPeriod(v[0] as PeriodKey) }}
              variant="outline"
              className="bg-card"
            >
              {PERIODS.map((p) => (
                <ToggleGroupItem key={p.key} value={p.key} className="h-8 px-3 text-xs">
                  {p.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ExportPdfButton />
            <AddConsultationDialog modes={modes} onAdd={addConsultation} />
          </div>
        </div>

        {/* Date range picker (custom) */}
        {period === 'custom' && (
          <div className="mt-3">
            <DateRangePicker value={customRange} onChange={setCustomRange} />
          </div>
        )}
      </header>

      {/* ─── CONTENU ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-sm">Chargement…</span>
          </div>
        </div>
      ) : (
        <main className="flex flex-col gap-4 pt-5">
          {/* KPI cards */}
          <KpiCards stats={stats} />

          {/* Ligne 1 : graphique CA + modes de paiement */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart stats={stats} />
            </div>
            <PaymentModeChart stats={stats} />
          </div>

          {/* Ligne 2 : performance par soin + activité par jour */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CareTypeTable stats={stats} />
            <WeekdayChart stats={stats} />
          </div>

          {/* Ligne 3 : tableau consultations */}
          <ConsultationsTable
            rows={tableRows}
            query={query}
            onQueryChange={setQuery}
            types={types}
            modes={modes}
            onUpdate={updateConsultation}
            onDelete={deleteConsultation}
          />
        </main>
      )}
    </div>
  )
}
