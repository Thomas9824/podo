'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, X, ChevronUp, ChevronDown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
type SoinItem = { label: string; prix: number; prixManuel: boolean; duree: number }

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

  const totalSoins = useMemo(() => soins.reduce((s, r) => s + r.prix, 0), [soins])
  const totalDuree = useMemo(() => soins.reduce((s, r) => s + r.duree, 0), [soins])

  const retro = Math.round(totalSoins * RETROCESSION_RATE * 100) / 100
  const net   = Math.round((totalSoins - retro) * 100) / 100

  function addSoin() {
    const def = SOIN_MAP.get(soinPick)
    if (!def) return
    const item: SoinItem = { label: def.label, prix: def.prix, prixManuel: false, duree: def.dureeDefaut }
    setSoins((prev) => [...prev, item])
  }

  function removeSoin(idx: number) {
    setSoins((prev) => prev.filter((_, i) => i !== idx))
  }

  function changePrix(idx: number, val: string) {
    const n = Number.parseFloat(val)
    setSoins((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, prix: Number.isFinite(n) && n >= 0 ? n : s.prix, prixManuel: true } : s
      )
    )
  }

  function resetPrix(idx: number) {
    const def = SOIN_MAP.get(soins[idx].label)
    if (!def) return
    setSoins((prev) =>
      prev.map((s, i) => i === idx ? { ...s, prix: def.prix, prixManuel: false } : s)
    )
  }

  function changeDuree(idx: number, delta: number) {
    setSoins((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, duree: Math.max(15, s.duree + delta) } : s
      )
    )
  }

  function reset() {
    setDate(new Date().toISOString().slice(0, 10))
    setNom('')
    setSoins([])
    setSoinPick(SOINS_BASE[0].label)
    setCommentaire('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || totalSoins <= 0) return
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
          mode,
          montant: s.prix,
          commentaire: commentaire.trim(),
          duree: s.duree,
          session_id: sid,
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

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Nouvelle consultation</DialogTitle>
            <DialogDescription>
              Ajoutez un ou plusieurs soins — montant et durée calculés automatiquement.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
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

              {/* Liste des soins ajoutés avec stepper de durée */}
              {soins.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {soins.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                    >
                      {/* Nom */}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>

                      {/* Prix éditable */}
                      <div className="relative flex shrink-0 items-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          value={s.prix}
                          onChange={(e) => changePrix(i, e.target.value)}
                          className="h-7 w-20 pr-5 text-right text-xs tabular-nums"
                          aria-label={`Prix ${s.label}`}
                        />
                        <span className="pointer-events-none absolute right-2 text-xs text-muted-foreground">€</span>
                        {s.prixManuel && (
                          <button
                            type="button"
                            onClick={() => resetPrix(i)}
                            className="ml-1 text-[11px] text-primary hover:underline"
                            title="Remettre le prix par défaut"
                          >↺</button>
                        )}
                      </div>

                      {/* Durée stepper */}
                      <div className="flex items-center gap-1">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => changeDuree(i, -15)}
                          disabled={s.duree <= 15}
                          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                          aria-label="Réduire durée"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                        <span className="w-14 text-center text-xs tabular-nums text-foreground">
                          {fmt(s.duree)}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeDuree(i, 15)}
                          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="Augmenter durée"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => removeSoin(i)}
                        className="ml-2 rounded-sm opacity-50 hover:opacity-100"
                        aria-label={`Retirer ${s.label}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}

                  {/* Récap durée totale */}
                  {soins.length > 1 && (
                    <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>Durée totale : <strong className="text-foreground">{fmt(totalDuree)}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </Field>

            {/* Paiement */}
            <Field>
              <FieldLabel>Paiement</FieldLabel>
                <Select value={mode} onValueChange={(v) => v != null && setMode(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
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
            <div className="flex flex-col gap-2 rounded-lg border border-accent bg-accent/40 p-3 text-sm">
              {soins.length > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Total brut ({soins.length} soin{soins.length > 1 ? 's' : ''})</span>
                  <span className="tabular-nums font-medium text-foreground">{totalSoins.toFixed(2)} €</span>
                </div>
              )}
              {soins.length > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Durée totale
                  </span>
                  <span className="tabular-nums">{fmt(totalDuree)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Rétrocession (40 %)</span>
                <span className="tabular-nums">{formatEUR2(retro)}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span>Revenu net (60 %)</span>
                <span className="tabular-nums text-primary">{formatEUR2(net)}</span>
              </div>
            </div>
          </FieldGroup>

          <DialogFooter>
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
