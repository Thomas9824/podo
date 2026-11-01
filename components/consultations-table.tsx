'use client'

import { useState } from 'react'
import { Search, MessageSquareText, Pencil, Trash2, Check, X } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmtDay, formatEUR2, type Consultation } from '@/lib/analytics'

type EditState = {
  id: number
  date: string
  nom: string
  type: string
  mode: string
  montant: string
  commentaire: string
  duree: number
  session_id: string
}

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
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(r: Consultation) {
    setEditing({
      id: r.id,
      date: r.date,
      nom: r.nom,
      type: r.type,
      mode: r.mode,
      montant: String(r.montant),
      commentaire: r.commentaire,
      duree: r.duree,
      session_id: r.session_id,
    })
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    await onUpdate(editing.id, {
      date: editing.date,
      nom: editing.nom,
      type: editing.type,
      mode: editing.mode,
      montant: Number(editing.montant) || 0,
      commentaire: editing.commentaire,
      duree: editing.duree,
      session_id: editing.session_id,
    })
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette consultation ?')) return
    await onDelete(id)
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="font-serif text-lg font-semibold">Consultations</CardTitle>
          <CardDescription>
            {rows.length} consultation{rows.length > 1 ? 's' : ''} sur la période
            {query.trim() ? ` (filtre actif)` : ''}
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-80">
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
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="min-w-44">Patient</TableHead>
                <TableHead className="min-w-44">Type de soin</TableHead>
                <TableHead className="w-28">Paiement</TableHead>
                <TableHead className="w-28 text-right font-semibold text-foreground">Montant brut</TableHead>
                <TableHead className="w-28 text-right text-muted-foreground">Rétro. (35%)</TableHead>
                <TableHead className="w-28 text-right text-muted-foreground">Net (65%)</TableHead>
                <TableHead className="w-20 text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    Aucune consultation trouvée
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const isEditing = editing?.id === r.id
                  if (isEditing && editing) {
                    const montantNum = Number.parseFloat(editing.montant) || 0
                    const retroPreview = Math.round(montantNum * 0.35 * 100) / 100
                    const netPreview = Math.round((montantNum - retroPreview) * 100) / 100
                    return (
                      <TableRow key={r.id} className="bg-muted/40">
                        <TableCell>
                          <Input
                            type="date"
                            value={editing.date}
                            onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                            className="h-7 w-32 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editing.nom}
                            onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
                            className="h-7 text-xs"
                            placeholder="Patient"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editing.type}
                            onValueChange={(v) => v != null && setEditing({ ...editing, type: v })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {types.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editing.mode}
                            onValueChange={(v) => v != null && setEditing({ ...editing, mode: v })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {modes.map((mo) => (
                                  <SelectItem key={mo} value={mo} className="text-xs">
                                    {mo}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editing.montant}
                            onChange={(e) => setEditing({ ...editing, montant: e.target.value })}
                            className="h-7 w-24 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatEUR2(retroPreview)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatEUR2(netPreview)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6"
                              onClick={saveEdit}
                              disabled={saving}
                              title="Enregistrer"
                            >
                              <Check className="size-3.5 text-primary" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6"
                              onClick={cancelEdit}
                              title="Annuler"
                            >
                              <X className="size-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fmtDay(r.date)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.mode}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-foreground">
                        {formatEUR2(r.montant)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground/70 text-xs">
                        {formatEUR2(r.retrocession)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                        {formatEUR2(r.net)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                            onClick={() => startEdit(r)}
                            title="Modifier"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                            onClick={() => handleDelete(r.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
