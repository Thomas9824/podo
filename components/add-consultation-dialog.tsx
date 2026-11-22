'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Minus, X, Clock, RotateCcw, AlertCircle, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  RETROCESSION_RATE,
  formatEUR2,
  formatPaymentMode,
  type Consultation,
} from '@/lib/analytics'

// ── Prix et durée par défaut par soin ─────────────────────────────────────
type SoinDef = { label: string; prix: number; dureeDefaut: number }

const SOINS_BASE: SoinDef[] = [
  { label: 'Pédicurie',             prix: 38,  dureeDefaut: 30 },
  { label: 'Bilan podologique',     prix: 40,  dureeDefaut: 40 },
  { label: 'Semelle orthopédique',  prix: 120, dureeDefaut: 45 },
  { label: 'Verrue',                prix: 20,  dureeDefaut: 20 },
  { label: 'Onychoplastie',         prix: 45,  dureeDefaut: 45 },
  { label: 'Orthonyxie',            prix: 45,  dureeDefaut: 45 },
  { label: 'Orthoplastie',          prix: 40,  dureeDefaut: 40 },
]

// Variantes "Vérification" — même prix, durée réduite à 15 min
const SOINS_VERIF: SoinDef[] = SOINS_BASE.map((s) => ({
  label: `Vérification ${s.label}`,
  prix: s.prix,
  dureeDefaut: 15,
}))

// Export pour les autres composants qui en auraient besoin
export const SOIN_PRIX = SOINS_BASE

// Lookup rapide label → définition
const SOIN_MAP = new Map<string, SoinDef>(
  [...SOINS_BASE, ...SOINS_VERIF].map((s) => [s.label, s])
)

// ── Type interne pour un soin ajouté (avec prix et durée éditables) ────────
type SoinItem = { label: string; prix: number; prixStr: string; prixManuel: boolean; duree: number }

function fmt(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

// ── Composant ──────────────────────────────────────────────────────────────
export function AddConsultationDialog({
  modes,
  onAdd,
}: {
  modes: string[]
  onAdd: (c: Omit<Consultation, 'id' | 'retrocession' | 'net'>) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [nom, setNom] = useState('')
  const [soins, setSoins] = useState<SoinItem[]>([])
  const [soinPick, setSoinPick] = useState(SOINS_BASE[0].label)
  const [mode, setMode] = useState(modes[0] ?? '')
  const [commentaire, setCommentaire] = useState('')
  const [impaye, setImpaye] = useState(false)
  const [maisonRetraite, setMaisonRetraite] = useState(false)

  // Double mode de paiement
  const [isSplit, setIsSplit] = useState(false)
  const [mode1, setMode1] = useState(modes[0] ?? 'CB')
  const [montant1Str, setMontant1Str] = useState('')
  const [mode2, setMode2] = useState('Espèces')
  const [montant2Str, setMontant2Str] = useState('')

  const totalSoins = useMemo(() => soins.reduce((s, r) => s + r.prix, 0), [soins])
  const totalDuree = useMemo(() => soins.reduce((s, r) => s + r.duree, 0), [soins])

  const retro = Math.round(totalSoins * RETROCESSION_RATE * 100) / 100
  const net   = Math.round((totalSoins - retro) * 100) / 100

  const m1Num = Number.parseFloat(montant1Str.replace(',', '.')) || 0
  const m2Num = Number.parseFloat(montant2Str.replace(',', '.')) || 0
  const sumSplit = Math.round((m1Num + m2Num) * 100) / 100
  const diffSplit = Math.round((totalSoins - sumSplit) * 100) / 100
  const isSplitBalanced = Math.abs(diffSplit) < 0.01

  function handleMontant1Change(val: string) {
    setMontant1Str(val)
    const n = Number.parseFloat(val.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0 && totalSoins > 0) {
      const rest = Math.max(0, Math.round((totalSoins - n) * 100) / 100)
      setMontant2Str(String(rest))
    }
  }

  function handleSwitchToSplit() {
    setIsSplit(true)
    const half = Math.round((totalSoins / 2) * 100) / 100
    setMontant1Str(String(half))
    setMontant2Str(String(Math.round((totalSoins - half) * 100) / 100))
    if (!mode1) setMode1(mode || 'CB')
    if (!mode2) setMode2(mode === 'Espèces' ? 'CB' : 'Espèces')
  }

  function addSoin() {
    const def = SOIN_MAP.get(soinPick)
    if (!def) return
    const item: SoinItem = {
      label: def.label,
      prix: def.prix,
      prixStr: String(def.prix),
      prixManuel: false,
      duree: def.dureeDefaut,
    }
    setSoins((prev) => [...prev, item])
  }

  function removeSoin(idx: number) {
    setSoins((prev) => prev.filter((_, i) => i !== idx))
  }

  function changePrix(idx: number, val: string) {
    const normalized = val.replace(',', '.')
    const n = Number.parseFloat(normalized)
    setSoins((prev) =>
      prev.map((s, i) =>
        i === idx
          ? {
              ...s,
              prix: Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0,
              prixStr: val,
              prixManuel: true,
            }
          : s
      )
    )
  }

  function resetPrix(idx: number) {
    const def = SOIN_MAP.get(soins[idx].label)
    if (!def) return
    setSoins((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, prix: def.prix, prixStr: String(def.prix), prixManuel: false }
          : s
      )
    )
  }

  function changeDuree(idx: number, delta: number) {
    setSoins((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, duree: Math.max(5, s.duree + delta) } : s
      )
    )
  }

  function reset() {
    setDate(new Date().toISOString().slice(0, 10))
    setNom('')
    setSoins([])
    setSoinPick(SOINS_BASE[0].label)
    setCommentaire('')
    setImpaye(false)
    setMaisonRetraite(false)
    setIsSplit(false)
    setMontant1Str('')
    setMontant2Str('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || totalSoins <= 0) return

    const finalMode = isSplit
      ? formatPaymentMode({
          isSplit: true,
          mode1,
          montant1: m1Num,
          mode2,
          montant2: m2Num,
        })
      : mode

    startTransition(async () => {
      // ID de session partagé entre tous les soins de cette visite
      // (si un seul soin, session_id vide = pas de groupement nécessaire)
      const sid = soins.length > 1
        ? `${date}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        : ''
      for (const s of soins) {
        await onAdd({
          date,
          nom: nom.trim(),
          type: s.label,
          mode: finalMode,
          montant: s.prix,
          commentaire: commentaire.trim(),
          duree: s.duree,
          session_id: sid,
          impaye,
          maison_retraite: maisonRetraite,
        })
      }
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Nouvelle consultation
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pr-12 pb-3 shrink-0 border-b border-border/40">
            <DialogTitle className="font-serif text-xl">Nouvelle consultation</DialogTitle>
            <DialogDescription>
              Ajoutez un ou plusieurs soins — montant et durée calculés automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4 min-h-0 flex-1">
            <FieldGroup className="py-1">
            {/* Date + Patient */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="c-date">Date</FieldLabel>
                <Input
                  id="c-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-nom">Patient</FieldLabel>
                <Input
                  id="c-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom du patient"
                />
              </Field>
            </div>

            {/* Toggle Maison de retraite */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-amber-600 dark:text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    Consultation en maison de retraite
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Flag spécifique pour les résidents d'EHPAD / maison de retraite
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaisonRetraite(!maisonRetraite)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer',
                  maisonRetraite
                    ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 shadow-2xs'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {maisonRetraite ? '✓ Activé' : 'Non'}
              </button>
            </div>

            {/* Sélecteur de soins */}
            <Field>
              <FieldLabel>Soins réalisés</FieldLabel>
              <div className="flex gap-2">
                <Select value={soinPick} onValueChange={(v) => v != null && setSoinPick(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Soins</SelectLabel>
                      {SOINS_BASE.map((s) => (
                        <SelectItem key={s.label} value={s.label}>
                          <span className="flex w-full items-center justify-between gap-4">
                            <span>{s.label}</span>
                            <span className="text-muted-foreground tabular-nums">{s.prix} €</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Vérifications</SelectLabel>
                      {SOINS_VERIF.map((s) => (
                        <SelectItem key={s.label} value={s.label}>
                          <span className="flex w-full items-center justify-between gap-4">
                            <span>{s.label}</span>
                            <span className="text-muted-foreground tabular-nums">{s.prix} €</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addSoin} className="shrink-0">
                  <Plus className="size-4" />
                  Ajouter
                </Button>
              </div>

              {/* Liste des soins ajoutés avec disposition aérée et harmonieuse */}
              {soins.length > 0 && (
                <div className="mt-3 flex flex-col gap-2.5">
                  {soins.map((s, i) => (
                    <div
                      key={i}
                      className="group relative rounded-xl border border-border/80 bg-muted/20 p-3 transition-colors hover:border-border hover:bg-muted/30"
                    >
                      {/* Ligne 1 : Nom du soin + bouton supprimer */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold tracking-tight text-foreground">
                            {s.label}
                          </span>
                          {s.label.startsWith('Vérification') && (
                            <span className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                              Vérification
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSoin(i)}
                          className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Retirer ${s.label}`}
                          title="Retirer ce soin"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* Ligne 2 : Sélecteurs avec espacement harmonieux */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                        {/* Montant éditable à la virgule près */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Montant</span>
                          <div className="relative flex items-center">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={s.prixStr}
                              onChange={(e) => changePrix(i, e.target.value)}
                              className="h-8 w-24 pr-6 text-right text-xs font-semibold tabular-nums"
                              aria-label={`Prix ${s.label}`}
                            />
                            <span className="pointer-events-none absolute right-2 text-xs font-medium text-muted-foreground">
                              €
                            </span>
                          </div>
                          {s.prixManuel && (
                            <button
                              type="button"
                              onClick={() => resetPrix(i)}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                              title="Rétablir le tarif initial"
                            >
                              <RotateCcw className="size-3" />
                              <span className="hidden sm:inline">Défaut</span>
                            </button>
                          )}
                        </div>

                        {/* Stepper de durée par tranche de 5 minutes */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Durée</span>
                          <div className="inline-flex items-center rounded-lg border border-input bg-background/80 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => changeDuree(i, -5)}
                              disabled={s.duree <= 5}
                              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent"
                              aria-label="Réduire de 5 minutes"
                              title="-5 min"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <div className="flex items-center gap-1.5 px-2">
                              <Clock className="size-3.5 text-muted-foreground/70" />
                              <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-foreground">
                                {fmt(s.duree)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => changeDuree(i, 5)}
                              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              aria-label="Augmenter de 5 minutes"
                              title="+5 min"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Récap durée totale */}
                  {soins.length > 1 && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <Clock className="size-3.5 text-primary" />
                      <span>
                        Durée totale : <strong className="font-semibold text-foreground">{fmt(totalDuree)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Field>

            {/* Section Paiement & Répartition */}
            <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Modalités de règlement
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Choisissez un règlement unique ou réparti sur 2 modes.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-border/80 p-0.5 bg-muted/50 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setIsSplit(false)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                      !isSplit
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Mode unique
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToSplit}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                      isSplit
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    2 modes (mixte)
                  </button>
                </div>
              </div>

              {!isSplit ? (
                <div className="pt-1">
                  <Select value={mode} onValueChange={(v) => v != null && setMode(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir le mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {modes.map((mo) => (
                          <SelectItem key={mo} value={mo}>
                            {mo}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {/* Mode 1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <Select value={mode1} onValueChange={(v) => v != null && setMode1(v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Mode 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {modes.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={montant1Str}
                        onChange={(e) => handleMontant1Change(e.target.value)}
                        className="h-9 pr-6 text-right text-xs font-semibold tabular-nums"
                        placeholder="Montant 1"
                      />
                      <span className="pointer-events-none absolute right-2 text-xs text-muted-foreground">
                        €
                      </span>
                    </div>
                  </div>

                  {/* Mode 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <Select value={mode2} onValueChange={(v) => v != null && setMode2(v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Mode 2" />
                      </SelectTrigger>
                      <SelectContent>
                        {modes.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={montant2Str}
                        onChange={(e) => setMontant2Str(e.target.value)}
                        className="h-9 pr-6 text-right text-xs font-semibold tabular-nums"
                        placeholder="Montant 2"
                      />
                      <span className="pointer-events-none absolute right-2 text-xs text-muted-foreground">
                        €
                      </span>
                    </div>
                  </div>

                  {/* Indicateur de répartition */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Total réparti :</span>
                    {isSplitBalanced ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        ✓ {sumSplit.toFixed(2)} € sur {totalSoins.toFixed(2)} € (équilibré)
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {sumSplit.toFixed(2)} € / {totalSoins.toFixed(2)} €
                        {diffSplit > 0
                          ? ` (reste ${diffSplit.toFixed(2)} €)`
                          : ` (dépassement ${(-diffSplit).toFixed(2)} €)`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Statut d'encaissement (Impayé toggle avec design cohérent) */}
            <Field>
              <FieldLabel>Statut d'encaissement</FieldLabel>
              <button
                type="button"
                onClick={() => setImpaye(!impaye)}
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-lg border px-3 text-xs font-medium transition-all shadow-2xs cursor-pointer',
                  impaye
                    ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-input bg-background text-foreground hover:bg-accent'
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      impaye ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                    )}
                  />
                  <span className="font-semibold">
                    {impaye ? 'Impayé / En attente' : 'Payé / Encaissé'}
                  </span>
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5',
                    impaye
                      ? 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/60 dark:text-rose-200'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  )}
                >
                  {impaye ? 'Exclu du CA' : 'Comptabilisé'}
                </Badge>
              </button>
            </Field>

            {/* Remarque */}
            <Field>
              <FieldLabel htmlFor="c-note">Remarque</FieldLabel>
              <Textarea
                id="c-note"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Note sur le patient ou le soin…"
                rows={2}
              />
            </Field>

            {/* Récap financier */}
            <div
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-3.5 text-sm transition-colors',
                impaye
                  ? 'border-rose-200 bg-rose-50/60 text-foreground dark:border-rose-900/60 dark:bg-rose-950/20'
                  : 'border-accent bg-accent/40 text-foreground'
              )}
            >
              {impaye && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-100/90 dark:bg-rose-900/40 px-3 py-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Consultation impayée : le montant ne sera pas décompté dans le calcul total du CA</span>
                </div>
              )}
              {soins.length > 0 && (
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Total brut ({soins.length} soin{soins.length > 1 ? 's' : ''})</span>
                  <span className={cn('tabular-nums font-semibold', impaye ? 'text-rose-700 dark:text-rose-400 line-through' : 'text-foreground')}>
                    {totalSoins.toFixed(2)} €
                  </span>
                </div>
              )}
              {soins.length > 0 && (
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Durée totale
                  </span>
                  <span className="tabular-nums">{fmt(totalDuree)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Rétrocession (35 %)</span>
                <span className={cn('tabular-nums', impaye && 'line-through opacity-60')}>{formatEUR2(retro)}</span>
              </div>
              <div className="flex items-center justify-between font-medium text-xs pt-1 border-t border-border/40">
                <span>Revenu net (65 %)</span>
                <span className={cn('tabular-nums font-semibold', impaye ? 'text-rose-700/80 line-through' : 'text-primary')}>
                  {formatEUR2(net)}
                </span>
              </div>
            </div>
          </FieldGroup>
        </div>

        <DialogFooter className="m-0 flex flex-row items-center justify-end gap-3 border-t border-border/50 bg-muted/30 px-6 py-4 shrink-0">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Annuler
          </DialogClose>
          <Button type="submit" disabled={totalSoins <= 0 || pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
    </Dialog>
  )
}
