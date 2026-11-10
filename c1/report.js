'use strict';
// Printable "full patient history" report — A4, doctor letterhead, FR/EN.

(async () => {
  const id = new URLSearchParams(location.search).get('id');
  const sheet = document.getElementById('sheet');
  const get = async (url) => {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  };

  let s, data;
  try { [s, data] = await Promise.all([get('/api/settings'), get(`/api/patients/${id}`)]); }
  catch { location.href = '/'; return; }

  let lang = s.lang;
  try { lang = localStorage.getItem('lang') || lang; } catch {}
  setLang(lang || 'fr');

  const { patient: p, visits } = data;
  const chronological = [...visits].reverse();
  const age = ageOf(p.dob);
  const name = `${(p.last_name || '').toUpperCase()} ${p.first_name || ''}`;
  document.title = `${t('report.title')} — ${name}`;

  const back = document.getElementById('back');
  back.textContent = '‹ ' + t('report.back');
  back.onclick = () => (history.length > 1 ? history.back() : window.close());
  const printBtn = document.getElementById('print');
  printBtn.textContent = '🖨 ' + t('report.print');
  printBtn.onclick = () => window.print();

  const kv = (label, value) => value ? `<div class="kv"><dt>${esc(label)}</dt><dd>${multiline(value)}</dd></div>` : '';
  const vitals = (v) => [['visit.bp', v.bp], ['visit.pulse', v.pulse], ['visit.temp', v.temp], ['visit.weight', v.weight], ['visit.height', v.height]]
    .filter(([, val]) => val).map(([k, val]) => `<span><b>${esc(t(k))}</b> ${esc(val)}</span>`).join('');

  // Lab / imaging / prescription by date, like the Excel sheet. A4 fits about 6 dates per table.
  function resultsGrid() {
    const rows = [
      ...LAB_TESTS.map(([k, label]) => [t('tpl.lab'), label, (v) => (v.labs || {})[k]]),
      ...RADIO_ITEMS.map(([k, label]) => [t('tpl.radio'), label || t('tpl.other'), (v) => (v.radio || {})[k]]),
      [t('tpl.prescription'), t('tpl.prescription'), (v) => v.treatment],
    ].filter(([, , get]) => chronological.some((v) => get(v)));
    if (!rows.length) return '';
    const chunks = [];
    for (let i = 0; i < chronological.length; i += 6) chunks.push(chronological.slice(i, i + 6));
    return `<section><h2>${esc(t('tpl.lab'))} · ${esc(t('tpl.radio'))} · ${esc(t('tpl.prescription'))}</h2>` + chunks.map((vs) => `
      <table class="grid"><thead><tr><th></th>${vs.map((v) => `<th>${esc(fmtDay(v.date, { day: '2-digit', month: '2-digit', year: '2-digit' }))}</th>`).join('')}</tr></thead>
      <tbody>${rows.filter(([, , get]) => vs.some((v) => get(v))).map(([sec, label, get], i, arr) =>
        (i === 0 || arr[i - 1][0] !== sec ? `<tr class="sec"><th colspan="${vs.length + 1}">${esc(sec)}</th></tr>` : '') +
        `<tr><th>${esc(label)}</th>${vs.map((v) => `<td>${multiline(get(v) || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('') + '</section>';
  }

  sheet.innerHTML = `
    <header class="letterhead">
      <div>
        <div class="dr">${esc(s.doctor_name || '')}</div>
        <div class="spec">${esc(s.specialty || '')}</div>
        ${s.reg_no ? `<div class="reg">${esc(t('settings.reg_no'))} : ${esc(s.reg_no)}</div>` : ''}
      </div>
      <div class="contact">
        ${s.address ? `<div>${multiline(s.address)}</div>` : ''}
        ${s.phone ? `<div>☎ ${esc(s.phone)}</div>` : ''}
        ${s.email ? `<div>${esc(s.email)}</div>` : ''}
      </div>
    </header>

    <h1>${esc(t('report.title'))}</h1>

    <section class="identity">
      <h2>${esc(t('report.identity'))}</h2>
      <dl class="cols">
        ${kv(t('patient.last_name') + ' / ' + t('patient.first_name'), name)}
        ${kv(t('patient.file_no'), p.file_no)}
        ${kv(t('patient.dob'), p.dob ? `${fmtDay(p.dob, { day: '2-digit', month: '2-digit', year: 'numeric' })} (${age} ${t('common.years')})` : '')}
        ${kv(t('patient.sex'), p.sex ? t('patient.sex.' + p.sex) : '')}
        ${kv(t('patient.blood_type'), p.blood_type)}
        ${kv(t('patient.profession'), p.profession)}
        ${kv(t('patient.phone'), p.phone)}
        ${kv(t('patient.tiers_payant'), p.tiers_payant)}
        ${kv(t('patient.address'), p.address)}
      </dl>
    </section>

    ${p.allergies ? `<div class="allergy">⚠ <b>${esc(t('patient.allergies'))} :</b> ${multiline(p.allergies)}</div>` : ''}

    <section>
      <h2>${esc(t('patient.section.history'))}</h2>
      <dl>
        ${HISTORY_ITEMS.map((h) => kv(h[1], historyValue(p, h))).join('')}
        ${kv(t('patient.notes'), p.notes)}
      </dl>
    </section>

    ${resultsGrid()}

    <section>
      <h2>${esc(t('patient.visits'))} <small>${esc(t('report.visit_count', { n: visits.length }))}</small></h2>
      ${chronological.map((v) => `
        <div class="visit">
          <div class="vhead"><span class="vdate">${esc(fmtDay(v.date, { day: '2-digit', month: '2-digit', year: 'numeric' }))}</span>
            ${v.reason ? `<span class="vreason">${esc(v.reason)}</span>` : ''}</div>
          ${vitals(v) ? `<div class="vitals">${vitals(v)}</div>` : ''}
          <dl>${kv(t('visit.exam'), v.exam)}${kv(t('visit.diagnosis'), v.diagnosis)}${kv(t('tpl.prescription'), v.treatment)}${kv(t('visit.notes'), v.notes)}</dl>
        </div>`).join('') || `<p class="muted">${esc(t('patient.no_visits'))}</p>`}
    </section>

    <footer class="sign">
      <div class="muted">${esc(t('report.printed_on', { d: fmtDay(new Date(), { day: '2-digit', month: '2-digit', year: 'numeric' }) }))}</div>
      <div class="sigbox">${esc(t('report.signature'))}</div>
    </footer>
    <div class="confidential">${esc(t('report.confidential'))} — ${esc(name)} — #${esc(p.file_no)}</div>`;
})();
