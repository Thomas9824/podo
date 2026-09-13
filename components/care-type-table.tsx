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
import { formatEUR2, type Stats } from '@/lib/analytics'

export function CareTypeTable({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.parType.map((t) => t.net))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg font-semibold">Performance par type de soin</CardTitle>
        <CardDescription>Rentabilité horaire estimée via la durée moyenne de chaque soin</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Type de soin</TableHead>
              <TableHead className="text-right">Nb</TableHead>
              <TableHead className="text-right">CA net</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Durée moy.</TableHead>
              <TableHead className="text-right">Net / h</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.parType.map((t) => (
              <TableRow key={t.type}>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-foreground">{t.type}</span>
                    <span className="relative h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
                        style={{ width: `${(t.net / max) * 100}%` }}
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{t.nb}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatEUR2(t.net)}</TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                  {Math.round(t.dureeMoy)} min
                </TableCell>
                <TableCell className="text-right tabular-nums text-primary">{formatEUR2(t.netHeure)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
