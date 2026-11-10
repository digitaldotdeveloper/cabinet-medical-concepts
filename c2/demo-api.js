'use strict';
// Demo backend for the design concepts: answers the app's /api/* calls from the browser's localStorage,
// so the static GitHub Pages copy works with no server. All three concepts share one origin,
// so they share this one demo database. Patients are fictional.
(() => {
  const KEY = 'cabinet-demo-db-v2';   // v2: Excel-template fields (tiers payant, history, labs, radio)
  const now = () => new Date().toISOString();
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  const at = (offset, h, m) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d.toISOString(); };

  function seed() {
    const P = [
      ['Karim', 'Haddad', 'M', '1968-03-14', '+961 3 214 556', 'Ingénieur', 'A+', 'Pénicilline', 'Hypertension, diabète type 2', 'Metformine 850 mg x2, Amlodipine 5 mg'],
      ['Nour', 'Khalil', 'F', '1991-07-02', '+961 70 118 902', 'Enseignante', 'O+', '', 'Asthme léger', 'Ventoline si besoin'],
      ['Élie', 'Mansour', 'M', '1955-11-23', '+961 3 667 120', 'Retraité', 'B+', '', 'Fibrillation auriculaire', 'Apixaban 5 mg x2'],
      ['Rania', 'Saliba', 'F', '1984-01-30', '+961 71 402 338', 'Architecte', 'AB+', 'Aspirine', 'Migraine', ''],
      ['Georges', 'Aoun', 'M', '1977-09-09', '+961 3 980 441', 'Commerçant', 'O-', '', 'Hypercholestérolémie', 'Atorvastatine 20 mg'],
      ['Maya', 'Frem', 'F', '2002-05-18', '+961 76 223 019', 'Étudiante', 'A-', 'Arachides', '', ''],
      ['Joseph', 'Nassar', 'M', '1949-12-01', '+961 3 345 712', 'Retraité', 'A+', '', 'BPCO, HTA', 'Tiotropium, Ramipril 5 mg'],
      ['Carla', 'Daher', 'F', '1996-08-27', '+961 81 556 230', 'Infirmière', 'O+', '', '', ''],
      ['Samir', 'Abi Nader', 'M', '1963-04-05', '+961 3 712 004', 'Avocat', 'B-', 'Sulfamides', 'Goutte', 'Allopurinol 100 mg'],
      ['Lina', 'Chamoun', 'F', '1972-10-12', '+961 70 889 541', 'Pharmacienne', 'A+', '', 'Hypothyroïdie', 'Lévothyroxine 75 µg'],
      ['Tarek', 'Fakhoury', 'M', '1988-02-19', '+961 71 330 667', 'Développeur', 'O+', '', '', ''],
      ['Hala', 'Rizk', 'F', '1959-06-08', '+961 3 501 283', 'Retraitée', 'AB-', 'Iode', 'Arthrose genoux', 'Paracétamol si besoin'],
    ];
    const db = { seq: { patients: 0, visits: 0, appointments: 0 }, patients: [], visits: [], appointments: [],
      settings: { lang: 'fr', cal_token: 'demo', cal_privacy: 'initials', specialty: 'Médecine générale',
        address: 'Rue Principale, Beyrouth', phone: '+961 1 000 000' } };
    const TP = ['CNSS', 'AXA', 'Allianz', 'Bupa', '', 'CNSS', 'Mutuelle', '', 'AXA', 'CNSS', '', 'Mutuelle'];
    const HIST = [
      { smoking: '1 paquet/j depuis 20 ans', diabetes: 'Type 2 depuis 2015', hta: 'Oui, depuis 2012', lipids: 'LDL limite' },
      { smoking: 'Non', diabetes: 'Non', hta: 'Non' },
      { smoking: 'Ancien fumeur (arrêt 2010)', hta: 'Oui', lipids: 'Oui', bone: 'Ostéopénie' },
      { smoking: 'Non', thyroid: 'Nodule bénin 2020' },
      { smoking: 'Narguilé le week-end', lipids: 'Hypercholestérolémie' },
      { smoking: 'Non' },
      { smoking: '2 paquets/j', hta: 'Oui', bone: 'Arthrose lombaire' },
      {},
      { diabetes: 'Prédiabète', hta: 'Non', lipids: 'TG élevés' },
      { thyroid: 'Hypothyroïdie (Hashimoto)', bone: 'Ostéoporose' },
      { smoking: 'Non' },
      { hta: 'Oui', bone: 'Gonarthrose bilatérale', diabetes: 'Non' },
    ];
    const PSH = ['Appendicectomie 1990', '', 'Pontage 2018', '', 'Hernie inguinale 2011', '', 'Cholécystectomie 2005', '', '', 'Thyroïdectomie partielle 2016', '', 'Prothèse hanche D 2019'];
    const FAM = ['Père diabétique', 'Mère asthmatique', 'Frère IDM à 55 ans', 'Mère migraineuse', 'Père HTA', '', 'Père BPCO', '', 'Mère goutte', 'Sœur thyroïde', '', 'Mère ostéoporose'];
    P.forEach((r, i) => {
      const id = ++db.seq.patients;
      db.patients.push({ id, file_no: String(id).padStart(5, '0'), first_name: r[0], last_name: r[1], sex: r[2], dob: r[3],
        phone: r[4], email: null, address: 'Beyrouth', profession: r[5], blood_type: r[6], allergies: r[7] || null,
        conditions: r[8] || null, surgical_history: PSH[i] || null, family_history: FAM[i] || null, medications: r[9] || null, notes: null,
        tiers_payant: TP[i] || null, history: HIST[i],
        created_at: now(), updated_at: new Date(Date.now() - i * 3600e3).toISOString() });
    });
    const LABS = {
      1: [{ glucose: '1.25', hba1c: '6.9', creat: '10.1', k: '4.4' }, { glucose: '1.12', hba1c: '7.8', creat: '9.9', k: '4.2' }, { glucose: '1.42', hba1c: '7.4', ct: '2.10', tg: '1.80', hdl: '0.42', ldl: '1.32', creat: '9.8' }],  // visit order: -2, -150, -60 days
      2: [{ cbc: 'GB 11 200', esr: '28' }],
      3: [{ creat: '12.4', k: '4.9', tsh: '2.1', ck: '140' }],
      4: [{ cbc: 'Normal', vitd: '18', b12: '310' }],
      5: [{ ct: '2.45', tg: '2.10', hdl: '0.38', ldl: '1.60', sgpt: '32', sgot: '28' }],
      7: [{ cbc: 'GB 13 400', esr: '42', creat: '11.0' }],
      9: [{ uree: '0.45', creat: '10.5', acr: '25', urine: 'Cristaux urates' }],
      10: [{ tsh: '3.2', ft4: '1.1', us_thyroid: 'Lobe D post-op, RAS' }],
      12: [{ vitd: '22', ca: '9.4' }],
    };
    const RADIO = { 3: [{ other: 'Écho cœur : FEVG 55 %' }], 7: [{ other: 'Radio thorax : distension' }], 12: [{ mri: 'IRM genou G : gonarthrose stade III' }] };
    const seen = {};
    const V = [
      [1, -2, 'Contrôle tension', '145/90', '78', '36.8', '88', 'Bon état général', 'HTA mal contrôlée', 'Amlodipine passée à 10 mg'],
      [1, -150, 'Suivi diabète', '150/92', '80', '36.8', '91', '', 'Diabète déséquilibré', 'Metformine 850 mg x2'],
      [1, -60, 'Bilan diabète', '138/85', '74', '36.7', '89', 'Examen des pieds normal', 'Diabète type 2 équilibré', 'HbA1c dans 3 mois'],
      [2, -5, 'Toux depuis 1 semaine', '118/72', '82', '37.9', '61', 'Sibilants bilatéraux', 'Bronchite asthmatiforme', 'Corticoïde inhalé 10 jours'],
      [3, -14, 'Palpitations', '132/80', '96', '36.6', '74', 'Rythme irrégulier', 'FA connue', 'Poursuite apixaban, ECG fait'],
      [4, -9, 'Céphalées', '120/76', '70', '36.9', '58', 'Examen neuro normal', 'Migraine sans aura', 'Triptan en crise'],
      [5, -30, 'Bilan lipidique', '130/82', '72', '36.7', '84', '', 'LDL 1.6 g/L', 'Atorvastatine 20 mg'],
      [7, -3, 'Essoufflement', '142/88', '88', '37.1', '77', 'Râles bronchiques', 'Exacerbation BPCO', 'Antibiotique 7 jours, contrôle J10'],
      [9, -21, 'Douleur gros orteil', '128/84', '76', '37.4', '92', 'Arthrite MTP1 droite', 'Crise de goutte', 'Colchicine, repos'],
      [10, -45, 'Suivi thyroïde', '115/70', '66', '36.5', '63', '', 'TSH normale', 'Même dose'],
      [12, -7, 'Douleur genou', '135/80', '72', '36.6', '70', 'Crépitations', 'Gonarthrose', 'Kiné 10 séances'],
    ];
    V.forEach((v) => {
      const n = seen[v[0]] = (seen[v[0]] || 0) + 1;
      db.visits.push({ id: ++db.seq.visits, patient_id: v[0], date: day(v[1]), reason: v[2], bp: v[3], pulse: v[4],
        temp: v[5], weight: v[6], height: null, exam: v[7] || null, diagnosis: v[8], treatment: v[9], notes: null,
        labs: (LABS[v[0]] || [])[n - 1] || {}, radio: (RADIO[v[0]] || [])[n - 1] || {}, created_at: now(), updated_at: now() });
    });
    const A = [[1, 0, 9, 0], [4, 0, 10, 30], [7, 0, 11, 15], [11, 0, 15, 0], [2, 1, 9, 30], [6, 1, 14, 0],
      [9, 2, 10, 0], [3, 3, 16, 30], [10, 4, 9, 0], [12, 4, 11, 30]];
    A.forEach((a) => db.appointments.push({ id: ++db.seq.appointments, uid: 'demo-' + db.seq.appointments, patient_id: a[0],
      start: at(a[1], a[2], a[3]), duration: 30, title: null, notes: null, status: 'scheduled', created_at: now(), updated_at: now() }));
    return db;
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
  save();
  window.cabinetDemoReset = () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); };

  class HttpError extends Error { constructor(s, m) { super(m); this.status = s; } }
  const bad = (m) => { throw new HttpError(400, m); };
  const clean = (v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x != null && String(x).trim() !== '').map(([k, x]) => [k, String(x).trim()]));
  const pick = (body, fields) => {
    const o = {};
    for (const f of fields) {
      const v = body[f];
      if (v === undefined) continue;
      o[f] = v && typeof v === 'object' ? clean(v) : v === '' || v === null ? null : typeof v === 'number' ? v : String(v).trim() || null;
    }
    return o;
  };
  const PF = ['file_no', 'first_name', 'last_name', 'sex', 'dob', 'phone', 'email', 'address', 'profession', 'blood_type', 'allergies', 'conditions', 'surgical_history', 'family_history', 'medications', 'notes', 'tiers_payant', 'history'];
  const VF = ['date', 'reason', 'bp', 'pulse', 'temp', 'weight', 'height', 'exam', 'diagnosis', 'treatment', 'notes', 'labs', 'radio'];
  const AF = ['patient_id', 'start', 'duration', 'title', 'notes', 'status'];
  const SET = ['doctor_name', 'specialty', 'address', 'phone', 'email', 'reg_no', 'lang', 'cal_name', 'cal_privacy'];
  const pat = (id) => db.patients.find((p) => p.id === Number(id)) || (() => { throw new HttpError(404, 'not_found'); })();
  const search = (p) => fold([p.last_name, p.first_name, p.file_no, p.phone, String(p.phone || '').replace(/\D/g, ''), p.dob, p.email].join(' '));
  const lastVisit = (id) => db.visits.filter((v) => v.patient_id === id).map((v) => v.date).sort().pop() || null;
  const brief = (p) => ({ id: p.id, file_no: p.file_no, first_name: p.first_name, last_name: p.last_name, sex: p.sex, dob: p.dob, phone: p.phone, allergies: p.allergies, tiers_payant: p.tiers_payant, last_visit: lastVisit(p.id) });
  const cleanAppt = (body, partial) => {
    const a = pick(body, AF);
    if ('start' in a || !partial) { const d = new Date(a.start); if (isNaN(d)) bad('start_required'); a.start = d.toISOString(); }
    if ('duration' in a) a.duration = Math.min(600, Math.max(5, parseInt(a.duration, 10) || 30));
    if ('patient_id' in a) a.patient_id = a.patient_id ? Number(a.patient_id) : null;
    return a;
  };

  const R = [];
  const on = (m, p, h) => R.push({ m, re: new RegExp('^' + p.replace(/:id/g, '(\\d+)') + '$'), h });
  on('GET', '/api/me', () => ({ setup: true, authed: true, settings: { lang: db.settings.lang, doctor_name: null } }));
  on('POST', '/api/logout', () => ({ ok: true }));
  on('PUT', '/api/password', () => ({ ok: true }));
  on('GET', '/api/settings', () => { const o = { cal_token: db.settings.cal_token }; for (const k of SET) o[k] = db.settings[k] ?? null; return o; });
  on('PUT', '/api/settings', ({ body }) => { for (const k of SET) if (body[k] !== undefined) db.settings[k] = body[k] === '' ? null : String(body[k]).trim(); return { ok: true }; });
  on('POST', '/api/settings/calendar-token', () => ({ cal_token: db.settings.cal_token = Math.random().toString(16).slice(2) }));
  on('GET', '/api/patients', ({ url }) => {
    const q = fold(url.searchParams.get('q')).trim();
    if (!q) return [...db.patients].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 50).map(brief);
    const terms = q.split(/\s+/);
    return db.patients.filter((p) => terms.every((t) => search(p).includes(t)))
      .sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name)).map(brief);
  });
  on('POST', '/api/patients', ({ body }) => {
    const p = pick(body, PF); if (!p.first_name || !p.last_name) bad('name_required');
    const id = ++db.seq.patients;
    db.patients.push({ ...Object.fromEntries(PF.map((f) => [f, null])), ...p, id, file_no: p.file_no || String(id).padStart(5, '0'), created_at: now(), updated_at: now() });
    return { id };
  });
  on('GET', '/api/patients/:id', ({ id }) => ({ patient: { ...pat(id) },
    visits: db.visits.filter((v) => v.patient_id === Number(id)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    appointments: db.appointments.filter((a) => a.patient_id === Number(id)).sort((a, b) => b.start.localeCompare(a.start)) }));
  on('PUT', '/api/patients/:id', ({ id, body }) => { const p = pat(id); const d = pick(body, PF); if (!d.file_no) delete d.file_no; Object.assign(p, d, { updated_at: now() }); return { ok: true }; });
  on('DELETE', '/api/patients/:id', ({ id }) => {
    id = Number(id); db.patients = db.patients.filter((p) => p.id !== id);
    db.visits = db.visits.filter((v) => v.patient_id !== id); db.appointments = db.appointments.filter((a) => a.patient_id !== id);
    return { ok: true };
  });
  on('POST', '/api/patients/:id/visits', ({ id, body }) => {
    const p = pat(id); const v = pick(body, VF); if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date || '')) bad('date_required');
    const vid = ++db.seq.visits; db.visits.push({ ...Object.fromEntries(VF.map((f) => [f, null])), ...v, id: vid, patient_id: p.id, created_at: now(), updated_at: now() });
    p.updated_at = now(); return { id: vid };
  });
  on('PUT', '/api/visits/:id', ({ id, body }) => { const v = db.visits.find((x) => x.id === Number(id)); if (!v) throw new HttpError(404, 'not_found'); Object.assign(v, pick(body, VF), { updated_at: now() }); return { ok: true }; });
  on('DELETE', '/api/visits/:id', ({ id }) => { db.visits = db.visits.filter((v) => v.id !== Number(id)); return { ok: true }; });
  on('GET', '/api/appointments', ({ url }) => {
    const from = new Date(url.searchParams.get('from')).toISOString(), to = new Date(url.searchParams.get('to')).toISOString();
    return db.appointments.filter((a) => a.start >= from && a.start < to).sort((a, b) => a.start.localeCompare(b.start)).map((a) => {
      const p = db.patients.find((x) => x.id === a.patient_id) || {};
      return { ...a, first_name: p.first_name, last_name: p.last_name, phone: p.phone, file_no: p.file_no };
    });
  });
  on('POST', '/api/appointments', ({ body }) => {
    const a = cleanAppt(body, false); if (!a.patient_id && !a.title) bad('patient_or_title_required');
    const id = ++db.seq.appointments; db.appointments.push({ duration: 30, status: 'scheduled', title: null, notes: null, ...a, id, uid: 'demo-' + id, created_at: now(), updated_at: now() });
    return { id };
  });
  on('PUT', '/api/appointments/:id', ({ id, body }) => { const a = db.appointments.find((x) => x.id === Number(id)); if (!a) throw new HttpError(404, 'not_found'); Object.assign(a, cleanAppt(body, true), { updated_at: now() }); return { ok: true }; });
  on('DELETE', '/api/appointments/:id', ({ id }) => { db.appointments = db.appointments.filter((a) => a.id !== Number(id)); return { ok: true }; });

  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const i = url.pathname.indexOf('/api/');
    if (i < 0) return realFetch(input, init);
    const path = url.pathname.slice(i);
    const method = (init.method || 'GET').toUpperCase();
    const r = R.find((x) => x.m === method && x.re.test(path));
    if (!r) return json(404, { error: 'not_found' });
    try {
      const out = r.h({ id: path.match(r.re)[1], url, body: init.body ? JSON.parse(init.body) : {} });
      save();
      return json(200, out);
    } catch (e) { return json(e.status || 500, { error: e.message || 'generic' }); }
  };

  // "Download backup" is a plain link to /api/backup: serve it from the demo data instead.
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest?.('a[href$="/api/backup"]');
    if (!a) return;
    ev.preventDefault();
    const blob = new Blob([JSON.stringify({ exported_at: now(), ...db }, null, 2)], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `cabinet-backup-${now().slice(0, 10)}.json` });
    link.click();
  });
})();
