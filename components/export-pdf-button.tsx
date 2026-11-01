'use client'

import { useState, useRef } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai',
  'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre',
  'Novembre', 'Décembre',
]

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function ExportPdfButton() {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(currentYearMonth)
  const [loading, setLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [year, monthIdx] = month.split('-').map(Number)
  const label = `${MOIS_FR[monthIdx - 1]} ${year}`

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/export/pdf?month=${month}`)
      if (!res.ok) throw new Error('Erreur génération')
      const html = await res.text()

      // Injecter dans l'iframe caché puis déclencher window.print()
      const iframe = iframeRef.current!
      const doc = iframe.contentDocument ?? iframe.contentWindow?.document
      if (!doc) return
      doc.open()
      doc.write(html)
      doc.close()

      // Attendre que le contenu soit rendu avant d'imprimer
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setLoading(false)
        setOpen(false)
      }, 600)
    } catch {
      setLoading(false)
      alert('Erreur lors de la génération du PDF.')
    }
  }

  return (
    <>
      {/* Iframe caché pour l'impression */}
      <iframe
        ref={iframeRef}
        title="pdf-export"
        style={{ position: 'fixed', top: -9999, left: -9999, width: '1px', height: '1px', border: 'none' }}
        aria-hidden
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          <FileDown className="size-4" data-icon="inline-start" />
          Exporter PDF
        </DialogTrigger>

        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Exporter en PDF</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Sélectionner le mois
            </label>
            <input
              type="month"
              value={month}
              max={currentYearMonth()}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
            {month && (
              <p className="mt-2 text-xs text-muted-foreground">
                Relevé de <strong>{label}</strong> — 2 pages (résumé + consultations)
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annuler
            </DialogClose>
            <Button onClick={handleExport} disabled={!month || loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  Génération…
                </>
              ) : (
                <>
                  <FileDown className="size-4" data-icon="inline-start" />
                  Imprimer / Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
