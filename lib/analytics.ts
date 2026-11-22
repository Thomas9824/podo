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
  impaye?: boolean       // true si la consultation est impayée (non encaissée)
  maison_retraite?: boolean // true si patient en maison de retraite / EHPAD
}

export const RETROCESSION_RATE = 0.35

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

function toDate(isoStr: string) {
  const [y, m, d] = isoStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0)
}
function pad2(n: number) {
  return String(n).padStart(2, '0')
}
function iso(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
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
  if (!b.start || !b.end) return 'Semaine'
  const d0 = toDate(b.start)
  const d1 = toDate(b.end)
  return `Semaine du ${d0.getDate()} ${MOIS_COURT[d0.getMonth()]} au ${d1.getDate()} ${MOIS_COURT[d1.getMonth()]} ${d1.getFullYear()}`
}

export function periodShortLabel(period: PeriodKey, refDate?: string): string {
  const ref = toDate(refDate ?? iso(new Date()))
  if (period === 'year') return `${ref.getFullYear()}`
  if (period === 'month') return `${MOIS[ref.getMonth()]} ${ref.getFullYear()}`
  if (period === 'week') {
    const b = periodBounds('week', refDate)
    if (!b.start || !b.end) return 'Semaine'
    const d0 = toDate(b.start)
    const d1 = toDate(b.end)
    if (d0.getMonth() === d1.getMonth()) {
      return `${d0.getDate()} – ${d1.getDate()} ${MOIS_COURT[d0.getMonth()]}`
    }
    return `${d0.getDate()} ${MOIS_COURT[d0.getMonth()]} – ${d1.getDate()} ${MOIS_COURT[d1.getMonth()]}`
  }
  return ''
}

export function isSamePeriodAsToday(period: PeriodKey, refDate: string): boolean {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const dRef = toDate(refDate)
  if (period === 'year') {
    return dRef.getFullYear() === today.getFullYear()
  }
  if (period === 'month') {
    return dRef.getFullYear() === today.getFullYear() && dRef.getMonth() === today.getMonth()
  }
  if (period === 'week') {
    const bRef = periodBounds('week', refDate)
    const bToday = periodBounds('week', todayStr)
    return bRef.start === bToday.start
  }
  return true
}

export function shiftPeriod(period: PeriodKey, refDate: string, direction: -1 | 1): string {
  const d = toDate(refDate)
  if (period === 'week') {
    d.setDate(d.getDate() + direction * 7)
  } else if (period === 'month') {
    // Toujours se placer au milieu du mois pour éviter le débordement de fin de mois (31 -> 28/30)
    d.setDate(15)
    d.setMonth(d.getMonth() + direction)
  } else if (period === 'year') {
    d.setFullYear(d.getFullYear() + direction)
  }
  return iso(d)
}

export type SplitPayment = {
  isSplit: boolean
  mode1: string
  montant1: number
  mode2: string
  montant2: number
}

export function parsePaymentMode(mode: string, total: number = 0): SplitPayment {
  if (!mode) {
    return { isSplit: false, mode1: 'CB', montant1: total, mode2: 'Espèces', montant2: 0 }
  }
  const match = mode.match(/^(.+?)\s*\(([\d.,]+)\s*€?\)\s*\+\s*(.+?)\s*\(([\d.,]+)\s*€?\)$/i)
  if (match) {
    const m1 = parseFloat(match[2].replace(',', '.')) || 0
    const m2 = parseFloat(match[4].replace(',', '.')) || 0
    return {
      isSplit: true,
      mode1: match[1].trim(),
      montant1: m1,
      mode2: match[3].trim(),
      montant2: m2,
    }
  }
  return {
    isSplit: false,
    mode1: mode,
    montant1: total,
    mode2: mode.toLowerCase().includes('espèce') ? 'CB' : 'Espèces',
    montant2: 0,
  }
}

export function formatPaymentMode(split: {
  isSplit: boolean
  mode1: string
  montant1: number
  mode2: string
  montant2: number
}): string {
  if (!split.isSplit) {
    return split.mode1
  }
  const f1 = split.montant1.toFixed(2).replace(/\.00$/, '')
  const f2 = split.montant2.toFixed(2).replace(/\.00$/, '')
  return `${split.mode1} (${f1} €) + ${split.mode2} (${f2} €)`
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

  const paidRows = rows.filter((r) => !r.impaye)
  const unpaidRows = rows.filter((r) => r.impaye)

  const totalMontant = sum(paidRows, (r) => r.montant)
  const totalRetro = sum(paidRows, (r) => r.retrocession)
  const totalNet = sum(paidRows, (r) => r.net)
  const totalImpaye = sum(unpaidRows, (r) => r.montant)
  const countImpaye = unpaidRows.length

  const maisonRetraiteRows = rows.filter((r) => r.maison_retraite)
  const countMaisonRetraite = maisonRetraiteRows.length
  const totalMaisonRetraite = round2(sum(maisonRetraiteRows.filter((r) => !r.impaye), (r) => r.montant))

  const paidSessions = new Set<string>()
  let nPaye = 0
  for (const r of paidRows) {
    if (r.session_id) {
      if (!paidSessions.has(r.session_id)) { paidSessions.add(r.session_id); nPaye++ }
    } else {
      nPaye++
    }
  }

  const panier = nPaye ? totalNet / nPaye : 0
  const panierBrut = nPaye ? totalMontant / nPaye : 0

  // Utilise la durée stockée si > 0, sinon tombe sur la table de référence
  const totalMinutes = rows.reduce((acc, r) => acc + (r.duree > 0 ? r.duree : dureeFor(r.type)), 0)
  const totalHeures = totalMinutes / 60
  const netParHeure = totalHeures ? totalNet / totalHeures : 0
  const montantParHeure = totalHeures ? totalMontant / totalHeures : 0

  // Évolution vs période précédente équivalente (sur CA brut encaissé)
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
    const prevPaid = prev.filter((r) => !r.impaye)
    const prevMontant = sum(prevPaid, (r) => r.montant)
    if (prevMontant) evolution = ((totalMontant - prevMontant) / prevMontant) * 100
    else if (totalMontant) evolution = 100
  }

  // Par type de soin — priorise le CA brut encaissé
  const typeMap = new Map<string, { nb: number; montant: number; net: number; minutes: number }>()
  for (const r of rows) {
    const cur = typeMap.get(r.type) ?? { nb: 0, montant: 0, net: 0, minutes: 0 }
    cur.nb += 1
    if (!r.impaye) {
      cur.montant += r.montant
      cur.net += r.net
    }
    cur.minutes += (r.duree > 0 ? r.duree : dureeFor(r.type))
    typeMap.set(r.type, cur)
  }
  const parType = [...typeMap.entries()]
    .map(([type, v]) => ({
      type,
      nb: v.nb,
      montant: round2(v.montant),
      net: round2(v.net),
      pct: totalMontant ? (v.montant / totalMontant) * 100 : 0,
      dureeMoy: v.minutes / v.nb,
      montantHeure: v.minutes ? v.montant / (v.minutes / 60) : 0,
      netHeure: v.minutes ? v.net / (v.minutes / 60) : 0,
    }))
    .sort((a, b) => b.montant - a.montant)

  // Par mode de paiement (regroupe les libellés rares) — priorise le brut encaissé
  // Pour éviter de doubler les paiements d'une même session multi-soins, on fusionne d'abord par session_id
  const sessionMergedPaid: Consultation[] = []
  const seenSessions = new Map<string, Consultation>()
  for (const r of paidRows) {
    if (!r.session_id) {
      sessionMergedPaid.push(r)
    } else if (seenSessions.has(r.session_id)) {
      const base = seenSessions.get(r.session_id)!
      base.montant = round2(base.montant + r.montant)
      base.net = round2(base.net + r.net)
    } else {
      const clone = { ...r }
      seenSessions.set(r.session_id, clone)
      sessionMergedPaid.push(clone)
    }
  }

  const modeMap = new Map<string, { montant: number; net: number }>()
  for (const r of sessionMergedPaid) {
    const split = parsePaymentMode(r.mode, r.montant)
    if (split.isSplit) {
      const k1 = normaliseMode(split.mode1)
      const cur1 = modeMap.get(k1) ?? { montant: 0, net: 0 }
      cur1.montant += split.montant1
      cur1.net += round2(split.montant1 * 0.65)
      modeMap.set(k1, cur1)

      const k2 = normaliseMode(split.mode2)
      const cur2 = modeMap.get(k2) ?? { montant: 0, net: 0 }
      cur2.montant += split.montant2
      cur2.net += round2(split.montant2 * 0.65)
      modeMap.set(k2, cur2)
    } else {
      const key = normaliseMode(r.mode)
      const cur = modeMap.get(key) ?? { montant: 0, net: 0 }
      cur.montant += r.montant
      cur.net += r.net
      modeMap.set(key, cur)
    }
  }
  const parMode = [...modeMap.entries()]
    .map(([mode, v]) => ({
      mode,
      montant: round2(v.montant),
      net: round2(v.net),
      pct: totalMontant ? (v.montant / totalMontant) * 100 : 0,
    }))
    .sort((a, b) => b.montant - a.montant)

  // Évolution temporelle (contient brut et net encaissés)
  const spanDays =
    rows.length > 1
      ? Math.round(
          (toDate(rows[rows.length - 1].date).getTime() - toDate(rows[0].date).getTime()) / 86400000,
        )
      : 0
  const monthly = spanDays > 45
  const serieMap = new Map<string, { montant: number; net: number }>()
  for (const r of paidRows) {
    const key = monthly ? r.date.slice(0, 7) + '-01' : r.date
    const cur = serieMap.get(key) ?? { montant: 0, net: 0 }
    cur.montant += r.montant
    cur.net += r.net
    serieMap.set(key, cur)
  }
  const serie = [...serieMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      montant: round2(v.montant),
      net: round2(v.net),
      label: monthly ? fmtMonth(date) : fmtDay(date),
    }))

  // Top patients
  const patientMap = new Map<string, { nb: number; montant: number; net: number }>()
  const patientSessions = new Set<string>()
  for (const r of rows) {
    if (!r.nom) continue
    const cur = patientMap.get(r.nom) ?? { nb: 0, montant: 0, net: 0 }
    const sessionKey = r.session_id ? `${r.nom}::${r.session_id}` : null
    if (!sessionKey || !patientSessions.has(sessionKey)) {
      if (sessionKey) patientSessions.add(sessionKey)
      cur.nb += 1
    }
    if (!r.impaye) {
      cur.montant += r.montant
      cur.net += r.net
    }
    patientMap.set(r.nom, cur)
  }
  const topPatients = [...patientMap.entries()]
    .map(([nom, v]) => ({ nom, nb: v.nb, montant: round2(v.montant), net: round2(v.net) }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 8)

  // Par jour de semaine — brut et net encaissés
  const jourMontant = new Array(7).fill(0)
  const jourNet = new Array(7).fill(0)
  const jourNb = new Array(7).fill(0)
  for (const r of rows) {
    const idx = (toDate(r.date).getDay() + 6) % 7
    if (!r.impaye) {
      jourMontant[idx] += r.montant
      jourNet[idx] += r.net
    }
    jourNb[idx] += 1
  }
  const parJour = JOURS.map((jour, i) => ({
    jour: jour.slice(0, 3),
    jourFull: jour,
    montant: round2(jourMontant[i]),
    net: round2(jourNet[i]),
    nb: jourNb[i],
  }))

  return {
    n,
    totalMontant: round2(totalMontant),
    totalRetro: round2(totalRetro),
    totalNet: round2(totalNet),
    totalImpaye: round2(totalImpaye),
    countImpaye,
    countMaisonRetraite,
    totalMaisonRetraite,
    panier: round2(panier),
    panierBrut: round2(panierBrut),
    totalHeures: round1(totalHeures),
    netParHeure: round2(netParHeure),
    montantParHeure: round2(montantParHeure),
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
  if (m.includes('cpam')) return 'CPAM'
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
    if (q === 'impaye' || q === 'impayé' || q === 'impayes' || q === 'impayés') {
      rows = rows.filter((r) => r.impaye)
    } else if (q === 'maison' || q === 'retraite' || q === 'ehpad' || q === 'maison de retraite') {
      rows = rows.filter((r) => r.maison_retraite)
    } else {
      rows = rows.filter(
        (r) =>
          r.nom.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.mode.toLowerCase().includes(q) ||
          (Boolean(r.impaye) && 'impayé'.includes(q)) ||
          (Boolean(r.maison_retraite) && 'maison de retraite ehpad'.includes(q)),
      )
    }
  }

  // Fusionner les lignes d'une même session en une seule ligne pour l'affichage
  const merged: Consultation[] = []
  const seen = new Map<string, Consultation>()
  for (const r of rows) {
    if (!r.session_id) {
      merged.push({ ...r, impaye: Boolean(r.impaye), maison_retraite: Boolean(r.maison_retraite) })
    } else if (seen.has(r.session_id)) {
      const base = seen.get(r.session_id)!
      base.type = base.type + ' + ' + r.type
      base.montant = round2(base.montant + r.montant)
      base.retrocession = round2(base.retrocession + r.retrocession)
      base.net = round2(base.net + r.net)
      base.duree += r.duree
      if (r.impaye) base.impaye = true
      if (r.maison_retraite) base.maison_retraite = true
    } else {
      // Clone pour ne pas muter le tableau d'origine
      const clone = { ...r, impaye: Boolean(r.impaye), maison_retraite: Boolean(r.maison_retraite) }
      seen.set(r.session_id, clone)
      merged.push(clone)
    }
  }

  return merged.sort((a, b) => b.date.localeCompare(a.date))
}
