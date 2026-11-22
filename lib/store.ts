import 'server-only'
import path from 'path'
import { readFile, writeFile } from 'fs/promises'
import { read, utils, write } from 'xlsx'
import type { Consultation } from '@/lib/analytics'

const FILE = path.join(process.cwd(), 'data', 'consultations-c71b22.xlsx')
const SHEET = 'Consultations'
const RETRO_RATE = 0.35

const HEADERS = [
  'date',
  'nom',
  'type_de_soin',
  'mode_paiement',
  'montant',
  'retrocession',
  'net',
  'commentaire',
  'duree',
  'session_id',
  'impaye',
  'maison_retraite',
] as const

export type ConsultationInput = {
  date: string
  nom: string
  type: string
  mode: string
  montant: number
  commentaire: string
  duree: number
  session_id: string
  impaye?: boolean
  maison_retraite?: boolean
}

type RawRow = Record<string, unknown>

function round2(v: number) {
  return Math.round(v * 100) / 100
}

/** Recalcule rétrocession (35 %) et net (65 %) à partir du montant brut. */
export function derive(montant: number) {
  const retrocession = round2(montant * RETRO_RATE)
  const net = round2(montant - retrocession)
  return { retrocession, net }
}

async function readRows(): Promise<Consultation[]> {
  const buf = await readFile(FILE)
  const wb = read(buf, { cellDates: false })
  const ws = wb.Sheets[SHEET] ?? wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<RawRow>(ws, { defval: '' })
  return raw.map((r, i) => {
    const montant = Number(r.montant) || 0
    const { retrocession, net } = derive(montant)
    const isImpaye =
      r.impaye === true ||
      String(r.impaye ?? '').toLowerCase() === 'true' ||
      String(r.impaye ?? '').toLowerCase() === 'oui' ||
      String(r.impaye ?? '').toLowerCase() === '1' ||
      r.impaye === 1

    const isMaisonRetraite =
      r.maison_retraite === true ||
      String(r.maison_retraite ?? '').toLowerCase() === 'true' ||
      String(r.maison_retraite ?? '').toLowerCase() === 'oui' ||
      String(r.maison_retraite ?? '').toLowerCase() === '1' ||
      r.maison_retraite === 1

    return {
      id: i + 1,
      date: String(r.date ?? '').slice(0, 10),
      nom: String(r.nom ?? ''),
      type: String(r.type_de_soin ?? ''),
      mode: String(r.mode_paiement ?? ''),
      montant,
      retrocession,
      net,
      commentaire: String(r.commentaire ?? ''),
      duree: Number(r.duree) || 0,
      session_id: String(r.session_id ?? ''),
      impaye: Boolean(isImpaye),
      maison_retraite: Boolean(isMaisonRetraite),
    }
  })
}

async function writeRows(rows: Consultation[]): Promise<void> {
  const data = rows.map((r) => ({
    date: r.date,
    nom: r.nom,
    type_de_soin: r.type,
    mode_paiement: r.mode,
    montant: r.montant,
    retrocession: r.retrocession,
    net: r.net,
    commentaire: r.commentaire,
    duree: r.duree,
    session_id: r.session_id,
    impaye: r.impaye ? 'OUI' : 'NON',
    maison_retraite: r.maison_retraite ? 'OUI' : 'NON',
  }))
  const ws = utils.json_to_sheet(data, { header: HEADERS as unknown as string[] })
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, SHEET)
  const buf = write(wb, { type: 'buffer', bookType: 'xlsx' })
  await writeFile(FILE, buf)
}

export async function getAll(): Promise<Consultation[]> {
  return readRows()
}

export async function addRow(input: ConsultationInput): Promise<Consultation[]> {
  const rows = await readRows()
  const { retrocession, net } = derive(input.montant)
  rows.push({
    id: rows.length + 1,
    date: input.date,
    nom: input.nom,
    type: input.type,
    mode: input.mode,
    montant: round2(input.montant),
    retrocession,
    net,
    commentaire: input.commentaire,
    duree: input.duree,
    session_id: input.session_id,
    impaye: Boolean(input.impaye),
    maison_retraite: Boolean(input.maison_retraite),
  })
  await writeRows(rows)
  return rows
}

export async function updateRow(
  id: number,
  input: ConsultationInput,
): Promise<Consultation[]> {
  const rows = await readRows()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error('Consultation introuvable')
  const { retrocession, net } = derive(input.montant)
  const targetSessionId = rows[idx].session_id

  let nextRows = rows
  if (targetSessionId) {
    // Si la consultation faisait partie d'une session groupée, on remplace le lot par la ligne mise à jour
    nextRows = rows.filter((r) => r.id === id || r.session_id !== targetSessionId)
  }

  const newIdx = nextRows.findIndex((r) => r.id === id)
  nextRows[newIdx] = {
    ...nextRows[newIdx],
    date: input.date,
    nom: input.nom,
    type: input.type,
    mode: input.mode,
    montant: round2(input.montant),
    retrocession,
    net,
    commentaire: input.commentaire,
    duree: input.duree,
    session_id: input.session_id,
    impaye: Boolean(input.impaye),
    maison_retraite: Boolean(input.maison_retraite),
  }
  await writeRows(nextRows)
  return nextRows
}

export async function deleteRow(id: number): Promise<Consultation[]> {
  const rows = await readRows()
  const target = rows.find((r) => r.id === id)
  let next = rows
  if (target?.session_id) {
    next = rows.filter((r) => r.session_id !== target.session_id)
  } else {
    next = rows.filter((r) => r.id !== id)
  }
  await writeRows(next)
  return next
}
