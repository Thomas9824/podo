import { getAll } from '@/lib/store'
import { filterPeriod } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt2(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmt0(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // e.g. "2025-06"

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response('Paramètre month manquant (format YYYY-MM)', { status: 400 })
  }

  const [yearStr, monthStr] = month.split('-')
  const year = parseInt(yearStr)
  const monthIdx = parseInt(monthStr) - 1
  const monthLabel = `${MOIS_FR[monthIdx]} ${year}`

  const startDate = `${year}-${monthStr.padStart(2, '0')}-01`
  const lastDay = new Date(year, monthIdx + 1, 0).getDate()
  const endDate = `${year}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const all = await getAll()
  const rows = filterPeriod(all, startDate, endDate)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const paidRows = rows.filter((r) => !r.impaye)
  const unpaidRows = rows.filter((r) => r.impaye)
  const totalMontant = paidRows.reduce((s, r) => s + r.montant, 0)
  const totalRetro = paidRows.reduce((s, r) => s + r.retrocession, 0)
  const totalNet = paidRows.reduce((s, r) => s + r.net, 0)
  const totalImpaye = unpaidRows.reduce((s, r) => s + r.montant, 0)
  const retroParPersonne = totalRetro / 2
  const joursTravailes = new Set(paidRows.map((r) => r.date)).size

  // Split consultations into pages of ~25 rows
  const PAGE_SIZE = 25
  const pages: typeof rows[] = []
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    pages.push(rows.slice(i, i + PAGE_SIZE))
  }

  const totalPages = 1 + pages.length

  const consultationPages = pages.map((pageRows, pi) => {
    const rowsHtml = pageRows.map((r, i) => {
      const isImpaye = Boolean(r.impaye)
      const rowClass = [i % 2 === 0 ? 'even' : '', isImpaye ? 'row-impaye' : ''].filter(Boolean).join(' ')
      return `
    <tr class="${rowClass}">
      <td class="center">${fmtDate(r.date)}</td>
      <td>${r.nom || '—'}${r.maison_retraite ? ' <span class="badge-ehpad">EHPAD</span>' : ''}</td>
      <td>${r.type}</td>
      <td class="center">${isImpaye ? '<span class="badge-impaye">Impayé</span>' : r.mode}</td>
      <td class="right mono ${isImpaye ? 'impaye-montant' : ''}">${isImpaye ? fmt2(r.montant) : fmt2(r.montant)}</td>
      <td class="right mono muted ${isImpaye ? 'impaye-montant' : ''}">${isImpaye ? '—' : fmt2(r.retrocession)}</td>
      <td class="right mono bold ${isImpaye ? 'impaye-montant' : ''}">${isImpaye ? '—' : fmt2(r.net)}</td>
    </tr>`
    }).join('\n')

    const isLastPage = pi === pages.length - 1

    return `
<div class="page${pi < pages.length - 1 ? ' page-break' : ''}">
  <div class="page-header">
    <div class="page-header-title">Comptabilité Mensuel Clara Mionnet — ${monthLabel}</div>
    <div class="page-header-right">Consultations · p. ${pi + 2}/${totalPages}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center">Date</th>
        <th>Patient</th>
        <th>Soin</th>
        <th class="center">Paiement</th>
        <th class="right">Montant</th>
        <th class="right">Rétro. (35%)</th>
        <th class="right">Net (65%)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    ${isLastPage ? `
    <tfoot>
      <tr>
        <td colspan="4" class="foot-label">
          Total — ${paidRows.length} consultation${paidRows.length > 1 ? 's' : ''} encaissées${totalImpaye > 0 ? ` · ${unpaidRows.length} impayé${unpaidRows.length > 1 ? 's' : ''} (${fmt2(totalImpaye)} exclu${unpaidRows.length > 1 ? 's' : ''})` : ''}
        </td>
        <td class="right mono">${fmt2(totalMontant)}</td>
        <td class="right mono muted">${fmt2(totalRetro)}</td>
        <td class="right mono bold accent-text">${fmt2(totalNet)}</td>
      </tr>
    </tfoot>` : ''}
  </table>

  <div class="doc-footer">
    <span>Clara Mionnet — Comptabilité ${monthLabel}</span>
    <span>p. ${pi + 2}/${totalPages}</span>
  </div>
</div>`
  }).join('\n')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Comptabilité ${monthLabel} — Clara Mionnet</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    font-size: 10.5pt;
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── PAGE ── */
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 16mm 16mm 14mm;
    position: relative;
  }
  .page-break { page-break-after: always; break-after: page; }

  /* ── COVER HEADER ── */
  .cover-header {
    border-bottom: 2.5px solid #111;
    padding-bottom: 7mm;
    margin-bottom: 10mm;
  }
  .cover-title {
    font-size: 20pt;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #111;
    line-height: 1.1;
  }
  .cover-sub {
    font-size: 11pt;
    color: #666;
    margin-top: 3px;
  }
  .cover-meta {
    font-size: 8.5pt;
    color: #aaa;
    margin-top: 6px;
  }

  /* ── KPI GRID ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5mm;
    margin-bottom: 7mm;
  }
  .kpi {
    border: 1.5px solid #e5e5e5;
    border-radius: 10px;
    padding: 6mm 7mm;
  }
  .kpi.primary {
    background: #111;
    border-color: #111;
    color: #fff;
  }
  .kpi-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #888;
    margin-bottom: 4px;
  }
  .kpi.primary .kpi-label { color: rgba(255,255,255,0.6); }
  .kpi-value {
    font-size: 22pt;
    font-weight: 700;
    color: #111;
    line-height: 1;
    letter-spacing: -0.5px;
  }
  .kpi.primary .kpi-value { color: #fff; }

  /* ── RETRO BLOCK ── */
  .retro-block {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 5mm;
    align-items: stretch;
    margin-bottom: 7mm;
    border: 1.5px solid #e5e5e5;
    border-radius: 10px;
    padding: 5mm 7mm;
  }
  .retro-person {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .retro-person-name { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
  .retro-person-amount { font-size: 18pt; font-weight: 700; color: #111; letter-spacing: -0.3px; line-height: 1.1; }
  .retro-person-pct { font-size: 7.5pt; color: #aaa; }
  .retro-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
    font-size: 14pt;
    padding: 0 4mm;
  }

  /* ── STATS ROW ── */
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 4mm;
    margin-bottom: 0;
  }
  .stat {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 4mm 5mm;
    text-align: center;
  }
  .stat-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.4px; }
  .stat-value { font-size: 13pt; font-weight: 700; color: #111; margin-top: 3px; }

  /* ── PAGE HEADER (pages 2+) ── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #111;
    padding-bottom: 4mm;
    margin-bottom: 7mm;
  }
  .page-header-title { font-size: 10pt; font-weight: 700; color: #111; }
  .page-header-right { font-size: 8.5pt; color: #999; }

  /* ── TABLE ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  thead tr { background: #111; color: #fff; }
  thead th {
    padding: 3mm 3.5mm;
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr.even { background: #fafafa; }
  tbody tr.row-impaye { background: #fff1f2 !important; }
  tbody tr.row-impaye td { color: #991b1b; }
  tbody tr:last-child { border-bottom: none; }
  td { padding: 2.5mm 3.5mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  .mono { font-variant-numeric: tabular-nums; }
  .bold { font-weight: 600; }
  .muted { color: #999; }
  .accent-text { color: #111; }

  .badge-impaye {
    display: inline-block;
    background: #e11d48;
    color: #fff;
    font-size: 6.5pt;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .badge-ehpad {
    display: inline-block;
    background: #fef3c7;
    color: #b45309;
    font-size: 6.5pt;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .impaye-montant { color: #e11d48 !important; }

  /* ── TFOOT ── */
  tfoot tr { background: #f5f5f5; border-top: 2px solid #ddd; }
  tfoot td { padding: 3mm 3.5mm; font-weight: 600; font-size: 9pt; }
  .foot-label { font-size: 8pt; color: #666; font-weight: 400; }

  /* ── FOOTER ── */
  .doc-footer {
    position: absolute;
    bottom: 7mm;
    left: 16mm;
    right: 16mm;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #bbb;
    border-top: 1px solid #eee;
    padding-top: 2.5mm;
  }

  @media print {
    html, body { margin: 0; background: #fff; }
    .page { padding: 14mm 14mm 12mm; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>

<!-- ══ PAGE 1 — RÉSUMÉ ══ -->
<div class="page page-break">

  <div class="cover-header">
    <div class="cover-title">Comptabilité Mensuel<br>Clara Mionnet</div>
    <div class="cover-sub">${monthLabel}</div>
    <div class="cover-meta">Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>

  <!-- KPIs principaux -->
  <div class="kpi-grid">
    <div class="kpi primary">
      <div class="kpi-label">CA brut</div>
      <div class="kpi-value">${fmt0(totalMontant)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Après rétrocession</div>
      <div class="kpi-value">${fmt0(totalNet)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Rétrocession totale</div>
      <div class="kpi-value">${fmt0(totalRetro)}</div>
    </div>
  </div>

  <!-- Répartition rétrocession -->
  <div class="retro-block">
    <div class="retro-person">
      <div class="retro-person-name">Yann</div>
      <div class="retro-person-amount">${fmt2(retroParPersonne)}</div>
      <div class="retro-person-pct">17,5 % du CA</div>
    </div>
    <div class="retro-divider">÷ 2</div>
    <div class="retro-person" style="text-align:right;">
      <div class="retro-person-name">Gauthier</div>
      <div class="retro-person-amount">${fmt2(retroParPersonne)}</div>
      <div class="retro-person-pct">17,5 % du CA</div>
    </div>
  </div>

  <!-- Stats secondaires -->
  <div class="stats-row">
    <div class="stat">
      <div class="stat-label">Jours travaillés</div>
      <div class="stat-value">${joursTravailes}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Consultations</div>
      <div class="stat-value">${paidRows.length}${unpaidRows.length > 0 ? ` <span style="font-size:9pt;color:#999;">+${unpaidRows.length} impayé${unpaidRows.length > 1 ? 's' : ''}</span>` : ''}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Panier moyen brut</div>
      <div class="stat-value">${fmt2(paidRows.length ? totalMontant / paidRows.length : 0)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Panier moyen net</div>
      <div class="stat-value">${fmt2(paidRows.length ? totalNet / paidRows.length : 0)}</div>
    </div>
  </div>

  <div class="doc-footer">
    <span>Clara Mionnet — Comptabilité ${monthLabel}</span>
    <span>p. 1/${totalPages}</span>
  </div>
</div>

${consultationPages}

</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
