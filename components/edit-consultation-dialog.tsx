'use client'

import { useEffect, useState, useTransition } from 'react'
import { Clock, Minus, Plus, AlertCircle, Pencil, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  formatEUR2,
  dureeFor,
  parsePaymentMode,
  formatPaymentMode,
  type Consultation,
} from '@/lib/analytics'

function fmt(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

export function EditConsultationDialog({
  consultation,
  modes,
  types,
  open,
  onOpenChange,
  onSave,
}: {
  consultation: Consultation | null
  modes: string[]
  types: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: number, c: Omit<Consultation, 'id' | 'retrocession' | 'net'>) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  const [date, setDate] = useState('')
  const [nom, setNom] = useState('')
  const [type, setType] = useState('')
  const [duree, setDuree] = useState(30)
  const [montantStr, setMontantStr] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [impaye, setImpaye] = useState(false)
  const [maisonRetraite, setMaisonRetraite] = useState(false)

  // Modes de paiement (simple vs double)
  const [isSplit, setIsSplit] = useState(false)
  const [modeUnique, setModeUnique] = useState(modes[0] ?? 'CB')
  const [mode1, setMode1] = useState('CB')
  const [montant1Str, setMontant1Str] = useState('')
  const [mode2, setMode2] = useState('Espèces')
  const [montant2Str, setMontant2Str] = useState('')

  // Charger les données de la consultation sélectionnée
  useEffect(() => {
    if (!consultation) return

    setDate(consultation.date)
    setNom(consultation.nom)
    setType(consultation.type)
    setDuree(consultation.duree > 0 ? consultation.duree : dureeFor(consultation.type))
    setMontantStr(String(consultation.montant))
    setCommentaire(consultation.commentaire)
    setImpaye(Boolean(consultation.impaye))
    setMaisonRetraite(Boolean(consultation.maison_retraite))

    // Parse du mode de paiement (simple ou double)
    const split = parsePaymentMode(consultation.mode, consultation.montant)
    setIsSplit(split.isSplit)
    if (split.isSplit) {
      setMode1(split.mode1)
      setMontant1Str(String(split.montant1))
      setMode2(split.mode2)
      setMontant2Str(String(split.montant2))
      setModeUnique(split.mode1)
    } else {
      setModeUnique(consultation.mode || modes[0] || 'CB')
      setMode1(consultation.mode || 'CB')
      setMontant1Str(String(Math.round((consultation.montant / 2) * 100) / 100))
      setMode2(consultation.mode === 'Espèces' ? 'CB' : 'Espèces')
      setMontant2Str(String(Math.round((consultation.montant / 2) * 100) / 100))
    }
  }, [consultation, modes])

  const totalNum = Number.parseFloat(montantStr.replace(',', '.')) || 0
  const retroPreview = Math.round(totalNum * 0.35 * 100) / 100
  const netPreview = Math.round((totalNum - retroPreview) * 100) / 100

  const m1Num = Number.parseFloat(montant1Str.replace(',', '.')) || 0
  const m2Num = Number.parseFloat(montant2Str.replace(',', '.')) || 0
  const sumSplit = Math.round((m1Num + m2Num) * 100) / 100
  const diffSplit = Math.round((totalNum - sumSplit) * 100) / 100
  const isSplitBalanced = Math.abs(diffSplit) < 0.01

  function handleMontant1Change(val: string) {
    setMontant1Str(val)
    const n = Number.parseFloat(val.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0 && totalNum > 0) {
      const rest = Math.max(0, Math.round((totalNum - n) * 100) / 100)
      setMontant2Str(String(rest))
    }
  }

  function handleSwitchToSplit() {
    setIsSplit(true)
    const half = Math.round((totalNum / 2) * 100) / 100
    setMontant1Str(String(half))
    setMontant2Str(String(Math.round((totalNum - half) * 100) / 100))
    if (!mode1) setMode1(modeUnique || 'CB')
    if (!mode2) setMode2(modeUnique === 'Espèces' ? 'CB' : 'Espèces')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consultation || !date) return

    const finalMode = isSplit
      ? formatPaymentMode({
          isSplit: true,
          mode1,
          montant1: m1Num,
          mode2,
          montant2: m2Num,
        })
      : modeUnique

    startTransition(async () => {
      await onSave(consultation.id, {
        date,
        nom: nom.trim(),
        type,
        mode: finalMode,
        montant: totalNum,
        commentaire: commentaire.trim(),
        duree,
        session_id: consultation.session_id,
        impaye,
        maison_retraite: maisonRetraite,
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pr-12 pb-3 shrink-0 border-b border-border/40">
            <div className="flex items-center gap-2 text-primary">
              <Pencil className="size-4" />
              <DialogTitle className="font-serif text-xl text-foreground">
                Modifier la consultation
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4 min-h-0 flex-1">
            <FieldGroup className="py-1 gap-4">
              {/* Date + Patient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-date">Date</FieldLabel>
                  <Input
                    id="edit-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-nom">Patient</FieldLabel>
                  <Input
                    id="edit-nom"
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
                  <span className="text-xs font-semibold text-foreground">
                    Consultation en maison de retraite
                  </span>
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

              {/* Soin + Durée */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <Field>
                  <FieldLabel>Type de soin</FieldLabel>
                  <Select value={type} onValueChange={(v) => v != null && setType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {types.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Durée de la consultation</FieldLabel>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-lg border border-input bg-background/80 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDuree((d) => Math.max(5, d - 5))}
                        disabled={duree <= 5}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-25"
                        title="-5 min"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <div className="flex items-center gap-1.5 px-2">
                        <Clock className="size-3.5 text-muted-foreground/70" />
                        <Input
                          type="number"
                          min="5"
                          step="5"
                          value={duree}
                          onChange={(e) => setDuree(Math.max(5, parseInt(e.target.value, 10) || 5))}
                          className="h-7 w-14 border-none text-center text-xs font-semibold tabular-nums shadow-none focus-visible:ring-0 p-0"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDuree((d) => d + 5)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="+5 min"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ({fmt(duree)})
                    </span>
                  </div>
                </Field>
              </div>

              {/* Montant brut */}
              <Field>
                <FieldLabel htmlFor="edit-montant">Montant brut (€)</FieldLabel>
                <div className="relative flex max-w-xs items-center">
                  <Input
                    id="edit-montant"
                    type="number"
                    min="0"
                    step="0.01"
                    value={montantStr}
                    onChange={(e) => setMontantStr(e.target.value)}
                    className="pr-7 text-sm font-semibold tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-3 text-xs font-medium text-muted-foreground">
                    €
                  </span>
                </div>
              </Field>

              {/* Section Paiement (Mode unique ou 2 modes mixtes) */}
              <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modalités de paiement
                    </span>
                  </div>
                  <div className="inline-flex rounded-lg border border-border/80 p-0.5 bg-muted/50 text-xs shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsSplit(false)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
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
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
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
                    <Select value={modeUnique} onValueChange={(v) => v != null && setModeUnique(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {modes.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
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
                          ✓ {sumSplit.toFixed(2)} € sur {totalNum.toFixed(2)} € (équilibré)
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {sumSplit.toFixed(2)} € / {totalNum.toFixed(2)} €
                          {diffSplit > 0
                            ? ` (reste ${diffSplit.toFixed(2)} €)`
                            : ` (dépassement ${(-diffSplit).toFixed(2)} €)`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Statut d'encaissement (Impayé toggle) */}
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
                <FieldLabel htmlFor="edit-note">Remarque</FieldLabel>
                <Textarea
                  id="edit-note"
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
                    <span>Montant exclu du CA</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Total brut</span>
                  <span className={cn('tabular-nums font-semibold', impaye ? 'text-rose-700 dark:text-rose-400 line-through' : 'text-foreground')}>
                    {totalNum.toFixed(2)} €
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Durée
                  </span>
                  <span className="tabular-nums">{fmt(duree)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Rétrocession (35 %)</span>
                  <span className={cn('tabular-nums', impaye && 'line-through opacity-60')}>
                    {formatEUR2(retroPreview)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-medium text-xs pt-1 border-t border-border/40">
                  <span>Revenu net (65 %)</span>
                  <span className={cn('tabular-nums font-semibold', impaye ? 'text-rose-700/80 line-through' : 'text-primary')}>
                    {formatEUR2(netPreview)}
                  </span>
                </div>
              </div>
            </FieldGroup>
          </div>

          <DialogFooter className="m-0 flex flex-row items-center justify-end gap-3 border-t border-border/50 bg-muted/30 px-6 py-4 shrink-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={totalNum <= 0 || pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

