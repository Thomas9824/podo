import { NextResponse } from 'next/server'
import { getAll, addRow } from '@/lib/store'
import type { ConsultationInput } from '@/lib/store'

export async function GET() {
  try {
    const rows = await getAll()
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[GET /api/consultations]', err)
    return NextResponse.json({ error: 'Erreur lecture' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConsultationInput
    if (!body.date || !body.montant) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    body.duree = Number(body.duree) || 0
    body.session_id = String(body.session_id ?? '')
    const rows = await addRow(body)
    return NextResponse.json(rows, { status: 201 })
  } catch (err) {
    console.error('[POST /api/consultations]', err)
    return NextResponse.json({ error: 'Erreur écriture' }, { status: 500 })
  }
}
