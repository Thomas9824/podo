export type Consultation = {
  id: number
  date: string
  nom: string
  type: string
  mode: string
  montant: number
  retrocession: number
  net: number
  commentaire: string
  duree: number          // durée totale de la consultation en minutes
  session_id: string     // id partagé entre les soins d'une même visite (vide = soin unique)
}

export const RETROCESSION_RATE = 0.4

// Durée par défaut (minutes) par type de soin — utilisée si duree non stockée.
export const DUREES: Record<string, number> = {
  Podologie: 30,
  Pédicurie: 30,
  'Vérification Pédicurie': 15,
  'Soin de pédicurie': 30,
  'Bilan podologique': 40,
  'Vérification Bilan podologique': 15,
  'Semelle orthopédique': 45,
  'Vérification Semelle orthopédique': 15,
  Verrue: 20,
  'Vérification Verrue': 15,
  Onychoplastie: 45,
  'Vérification Onychoplastie': 15,
  Orthonyxie: 45,
  'Vérification Orthonyxie': 15,
  Orthoplastie: 40,
  Orthoplasties: 40,
  'Vérification Orthoplastie': 15,
  'Soin pédicurie + Verrue': 40,
  'Remise OP': 10,
}
export const DUREE_DEFAUT = 30

export function dureeFor(type: string) {
  return DUREES[type] ?? DUREE_DEFAUT
}

export type PeriodKey = 'week' | 'month' | 'year' | 'all' | 'custom'

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const MOIS_COURT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

function toDate(iso: string) {
  return new Date(iso + 'T00:00:00')
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

/**
 * Calcule les bornes de la période par rapport à la date de référence.
 * refDate : la date "aujourd'hui" du point de vue du tableau de bord
 *           (par défaut : date actuelle du navigateur/serveur).
 */
export function periodBounds(
  period: PeriodKey,
  refDate?: string,
  customRange?: { start: string; end: string },
): { start: string | null; end: string | null } {
  if (period === 'all') return { start: null, end: null }
  if (period === 'custom') {
    return {
      start: customRange?.start ?? null,
      end: customRange?.end ?? null,
    }
  }
  const ref = toDate(refDate ?? iso(new Date()))
  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
    return { start: iso(start), end: iso(end) }
  }
  if (period === 'year') {
    return { start: `${ref.getFullYear()}-01-01`, end: `${ref.getFullYear()}-12-31` }
  }
  // week (lundi -> dimanche)
  const day = (ref.getDay() + 6) % 7
  const start = new Date(ref)
  start.setDate(ref.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: iso(start), end: iso(end) }
}

export function periodLabel(
  period: PeriodKey,
  refDate?: string,
  customRange?: { start: string; end: string },
): string {
  if (period === 'all') return 'Toutes les données'
  if (period === 'custom') {
    if (customRange?.start && customRange?.end) {
      return `${fmtDay(customRange.start)} — ${fmtDay(customRange.end)}`
    }
    return 'Plage personnalisée'
  }
  const ref = toDate(refDate ?? iso(new Date()))
  if (period === 'month') return `${MOIS[ref.getMonth()]} ${ref.getFullYear()}`
  if (period === 'year') return `Année ${ref.getFullYear()}`
  const b = periodBounds('week', refDate)
  return `Semaine du ${fmtDay(b.start!)} au ${fmtDay(b.end!)}`
}

export function fmtDay(isoDate: string) {
  const d = toDate(isoDate)
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]}`
}
export function fmtMonth(isoDate: string) {
  const d = toDate(isoDate)
  return `${MOIS_COURT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

export function filterPeriod(
  rows: Consultation[],
  start: string | null,
  end: string | null,
) {
  return rows.filter((r) => {
    if (start && r.date < start) return false
    if (end && r.date > end) return false
    return true
  })
}

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const eur2 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
export const formatEUR = (v: number) => eur.format(v || 0)
export const formatEUR2 = (v: number) => eur2.format(v || 0)

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export type Stats = ReturnType<typeof computeStats>

export function computeStats(
  all: Consultation[],
  period: PeriodKey,
  refDate?: string,
  customRange?: { start: string; end: string },
) {
  const { start, end } = periodBounds(period, refDate, customRange)
  const rows = filterPeriod(all, start, end)
  // Compter les consultations : lignes avec session_id identique = 1 seule visite
  const sessions = new Set<string>()
  let n = 0
  for (const r of rows) {
    if (r.session_id) {
      if (!sessions.has(r.session_id)) { sessions.add(r.session_id); n++ }
    } else {
      n++
    }
  }

  const totalMontant = sum(rows, (r) => r.montant)
  const totalRetro = sum(rows, (r) => r.retrocession)
  const totalNet = sum(rows, (r) => r.net)
  const panier = n ? totalNet / n : 0

  // Utilise la durée stockée si > 0, sinon tombe sur la table de référence
  const totalMinutes = rows.reduce((acc, r) => acc + (r.duree > 0 ? r.duree : dureeFor(r.type)), 0)
  const totalHeures = totalMinutes / 60
  const netParHeure = totalHeures ? totalNet / totalHeures : 0

  // Évolution vs période précédente équivalente
  let evolution: number | null = null
  if (start && end) {
    const d0 = toDate(start)
    const d1 = toDate(end)
    const span = Math.round((d1.getTime() - d0.getTime()) / 86400000) + 1
    const prevEnd = new Date(d0)
    prevEnd.setDate(d0.getDate() - 1)
    const prevStart = new Date(d0)
    prevStart.setDate(d0.getDate() - span)
    const prev = filterPeriod(all, iso(prevStart), iso(prevEnd))
    const prevNet = sum(prev, (r) => r.net)
    if (prevNet) evolution = ((totalNet - prevNet) / prevNet) * 100
    else if (totalNet) evolution = 100
  }

  // Par type de soin
  const typeMap = new Map<string, { nb: number; net: number; minutes: number }>()
  for (const r of rows) {
    const cur = typeMap.get(r.type) ?? { nb: 0, net: 0, minutes: 0 }
    cur.nb += 1
    cur.net += r.net
    cur.minutes += dureeFor(r.type)
    typeMap.set(r.type, cur)
  }
  const parType = [...typeMap.entries()]
    .map(([type, v]) => ({
      type,
      nb: v.nb,
      net: v.net,
      pct: totalNet ? (v.net / totalNet) * 100 : 0,
      dureeMoy: v.minutes / v.nb,
      netHeure: v.minutes ? v.net / (v.minutes / 60) : 0,
    }))
    .sort((a, b) => b.net - a.net)

  // Par mode de paiement (regroupe les libellés rares)
  const modeMap = new Map<string, number>()
  for (const r of rows) {
    const key = normaliseMode(r.mode)
    modeMap.set(key, (modeMap.get(key) ?? 0) + r.net)
  }
  const parMode = [...modeMap.entries()]
    .map(([mode, net]) => ({ mode, net, pct: totalNet ? (net / totalNet) * 100 : 0 }))
    .sort((a, b) => b.net - a.net)

  // Évolution temporelle
  const spanDays =
    n > 1
      ? Math.round(
          (toDate(rows[n - 1].date).getTime() - toDate(rows[0].date).getTime()) / 86400000,
        )
      : 0
  const monthly = spanDays > 45
  const serieMap = new Map<string, number>()
  for (const r of rows) {
    const key = monthly ? r.date.slice(0, 7) + '-01' : r.date
    serieMap.set(key, (serieMap.get(key) ?? 0) + r.net)
  }
  const serie = [...serieMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, net]) => ({
      date,
      net: round2(net),
      label: monthly ? fmtMonth(date) : fmtDay(date),
    }))

  // Top patients — une session multi-soins = 1 visite
  const patientMap = new Map<string, { nb: number; net: number }>()
  const patientSessions = new Set<string>() // session_id déjà comptés
  for (const r of rows) {
    if (!r.nom) continue
    const cur = patientMap.get(r.nom) ?? { nb: 0, net: 0 }
    const sessionKey = r.session_id ? `${r.nom}::${r.session_id}` : null
    if (!sessionKey || !patientSessions.has(sessionKey)) {
      if (sessionKey) patientSessions.add(sessionKey)
      cur.nb += 1
    }
    cur.net += r.net
    patientMap.set(r.nom, cur)
  }
  const topPatients = [...patientMap.entries()]
    .map(([nom, v]) => ({ nom, nb: v.nb, net: v.net }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 8)

  // Par jour de semaine
  const jourMap = new Array(7).fill(0)
  const jourNb = new Array(7).fill(0)
  for (const r of rows) {
    const idx = (toDate(r.date).getDay() + 6) % 7
    jourMap[idx] += r.net
    jourNb[idx] += 1
  }
  const parJour = JOURS.map((jour, i) => ({ jour: jour.slice(0, 3), jourFull: jour, net: round2(jourMap[i]), nb: jourNb[i] }))

  return {
    n,
    totalMontant: round2(totalMontant),
    totalRetro: round2(totalRetro),
    totalNet: round2(totalNet),
    panier: round2(panier),
    totalHeures: round1(totalHeures),
    netParHeure: round2(netParHeure),
    evolution: evolution === null ? null : round1(evolution),
    parType,
    parMode,
    serie,
    monthly,
    topPatients,
    parJour,
  }
}

function normaliseMode(mode: string) {
  const m = mode.toLowerCase()
  if (m.startsWith('cb')) return 'CB'
  if (m.includes('espèce') || m.includes('espece')) return 'Espèces'
  if (m.includes('chèque') || m.includes('cheque')) return 'Chèque'
  if (m.includes('virement')) return 'Virement'
  return 'Autre'
}

function sum<T>(rows: T[], f: (r: T) => number) {
  return rows.reduce((acc, r) => acc + f(r), 0)
}
function round2(v: number) {
  return Math.round(v * 100) / 100
}
function round1(v: number) {
  return Math.round(v * 10) / 10
}

export function searchConsultations(
  all: Consultation[],
  period: PeriodKey,
  query: string,
  refDate?: string,
  customRange?: { start: string; end: string },
) {
  const { start, end } = periodBounds(period, refDate, customRange)
  let rows = filterPeriod(all, start, end)
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (r) => r.nom.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
    )
  }

  // Fusionner les lignes d'une même session en une seule ligne pour l'affichage
  const merged: Consultation[] = []
  const seen = new Map<string, Consultation>()
  for (const r of rows) {
    if (!r.session_id) {
      merged.push(r)
    } else if (seen.has(r.session_id)) {
      const base = seen.get(r.session_id)!
      base.type = base.type + ' + ' + r.type
      base.montant = round2(base.montant + r.montant)
      base.retrocession = round2(base.retrocession + r.retrocession)
      base.net = round2(base.net + r.net)
      base.duree += r.duree
    } else {
      // Clone pour ne pas muter le tableau d'origine
      const clone = { ...r }
      seen.set(r.session_id, clone)
      merged.push(clone)
    }
  }

  return merged.sort((a, b) => b.date.localeCompare(a.date))
}
