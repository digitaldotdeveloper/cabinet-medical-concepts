'use strict';
// Concept 3 — Lilas: contacts-style patient list grouped by letter, results as one tile per test
// (latest value big, earlier values underneath), switched with Laboratoire / Radio / Prescription tabs.
function patientList(list) {
  const sorted = [...list].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  let last = '';
  return sorted.map((p) => {
    const L = (p.last_name || '?')[0].toUpperCase();
    const head = L !== last ? `<div class="letter">${esc((last = L))}</div>` : '';
    const age = ageOf(p.dob);
    return `${head}<a class="contact-row" href="#/patients/${p.id}">
      <span class="avatar ${p.sex === 'F' ? 'f' : p.sex === 'M' ? 'm' : ''}">${esc(initials(p))}</span>
      <span class="who"><strong>${esc(fullName(p))}</strong><small>${[age != null && age + ' ' + t('common.years'), p.phone].filter(Boolean).map(esc).join(' · ')}</small></span>
      ${p.allergies ? '<span title="allergies">⚠️</span>' : ''}
      ${p.tiers_payant ? `<span class="tp">${esc(p.tiers_payant)}</span>` : ''}</a>`;
  }).join('');
}

let c3Tab = 'lab';
function renderFollowup(rows, chrono) {
  const tabs = FU_SECTIONS().filter(([sec]) => rows.some((r) => r.section === sec));
  if (!tabs.some(([s]) => s === c3Tab)) c3Tab = tabs[0]?.[0] || 'lab';
  const short = (d) => fmtDay(d, { day: 'numeric', month: 'short' });
  const tiles = rows.filter((r) => r.section === c3Tab).map((r) => {
    const filled = r.values.filter((x) => x.value);
    const latest = filled[filled.length - 1];
    const text = r.section !== 'lab' || (latest && latest.value.length > 12);
    const target = latest ? latest.visit : chrono[chrono.length - 1];
    return `<div class="tile${text ? ' text' : ''}${r.section !== 'lab' ? ' wide' : ''}${latest ? '' : ' empty'}" data-cell="${target.id}|${r.name}">
      <div class="lbl">${esc(r.label)}</div>
      <div class="val">${latest ? multiline(latest.value) : '—'}</div>
      ${latest ? `<div class="when">${esc(short(latest.visit.date))}</div>` : ''}
      ${filled.length > 1 ? `<div class="trail">${filled.slice(0, -1).reverse().map((x) => `<span>${esc(x.value.length > 14 ? x.value.slice(0, 14) + '…' : x.value)} · ${esc(short(x.visit.date))}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="tabs">${tabs.map(([sec, title]) => `<button type="button" data-tab="${sec}" class="${sec === c3Tab ? 'on' : ''}">${esc(title)}</button>`).join('')}</div>
    <div class="tiles pop">${tiles}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  c3Tab = b.dataset.tab;
  window.redrawFollowup?.();
});
// Dock: a little bounce on the tapped icon.
document.addEventListener('pointerdown', (e) => {
  const a = e.target.closest('#nav a, .tile, .contact-row');
  if (!a) return;
  a.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
    { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
});
