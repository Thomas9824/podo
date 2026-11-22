'use client'

import { useState } from 'react'
import { Search, MessageSquareText, Pencil, Trash2, X, Clock, AlertCircle, Building2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { fmtDay, formatEUR2, dureeFor, parsePaymentMode, type Consultation } from '@/lib/analytics'
import { EditConsultationDialog } from '@/components/edit-consultation-dialog'

export function ConsultationsTable({
  rows,
  query,
  onQueryChange,
  types,
  modes,
  onUpdate,
  onDelete,
}: {
  rows: Consultation[]
  query: string
  onQueryChange: (v: string) => void
  types: string[]
  modes: string[]
  onUpdate: (id: number, c: Omit<Consultation, 'id' | 'retrocession' | 'net'>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null)
  const [onlyImpayes, setOnlyImpayes] = useState(false)
  const [onlyMaisonRetraite, setOnlyMaisonRetraite] = useState(false)

  const unpaidCount = rows.filter((r) => r.impaye).length
  const maisonRetraiteCount = rows.filter((r) => r.maison_retraite).length

  let displayedRows = rows
  if (onlyImpayes) displayedRows = displayedRows.filter((r) => r.impaye)
  if (onlyMaisonRetraite) displayedRows = displayedRows.filter((r) => r.maison_retraite)

  async function toggleImpaye(r: Consultation) {
    await onUpdate(r.id, {
      date: r.date,
      nom: r.nom,
      type: r.type,
      mode: r.mode,
      montant: r.montant,
      commentaire: r.commentaire,
      duree: r.duree > 0 ? r.duree : dureeFor(r.type),
      session_id: r.session_id,
      impaye: !r.impaye,
      maison_retraite: r.maison_retraite,
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette consultation ?')) return
    await onDelete(id)
  }

  return (
    <>
      <EditConsultationDialog
        consultation={editingConsultation}
        open={Boolean(editingConsultation)}
        onOpenChange={(open) => {
          if (!open) setEditingConsultation(null)
        }}
        modes={modes}
        types={types}
        onSave={onUpdate}
      />

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="font-serif text-lg font-semibold">Consultations</CardTitle>
            <CardDescription>
              {rows.length} consultation{rows.length > 1 ? 's' : ''} sur la période
              {query.trim() ? ` (filtre actif)` : ''}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unpaidCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOnlyImpayes(!onlyImpayes)}
                className={cn(
                  'h-9 gap-1.5 text-xs font-semibold shrink-0 transition-colors cursor-pointer',
                  onlyImpayes
                    ? 'border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950/80 dark:text-rose-200 shadow-2xs'
                    : 'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40'
                )}
                title="Filtrer uniquement les consultations impayées"
              >
                <AlertCircle className="size-3.5" />
                <span>Impayés</span>
                <span className="rounded-full bg-rose-200/80 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  {unpaidCount}
                </span>
              </Button>
            )}

            {maisonRetraiteCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOnlyMaisonRetraite(!onlyMaisonRetraite)}
                className={cn(
                  'h-9 gap-1.5 text-xs font-semibold shrink-0 transition-colors cursor-pointer',
                  onlyMaisonRetraite
                    ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200 shadow-2xs'
                    : 'border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40'
                )}
                title="Filtrer uniquement les consultations en maison de retraite"
              >
                <Building2 className="size-3.5" />
                <span>Maison de retraite</span>
                <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  {maisonRetraiteCount}
                </span>
              </Button>
            )}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Rechercher un patient ou un soin…"
                className="pl-9 pr-8"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                  title="Effacer la recherche"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px]">
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="min-w-40">Patient</TableHead>
                    <TableHead className="min-w-36">Type de soin</TableHead>
                    <TableHead className="w-24 text-center">Durée</TableHead>
                    <TableHead className="min-w-44">Paiement</TableHead>
                    <TableHead className="w-28 text-right font-semibold text-foreground">Montant brut</TableHead>
                    <TableHead className="w-24 text-right text-muted-foreground">Rétro. (35%)</TableHead>
                    <TableHead className="w-24 text-right text-muted-foreground">Net (65%)</TableHead>
                    <TableHead className="w-20 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                        {onlyImpayes && onlyMaisonRetraite
                          ? 'Aucune consultation impayée en maison de retraite sur la période'
                          : onlyImpayes
                          ? 'Aucune consultation impayée sur la période'
                          : onlyMaisonRetraite
                          ? 'Aucune consultation en maison de retraite sur la période'
                          : 'Aucune consultation trouvée'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((r) => {
                      const split = parsePaymentMode(r.mode, r.montant)
                      return (
                        <TableRow
                          key={r.id}
                          className={cn(
                            'group transition-colors',
                            r.impaye
                              ? 'bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-rose-500 text-foreground dark:bg-rose-950/20 dark:border-l-rose-500'
                              : ''
                          )}
                        >
                          <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                            {fmtDay(r.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                {r.nom || '—'}
                                {r.commentaire ? (
                                  <Tooltip>
                                    <TooltipTrigger render={<span className="inline-flex text-muted-foreground/70" />}>
                                      <MessageSquareText className="size-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">{r.commentaire}</TooltipContent>
                                  </Tooltip>
                                ) : null}
                              </span>
                              {r.maison_retraite && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/80 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Building2 className="size-3" />
                                  Maison de retraite
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs">
                              {r.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                              <Clock className="size-3 text-muted-foreground/70" />
                              {r.duree > 0 ? `${r.duree} min` : `${dureeFor(r.type)} min`}
                            </span>
                          </TableCell>
                          <TableCell>
                            {r.impaye ? (
                              <div className="flex flex-col gap-1 items-start">
                                <button
                                  type="button"
                                  onClick={() => toggleImpaye(r)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/80 bg-rose-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 transition-colors hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer shadow-2xs"
                                  title="Consultation marquée impayée. Cliquer pour marquer comme payée"
                                >
                                  <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
                                  Impayé
                                </button>
                                {split.isSplit ? (
                                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                    <span>{split.mode1} ({split.montant1} €)</span>
                                    <span>+</span>
                                    <span>{split.mode2} ({split.montant2} €)</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">{r.mode}</span>
                                )}
                              </div>
                            ) : split.isSplit ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10.5px] font-medium text-secondary-foreground">
                                  {split.mode1} {split.montant1} €
                                </span>
                                <span className="text-[10px] text-muted-foreground">+</span>
                                <span className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10.5px] font-medium text-secondary-foreground">
                                  {split.mode2} {split.montant2} €
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">{r.mode}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.impaye ? (
                              <div className="flex flex-col items-end">
                                <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                                  {formatEUR2(r.montant)}
                                </span>
                                <span className="text-[10px] text-rose-600/90 font-medium">Non encaissé</span>
                              </div>
                            ) : (
                              <span className="font-semibold tabular-nums text-foreground">
                                {formatEUR2(r.montant)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground/70 text-xs">
                            {r.impaye ? (
                              <span className="line-through opacity-50">{formatEUR2(r.retrocession)}</span>
                            ) : (
                              formatEUR2(r.retrocession)
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                            {r.impaye ? (
                              <span className="line-through opacity-50">{formatEUR2(r.net)}</span>
                            ) : (
                              formatEUR2(r.net)
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => setEditingConsultation(r)}
                                title="Modifier la consultation"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(r.id)}
                                title="Supprimer la consultation"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  )
}
