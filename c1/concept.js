'use strict';
// Concept 1 — Sauge: the patients page is a sortable-looking data table, like the Excel sheet the doctor knows.
// (Overrides patientList from app.js; the follow-up keeps the default spreadsheet, styled in c1.css.)
function patientList(list) {
  return `<table class="ptable"><thead><tr>
      <th>N°</th><th>${esc(t('patient.last_name'))} ${esc(t('patient.first_name'))}</th><th class="hide-sm">${esc(t('patient.age'))}</th>
      <th class="hide-sm">${esc(t('patient.phone'))}</th><th class="hide-sm">${esc(t('patient.tiers_payant'))}</th>
      <th class="hide-sm">${esc(t('patients.last_visit'))}</th><th></th></tr></thead><tbody>
    ${list.map((p) => `<tr data-href="#/patients/${p.id}">
      <td class="num">${esc(p.file_no || '')}</td>
      <td class="nm">${esc(fullName(p))}</td>
      <td class="hide-sm">${p.dob ? ageOf(p.dob) + ' ' + esc(t('common.years')) : '—'}</td>
      <td class="hide-sm">${esc(p.phone || '—')}</td>
      <td class="hide-sm">${p.tiers_payant ? `<span class="tp">${esc(p.tiers_payant)}</span>` : '—'}</td>
      <td class="hide-sm">${p.last_visit ? esc(fmtDay(p.last_visit)) : '—'}</td>
      <td>${p.allergies ? `<span class="badge alert" title="${esc(p.allergies)}">⚠</span>` : ''}</td></tr>`).join('')}
    </tbody></table>`;
}
document.addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-href]');
  if (tr) location.hash = tr.dataset.href;
});
