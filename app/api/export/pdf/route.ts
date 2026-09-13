import { getAll } from '@/lib/store'
import { filterPeriod, formatEUR2 } from '@/lib/analytics'

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
  const monthIdx = parseInt(monthStr) - 1 // 0-based
  const monthLabel = `${MOIS_FR[monthIdx]} ${year}`

  const startDate = `${year}-${monthStr.padStart(2, '0')}-01`
  const lastDay = new Date(year, monthIdx + 1, 0).getDate()
  const endDate = `${year}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const all = await getAll()
  const rows = filterPeriod(all, startDate, endDate)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalMontant = rows.reduce((s, r) => s + r.montant, 0)
  const totalRetro = rows.reduce((s, r) => s + r.retrocession, 0)
  const totalNet = rows.reduce((s, r) => s + r.net, 0)
  const retroParPersonne = totalRetro / 2

  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const rowsHtml = rows.map((r, i) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td class="center">${fmtDate(r.date)}</td>
      <td>${r.nom || '—'}</td>
      <td>${r.type}</td>
      <td class="center">${r.mode}</td>
      <td class="right mono">${fmt2(r.montant)}</td>
      <td class="right mono muted">${fmt2(r.retrocession)}</td>
      <td class="right mono bold">${fmt2(r.net)}</td>
    </tr>`).join('\n')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Relevé ${monthLabel}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    font-size: 11pt;
    color: #1a1a2e;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── PAGE LAYOUT ────────────────────────────── */
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 18mm 16mm 14mm;
    position: relative;
  }
  .page-break { page-break-after: always; break-after: page; }

  /* ── HEADER ─────────────────────────────────── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10mm;
    padding-bottom: 6mm;
    border-bottom: 2px solid #d4607a;
  }
  .brand { display: flex; flex-direction: column; gap: 3px; }
  .brand-name {
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: #1a1a2e;
  }
  .brand-sub { font-size: 9pt; color: #888; }
  .doc-meta { text-align: right; }
  .doc-title {
    font-size: 14pt;
    font-weight: 600;
    color: #d4607a;
    margin-bottom: 4px;
  }
  .doc-period { font-size: 10pt; color: #555; }
  .doc-generated { font-size: 8pt; color: #aaa; margin-top: 3px; }

  /* ── SUMMARY CARDS ──────────────────────────── */
  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5mm;
    margin-bottom: 8mm;
  }
  .card {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 5mm 6mm;
  }
  .card-label { font-size: 8pt; color: #888; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-value { font-size: 16pt; font-weight: 700; color: #1a1a2e; line-height: 1.1; }
  .card-sub { font-size: 8pt; color: #aaa; margin-top: 3px; }
  .card.primary { background: #d4607a; border-color: #d4607a; }
  .card.primary .card-label { color: rgba(255,255,255,0.75); }
  .card.primary .card-value { color: #fff; }
  .card.primary .card-sub { color: rgba(255,255,255,0.6); }
  .card.accent { background: #fff5f7; border-color: #f5c6d0; }

  /* ── RETRO SPLIT ────────────────────────────── */
  .retro-split {
    background: #fff5f7;
    border: 1px solid #f5c6d0;
    border-radius: 8px;
    padding: 5mm 6mm;
    margin-bottom: 8mm;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    gap: 4mm;
  }
  .retro-split-title {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-bottom: 2mm;
    grid-column: 1 / -1;
  }
  .retro-person {
    background: #fff;
    border: 1px solid #f5c6d0;
    border-radius: 6px;
    padding: 4mm 5mm;
    text-align: center;
  }
  .retro-person-name { font-size: 9pt; font-weight: 600; color: #555; margin-bottom: 3px; }
  .retro-person-amount { font-size: 14pt; font-weight: 700; color: #d4607a; }
  .retro-person-pct { font-size: 8pt; color: #aaa; }
  .retro-total {
    text-align: center;
  }
  .retro-total-label { font-size: 8pt; color: #888; margin-bottom: 3px; }
  .retro-total-value { font-size: 14pt; font-weight: 700; color: #1a1a2e; }

  /* ── STATS ROW ──────────────────────────────── */
  .stats-row {
    display: flex;
    gap: 4mm;
    margin-bottom: 10mm;
  }
  .stat-item {
    flex: 1;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 3mm 4mm;
    text-align: center;
  }
  .stat-item .label { font-size: 8pt; color: #888; }
  .stat-item .value { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin-top: 2px; }

  /* ── SECTION TITLE ──────────────────────────── */
  .section-title {
    font-size: 10pt;
    font-weight: 600;
    color: #1a1a2e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4mm;
    padding-bottom: 2mm;
    border-bottom: 1px solid #eee;
  }

  /* ── TABLE ──────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  thead tr {
    background: #1a1a2e;
    color: #fff;
  }
  thead th {
    padding: 3mm 4mm;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr.even { background: #fafafa; }
  tbody tr:last-child { border-bottom: none; }
  td { padding: 2.5mm 4mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  .mono { font-variant-numeric: tabular-nums; }
  .bold { font-weight: 600; color: #1a1a2e; }
  .muted { color: #999; }

  /* ── TABLE FOOTER ───────────────────────────── */
  tfoot tr {
    background: #f7f7f7;
    border-top: 2px solid #eee;
  }
  tfoot td { padding: 3mm 4mm; font-weight: 600; }

  /* ── FOOTER ─────────────────────────────────── */
  .doc-footer {
    position: absolute;
    bottom: 8mm;
    left: 16mm;
    right: 16mm;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #bbb;
    border-top: 1px solid #eee;
    padding-top: 3mm;
  }

  /* ── PRINT ──────────────────────────────────── */
  @media print {
    html, body { margin: 0; background: #fff; }
    .page { padding: 15mm 14mm 12mm; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════
     PAGE 1 — RÉSUMÉ FINANCIER
══════════════════════════════════════════ -->
<div class="page page-break">

  <div class="doc-header">
    <div class="brand">
      <div class="brand-name">Cabinet de podologie</div>
      <div class="brand-sub">Relevé mensuel des revenus</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${monthLabel}</div>
      <div class="doc-period">${fmtDate(startDate)} → ${fmtDate(endDate)}</div>
      <div class="doc-generated">Généré le ${generatedAt}</div>
    </div>
  </div>

  <!-- KPIs principaux -->
  <div class="summary">
    <div class="card primary">
      <div class="card-label">Revenu net</div>
      <div class="card-value">${fmt0(totalNet)}</div>
      <div class="card-sub">Après rétrocession (60 %)</div>
    </div>
    <div class="card">
      <div class="card-label">Chiffre d'affaires</div>
      <div class="card-value">${fmt0(totalMontant)}</div>
      <div class="card-sub">Montant brut encaissé</div>
    </div>
    <div class="card accent">
      <div class="card-label">Rétrocession totale</div>
      <div class="card-value">${fmt0(totalRetro)}</div>
      <div class="card-sub">40 % reversés au cabinet</div>
    </div>
  </div>

  <!-- Répartition rétrocession -->
  <div class="retro-split">
    <div class="retro-split-title">Répartition de la rétrocession (40 % = 20 % + 20 %)</div>
    <div class="retro-person">
      <div class="retro-person-name">Yann</div>
      <div class="retro-person-amount">${fmt2(retroParPersonne)}</div>
      <div class="retro-person-pct">20 % du CA</div>
    </div>
    <div class="retro-total">
      <div class="retro-total-label">Total rétrocession</div>
      <div class="retro-total-value">${fmt2(totalRetro)}</div>
    </div>
    <div class="retro-person">
      <div class="retro-person-name">Gautier</div>
      <div class="retro-person-amount">${fmt2(retroParPersonne)}</div>
      <div class="retro-person-pct">20 % du CA</div>
    </div>
  </div>

  <!-- Stats secondaires -->
  <div class="stats-row">
    <div class="stat-item">
      <div class="label">Consultations</div>
      <div class="value">${rows.length}</div>
    </div>
    <div class="stat-item">
      <div class="label">Panier moyen net</div>
      <div class="value">${fmt2(rows.length ? totalNet / rows.length : 0)}</div>
    </div>
    <div class="stat-item">
      <div class="label">Panier moyen brut</div>
      <div class="value">${fmt2(rows.length ? totalMontant / rows.length : 0)}</div>
    </div>
    <div class="stat-item">
      <div class="label">Jours travaillés</div>
      <div class="value">${new Set(rows.map(r => r.date)).size}</div>
    </div>
  </div>

  <!-- Aperçu tableau page 2 -->
  <p style="font-size:9pt;color:#aaa;text-align:center;margin-top:auto;padding-top:8mm;">
    → Détail de toutes les consultations en page 2
  </p>

  <div class="doc-footer">
    <span>Cabinet de podologie — Relevé confidentiel</span>
    <span>${monthLabel} · Page 1/2</span>
  </div>
</div>

<!-- ══════════════════════════════════════════
     PAGE 2 — LISTE DES CONSULTATIONS
══════════════════════════════════════════ -->
<div class="page">

  <div class="doc-header">
    <div class="brand">
      <div class="brand-name">Cabinet de podologie</div>
      <div class="brand-sub">Détail des consultations</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${monthLabel}</div>
      <div class="doc-period">${rows.length} consultation${rows.length > 1 ? 's' : ''}</div>
    </div>
  </div>

  <div class="section-title">Consultations du mois</div>

  <table>
    <thead>
      <tr>
        <th class="center">Date</th>
        <th>Patient</th>
        <th>Soin</th>
        <th class="center">Paiement</th>
        <th class="right">Montant</th>
        <th class="right">Rétro. (40%)</th>
        <th class="right">Net (60%)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="font-size:9pt;color:#555;">Total — ${rows.length} consultation${rows.length > 1 ? 's' : ''}</td>
        <td class="right mono">${fmt2(totalMontant)}</td>
        <td class="right mono muted">${fmt2(totalRetro)}</td>
        <td class="right mono bold" style="color:#d4607a;">${fmt2(totalNet)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    <span>Cabinet de podologie — Relevé confidentiel</span>
    <span>${monthLabel} · Page 2/2</span>
  </div>
</div>

</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
