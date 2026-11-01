'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatEUR2, type Stats } from '@/lib/analytics'

export function CareTypeTable({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.parType.map((t) => t.montant))
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg font-semibold">Performance par type de soin</CardTitle>
        <CardDescription>CA brut et rentabilité horaire estimée</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ScrollArea className="h-[250px] pr-2">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead>Type de soin</TableHead>
                <TableHead className="text-right">Nb</TableHead>
                <TableHead className="text-right font-semibold text-foreground">CA brut</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Durée moy.</TableHead>
                <TableHead className="text-right font-semibold text-primary">Brut / h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.parType.map((t) => (
                <TableRow key={t.type}>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-medium text-foreground">{t.type}</span>
                      <span className="relative h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-muted">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
                          style={{ width: `${(t.montant / max) * 100}%` }}
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{t.nb}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">{formatEUR2(t.montant)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {Math.round(t.dureeMoy)} min
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-primary">{formatEUR2(t.montantHeure)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
