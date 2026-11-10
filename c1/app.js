'use strict';
// Cabinet Médical — single-page app (vanilla JS, hash routing).

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const state = { me: null, settings: null };

// ---------------------------------------------------------------- API
async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Cabinet': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new Error('network'); }
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json() : null;
  if (res.status === 401 && data?.error === 'auth_required') { state.me.authed = false; route(); throw new Error('auth_required'); }
  if (!res.ok) throw new Error(data?.error || 'generic');
  return data;
}
const errText = (e) => { const k = 'err.' + e.message; return t(k) === k ? t('err.generic') : t(k); };

function toast(msg, kind = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + kind;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = 'toast'), 2600);
}
const fail = (e) => { if (e.message !== 'auth_required') toast(errText(e), 'err'); };
const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };
const formData = (form) => Object.fromEntries(new FormData(form).entries());

// ---------------------------------------------------------------- modal
function openModal(title, bodyHtml, { onSubmit, onDelete, wide } = {}) {
  const dlg = $('#modal');
  dlg.className = wide ? 'wide' : '';
  dlg.innerHTML = `
    <form method="dialog" class="modal-form" novalidate>
      <header class="modal-head"><h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="${esc(t('common.close'))}">✕</button></header>
      <div class="modal-body">${bodyHtml}</div>
      <footer class="modal-foot">
        ${onDelete ? `<button type="button" class="btn danger ghost" data-delete>${esc(t('common.delete'))}</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>${esc(t('common.cancel'))}</button>
        <button type="submit" class="btn primary">${esc(t('common.save'))}</button>
      </footer>
    </form>`;
  const form = $('form', dlg);
  $$('[data-close]', dlg).forEach((b) => (b.onclick = () => dlg.close()));
  if (onDelete) $('[data-delete]', dlg).onclick = async () => {
    if (!confirm(t('common.confirm_delete'))) return;
    try { await onDelete(); dlg.close(); } catch (e) { fail(e); }
  };
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = $('[type=submit]', form);
    btn.disabled = true;
    try { await onSubmit(formData(form), form); dlg.close(); } catch (e) { fail(e); } finally { btn.disabled = false; }
  };
  dlg.showModal();
  $('input:not([type=hidden]), textarea, select', dlg)?.focus();
  return dlg;
}

// ---------------------------------------------------------------- shared pieces
const field = (name, label, value = '', { type = 'text', attrs = '', full = false } = {}) => `
  <label class="field${full ? ' full' : ''}"><span>${esc(label)}</span>
    <input type="${type}" name="${name}" value="${esc(value)}" ${attrs}></label>`;
const area = (name, label, value = '', { rows = 3, full = true } = {}) => `
  <label class="field${full ? ' full' : ''}"><span>${esc(label)}</span>
    <textarea name="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
const select = (name, label, value, options, { full = false } = {}) => `
  <label class="field${full ? ' full' : ''}"><span>${esc(label)}</span>
    <select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;

const fullName = (p) => `${(p.last_name || '').toUpperCase()} ${p.first_name || ''}`.trim();
const initials = (p) => ((p.first_name || '?')[0] + (p.last_name || '?')[0]).toUpperCase();

function patientRow(p) {
  const age = ageOf(p.dob);
  const meta = [
    p.file_no && `#${esc(p.file_no)}`,
    age != null && `${age} ${t('common.years')}`,
    p.phone && esc(p.phone),
    p.last_visit && `${esc(t('patients.last_visit'))} ${esc(fmtDay(p.last_visit))}`,
  ].filter(Boolean).join(' · ');
  return `<a class="row" href="#/patients/${p.id}">
    <span class="avatar ${p.sex === 'F' ? 'f' : p.sex === 'M' ? 'm' : ''}">${esc(initials(p))}</span>
    <span class="row-main"><strong>${esc(fullName(p))}</strong><small>${meta}</small></span>
    ${p.allergies ? `<span class="badge alert" title="${esc(p.allergies)}">⚠ ${esc(t('patient.allergy_alert'))}</span>` : ''}
    <span class="chev">›</span></a>`;
}

function apptRow(a, { showPatient = true, showDate = false } = {}) {
  const who = a.patient_id ? `${(a.last_name || '').toUpperCase()} ${a.first_name || ''}` : '';
  const when = showDate ? `${fmtDay(a.start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${fmtTime(a.start)}` : fmtTime(a.start);
  return `<button type="button" class="row appt status-${a.status}" data-appt="${a.id}">
    <span class="time">${esc(when)}</span>
    <span class="row-main"><strong>${esc(showPatient ? who || a.title : a.title || '')}</strong>
      <small>${esc([showPatient && who ? a.title : '', `${a.duration} ${t('appt.minutes')}`].filter(Boolean).join(' · '))}</small></span>
    <span class="pill s-${a.status}">${esc(t('appt.status.' + a.status))}</span></button>`;
}

// ---------------------------------------------------------------- appointment modal
function apptModal({ appt, patient, day, onDone }) {
  const editing = !!appt;
  const start = appt ? new Date(appt.start) : null;
  const preset = patient || (appt?.patient_id ? { id: appt.patient_id, first_name: appt.first_name, last_name: appt.last_name } : null);
  const durations = [10, 15, 20, 30, 45, 60, 90].map((m) => [m, `${m} ${t('appt.minutes')}`]);
  const defaultTime = () => { if (day && day !== ymd(new Date())) return '09:00'; const d = new Date(); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return hm(d); };

  const html = `
    <div class="grid">
      <div class="field full"><span>${esc(t('appt.patient'))}</span>
        <input type="hidden" name="patient_id" value="${preset ? preset.id : ''}">
        <div class="picker">
          <div class="picked" ${preset ? '' : 'hidden'}><strong>${preset ? esc(fullName(preset)) : ''}</strong>
            <button type="button" class="link" data-change>${esc(t('appt.change'))}</button></div>
          <div class="pick-search" ${preset ? 'hidden' : ''}>
            <input type="search" placeholder="${esc(t('appt.patient_search'))}" autocomplete="off">
            <div class="pick-results"></div>
            <small class="hint">${esc(t('appt.no_patient'))}</small>
          </div>
        </div>
      </div>
      ${field('date', t('appt.date'), start ? ymd(start) : day || ymd(new Date()), { type: 'date', attrs: 'required' })}
      ${field('time', t('appt.time'), start ? hm(start) : defaultTime(), { type: 'time', attrs: 'required step="300"' })}
      ${select('duration', t('appt.duration'), appt?.duration || 30, durations)}
      ${editing ? select('status', t('appt.status'), appt.status, ['scheduled', 'done', 'cancelled', 'noshow'].map((s) => [s, t('appt.status.' + s)])) : ''}
      ${field('title', t('appt.reason'), appt?.title || '', { full: true })}
      ${area('notes', t('appt.notes'), appt?.notes || '', { rows: 2 })}
    </div>`;

  const dlg = openModal(t('appt.title'), html, {
    onSubmit: async (d) => {
      const startDate = new Date(`${d.date}T${d.time || '00:00'}`);
      if (!d.date || isNaN(startDate)) throw new Error('start_required');
      const body = { patient_id: d.patient_id || null, start: startDate.toISOString(), duration: Number(d.duration), title: d.title, notes: d.notes };
      if (editing) { body.status = d.status; await api('PUT', `/api/appointments/${appt.id}`, body); }
      else await api('POST', '/api/appointments', body);
      toast(t('common.saved'));
      onDone?.();
    },
    onDelete: editing ? async () => { await api('DELETE', `/api/appointments/${appt.id}`); onDone?.(); } : null,
  });

  // Patient picker
  const hidden = $('[name=patient_id]', dlg), picked = $('.picked', dlg), searchBox = $('.pick-search', dlg);
  const input = $('.pick-search input', dlg), results = $('.pick-results', dlg);
  $('[data-change]', dlg).onclick = () => { hidden.value = ''; picked.hidden = true; searchBox.hidden = false; input.focus(); };
  input.oninput = debounce(async () => {
    const q = input.value.trim();
    if (!q) { results.innerHTML = ''; return; }
    const list = await api('GET', '/api/patients?q=' + encodeURIComponent(q)).catch(() => []);
    results.innerHTML = list.slice(0, 8).map((p) =>
      `<button type="button" class="pick" data-id="${p.id}">${esc(fullName(p))} <small>${esc([p.file_no && '#' + p.file_no, p.phone].filter(Boolean).join(' · '))}</small></button>`).join('')
      || `<p class="muted">${esc(t('home.no_results'))}</p>`;
    $$('.pick', results).forEach((b) => (b.onclick = () => {
      const p = list.find((x) => String(x.id) === b.dataset.id);
      hidden.value = p.id;
      $('strong', picked).textContent = fullName(p);
      picked.hidden = false; searchBox.hidden = true; input.value = ''; results.innerHTML = '';
    }));
  }, 200);
}

// ---------------------------------------------------------------- visit modal
function visitModal({ patientId, visit, onDone }) {
  const v = visit || { date: ymd(new Date()) };
  const html = `
    <div class="grid">
      ${field('date', t('visit.date'), v.date, { type: 'date', attrs: 'required' })}
      ${field('reason', t('visit.reason'), v.reason)}
      <fieldset class="vitals full"><legend>${esc(t('visit.vitals'))}</legend>
        ${field('bp', t('visit.bp'), v.bp, { attrs: 'placeholder="120/80" inputmode="numeric"' })}
        ${field('pulse', t('visit.pulse'), v.pulse, { attrs: 'inputmode="numeric"' })}
        ${field('temp', t('visit.temp'), v.temp, { attrs: 'inputmode="decimal"' })}
        ${field('weight', t('visit.weight'), v.weight, { attrs: 'inputmode="decimal"' })}
        ${field('height', t('visit.height'), v.height, { attrs: 'inputmode="numeric"' })}
      </fieldset>
      ${area('exam', t('visit.exam'), v.exam, { rows: 3 })}
      ${area('diagnosis', t('visit.diagnosis'), v.diagnosis, { rows: 2 })}
      ${area('treatment', t('visit.treatment'), v.treatment, { rows: 3 })}
      ${area('notes', t('visit.notes'), v.notes, { rows: 2 })}
    </div>`;
  openModal(t('visit.title'), html, {
    wide: true,
    onSubmit: async (d) => {
      if (visit) await api('PUT', `/api/visits/${visit.id}`, d);
      else await api('POST', `/api/patients/${patientId}/visits`, d);
      toast(t('common.saved'));
      onDone?.();
    },
    onDelete: visit ? async () => { await api('DELETE', `/api/visits/${visit.id}`); onDone?.(); } : null,
  });
}

// ---------------------------------------------------------------- views: auth
function viewSetup(main) {
  main.innerHTML = `
    <section class="auth card">
      <div class="logo">✚</div>
      <h1>${esc(t('setup.title'))}</h1>
      <p class="muted">${esc(t('setup.intro'))}</p>
      <form class="grid one">
        ${field('doctor_name', t('setup.doctor'), '', { attrs: 'placeholder="Dr …" autocomplete="name"' })}
        ${field('specialty', t('setup.specialty'))}
        ${field('password', t('setup.password'), '', { type: 'password', attrs: 'required minlength="8" autocomplete="new-password"' })}
        ${field('password2', t('setup.password2'), '', { type: 'password', attrs: 'required autocomplete="new-password"' })}
        <button class="btn primary big">${esc(t('setup.go'))}</button>
      </form>
    </section>`;
  $('form', main).onsubmit = async (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    if (d.password !== d.password2) return toast(t('setup.mismatch'), 'err');
    try { await api('POST', '/api/setup', { ...d, lang: LANG }); await boot(); } catch (e) { fail(e); }
  };
}

function viewLogin(main) {
  main.innerHTML = `
    <section class="auth card">
      <div class="logo">✚</div>
      <h1>${esc(state.me.settings.doctor_name || t('app.name'))}</h1>
      <form class="grid one">
        ${field('password', t('login.password'), '', { type: 'password', attrs: 'required autofocus autocomplete="current-password"' })}
        <button class="btn primary big">${esc(t('login.go'))}</button>
      </form>
    </section>`;
  $('input', main).focus();
  $('form', main).onsubmit = async (ev) => {
    ev.preventDefault();
    try { await api('POST', '/api/login', formData(ev.target)); await boot(); } catch (e) { fail(e); }
  };
}

// ---------------------------------------------------------------- views: home
async function viewHome(main) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  main.innerHTML = `
    <section class="hero">
      <p class="eyebrow">${esc(fmtDay(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      <h1>${esc(t('home.hello'))}</h1>
      <div class="searchbar"><span>⌕</span><input id="q" type="search" placeholder="${esc(t('home.search'))}" autocomplete="off"></div>
      <div id="results" class="list"></div>
    </section>
    <div class="columns">
      <section class="card">
        <header class="card-head"><h2>${esc(t('home.today'))}</h2>
          <button class="btn small" id="add-appt">＋ ${esc(t('patient.new_appt'))}</button></header>
        <div id="today" class="list"><p class="muted">${esc(t('common.loading'))}</p></div>
      </section>
      <section class="card">
        <header class="card-head"><h2>${esc(t('home.recent'))}</h2>
          <a class="btn small" href="#/patients/new">＋ ${esc(t('patients.new'))}</a></header>
        <div id="recent" class="list"></div>
      </section>
    </div>`;

  const loadToday = async () => {
    const list = await api('GET', `/api/appointments?from=${today.toISOString()}&to=${tomorrow.toISOString()}`);
    $('#today').innerHTML = list.length ? list.map((a) => apptRow(a)).join('') : `<p class="muted">${esc(t('home.no_today'))}</p>`;
    bindApptRows($('#today'), list, loadToday);
  };
  $('#add-appt').onclick = () => apptModal({ onDone: loadToday });

  const q = $('#q');
  q.focus();
  q.oninput = debounce(async () => {
    const term = q.value.trim();
    if (!term) { $('#results').innerHTML = ''; return; }
    const list = await api('GET', '/api/patients?q=' + encodeURIComponent(term)).catch(() => []);
    $('#results').innerHTML = (list.map(patientRow).join('') || `<p class="muted">${esc(t('home.no_results'))}</p>`)
      + `<a class="row create" href="#/patients/new?name=${encodeURIComponent(term)}">＋ ${esc(t('home.create_named', { q: term }))}</a>`;
  }, 180);
  q.onkeydown = (e) => { if (e.key === 'Enter') $('#results a.row')?.click(); };

  try {
    await loadToday();
    const recent = await api('GET', '/api/patients');
    $('#recent').innerHTML = recent.slice(0, 8).map(patientRow).join('') || `<p class="muted">${esc(t('patients.empty'))}</p>`;
  } catch (e) { fail(e); }
}

function bindApptRows(container, list, reload) {
  $$('[data-appt]', container).forEach((b) => (b.onclick = () =>
    apptModal({ appt: list.find((a) => String(a.id) === b.dataset.appt), onDone: reload })));
}

// ---------------------------------------------------------------- views: patients
async function viewPatients(main) {
  main.innerHTML = `
    <header class="page-head"><h1>${esc(t('patients.title'))}</h1>
      <a class="btn primary" href="#/patients/new">＋ ${esc(t('patients.new'))}</a></header>
    <div class="searchbar"><span>⌕</span><input id="q" type="search" placeholder="${esc(t('home.search'))}" autocomplete="off"></div>
    <p id="count" class="muted small"></p>
    <div id="list" class="list card flush"></div>`;
  const load = async () => {
    const term = $('#q').value.trim();
    try {
      const list = await api('GET', '/api/patients' + (term ? '?q=' + encodeURIComponent(term) : ''));
      $('#list').innerHTML = list.map(patientRow).join('') || `<p class="muted pad">${esc(term ? t('home.no_results') : t('patients.empty'))}</p>`;
      $('#count').textContent = term ? t('patients.count', { n: list.length }) : '';
    } catch (e) { fail(e); }
  };
  $('#q').oninput = debounce(load, 180);
  $('#q').focus();
  await load();
}

async function viewPatientForm(main, id) {
  let p = {};
  if (id) {
    try { p = (await api('GET', `/api/patients/${id}`)).patient; } catch (e) { return fail(e); }
  } else {
    // Prefill from the "create patient 'X Y'" shortcut on the home search.
    const name = new URLSearchParams(location.hash.split('?')[1] || '').get('name');
    if (name) { const parts = name.trim().split(/\s+/); p.last_name = parts.shift(); p.first_name = parts.join(' '); }
  }
  const sexes = [['', t('common.none')], ['F', t('patient.sex.F')], ['M', t('patient.sex.M')]];
  const bloods = [['', t('common.none')], ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => [b, b])];
  main.innerHTML = `
    <header class="page-head"><h1>${esc(t(id ? 'patient.edit_title' : 'patient.new_title'))}</h1></header>
    <form class="card form-card">
      <h2>${esc(t('patient.section.identity'))}</h2>
      <div class="grid">
        ${field('last_name', t('patient.last_name'), p.last_name, { attrs: 'required autocapitalize="characters"' })}
        ${field('first_name', t('patient.first_name'), p.first_name, { attrs: 'required autocapitalize="words"' })}
        ${select('sex', t('patient.sex'), p.sex, sexes)}
        ${field('dob', t('patient.dob'), p.dob, { type: 'date' })}
        ${field('profession', t('patient.profession'), p.profession)}
        ${field('file_no', t('patient.file_no'), p.file_no, { attrs: `placeholder="${esc(t('patient.file_no_hint'))}"` })}
      </div>
      <h2>${esc(t('patient.section.contact'))}</h2>
      <div class="grid">
        ${field('phone', t('patient.phone'), p.phone, { type: 'tel' })}
        ${field('email', t('patient.email'), p.email, { type: 'email' })}
        ${area('address', t('patient.address'), p.address, { rows: 2 })}
      </div>
      <h2>${esc(t('patient.section.medical'))}</h2>
      <div class="grid">
        ${select('blood_type', t('patient.blood_type'), p.blood_type, bloods)}
        ${area('allergies', t('patient.allergies'), p.allergies, { rows: 2 })}
        ${area('conditions', t('patient.conditions'), p.conditions)}
        ${area('surgical_history', t('patient.surgical_history'), p.surgical_history, { rows: 2 })}
        ${area('family_history', t('patient.family_history'), p.family_history, { rows: 2 })}
        ${area('medications', t('patient.medications'), p.medications)}
        ${area('notes', t('patient.notes'), p.notes)}
      </div>
      <footer class="form-foot">
        ${id ? `<button type="button" class="btn danger ghost" id="del">${esc(t('common.delete'))}</button>` : ''}
        <span class="spacer"></span>
        <a class="btn ghost" href="${id ? `#/patients/${id}` : '#/patients'}">${esc(t('common.cancel'))}</a>
        <button class="btn primary">${esc(t('common.save'))}</button>
      </footer>
    </form>`;
  $('[name=last_name]', main).focus();
  const form = $('form', main);
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const d = formData(form);
    try {
      if (id) { await api('PUT', `/api/patients/${id}`, d); location.hash = `#/patients/${id}`; }
      else { const r = await api('POST', '/api/patients', d); location.hash = `#/patients/${r.id}`; }
      toast(t('common.saved'));
    } catch (e) { fail(e); }
  };
  if (id) $('#del').onclick = async () => {
    if (!confirm(t('common.confirm_delete'))) return;
    try { await api('DELETE', `/api/patients/${id}`); location.hash = '#/patients'; } catch (e) { fail(e); }
  };
}

async function viewPatient(main, id) {
  let data;
  try { data = await api('GET', `/api/patients/${id}`); } catch (e) { main.innerHTML = ''; return fail(e); }
  const { patient: p, visits, appointments } = data;
  const age = ageOf(p.dob);
  const reload = () => viewPatient(main, id);

  const info = (label, value) => value ? `<div><dt>${esc(label)}</dt><dd>${multiline(value)}</dd></div>` : '';
  const vital = (label, value) => value ? `<span class="chip"><b>${esc(label.replace(/\s*\(.*\)/, ''))}</b> ${esc(value)}</span>` : '';
  const upcoming = appointments.filter((a) => new Date(a.start) >= new Date(Date.now() - 864e5)).reverse();
  const past = appointments.filter((a) => new Date(a.start) < new Date(Date.now() - 864e5));

  main.innerHTML = `
    <section class="patient-head card">
      <span class="avatar xl ${p.sex === 'F' ? 'f' : p.sex === 'M' ? 'm' : ''}">${esc(initials(p))}</span>
      <div class="ph-main">
        <h1>${esc(fullName(p))}</h1>
        <p class="muted">${[
          `#${esc(p.file_no)}`,
          p.sex && esc(t('patient.sex.' + p.sex)),
          p.dob && `${esc(fmtDay(p.dob))} (${age} ${esc(t('common.years'))})`,
          p.blood_type && `🩸 ${esc(p.blood_type)}`,
        ].filter(Boolean).join(' · ')}</p>
        <p class="contact">${[p.phone && `<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">📞 ${esc(p.phone)}</a>`,
          p.email && `<a href="mailto:${esc(p.email)}">✉ ${esc(p.email)}</a>`].filter(Boolean).join('')}</p>
      </div>
      <div class="ph-actions">
        <a class="btn" href="report.html?id=${p.id}" target="_blank" rel="noopener">🖨 ${esc(t('patient.print'))}</a>
        <a class="btn ghost" href="#/patients/${p.id}/edit">${esc(t('common.edit'))}</a>
      </div>
    </section>
    ${p.allergies ? `<div class="alert-banner">⚠ <b>${esc(t('patient.allergies'))} :</b> ${multiline(p.allergies)}</div>` : ''}

    <div class="columns wide-left">
      <section class="card">
        <header class="card-head"><h2>${esc(t('patient.visits'))} <span class="count">${visits.length}</span></h2>
          <button class="btn primary small" id="new-visit">＋ ${esc(t('patient.new_visit'))}</button></header>
        <div class="timeline">
          ${visits.map((v) => `
            <article class="visit" data-visit="${v.id}">
              <header><time>${esc(fmtDay(v.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))}</time>
                ${v.reason ? `<strong>${esc(v.reason)}</strong>` : ''}
                <button class="link" data-edit-visit="${v.id}">${esc(t('common.edit'))}</button></header>
              <div class="chips">${vital(t('visit.bp'), v.bp)}${vital(t('visit.pulse'), v.pulse)}${vital(t('visit.temp'), v.temp)}${vital(t('visit.weight'), v.weight)}${vital(t('visit.height'), v.height)}</div>
              <dl>${info(t('visit.exam'), v.exam)}${info(t('visit.diagnosis'), v.diagnosis)}${info(t('visit.treatment'), v.treatment)}${info(t('visit.notes'), v.notes)}</dl>
            </article>`).join('') || `<p class="muted">${esc(t('patient.no_visits'))}</p>`}
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <header class="card-head"><h2>${esc(t('patient.appointments'))}</h2>
            <button class="btn small" id="new-appt">＋ ${esc(t('patient.new_appt'))}</button></header>
          <div class="list" id="appts">
            ${upcoming.map((a) => apptRow(a, { showPatient: false, showDate: true })).join('')}
            ${past.slice(0, 5).map((a) => apptRow(a, { showPatient: false, showDate: true })).join('')}
            ${appointments.length ? '' : `<p class="muted">${esc(t('patient.no_appts'))}</p>`}
          </div>
        </section>
        <section class="card">
          <header class="card-head"><h2>${esc(t('patient.summary'))}</h2></header>
          <dl class="summary">
            ${info(t('patient.conditions'), p.conditions)}${info(t('patient.medications'), p.medications)}
            ${info(t('patient.surgical_history'), p.surgical_history)}${info(t('patient.family_history'), p.family_history)}
            ${info(t('patient.profession'), p.profession)}${info(t('patient.address'), p.address)}${info(t('patient.notes'), p.notes)}
          </dl>
        </section>
      </div>
    </div>`;

  $('#new-visit').onclick = () => visitModal({ patientId: p.id, onDone: reload });
  $$('[data-edit-visit]', main).forEach((b) => (b.onclick = () =>
    visitModal({ patientId: p.id, visit: visits.find((v) => String(v.id) === b.dataset.editVisit), onDone: reload })));
  $('#new-appt').onclick = () => apptModal({ patient: p, onDone: reload });
  $$('[data-appt]', main).forEach((b) => (b.onclick = () =>
    apptModal({ appt: { ...appointments.find((a) => String(a.id) === b.dataset.appt), first_name: p.first_name, last_name: p.last_name }, onDone: reload })));
}

// ---------------------------------------------------------------- views: agenda
async function viewAgenda(main, dayParam) {
  const base = dayParam ? dayToDate(dayParam) : new Date();
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - ((base.getDay() + 6) % 7));
  const days = [...Array(7)].map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  const shift = (n) => ymd(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + n));
  const todayKey = ymd(new Date());

  main.innerHTML = `
    <header class="page-head"><h1>${esc(t('agenda.title'))}</h1>
      <div class="seg">
        <a class="btn ghost" href="#/agenda/${shift(-7)}" aria-label="‹">‹</a>
        <a class="btn ghost" href="#/agenda">${esc(t('agenda.today'))}</a>
        <a class="btn ghost" href="#/agenda/${shift(7)}" aria-label="›">›</a>
      </div></header>
    <p class="muted">${esc(t('agenda.week', { d: fmtDay(ymd(monday), { day: 'numeric', month: 'long', year: 'numeric' }) }))}
      · <a href="#/settings">${esc(t('agenda.cal_hint'))}</a></p>
    <div class="week" id="week"></div>`;

  const load = async () => {
    let list;
    try { list = await api('GET', `/api/appointments?from=${monday.toISOString()}&to=${end.toISOString()}`); } catch (e) { return fail(e); }
    $('#week').innerHTML = days.map((d) => {
      const key = ymd(d);
      const items = list.filter((a) => ymd(new Date(a.start)) === key);
      return `<section class="day card${key === todayKey ? ' today' : ''}">
        <header><span><b>${esc(fmtDay(key, { weekday: 'long' }))}</b> ${esc(fmtDay(key, { day: 'numeric', month: 'short' }))}</span>
          <button class="icon-btn" data-add="${key}" aria-label="${esc(t('common.add'))}">＋</button></header>
        <div class="list">${items.map((a) => apptRow(a)).join('') || `<p class="muted small">${esc(t('agenda.empty'))}</p>`}</div>
      </section>`;
    }).join('');
    bindApptRows($('#week'), list, load);
    $$('[data-add]', main).forEach((b) => (b.onclick = () => apptModal({ day: b.dataset.add, onDone: load })));
  };
  await load();
}

// ---------------------------------------------------------------- views: settings
async function viewSettings(main) {
  let s;
  try { s = await api('GET', '/api/settings'); } catch (e) { return fail(e); }
  const feedPath = () => `${location.host}/cal/${s.cal_token}.ics`;
  main.innerHTML = `
    <header class="page-head"><h1>${esc(t('settings.title'))}</h1></header>

    <form class="card form-card" id="f-letterhead">
      <h2>${esc(t('settings.letterhead'))}</h2>
      <p class="muted small">${esc(t('settings.letterhead_hint'))}</p>
      <div class="grid">
        ${field('doctor_name', t('settings.doctor_name'), s.doctor_name)}
        ${field('specialty', t('settings.specialty'), s.specialty)}
        ${field('phone', t('settings.phone'), s.phone, { type: 'tel' })}
        ${field('email', t('settings.email'), s.email, { type: 'email' })}
        ${field('reg_no', t('settings.reg_no'), s.reg_no)}
        ${select('lang', t('settings.language'), s.lang || LANG, [['fr', 'Français'], ['en', 'English']])}
        ${area('address', t('settings.address'), s.address, { rows: 2 })}
      </div>
      <footer class="form-foot"><span class="spacer"></span><button class="btn primary">${esc(t('common.save'))}</button></footer>
    </form>

    <form class="card form-card" id="f-calendar">
      <h2>${esc(t('settings.calendar'))}</h2>
      <div class="grid">
        ${field('cal_name', t('settings.cal_name'), s.cal_name || 'Cabinet — Rendez-vous')}
        ${select('cal_privacy', t('settings.cal_privacy'), s.cal_privacy || 'full',
          ['full', 'initials', 'none'].map((k) => [k, t('settings.cal_privacy.' + k)]))}
        <div class="field full"><span>${esc(t('settings.cal_url'))}</span>
          <div class="copyline"><input id="feed" readonly value="${esc(location.protocol + '//' + feedPath())}">
            <button type="button" class="btn" id="copy">${esc(t('common.copy'))}</button></div></div>
      </div>
      <div class="actions">
        <a class="btn primary" id="subscribe" href="webcal://${esc(feedPath())}">📅 ${esc(t('settings.cal_subscribe'))}</a>
        <button type="button" class="btn ghost danger" id="regen">${esc(t('settings.cal_regen'))}</button>
      </div>
      <ul class="help">
        <li>${t('settings.cal_help_iphone')}</li>
        <li>${t('settings.cal_help_mac')}</li>
        <li>${esc(t('settings.cal_help_note'))}</li>
      </ul>
      <footer class="form-foot"><span class="spacer"></span><button class="btn primary">${esc(t('common.save'))}</button></footer>
    </form>

    <div class="columns">
      <form class="card form-card" id="f-password">
        <h2>${esc(t('settings.security'))}</h2>
        <div class="grid one">
          ${field('current', t('settings.current_pw'), '', { type: 'password', attrs: 'required autocomplete="current-password"' })}
          ${field('next', t('settings.new_pw'), '', { type: 'password', attrs: 'required minlength="8" autocomplete="new-password"' })}
        </div>
        <footer class="form-foot"><button type="button" class="btn ghost" id="logout">${esc(t('login.logout'))}</button>
          <span class="spacer"></span><button class="btn primary">${esc(t('settings.change_pw'))}</button></footer>
      </form>
      <section class="card form-card">
        <h2>${esc(t('settings.backup'))}</h2>
        <p class="muted">${esc(t('settings.backup_hint'))}</p>
        <a class="btn" href="/api/backup" download>⬇ ${esc(t('settings.backup_go'))}</a>
      </section>
    </div>`;

  const save = (form, after) => async (ev) => {
    ev.preventDefault();
    try { await api('PUT', '/api/settings', formData(form)); toast(t('common.saved')); after?.(); } catch (e) { fail(e); }
  };
  const fl = $('#f-letterhead');
  fl.onsubmit = save(fl, async () => {
    const lang = formData(fl).lang;
    state.settings = await api('GET', '/api/settings');
    try { localStorage.setItem('lang', lang); } catch {}
    if (lang !== LANG) { setLang(lang); renderShell(); route(); }
  });
  const fc = $('#f-calendar');
  fc.onsubmit = save(fc);
  $('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText($('#feed').value); } catch { $('#feed').select(); document.execCommand('copy'); }
    toast(t('common.copied'));
  };
  $('#regen').onclick = async () => {
    if (!confirm(t('settings.cal_regen_confirm'))) return;
    try { s.cal_token = (await api('POST', '/api/settings/calendar-token')).cal_token; viewSettings(main); } catch (e) { fail(e); }
  };
  const fp = $('#f-password');
  fp.onsubmit = async (ev) => {
    ev.preventDefault();
    try { await api('PUT', '/api/password', formData(fp)); fp.reset(); toast(t('settings.pw_changed')); } catch (e) { fail(e); }
  };
  $('#logout').onclick = async () => { await api('POST', '/api/logout').catch(() => {}); await boot(); };
}

// ---------------------------------------------------------------- shell & router
function renderShell() {
  document.title = t('app.name');
  const authed = state.me?.authed;
  $('#nav').innerHTML = authed ? [
    ['#/', '⌂', 'nav.home'], ['#/patients', '☰', 'nav.patients'], ['#/agenda', '▦', 'nav.agenda'], ['#/settings', '⚙', 'nav.settings'],
  ].map(([href, icon, key]) => `<a href="${href}" data-nav="${href}"><span class="ico">${icon}</span><span>${esc(t(key))}</span></a>`).join('') : '';
  $('#lang').textContent = LANG === 'fr' ? 'EN' : 'FR';
  document.body.classList.toggle('authed', !!authed);
}

const ROUTES = [
  [/^#?\/?$/, viewHome],
  [/^#\/patients$/, viewPatients],
  [/^#\/patients\/new(\?.*)?$/, (m) => viewPatientForm(m)],
  [/^#\/patients\/(\d+)$/, viewPatient],
  [/^#\/patients\/(\d+)\/edit$/, viewPatientForm],
  [/^#\/agenda(?:\/(\d{4}-\d{2}-\d{2}))?$/, viewAgenda],
  [/^#\/settings$/, viewSettings],
];

function route() {
  const main = $('#view');
  if ($('#modal').open) $('#modal').close();
  if (!state.me.setup) return viewSetup(main);
  if (!state.me.authed) return viewLogin(main);
  const hash = location.hash || '#/';
  $$('[data-nav]').forEach((a) => {
    const href = a.dataset.nav;
    a.classList.toggle('active', href === '#/' ? hash === '#/' : hash.startsWith(href));
  });
  for (const [re, view] of ROUTES) {
    const m = hash.match(re);
    if (m) { main.innerHTML = ''; window.scrollTo(0, 0); return view(main, m[1]); }
  }
  location.hash = '#/';
}

async function boot() {
  try { state.me = await (await fetch('/api/me', { credentials: 'same-origin' })).json(); }
  catch { $('#view').innerHTML = `<p class="muted pad">${esc(t('err.network'))}</p>`; return; }
  let lang = state.me.settings.lang;
  try { lang = localStorage.getItem('lang') || lang; } catch {}
  setLang(lang || 'fr');
  if (state.me.authed) state.settings = await api('GET', '/api/settings').catch(() => null);
  renderShell();
  route();
}

$('#lang').onclick = async () => {
  setLang(LANG === 'fr' ? 'en' : 'fr');
  try { localStorage.setItem('lang', LANG); } catch {}
  renderShell();
  route();
};
window.addEventListener('hashchange', route);
boot();
