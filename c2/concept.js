'use strict';
// Concept 2 — Oasis: patients as a card grid, follow-up as one card per consultation, saffron ripple on click.
function patientList(list) {
  return `<div class="pgrid">${list.map((p) => {
    const age = ageOf(p.dob);
    return `<a class="pcard" href="#/patients/${p.id}">
      <div class="top"><span class="avatar ${p.sex === 'F' ? 'f' : p.sex === 'M' ? 'm' : ''}">${esc(initials(p))}</span>
        <div><strong>${esc(fullName(p))}</strong><div class="meta">#${esc(p.file_no || '')}${age != null ? ' · ' + age + ' ' + esc(t('common.years')) : ''}</div></div></div>
      <div class="meta">${esc(p.phone || '')}${p.last_visit ? ' · ' + esc(t('patients.last_visit')) + ' ' + esc(fmtDay(p.last_visit)) : ''}</div>
      <div class="tags">${p.tiers_payant ? `<span class="tag">${esc(p.tiers_payant)}</span>` : ''}${p.allergies ? `<span class="tag warn">⚠ ${esc(t('patient.allergy_alert'))}</span>` : ''}</div>
    </a>`;
  }).join('')}</div>`;
}

function renderFollowup(rows, chrono) {
  const cards = chrono.map((v, i) => {
    const groups = FU_SECTIONS().map(([sec, title]) => {
      const items = rows.filter((r) => r.section === sec).map((r) => ({ r, value: r.values[i].value })).filter((x) => x.value || rows.length > 12);
      if (!items.length) return '';
      const wide = sec !== 'lab';
      return `<h4>${esc(title)}</h4><ul>${items.map(({ r, value }) =>
        `<li class="${wide ? 'wide' : ''}" data-cell="${v.id}|${r.name}"><b>${esc(r.label)}</b><span>${value ? multiline(value) : '—'}</span></li>`).join('')}</ul>`;
    }).join('');
    return `<article class="fu-card"><header><b>${esc(fmtDay(v.date, { day: 'numeric', month: 'short', year: 'numeric' }))}</b>
      <span>${esc(v.reason || '')}</span></header>${groups || `<p class="muted small">—</p>`}</article>`;
  }).join('');
  return `<div class="fu-cards fu-scroll" style="border:0">${cards}</div>`;
}

// Saffron ripple from the point you click on buttons, rows and cards.
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.btn, .row, .pcard, #nav a');
  if (!el) return;
  const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height);
  const dot = Object.assign(document.createElement('span'), { className: 'ripple' });
  Object.assign(dot.style, { width: size + 'px', height: size + 'px', left: e.clientX - r.left - size / 2 + 'px', top: e.clientY - r.top - size / 2 + 'px' });
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(dot);
  setTimeout(() => dot.remove(), 600);
});
