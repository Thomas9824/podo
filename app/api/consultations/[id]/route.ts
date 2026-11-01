import { NextResponse } from 'next/server'
import { updateRow, deleteRow } from '@/lib/store'
import type { ConsultationInput } from '@/lib/store'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    const body = (await req.json()) as ConsultationInput
    body.duree = Number(body.duree) || 0
    body.session_id = String(body.session_id ?? '')
    const rows = await updateRow(id, body)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[PATCH /api/consultations/[id]]', err)
    return NextResponse.json({ error: 'Erreur modification' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    const rows = await deleteRow(id)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[DELETE /api/consultations/[id]]', err)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
